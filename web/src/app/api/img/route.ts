export const runtime = "nodejs";

const ALLOWED = ["fal.media", "fal.ai", "fal.run"];

function allowed(host: string) {
  return ALLOWED.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Same-origin proxy for fal-hosted media so the browser can draw it on a
 * canvas (postcard) and download it with a filename. SSRF-guarded by an
 * HTTPS-only host allow-list. Streams instead of buffering.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const raw = u.searchParams.get("url");
  const filename = u.searchParams.get("filename");
  if (!raw) return Response.json({ error: "Missing url" }, { status: 400 });
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ error: "Bad url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !allowed(target.hostname)) {
    return Response.json({ error: "Host not allowed" }, { status: 403 });
  }
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(60000) });
    if (!res.ok || !res.body) return Response.json({ error: "Upstream error" }, { status: 502 });
    const headers = new Headers({
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    });
    const len = res.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    if (filename) {
      headers.set("Content-Disposition", `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`);
    }
    return new Response(res.body, { headers });
  } catch {
    return Response.json({ error: "Fetch failed" }, { status: 502 });
  }
}
