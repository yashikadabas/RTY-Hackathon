"use client";

import { useEffect, useRef, useState } from "react";
import { BROWSER_KEY, loadGoogleMaps } from "@/lib/gmaps";
import { useApp } from "@/lib/store";
import { bearing } from "@/lib/utils";

type Status = "loading" | "ready" | "none" | "nokey";

/**
 * Interactive Street View. As the user walks/looks around, the resolved
 * panorama position + heading is written to the store as the `viewpoint`,
 * which the generators use to ground exactly what the user is looking at.
 */
export function StreetView({ lat, lng }: { lat: number; lng: number }) {
  const el = useRef<HTMLDivElement>(null);
  const setViewpoint = useApp((s) => s.setViewpoint);
  const [status, setStatus] = useState<Status>(BROWSER_KEY ? "loading" : "nokey");

  useEffect(() => {
    if (!BROWSER_KEY) return;
    let cancelled = false;
    let raf = 0;
    const listeners: google.maps.MapsEventListener[] = [];

    loadGoogleMaps()
      .then(async (maps) => {
        if (cancelled || !el.current) return;
        const svc = new maps.StreetViewService();
        const res = await svc
          .getPanorama({
            location: { lat, lng },
            radius: 120,
            source: maps.StreetViewSource.OUTDOOR,
          })
          .catch(() => null);
        if (cancelled) return;
        const loc = res?.data.location?.latLng;
        if (!loc) {
          setStatus("none");
          return;
        }
        const start = { lat: loc.lat(), lng: loc.lng() };
        const heading = bearing(start, { lat, lng });
        const pano = new maps.StreetViewPanorama(el.current!, {
          pano: res!.data.location!.pano,
          pov: { heading, pitch: 4 },
          zoom: 0,
          addressControl: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          showRoadLabels: false,
        });
        setStatus("ready");
        setViewpoint({ ...start, heading });

        const report = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const p = pano.getPosition();
            const pov = pano.getPov();
            if (p) setViewpoint({ lat: p.lat(), lng: p.lng(), heading: (pov.heading + 360) % 360 });
          });
        };
        listeners.push(pano.addListener("position_changed", report));
        listeners.push(pano.addListener("pov_changed", report));
      })
      .catch(() => !cancelled && setStatus("nokey"));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      listeners.forEach((l) => l.remove());
    };
  }, [lat, lng, setViewpoint]);

  if (status === "nokey") return null;
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-surface-2">
      <div ref={el} className="absolute inset-0" />
      {status === "loading" && <div className="skeleton absolute inset-0" />}
      {status === "none" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted">
          No Street View here. We&apos;ll still ground the scene from the location.
        </div>
      )}
      {status === "ready" && (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/80">
          Drag to look around · your view is what we shoot
        </span>
      )}
    </div>
  );
}
