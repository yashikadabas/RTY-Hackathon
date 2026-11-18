"use client";

import { useEffect, useRef, useState } from "react";
import { getFilmStatus, poll, remixFilm, startFilm } from "@/lib/client-api";
import { useApp } from "@/lib/store";
import type { PublicFilmJob } from "@/lib/types";
import { FilmProgressTracker } from "./FilmProgressTracker";
import { VideoPlayer } from "./VideoPlayer";

export function FilmView() {
  const { userImages, place, modifiers, viewpoint, photoJob, selectedCandidate, filmJob, setFilmJob, setShowFilm, anotherPlace } =
    useApp();
  const started = useRef(false);
  const cancel = useRef<() => void>(() => {});
  const [remixing, setRemixing] = useState(false);

  const fail = (e: Error) =>
    setFilmJob({
      jobId: "local",
      createdAt: Date.now(),
      stage: "failed",
      progress: { clipsDone: 0, clipsTotal: 0 },
      log: [],
      error: e.message,
    });

  function follow(jobId: string, onDone?: () => void) {
    cancel.current();
    cancel.current = poll<PublicFilmJob>(
      () => getFilmStatus(jobId),
      (j) => (j.stage === "done" || j.stage === "failed") && !j.remixing,
      (j) => {
        setFilmJob(j);
        if ((j.stage === "done" || j.stage === "failed") && !j.remixing) onDone?.();
      },
      (e) => {
        fail(e);
        onDone?.();
      },
    );
  }

  useEffect(() => {
    if (started.current || !place) return;
    started.current = true;
    // Resume an existing film for this place if we already have one.
    if (filmJob && filmJob.jobId !== "local") {
      if (filmJob.stage !== "done" && filmJob.stage !== "failed") follow(filmJob.jobId);
      return () => cancel.current();
    }
    const seed = photoJob?.candidates[selectedCandidate];
    startFilm({ userImages, place, modifiers, viewpoint: viewpoint ?? undefined, seedImage: seed })
      .then(({ jobId }) => follow(jobId))
      .catch(fail);
    return () => cancel.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remix() {
    if (!filmJob || remixing) return;
    setRemixing(true);
    try {
      await remixFilm(filmJob.jobId);
      setFilmJob({ ...filmJob, stage: "voice", remixing: true, videoUrl: undefined, videoUrlVertical: undefined });
      follow(filmJob.jobId, () => setRemixing(false));
    } catch (e) {
      setRemixing(false);
      alert((e as Error).message);
    }
  }

  const done = filmJob?.stage === "done" && !filmJob.remixing;
  const failed = filmJob?.stage === "failed";

  return (
    <div className="fade-up">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The film · {place?.placeName}</p>
          <h2 className="font-display mt-2 text-4xl tracking-tightest sm:text-5xl">
            {done ? "That's a wrap." : failed ? "The shoot hit a snag." : "On set."}
          </h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setShowFilm(false)}>
            ← Photos
          </button>
          <button className="btn btn-ghost" onClick={anotherPlace}>
            Another place
          </button>
        </div>
      </div>

      {failed ? (
        <div className="card p-8 text-center">
          <p className="text-muted">{filmJob?.error}</p>
          <button className="btn btn-primary mt-6" onClick={anotherPlace}>
            Try another place
          </button>
        </div>
      ) : done && filmJob && place ? (
        <VideoPlayer job={filmJob} placeName={place.placeName} onRemix={remix} remixing={remixing} />
      ) : (
        <FilmProgressTracker job={filmJob} />
      )}
    </div>
  );
}
