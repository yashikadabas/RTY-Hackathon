import "server-only";

const KEY = () => process.env.GOOGLE_MAPS_API_KEY ?? "";

export function hasGoogleKey() {
  return Boolean(KEY());
}

interface GeocodeComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ placeName: string; country: string }> {
  const fallback = { placeName: `${lat.toFixed(3)}, ${lng.toFixed(3)}`, country: "" };
  if (KEY()) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY()}`,
        { signal: AbortSignal.timeout(8000) },
      );
      const data = (await res.json()) as {
        status: string;
        results: { address_components: GeocodeComponent[]; formatted_address: string }[];
      };
      if (data.status === "OK" && data.results.length) {
        const comps = data.results.flatMap((r) => r.address_components);
        const find = (t: string) => comps.find((c) => c.types.includes(t))?.long_name;
        const placeName =
          find("locality") ??
          find("postal_town") ??
          find("administrative_area_level_2") ??
          find("administrative_area_level_1") ??
          data.results[0].formatted_address.split(",")[0];
        return { placeName, country: find("country") ?? "" };
      }
    } catch {
      /* fall through to OSM */
    }
  }
  // Keyless fallback: OpenStreetMap Nominatim reverse geocoding.
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
      { headers: { "User-Agent": "onlocation-buildathon/0.1" }, signal: AbortSignal.timeout(8000) },
    );
    const d = (await res.json()) as {
      address?: Record<string, string>;
      name?: string;
    };
    const a = d.address ?? {};
    const placeName = a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? d.name;
    if (placeName) return { placeName, country: a.country ?? "" };
  } catch {
    /* ignore */
  }
  return fallback;
}

export interface PanoMeta {
  ok: boolean;
  lat?: number;
  lng?: number;
  panoId?: string;
}

export async function streetViewMeta(lat: number, lng: number): Promise<PanoMeta> {
  if (!KEY()) return { ok: false };
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=120&source=outdoor&key=${KEY()}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const d = (await res.json()) as {
      status: string;
      location?: { lat: number; lng: number };
      pano_id?: string;
    };
    if (d.status !== "OK") return { ok: false };
    return { ok: true, lat: d.location?.lat, lng: d.location?.lng, panoId: d.pano_id };
  } catch {
    return { ok: false };
  }
}

export function streetViewStaticUrl(lat: number, lng: number, heading: number, size = 640) {
  return (
    `https://maps.googleapis.com/maps/api/streetview?size=${size}x${size}` +
    `&location=${lat},${lng}&heading=${Math.round(heading)}&pitch=8&fov=90&radius=120&source=outdoor&key=${KEY()}`
  );
}

/** Public, key-hiding proxy URL for the browser. */
export function proxiedStreetView(lat: number, lng: number, heading: number) {
  return `/api/streetview?lat=${lat}&lng=${lng}&heading=${Math.round(heading)}`;
}

/** Fetch Street View frames as base64 data URLs for GPT vision. */
export async function streetViewFrames(
  lat: number,
  lng: number,
  headings: number[],
): Promise<string[]> {
  if (!KEY()) return [];
  const out = await Promise.all(
    headings.map(async (h) => {
      try {
        const res = await fetch(streetViewStaticUrl(lat, lng, (h + 360) % 360, 512), {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return `data:image/jpeg;base64,${buf.toString("base64")}`;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is string => Boolean(x));
}

/** Headings to ground from: centred on the user's view, or evenly spread. */
export function groundingHeadings(heading?: number) {
  if (heading === undefined) return [0, 120, 240];
  return [heading, heading + 60, heading - 60];
}
