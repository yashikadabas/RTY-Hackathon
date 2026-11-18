import { after } from "next/server";
import { savePhoto } from "@/lib/jobs";
import { processPhotoJob } from "@/lib/photo-pipeline";
import type { PhotoJob } from "@/lib/types";
import { makeId } from "@/lib/utils";
import { parseImages, parseModifiers, parsePlace, parseViewpoint } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const userImages = parseImages(body?.userImages);
  const place = parsePlace(body?.place);
  if (!userImages || !place) return Response.json({ error: "Invalid input" }, { status: 400 });

  const job: PhotoJob = {
    id: makeId("photo"),
    stage: "queued",
    createdAt: Date.now(),
    input: { userImages, place, modifiers: parseModifiers(body?.modifiers), viewpoint: parseViewpoint(body?.viewpoint) },
    candidates: [],
  };
  savePhoto(job);
  // Keep the function alive until the job finishes (serverless-safe).
  after(() => processPhotoJob(job));
  return Response.json({ id: job.id });
}
