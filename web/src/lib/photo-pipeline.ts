import "server-only";
import { demoComposite, isDemo, toDataUrl } from "./demo";
import { faceRestore, generateIdentityImage, toFalUrl } from "./fal";
import { groundingHeadings, proxiedStreetView, streetViewFrames } from "./google";
import { savePhoto } from "./jobs";
import { compilePhotoPrompt, describeLocation, hasOpenAI } from "./openai";
import type { PhotoJob } from "./types";
import { resolveConditions } from "./weather";

const N = 3;

export async function processPhotoJob(job: PhotoJob) {
  const { place, modifiers, viewpoint, userImages } = job.input;
  const placeLabel = [place.placeName, place.country].filter(Boolean).join(", ");
  const conditions = resolveConditions(place.weather, modifiers);

  try {
    // 1. Ground the scene in what the user is actually looking at.
    job.stage = "grounding";
    savePhoto(job);
    const at = viewpoint ?? { lat: place.lat, lng: place.lng };
    const headings = groundingHeadings(viewpoint?.heading);
    const frames = await streetViewFrames(at.lat, at.lng, headings);
    if (frames.length) job.groundingFrames = headings.map((h) => proxiedStreetView(at.lat, at.lng, (h + 360) % 360));
    if (frames.length && hasOpenAI()) {
      job.grounding = await describeLocation(placeLabel, frames).catch(() => "");
    }
    savePhoto(job);

    // 2. Compile prompt + generate.
    job.stage = "generating";
    savePhoto(job);

    if (isDemo()) {
      job.demo = true;
      job.prompt = hasOpenAI()
        ? await compilePhotoPrompt({
            place: placeLabel,
            grounding: job.grounding ?? "",
            conditions,
            sceneIdea: modifiers.sceneDescription,
            era: modifiers.era,
          })
        : undefined;
      job.candidates = await Promise.all(
        Array.from({ length: N }, async (_, i) =>
          toDataUrl(
            await demoComposite({
              background: frames[i % Math.max(frames.length, 1)],
              selfie: userImages[i % userImages.length],
              title: place.placeName,
              subtitle: conditions.label,
              width: 864,
              height: 1080,
              variant: i,
            }),
          ),
        ),
      );
      job.stage = "done";
      savePhoto(job);
      return;
    }

    const prompt = await compilePhotoPrompt({
      place: placeLabel,
      grounding: job.grounding ?? "",
      conditions,
      sceneIdea: modifiers.sceneDescription,
      era: modifiers.era,
    });
    job.prompt = prompt;
    savePhoto(job);

    const refs = await Promise.all(userImages.slice(0, 5).map(toFalUrl));
    let urls = await generateIdentityImage({ prompt, refs, numImages: N, aspect: "4:5" }).catch(() => []);
    // Some endpoints return fewer than asked; top up one at a time.
    for (let tries = 0; urls.length < N && tries < N; tries++) {
      const more = await generateIdentityImage({ prompt, refs, numImages: 1, aspect: "4:5" }).catch(() => []);
      urls = [...urls, ...more];
    }
    if (!urls.length) throw new Error("The image model returned no photos. Try again or pick another place.");

    job.candidates = await Promise.all(urls.slice(0, N).map(faceRestore));
    job.stage = "done";
    savePhoto(job);
  } catch (e) {
    job.stage = "failed";
    job.error = e instanceof Error ? e.message : "Generation failed";
    savePhoto(job);
  }
}
