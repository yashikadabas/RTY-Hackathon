import "server-only";
import type { Modifiers, PlaceResult, Viewpoint, WeatherOverride } from "./types";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // per data URL (base64 chars)
const OVERRIDES: WeatherOverride[] = ["clear", "rain", "snow", "golden", "night"];

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

export function parseImages(v: unknown): string[] | null {
  if (!Array.isArray(v) || !v.length) return null;
  const imgs = v.slice(0, MAX_IMAGES).filter(
    (s): s is string =>
      typeof s === "string" &&
      s.length < MAX_IMAGE_BYTES &&
      (/^data:image\/(jpeg|png|webp);base64,/.test(s) || /^https:\/\//.test(s)),
  );
  return imgs.length ? imgs : null;
}

export function parsePlace(v: unknown): PlaceResult | null {
  const p = v as Partial<PlaceResult> | null;
  const lat = num(p?.lat);
  const lng = num(p?.lng);
  if (lat === null || lng === null || !p) return null;
  return {
    lat,
    lng,
    placeName: str(p.placeName, 120) || `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    country: str(p.country, 80) ?? "",
    streetViewImages: [],
    weather: p.weather && typeof p.weather === "object" ? p.weather : null,
  };
}

export function parseModifiers(v: unknown): Modifiers {
  const m = (v ?? {}) as Partial<Modifiers>;
  return {
    useLiveWeather: m.useLiveWeather !== false,
    override: OVERRIDES.includes(m.override as WeatherOverride) ? m.override : undefined,
    sceneDescription: str(m.sceneDescription, 240)?.trim() || undefined,
    era: str(m.era, 40)?.trim() || undefined,
  };
}

export function parseViewpoint(v: unknown): Viewpoint | undefined {
  const p = v as Partial<Viewpoint> | null;
  const lat = num(p?.lat);
  const lng = num(p?.lng);
  const heading = num(p?.heading);
  return lat !== null && lng !== null && heading !== null ? { lat, lng, heading } : undefined;
}
