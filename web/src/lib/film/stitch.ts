import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const FPS = 24;
export const XFADE = 0.5;
export const CARD_SEC = 2;

let ffmpegPath: string | null = null;
export function ffmpegBin(): string {
  if (ffmpegPath) return ffmpegPath;
  try {
    const p = createRequire(import.meta.url)("@ffmpeg-installer/ffmpeg").path as string;
    if (p && existsSync(p)) return (ffmpegPath = p);
  } catch {
    /* fall through */
  }
  return (ffmpegPath = "ffmpeg");
}

async function ff(args: string[]) {
  await run(ffmpegBin(), ["-y", "-hide_banner", "-loglevel", "error", ...args], {
    maxBuffer: 16 * 1024 * 1024,
    timeout: 240_000,
  });
}

/** A source for one segment of the montage. */
export type Segment =
  | { kind: "card"; png: Buffer }
  | { kind: "video"; url: string; durationSec: number }
  // A still animated with a slow Ken Burns move (demo mode / clip fallback).
  | { kind: "still"; url: string; durationSec: number; move: number };

export interface StitchInput {
  segments: Segment[];
  width: number;
  height: number;
  musicPath: string;
  narration: Buffer | null;
  grade: boolean;
}

async function fetchTo(url: string, file: string) {
  if (url.startsWith("data:")) {
    const m = /^data:[^;]+;base64,(.*)$/.exec(url);
    if (!m) throw new Error("bad data url");
    await writeFile(file, Buffer.from(m[1], "base64"));
    return;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

export function segDuration(s: Segment) {
  return s.kind === "card" ? CARD_SEC : s.durationSec;
}

/** Total montage length: Σ segments − crossfade overlap. */
export function totalDuration(segments: Segment[]) {
  const sum = segments.reduce((a, s) => a + segDuration(s), 0);
  return sum - XFADE * (segments.length - 1);
}

/** Pure: the filter that normalises any source to W×H@24fps. */
export function normalizeFilter(w: number, h: number) {
  return `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=${FPS},format=yuv420p`;
}

/** Pure: Ken Burns zoompan for a still (4 move variants). */
export function kenBurnsFilter(w: number, h: number, dur: number, move: number) {
  const frames = Math.round(dur * FPS);
  const z = move % 2 === 0 ? `'min(1+0.12*on/${frames},1.12)'` : `'max(1.12-0.12*on/${frames},1)'`;
  const x = ["'iw/2-(iw/zoom/2)'", "'(iw-iw/zoom)*on/" + frames + "'", "'iw/2-(iw/zoom/2)'", "'(iw-iw/zoom)*(1-on/" + frames + ")'"][move % 4];
  return `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z=${z}:x=${x}:y='ih/2-(ih/zoom/2)':d=${frames}:s=${w}x${h}:fps=${FPS},setsar=1,format=yuv420p`;
}

/** Pure: chained xfade graph over n normalised inputs + optional film grade. */
export function montageFilter(durations: number[], grade: boolean) {
  const parts: string[] = [];
  let acc = durations[0];
  let prev = "[0:v]";
  for (let i = 1; i < durations.length; i++) {
    const out = i === durations.length - 1 ? "[mv]" : `[x${i}]`;
    parts.push(`${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${(acc - XFADE).toFixed(3)}${out}`);
    acc += durations[i] - XFADE;
    prev = out;
  }
  if (durations.length === 1) parts.push("[0:v]null[mv]");
  const look = grade
    ? "eq=contrast=1.06:saturation=1.1:gamma=0.98,curves=r='0/0.02 0.5/0.52 1/1':b='0/0.06 0.5/0.48 1/0.94',vignette=PI/5,noise=alls=6:allf=t+u,format=yuv420p"
    : "format=yuv420p";
  parts.push(`[mv]${look}[v]`);
  return parts.join(";");
}

/** Pure: music bed ducked under narration, with fades. */
export function audioFilter(total: number, hasNarration: boolean, narrationDelayMs: number) {
  const fadeOut = Math.max(0, total - 1.5).toFixed(2);
  if (!hasNarration) {
    return `[1:a]atrim=0:${total.toFixed(2)},volume=0.6,afade=t=in:d=1,afade=t=out:st=${fadeOut}:d=1.5[a]`;
  }
  return [
    `[1:a]atrim=0:${total.toFixed(2)},volume=0.22,afade=t=in:d=1,afade=t=out:st=${fadeOut}:d=1.5[m]`,
    `[2:a]adelay=${narrationDelayMs}|${narrationDelayMs},volume=1.0,apad[n]`,
    `[m][n]amix=inputs=2:normalize=0:duration=first[a]`,
  ].join(";");
}

/** Build the finished film. Always cleans up its temp dir. */
export async function stitch(input: StitchInput): Promise<Buffer> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "onloc-"));
  const { width: W, height: H } = input;
  try {
    // 1. Normalise each segment to an intermediate clip of exact length.
    const segFiles: string[] = [];
    const durations: number[] = [];
    for (let i = 0; i < input.segments.length; i++) {
      const s = input.segments[i];
      const out = path.join(dir, `seg${i}.mp4`);
      const dur = segDuration(s);
      const enc = ["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), "-t", String(dur), out];
      if (s.kind === "card") {
        const png = path.join(dir, `card${i}.png`);
        await writeFile(png, s.png);
        await ff(["-loop", "1", "-i", png, "-vf", normalizeFilter(W, H), ...enc]);
      } else if (s.kind === "video") {
        const src = path.join(dir, `src${i}.mp4`);
        await fetchTo(s.url, src);
        // tpad holds the last frame if the clip is shorter than planned.
        await ff(["-i", src, "-vf", `${normalizeFilter(W, H)},tpad=stop_mode=clone:stop_duration=3`, ...enc]);
      } else {
        const src = path.join(dir, `src${i}.img`);
        await fetchTo(s.url, src);
        await ff(["-i", src, "-vf", kenBurnsFilter(W, H, dur, s.move), ...enc]);
      }
      segFiles.push(out);
      durations.push(dur);
    }

    // 2. Crossfade montage + grade.
    const total = totalDuration(input.segments);
    const montage = path.join(dir, "montage.mp4");
    await ff([
      ...segFiles.flatMap((f) => ["-i", f]),
      "-filter_complex", montageFilter(durations, input.grade),
      "-map", "[v]",
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      montage,
    ]);

    // 3. Audio: looped music bed (+ narration, ducked).
    const final = path.join(dir, "final.mp4");
    const args = ["-i", montage, "-stream_loop", "-1", "-i", input.musicPath];
    if (input.narration) {
      const narr = path.join(dir, "narration.mp3");
      await writeFile(narr, input.narration);
      args.push("-i", narr);
    }
    // Narration starts just as the title card fades into the first shot.
    const delayMs = Math.round((CARD_SEC - XFADE) * 1000);
    await ff([
      ...args,
      "-filter_complex", audioFilter(total, Boolean(input.narration), delayMs),
      "-map", "0:v", "-map", "[a]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
      "-t", total.toFixed(2),
      "-movflags", "+faststart",
      final,
    ]);
    return await readFile(final);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
