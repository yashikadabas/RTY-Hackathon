"use client";

import { maplibregl } from "@/lib/maplibre";
import { useEffect, useRef, useState } from "react";
import { SATELLITE_STYLE, SURPRISE_CITIES } from "@/lib/map-style";
import { useApp } from "@/lib/store";

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function GlobeMap() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const { pin, setPin } = useApp();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Init once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: SATELLITE_STYLE,
      center: pin ? [pin.lng, pin.lat] : [10, 25],
      zoom: pin ? 5 : 1.4,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("click", (e) => setPin({ lat: round6(e.lngLat.lat), lng: round6(e.lngLat.lng) }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin → marker + fly.
  useEffect(() => {
    const m = map.current;
    if (!m || !pin) return;
    if (!marker.current) {
      const dot = document.createElement("div");
      dot.className = "onloc-pin";
      marker.current = new maplibregl.Marker({ element: dot });
    }
    marker.current.setLngLat([pin.lng, pin.lat]).addTo(m);
    m.flyTo({ center: [pin.lng, pin.lat], zoom: Math.max(m.getZoom(), 4.5), speed: 1.4, essential: true });
  }, [pin]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (!data.length) setSearchError("No match. Try a city name.");
      else setPin({ lat: round6(Number(data[0].lat)), lng: round6(Number(data[0].lon)) });
    } catch {
      setSearchError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function surprise() {
    const c = SURPRISE_CITIES[Math.floor(Math.random() * SURPRISE_CITIES.length)];
    setQuery(c.name);
    setPin({ lat: c.lat, lng: c.lng });
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-black">
      <div ref={el} className="absolute inset-0" />
      <form onSubmit={search} className="panel elevated absolute left-3 right-3 top-3 flex gap-2 p-2 sm:right-auto sm:w-[420px]">
        <input
          className="field !rounded-full !border-transparent !bg-transparent"
          placeholder="Search a city or landmark…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search places"
        />
        <button className="btn btn-secondary !px-4" disabled={searching}>
          {searching ? "…" : "Go"}
        </button>
        <button type="button" className="btn btn-ghost !px-3" onClick={surprise} title="Surprise me">
          🎲
        </button>
      </form>
      {searchError && (
        <p className="absolute left-5 top-[4.5rem] rounded-full bg-black/70 px-3 py-1 text-xs text-amber-300">{searchError}</p>
      )}
      {!pin && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="rounded-full bg-black/70 px-4 py-2 text-sm text-white/85 backdrop-blur">
            Step 2 of 2 · Click anywhere on Earth to drop a pin
          </span>
        </div>
      )}
    </div>
  );
}
