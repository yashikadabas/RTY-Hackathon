"use client";

import type {
  Modifiers,
  PlaceResult,
  PublicFilmJob,
  PublicPhotoJob,
  Viewpoint,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export async function fetchPlace(lat: number, lng: number, signal?: AbortSignal) {
  return json<PlaceResult>(
    await fetch("/api/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
      signal,
    }),
  );
}

export async function startPhotoJob(input: {
  userImages: string[];
  place: PlaceResult;
  modifiers: Modifiers;
  viewpoint?: Viewpoint;
}) {
  return json<{ id: string }>(
    await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function getPhotoStatus(id: string) {
  return json<PublicPhotoJob>(await fetch(`/api/generate/status/${id}`, { cache: "no-store" }));
}

export async function startFilm(input: {
  userImages: string[];
  place: PlaceResult;
  modifiers: Modifiers;
  viewpoint?: Viewpoint;
  seedImage?: string;
}) {
  return json<{ jobId: string }>(
    await fetch("/api/film", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function remixFilm(jobId: string) {
  return json<{ jobId: string }>(
    await fetch("/api/film/remix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    }),
  );
}

export async function getFilmStatus(jobId: string) {
  return json<PublicFilmJob>(await fetch(`/api/film/status/${jobId}`, { cache: "no-store" }));
}

/**
 * Poll `fn` until `done(result)` is true. Tolerates transient network
 * errors (up to 5 in a row). Returns a cancel function.
 */
export function poll<T>(
  fn: () => Promise<T>,
  done: (r: T) => boolean,
  onTick: (r: T) => void,
  onError: (e: Error) => void,
  intervalMs = 1800,
  timeoutMs = 15 * 60_000,
) {
  let stopped = false;
  let failures = 0;
  const started = Date.now();
  const tick = async () => {
    if (stopped) return;
    try {
      const r = await fn();
      failures = 0;
      if (stopped) return;
      onTick(r);
      if (done(r)) return;
    } catch (e) {
      if (++failures >= 5) return onError(e as Error);
    }
    if (Date.now() - started > timeoutMs) return onError(new Error("Timed out waiting for the job"));
    setTimeout(tick, intervalMs);
  };
  void tick();
  return () => {
    stopped = true;
  };
}

/** Proxy fal media through our origin (canvas-safe, downloadable). */
export function proxied(url: string, filename?: string) {
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  const q = new URLSearchParams({ url });
  if (filename) q.set("filename", filename);
  return `/api/img?${q.toString()}`;
}
