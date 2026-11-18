import { proxiedStreetView, reverseGeocode, streetViewMeta } from "@/lib/google";
import type { PlaceResult } from "@/lib/types";
import { fetchWeather } from "@/lib/weather";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lat?: unknown; lng?: unknown } | null;
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  const [geo, sv, weather] = await Promise.all([
    reverseGeocode(lat, lng),
    streetViewMeta(lat, lng),
    fetchWeather(lat, lng),
  ]);

  const result: PlaceResult = {
    lat,
    lng,
    placeName: geo.placeName,
    country: geo.country,
    streetViewImages: sv.ok ? [0, 90, 180, 270].map((h) => proxiedStreetView(lat, lng, h)) : [],
    weather,
  };
  return Response.json(result);
}
