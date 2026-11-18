import { getPhoto, publicPhoto } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/generate/status/[id]">) {
  const { id } = await ctx.params;
  const job = getPhoto(id);
  if (!job) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(publicPhoto(job), { headers: { "Cache-Control": "no-store" } });
}
