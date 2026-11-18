"use client";

/** Minimal promise-based loader for the Google Maps JavaScript API. */
let loader: Promise<typeof google.maps> | null = null;

export const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!BROWSER_KEY) return Promise.reject(new Error("No browser key"));
  if (typeof window !== "undefined" && window.google?.maps?.StreetViewPanorama) {
    return Promise.resolve(window.google.maps);
  }
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.__onlocationGmapsReady = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&v=weekly&callback=__onlocationGmapsReady`;
    s.async = true;
    s.onerror = () => {
      loader = null; // allow retry
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  });
  return loader;
}
