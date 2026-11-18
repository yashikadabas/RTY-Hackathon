"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import { SATELLITE_STYLE, SURPRISE_CITIES } from "@/lib/map-style";

/** Non-interactive-zoom satellite globe that spins and shows pulsing city pins. */
export default function HeroGlobe() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: SATELLITE_STYLE,
      center: [20, 20],
      zoom: 1.6,
      interactive: true,
      scrollZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoomRotate: false,
      keyboard: false,
      attributionControl: { compact: true },
    });
    SURPRISE_CITIES.slice(0, 8).forEach((c) => {
      const dot = document.createElement("div");
      dot.className = "onloc-pin";
      dot.style.transform = "scale(0.7)";
      new maplibregl.Marker({ element: dot }).setLngLat([c.lng, c.lat]).addTo(map);
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const spin = () => {
      if (!paused && !reduce) {
        const c = map.getCenter();
        map.setCenter([c.lng + 0.12, c.lat]);
      }
      raf = requestAnimationFrame(spin);
    };
    map.on("load", () => (raf = requestAnimationFrame(spin)));
    map.on("dragstart", () => {
      paused = true;
      clearTimeout(resumeTimer);
    });
    map.on("dragend", () => {
      resumeTimer = setTimeout(() => (paused = false), 1200);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      map.remove();
    };
  }, []);

  return <div ref={el} style={{ position: "absolute", inset: 0 }} aria-hidden />;
}
