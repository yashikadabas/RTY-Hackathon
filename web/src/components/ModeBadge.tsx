"use client";

import { useEffect, useState } from "react";

interface Health {
  demo: boolean;
  providers: Record<string, boolean>;
}

const LABELS: Record<string, string> = {
  openai: "GPT-4o",
  google: "Street View",
  streetViewInteractive: "Interactive SV",
  fal: "fal.ai",
  elevenlabs: "Voice",
};

export function ModeBadge() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setH)
      .catch(() => {});
  }, []);
  if (!h) return null;
  const tip = Object.entries(h.providers)
    .map(([k, v]) => `${v ? "✓" : "✕"} ${LABELS[k] ?? k}`)
    .join("\n");
  return (
    <span
      title={tip}
      className={
        h.demo
          ? "rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300"
          : "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300"
      }
    >
      {h.demo ? "Demo mode" : "Live"} · {Object.values(h.providers).filter(Boolean).length}/5 providers
    </span>
  );
}
