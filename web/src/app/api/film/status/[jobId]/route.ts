import { getFilm, publicFilm } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/film/status/[jobId]">) {
  const { jobId } = await ctx.params;
  const job = getFilm(jobId);
  if (!job) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(publicFilm(job), { headers: { "Cache-Control": "no-store" } });
}
