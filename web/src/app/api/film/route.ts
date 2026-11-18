import { after } from "next/server";
import { processFilmJob } from "@/lib/film/pipeline";
import { saveFilm } from "@/lib/jobs";
import type { FilmJob } from "@/lib/types";
import { makeId } from "@/lib/utils";
import { parseImages, parseModifiers, parsePlace, parseViewpoint } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const userImages = parseImages(body?.userImages);
  const place = parsePlace(body?.place);
  if (!userImages || !place) return Response.json({ error: "Invalid input" }, { status: 400 });
  const seed = typeof body?.seedImage === "string" ? parseImages([body.seedImage])?.[0] : undefined;

  const job: FilmJob = {
    jobId: makeId("film"),
    createdAt: Date.now(),
    input: {
      userImages,
      place,
      modifiers: parseModifiers(body?.modifiers),
      viewpoint: parseViewpoint(body?.viewpoint),
      seedImage: seed,
    },
    stage: "queued",
    progress: { clipsDone: 0, clipsTotal: 0 },
    log: [],
  };
  saveFilm(job);
  after(() => processFilmJob(job));
  return Response.json({ jobId: job.jobId });
}
