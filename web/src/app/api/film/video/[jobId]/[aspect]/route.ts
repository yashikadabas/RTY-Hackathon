import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";

/** Serves locally-stitched films (demo mode / no fal storage), with Range support. */
export async function GET(req: Request, ctx: RouteContext<"/api/film/video/[jobId]/[aspect]">) {
  const { jobId, aspect } = await ctx.params;
  if (!/^film_[a-f0-9]{12}$/.test(jobId) || !["wide", "vertical"].includes(aspect)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const file = path.join(os.tmpdir(), "onlocation-films", `${jobId}-${aspect}.mp4`);
  const info = await stat(file).catch(() => null);
  if (!info) return Response.json({ error: "not found" }, { status: 404 });

  const u = new URL(req.url);
  const download = u.searchParams.get("download");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${download.replace(/[^\w.-]/g, "_")}"`;

  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(info.size) } });
}
