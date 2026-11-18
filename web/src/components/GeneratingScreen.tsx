"use client";

import { useEffect, useRef, useState } from "react";
import { getPhotoStatus, poll, startPhotoJob } from "@/lib/client-api";
import { useApp } from "@/lib/store";
import type { PhotoStage, PublicPhotoJob } from "@/lib/types";

const STAGE_COPY: Record<PhotoStage, string> = {
  queued: "Booking the location…",
  grounding: "Scouting the real street from Street View…",
  generating: "Shooting three frames on location…",
  done: "Developing…",
  failed: "Something went wrong",
};

const QUIPS = [
  "Checking the light meter",
  "Asking locals to step out of frame",
  "Matching your face across every frame",
  "Reading the sky",
  "Choosing a 35mm lens",
  "Waiting for the cloud to pass",
];

export function GeneratingScreen() {
  const { userImages, place, modifiers, viewpoint, setPhotoJob, setStep, photoJob, anotherPlace } = useApp();
  const started = useRef(false);
  const [quip, setQuip] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (started.current || !place) return;
    started.current = true;
    let cancel = () => {};
    const fail = (e: Error) =>
      setPhotoJob({ id: "local", stage: "failed", candidates: [], createdAt: Date.now(), error: e.message });
    startPhotoJob({ userImages, place, modifiers, viewpoint: viewpoint ?? undefined })
      .then(({ id }) => {
        cancel = poll<PublicPhotoJob>(
          () => getPhotoStatus(id),
          (j) => j.stage === "done" || j.stage === "failed",
          (j) => {
            setPhotoJob(j);
            if (j.stage === "done") setStep("results");
          },
          fail,
        );
      })
      .catch(fail);
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setQuip((q) => (q + 1) % QUIPS.length);
      setElapsed((e) => e + 2.6);
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const stage = photoJob?.stage ?? "queued";

  if (stage === "failed") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center fade-up">
        <p className="eyebrow text-amber-300">Cut</p>
        <h2 className="font-display mt-3 text-4xl tracking-tightest">That take didn&apos;t land.</h2>
        <p className="mt-3 text-muted">{photoJob?.error ?? "Unknown error"}</p>
        <button className="btn btn-primary mt-8" onClick={anotherPlace}>
          Try another place
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-10 text-center" aria-live="polite">
      <div className="mx-auto h-10 w-10 spin rounded-full border-2 border-accent border-t-transparent" />
      <p className="eyebrow mt-6">{place?.placeName}</p>
      <h2 className="font-display mt-2 text-3xl tracking-tightest sm:text-4xl">{STAGE_COPY[stage]}</h2>
      <p className="mt-2 text-sm text-faint">
        {QUIPS[quip]}… · {Math.round(elapsed)}s
      </p>
      {photoJob?.grounding && (
        <p className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-surface p-4 text-left text-sm italic text-muted fade-up">
          <span className="eyebrow not-italic">What we see on the street · </span>
          {photoJob.grounding}
        </p>
      )}
      <div className="mt-10 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton aspect-[4/5] rounded-2xl" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}
