"use client";

import { useEffect } from "react";
import { fetchPlace } from "@/lib/client-api";
import { useApp } from "@/lib/store";
import type { WeatherOverride } from "@/lib/types";
import { OVERRIDE_LABELS, resolveConditions } from "@/lib/weather";
import { StreetView } from "./StreetView";
import { WeatherChip } from "./WeatherChip";
import { BROWSER_KEY } from "@/lib/gmaps";

const ERAS = ["", "1920s", "1960s", "1980s", "2080 (near future)"];

export function PlacePanel() {
  const { pin, place, setPlace, placeLoading, setPlaceLoading, modifiers, setModifiers, setStep, viewpoint } =
    useApp();

  useEffect(() => {
    if (!pin) return;
    const ctrl = new AbortController();
    setPlaceLoading(true);
    fetchPlace(pin.lat, pin.lng, ctrl.signal)
      .then((p) => setPlace(p))
      .catch(() => {})
      .finally(() => !ctrl.signal.aborted && setPlaceLoading(false));
    return () => ctrl.abort();
  }, [pin, setPlace, setPlaceLoading]);

  if (!pin) {
    return (
      <div className="card flex h-full flex-col justify-center p-8">
        <p className="eyebrow">Location scout</p>
        <h3 className="font-display mt-3 text-3xl tracking-tightest">Where are we shooting?</h3>
        <p className="mt-3 text-muted">
          Drop a pin, search a city, or hit 🎲. We&apos;ll pull the real street and the weather there right now.
        </p>
      </div>
    );
  }

  const cond = place ? resolveConditions(place.weather, modifiers) : null;

  return (
    <div className="card flex h-full flex-col overflow-y-auto p-5 sm:p-6">
      {placeLoading || !place ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-9 w-2/3 rounded" />
          <div className="skeleton h-8 w-56 rounded-full" />
          <div className="skeleton aspect-[16/10] w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <p className="eyebrow">{place.country || "On location"}</p>
          <h3 className="font-display mt-2 text-3xl leading-tight tracking-tightest sm:text-4xl">{place.placeName}</h3>
          <p className="mt-1 font-mono text-xs text-faint">
            {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
            {viewpoint && ` · facing ${Math.round(viewpoint.heading)}°`}
          </p>

          {place.weather && (
            <div className="mt-4">
              <WeatherChip weather={place.weather} />
              <p className="mt-2 text-sm text-muted">
                It&apos;s {place.weather.description} in {place.placeName} right now, and it&apos;ll show up in your shots.
              </p>
            </div>
          )}

          <div className="mt-5">
            {BROWSER_KEY ? (
              <StreetView key={`${pin.lat},${pin.lng}`} lat={pin.lat} lng={pin.lng} />
            ) : place.streetViewImages.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {place.streetViewImages.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="Street View" className="h-28 w-28 flex-none rounded-xl object-cover" />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
                No Street View here. We&apos;ll still ground the scene from the location.
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={modifiers.useLiveWeather}
                onChange={(e) => setModifiers({ useLiveWeather: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Use live weather
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Weather override">
              {(Object.keys(OVERRIDE_LABELS) as WeatherOverride[]).map((o) => (
                <button
                  key={o}
                  className="chip"
                  data-active={modifiers.override === o}
                  aria-pressed={modifiers.override === o}
                  onClick={() => setModifiers({ override: modifiers.override === o ? undefined : o })}
                >
                  {OVERRIDE_LABELS[o]}
                </button>
              ))}
            </div>
            <textarea
              className="field min-h-[70px] resize-none"
              placeholder="Scene idea (optional): e.g. eating pastel de nata by the river"
              maxLength={240}
              value={modifiers.sceneDescription ?? ""}
              onChange={(e) => setModifiers({ sceneDescription: e.target.value })}
            />
            <label className="flex items-center justify-between gap-3 text-sm text-muted">
              Era restyle
              <select
                className="field !w-auto"
                value={modifiers.era ?? ""}
                onChange={(e) => setModifiers({ era: e.target.value || undefined })}
              >
                {ERAS.map((e) => (
                  <option key={e} value={e}>
                    {e || "Present day"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-auto pt-6">
            {cond && (
              <p className="mb-3 text-xs text-faint">
                Shooting in: <span className="text-muted">{cond.label}</span>
              </p>
            )}
            <button className="btn btn-primary w-full" onClick={() => setStep("generating")}>
              Shoot here →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
