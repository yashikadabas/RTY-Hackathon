"use client";

import type { Conditions } from "@/lib/types";

/**
 * "What the director saw": the actual Street View frames at the user's
 * viewpoint and the vision model's read of them. This is the evidence that
 * the output is grounded in the real street, not a generic idea of the city.
 */
export function GroundingCard({
  frames,
  grounding,
  conditions,
  prompt,
  open = false,
}: {
  frames?: string[];
  grounding?: string;
  conditions?: Conditions | null;
  prompt?: string;
  open?: boolean;
}) {
  if (!frames?.length && !grounding && !conditions) return null;
  return (
    <details open={open} className="group rounded-2xl border border-border bg-surface p-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between text-foreground">
        <span>
          <span className="eyebrow">Grounding</span>
          <span className="ml-2">What the director saw on the real street</span>
        </span>
        <span className="text-faint transition-transform group-open:rotate-180">⌄</span>
      </summary>
      {frames?.length ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {frames.map((src, i) => (
            <figure key={src} className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Street View frame ${i + 1}`} className="aspect-square w-full object-cover" />
              <figcaption className="bg-surface-2 px-2 py-1 font-mono text-[10px] text-faint">
                {i === 0 ? "your view" : i === 1 ? "+60°" : "−60°"}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-muted">No Street View coverage here, so we grounded from the place name and live conditions.</p>
      )}
      {grounding && <p className="mt-4 italic leading-relaxed text-muted">“{grounding}”</p>}
      {conditions && conditions.source !== "none" && (
        <p className="mt-3 text-xs text-faint">
          Conditions injected into every shot ({conditions.source === "live" ? "live" : "your override"}):{" "}
          <span className="text-muted">
            {[conditions.weatherFragment, conditions.timeFragment].filter(Boolean).join(" · ")}
          </span>
        </p>
      )}
      {prompt && <p className="mt-3 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-faint">{prompt}</p>}
    </details>
  );
}
