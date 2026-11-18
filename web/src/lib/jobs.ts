import "server-only";
import type { FilmJob, PhotoJob, PublicFilmJob, PublicPhotoJob } from "./types";

/**
 * In-memory job store on globalThis (survives dev hot reloads).
 * Jobs expire after 2 hours so memory doesn't grow without bound.
 */
const TTL_MS = 2 * 60 * 60 * 1000;

interface Store {
  photo: Map<string, PhotoJob>;
  film: Map<string, FilmJob>;
}

const g = globalThis as unknown as { __onlocationJobs?: Store };
const store: Store = (g.__onlocationJobs ??= { photo: new Map(), film: new Map() });

function evict() {
  const cutoff = Date.now() - TTL_MS;
  for (const [k, j] of store.photo) if (j.createdAt < cutoff) store.photo.delete(k);
  for (const [k, j] of store.film) if (j.createdAt < cutoff) store.film.delete(k);
}

export function savePhoto(job: PhotoJob) {
  evict();
  store.photo.set(job.id, { ...job });
}
export function getPhoto(id: string) {
  return store.photo.get(id);
}
export function saveFilm(job: FilmJob) {
  evict();
  store.film.set(job.jobId, { ...job });
}
export function getFilm(id: string) {
  return store.film.get(id);
}

/** Strip selfies + inputs from status payloads (privacy + bandwidth). */
export function publicPhoto(job: PhotoJob): PublicPhotoJob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { input, ...rest } = job;
  return rest;
}
export function publicFilm(job: FilmJob): PublicFilmJob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { input, ...rest } = job;
  return rest;
}
