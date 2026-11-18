"use client";

import { useState } from "react";
import { proxied } from "@/lib/client-api";
import { useApp } from "@/lib/store";
import { cn, slugify } from "@/lib/utils";
import { resolveConditions } from "@/lib/weather";
import { PostcardComposer } from "./PostcardComposer";

export function ResultsGrid() {
  const { photoJob, place, modifiers, selectedCandidate, setSelectedCandidate, setShowFilm, anotherPlace } = useApp();
  const [postcard, setPostcard] = useState(false);
  if (!photoJob || !place) return null;
  const cands = photoJob.candidates;
  const chosen = cands[selectedCandidate] ?? cands[0];
  const cond = resolveConditions(place.weather, modifiers);
  const filename = `onlocation-${slugify(place.placeName)}.jpg`;

  return (
    <div className="fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{place.country || "On location"} · {cond.label}</p>
          <h2 className="font-display mt-2 text-4xl tracking-tightest sm:text-5xl">You, in {place.placeName}.</h2>
          <p className="mt-2 text-muted">Pick your favourite take. It sets the look for the film.</p>
        </div>
        {photoJob.demo && (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
            Demo mode · add FAL_KEY for real generations
          </span>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Choose a photo">
        {cands.map((src, i) => (
          <button
            key={src.slice(0, 80) + i}
            role="radio"
            aria-checked={i === selectedCandidate}
            onClick={() => setSelectedCandidate(i)}
            className={cn(
              "group relative aspect-[4/5] overflow-hidden rounded-2xl border transition-all",
              i === selectedCandidate
                ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-background"
                : "border-border opacity-80 hover:opacity-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxied(src)} alt={`Take ${i + 1}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            {i === selectedCandidate && (
              <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg">
                Selected
              </span>
            )}
          </button>
        ))}
      </div>

      {photoJob.grounding && (
        <details className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
          <summary className="cursor-pointer text-foreground">How we grounded this shot</summary>
          <p className="mt-3 italic">{photoJob.grounding}</p>
          {photoJob.prompt && <p className="mt-3 font-mono text-xs text-faint">{photoJob.prompt}</p>}
        </details>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={anotherPlace}>
          ← Another place
        </button>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-secondary" href={proxied(chosen, filename)} download={filename}>
            Download photo
          </a>
          <button className="btn btn-secondary" onClick={() => setPostcard(true)}>
            Postcard
          </button>
          <button className="btn btn-primary" onClick={() => setShowFilm(true)}>
            Make the cinematic film →
          </button>
        </div>
      </div>

      {postcard && (
        <PostcardComposer photo={chosen} place={place} weatherLine={cond.label} onClose={() => setPostcard(false)} />
      )}
    </div>
  );
}
