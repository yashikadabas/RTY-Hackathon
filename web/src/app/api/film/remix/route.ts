import { after } from "next/server";
import { remixFilmJob } from "@/lib/film/pipeline";
import { getFilm, saveFilm } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { jobId?: unknown } | null;
  if (typeof body?.jobId !== "string") return Response.json({ error: "Invalid input" }, { status: 400 });
  const job = getFilm(body.jobId);
  if (!job) return Response.json({ error: "not found" }, { status: 404 });
  if ((job.clips?.length ?? 0) < 2 || !job.shots) {
    return Response.json({ error: "Nothing to remix yet" }, { status: 400 });
  }
  // Server-side guard: one remix at a time per job.
  if (job.remixing || (job.stage !== "done" && job.stage !== "failed")) {
    return Response.json({ error: "Already working on this film" }, { status: 409 });
  }
  job.remixing = true;
  saveFilm(job);
  after(() => remixFilmJob(job));
  return Response.json({ jobId: job.jobId });
}
