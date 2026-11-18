import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import { hasFal } from "./fal";

/**
 * Demo mode runs the whole flow without paid generation APIs, so the demo
 * path never breaks. Enabled when DEMO_MODE=1 or FAL_KEY is missing.
 */
export function isDemo() {
  return process.env.DEMO_MODE === "1" || !hasFal();
}

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

function dataUrlToBuffer(src: string) {
  const m = /^data:[^;]+;base64,(.*)$/.exec(src);
  return m ? Buffer.from(m[1], "base64") : null;
}

/**
 * Compose a stand-in "photo": the real Street View frame (or a graded
 * gradient) with the subject's reference photo inset, labelled DEMO.
 */
export async function demoComposite(opts: {
  background?: string; // data URL
  selfie?: string; // data URL
  title: string;
  subtitle: string;
  width: number;
  height: number;
  variant: number;
}): Promise<Buffer> {
  const { width: W, height: H } = opts;
  const bgBuf = opts.background ? dataUrlToBuffer(opts.background) : null;
  const hues = ["#2a3a4f", "#4f3a2a", "#2a4f44", "#3d2a4f"];
  const base = bgBuf
    ? sharp(bgBuf).resize(W, H, { fit: "cover" }).modulate({ saturation: 1.1, brightness: 0.92 })
    : sharp({
        create: { width: W, height: H, channels: 3, background: hues[opts.variant % hues.length] },
      });

  const layers: OverlayOptions[] = [];
  const shade = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  layers.push({ input: shade });

  const selfieBuf = opts.selfie ? dataUrlToBuffer(opts.selfie) : null;
  if (selfieBuf) {
    const s = Math.round(Math.min(W, H) * 0.42);
    const mask = Buffer.from(`<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.12}" fill="#fff"/></svg>`);
    const face = await sharp(selfieBuf)
      .resize(s, s, { fit: "cover", position: "attention" })
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    const positions = [
      [0.5, 0.48],
      [0.3, 0.5],
      [0.7, 0.46],
      [0.5, 0.42],
    ][opts.variant % 4];
    layers.push({
      input: face,
      left: Math.round(W * positions[0] - s / 2),
      top: Math.round(H * positions[1] - s / 2),
    });
  }

  const fs = Math.round(Math.min(W, H) * 0.07);
  const text = Buffer.from(
    `<svg width="${W}" height="${H}">
      <text x="${W * 0.06}" y="${H - fs * 1.9}" font-family="Georgia, serif" font-size="${fs}" fill="#fff">${esc(opts.title)}</text>
      <text x="${W * 0.06}" y="${H - fs * 0.9}" font-family="Helvetica, Arial" font-size="${fs * 0.36}" letter-spacing="3" fill="#e0a35e">${esc(opts.subtitle.toUpperCase())}</text>
      <rect x="${W - fs * 3.6}" y="${fs * 0.6}" width="${fs * 3}" height="${fs * 0.8}" rx="${fs * 0.4}" fill="#000" fill-opacity="0.6"/>
      <text x="${W - fs * 2.1}" y="${fs * 1.15}" text-anchor="middle" font-family="Helvetica, Arial" font-size="${fs * 0.34}" letter-spacing="2" fill="#fff">DEMO MODE</text>
    </svg>`,
  );
  layers.push({ input: text });

  return base.composite(layers).jpeg({ quality: 88 }).toBuffer();
}

export const toDataUrl = (buf: Buffer, type = "image/jpeg") => `data:${type};base64,${buf.toString("base64")}`;
