import { hasGoogleKey, streetViewStaticUrl } from "@/lib/google";

export const runtime = "nodejs";

/** Key-hiding proxy for Street View Static images. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat"));
  const lng = Number(u.searchParams.get("lng"));
  const heading = Number(u.searchParams.get("heading") ?? 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(heading)) {
    return Response.json({ error: "Invalid coords" }, { status: 400 });
  }
  if (!hasGoogleKey()) return Response.json({ error: "Street View unavailable" }, { status: 502 });
  try {
    const res = await fetch(streetViewStaticUrl(lat, lng, heading), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return Response.json({ error: "Upstream error" }, { status: 502 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }
}
