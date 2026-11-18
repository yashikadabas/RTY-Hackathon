import "server-only";
import { fal } from "@fal-ai/client";

let configured = false;
function client() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY missing");
  if (!configured) {
    fal.config({ credentials: process.env.FAL_KEY });
    configured = true;
  }
  return fal;
}
export function hasFal() {
  return Boolean(process.env.FAL_KEY);
}

const IMAGE_MODEL = () => process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana-pro/edit";
const T2I_MODEL = () => process.env.FAL_T2I_MODEL || "fal-ai/flux-2/turbo";
const VIDEO_MODEL = () => process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v3/pro/image-to-video";
const FACE_MODEL = () => process.env.FAL_FACE_RESTORE_MODEL || "fal-ai/codeformer";

type Aspect = "4:5" | "16:9" | "9:16" | "1:1";

/** data: URL → hosted fal storage URL (http URLs pass through). */
export async function toFalUrl(src: string): Promise<string> {
  if (!src.startsWith("data:")) return src;
  const m = /^data:([^;]+);base64,(.*)$/.exec(src);
  if (!m) throw new Error("Bad data URL");
  const blob = new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
  return client().storage.upload(blob);
}

export async function uploadBuffer(buf: Buffer, type: string): Promise<string> {
  return client().storage.upload(new Blob([new Uint8Array(buf)], { type }));
}

function imagesFrom(data: unknown): string[] {
  const d = data as { images?: { url: string }[]; image?: { url: string } };
  if (Array.isArray(d.images)) return d.images.map((i) => i.url).filter(Boolean);
  if (d.image?.url) return [d.image.url];
  return [];
}

/**
 * Identity-preserving generation. Multi-reference models (Nano Banana,
 * Kontext) see ALL reference photos at once; legacy single-ref models
 * (PuLID, Ideogram character) get the first one.
 */
export async function generateIdentityImage(opts: {
  prompt: string;
  refs: string[];
  numImages: number;
  aspect: Aspect;
}): Promise<string[]> {
  const model = IMAGE_MODEL();
  let input: Record<string, unknown>;
  if (/nano-banana|kontext|gemini/.test(model)) {
    input = {
      prompt: opts.prompt,
      image_urls: opts.refs.slice(0, 5),
      num_images: opts.numImages,
      aspect_ratio: opts.aspect,
      output_format: "jpeg",
      ...(/pro/.test(model) ? { resolution: process.env.FAL_IMAGE_RESOLUTION || "2K" } : {}),
    };
  } else if (/ideogram/.test(model)) {
    input = {
      prompt: opts.prompt,
      reference_image_urls: [opts.refs[0]],
      num_images: opts.numImages,
      image_size: aspectToSize(opts.aspect),
    };
  } else {
    input = {
      prompt: opts.prompt,
      reference_image_url: opts.refs[0],
      num_images: opts.numImages,
      image_size: aspectToSize(opts.aspect),
    };
  }
  const { data } = await client().subscribe(model, { input });
  return imagesFrom(data);
}

function aspectToSize(a: Aspect) {
  return a === "16:9" ? "landscape_16_9" : a === "9:16" ? "portrait_16_9" : a === "1:1" ? "square_hd" : "portrait_4_3";
}

/** Plain text-to-image (used for the person-free detail cutaway). */
export async function generateImage(prompt: string, aspect: Aspect): Promise<string> {
  const { data } = await client().subscribe(T2I_MODEL(), {
    input: { prompt, image_size: aspectToSize(aspect), num_images: 1, output_format: "jpeg" },
  });
  const url = imagesFrom(data)[0];
  if (!url) throw new Error("No image returned");
  return url;
}

/** Animate a still into a short clip. */
export async function imageToVideo(imageUrl: string, prompt: string, durationSec: number): Promise<string> {
  const model = VIDEO_MODEL();
  let input: Record<string, unknown>;
  if (/kling/.test(model)) {
    input = {
      prompt,
      ...(/v3|o1|o3/.test(model) ? { start_image_url: imageUrl } : { image_url: imageUrl }),
      duration: String(durationSec >= 5 ? 5 : durationSec),
      negative_prompt: "blur, distort, low quality, morphing face, extra limbs, text, watermark",
      cfg_scale: 0.5,
      generate_audio: false,
    };
  } else if (/veo/.test(model)) {
    input = {
      prompt,
      image_url: imageUrl,
      duration: `${Math.min(8, Math.max(4, durationSec))}s`,
      generate_audio: false,
    };
  } else {
    input = { prompt, image_url: imageUrl, aspect_ratio: "16:9" };
  }
  const { data } = await client().subscribe(model, { input });
  const url = (data as { video?: { url: string } }).video?.url;
  if (!url) throw new Error("No video returned");
  return url;
}

/** Best-effort CodeFormer face restore; returns the original on failure. */
export async function faceRestore(url: string): Promise<string> {
  if (process.env.FAL_FACE_RESTORE === "0") return url;
  try {
    const { data } = await client().subscribe(FACE_MODEL(), {
      input: { image_url: url, fidelity: 0.72, upscale_factor: 2 },
    });
    return imagesFrom(data)[0] ?? url;
  } catch {
    return url;
  }
}
