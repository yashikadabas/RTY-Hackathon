"use client";

import { proxied } from "@/lib/client-api";
import type { FilmStage, PublicFilmJob } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { stage: FilmStage; label: string; active: string }[] = [
  { stage: "planning", label: "Planning", active: "Scouting the street and blocking the shots…" },
  { stage: "stills", label: "Framing", active: "Lighting each frame for the real weather…" },
  { stage: "clips", label: "Filming", active: "Rolling camera…" },
  { stage: "voice", label: "Voiceover", active: "Recording the narration…" },
  { stage: "stitching", label: "Cutting", active: "In the editing bay…" },
];
const ORDER: FilmStage[] = ["queued", "planning", "stills", "clips", "voice", "stitching", "done"];

export function FilmProgressTracker({ job }: { job: PublicFilmJob | null }) {
  const stage = job?.stage ?? "queued";
  const idx = ORDER.indexOf(stage);
  const current = STEPS.find((s) => s.stage === stage);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]" aria-live="polite">
      <ol className="space-y-1">
        {STEPS.map((s) => {
          const i = ORDER.indexOf(s.stage);
          const state = idx > i ? "done" : idx === i ? "active" : "todo";
          return (
            <li
              key={s.stage}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                state === "active" && "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 flex-none place-items-center rounded-full border font-mono text-xs",
                  state === "done" && "border-accent bg-accent text-accent-fg",
                  state === "active" && "border-accent text-accent",
                  state === "todo" && "border-border text-faint",
                )}
              >
                {state === "done" ? "✓" : state === "active" ? <span className="spin inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent" /> : i}
              </span>
              <span className={cn("text-sm", state === "todo" ? "text-faint" : "text-foreground")}>
                {s.label}
                {s.stage === "clips" && job?.progress.clipsTotal ? (
                  <span className="text-muted"> {job.progress.clipsDone}/{job.progress.clipsTotal}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <div>
        <h3 className="font-display text-3xl tracking-tightest">{current?.active ?? "Booking the crew…"}</h3>
        {job?.conditions && <p className="mt-1 text-sm text-muted">Shooting in {job.conditions.label}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: Math.max(job?.shots?.length ?? 4, 4) }).map((_, i) => {
            const shot = job?.shots?.[i];
            const still = shot && job?.stills?.find((s) => s.shotId === shot.shotId);
            return (
              <figure key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                {still ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxied(still.url)} alt={shot.shotId} className="aspect-video w-full object-cover fade-up" />
                ) : (
                  <div className="skeleton aspect-video w-full" />
                )}
                <figcaption className="px-2.5 py-2 text-[11px] uppercase tracking-wider text-faint">
                  {shot ? shot.shotId.replace(/_/g, " ") : `Shot ${i + 1}`}
                </figcaption>
              </figure>
            );
          })}
        </div>

        {job?.log?.length ? (
          <ul className="mt-6 space-y-1 font-mono text-xs text-faint">
            {job.log.slice(-6).map((l) => (
              <li key={l.at + l.msg} className="fade-up">
                › {l.msg}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
