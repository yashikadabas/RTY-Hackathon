import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { demoComposite, isDemo, toDataUrl } from "../demo";
import { tts } from "../elevenlabs";
import { generateIdentityImage, generateImage, hasFal, imageToVideo, toFalUrl, uploadBuffer } from "../fal";
import { groundingHeadings, proxiedStreetView, streetViewFrames } from "../google";
import { saveFilm } from "../jobs";
import {
  describeLocation,
  fallbackShots,
  FILM_LOOK,
  hasOpenAI,
  planShots,
  SAFETY_LINE,
  writeDialogue,
} from "../openai";
import type { Conditions, FilmJob, Script, Shot } from "../types";
import { mapLimit } from "../utils";
import { resolveConditions } from "../weather";
import { renderCard } from "./cards";
import { stitch, type Segment } from "./stitch";

const CONCURRENCY = 4;

function log(job: FilmJob, msg: string) {
  job.log.push({ at: Date.now(), msg });
  saveFilm(job);
}

function placeLabel(job: FilmJob) {
  const p = job.input.place;
  return [p.placeName, p.country].filter(Boolean).join(", ");
}

/** Narration used when there's no LLM: still references the conditions. */
function templateScript(place: string, c: Conditions): Script {
  const sky = c.spoken ? `It's ${c.spoken.split(",")[0]} here right now` : "The light here is doing something quiet";
  return {
    lines: [
      { text: `So this is ${place}.`, overShot: "establishing_drone" },
      { text: `${sky}, and I keep stopping just to look.`, overShot: "walking_tracking" },
      { text: "Every corner feels like it has a story it isn't telling.", overShot: "detail_cutaway" },
      { text: "I think I'll stay a little longer.", overShot: "hero_finale" },
    ],
    musicMood: /rain|fog|snow|night/.test(c.spoken) ? "moody" : "mellow",
  };
}

function stillPrompt(shot: Shot, c: Conditions, era?: string) {
  const period = era ? `Set in the ${era}: period-accurate clothing, vehicles and signage` : "";
  return [shot.imagePrompt, c.weatherFragment, c.timeFragment, period, FILM_LOOK, SAFETY_LINE].filter(Boolean).join(". ");
}

// ------------------------------------------------------------- stitching

async function storeVideo(job: FilmJob, buf: Buffer, aspect: "wide" | "vertical"): Promise<string> {
  if (hasFal() && !isDemo()) {
    try {
      return await uploadBuffer(buf, "video/mp4");
    } catch {
      /* fall back to local */
    }
  }
  const dir = path.join(os.tmpdir(), "onlocation-films");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${job.jobId}-${aspect}.mp4`), buf);
  return `/api/film/video/${job.jobId}/${aspect}?v=${Date.now()}`;
}

function segmentsFor(job: FilmJob, w: number, h: number) {
  return async (): Promise<Segment[]> => {
    const title = job.input.place.placeName;
    const subtitle = job.conditions?.label ?? "Shot on location";
    const [titleCard, endCard] = await Promise.all([
      renderCard({ title, subtitle, width: w, height: h }),
      renderCard({ title: "Onlocation", subtitle: "shot with Onlocation", width: w, height: h }),
    ]);
    const shots: Segment[] = (job.clips ?? []).map((c, i) =>
      c.animated
        ? { kind: "video", url: c.url, durationSec: c.durationSec }
        : { kind: "still", url: c.url, durationSec: c.durationSec, move: i },
    );
    return [{ kind: "card", png: titleCard }, ...shots, { kind: "card", png: endCard }];
  };
}

async function stitchAndUpload(job: FilmJob, narration: Buffer | null) {
  const mood = job.script?.musicMood ?? "mellow";
  const musicPath = path.join(process.cwd(), "public", "audio", `${mood}.mp3`);
  const grade = process.env.FILM_GRADE !== "0";

  log(job, "Cutting the 16:9 master");
  const wide = await stitch({
    segments: await segmentsFor(job, 1280, 720)(),
    width: 1280,
    height: 720,
    musicPath,
    narration,
    grade,
  });
  job.videoUrl = await storeVideo(job, wide, "wide");
  saveFilm(job);

  // Vertical is best-effort: landscape is already delivered.
  try {
    log(job, "Reframing for vertical (9:16)");
    const vertical = await stitch({
      segments: await segmentsFor(job, 720, 1280)(),
      width: 720,
      height: 1280,
      musicPath,
      narration,
      grade,
    });
    job.videoUrlVertical = await storeVideo(job, vertical, "vertical");
  } catch {
    log(job, "Vertical cut skipped");
  }
  saveFilm(job);
}

function playlistFallback(job: FilmJob, reason: string) {
  job.clipPlaylist = (job.clips ?? []).filter((c) => c.animated).map((c) => c.url);
  if (!job.clipPlaylist.length) job.clipPlaylist = (job.clips ?? []).map((c) => c.url);
  job.error = reason;
  job.stage = "done";
  saveFilm(job);
}

// -------------------------------------------------------------- pipeline

export async function processFilmJob(job: FilmJob) {
  const { place, modifiers, viewpoint, userImages, seedImage } = job.input;
  const label = placeLabel(job);
  const demo = isDemo();
  job.demo = demo;
  // One source of truth for weather/time: overrides apply to the film too.
  const conditions = resolveConditions(place.weather, modifiers);
  job.conditions = conditions;

  try {
    // ---- planning
    job.stage = "planning";
    log(job, `Conditions: ${conditions.label}`);
    const at = viewpoint ?? { lat: place.lat, lng: place.lng };
    const headings = groundingHeadings(viewpoint?.heading);
    const frames = await streetViewFrames(at.lat, at.lng, headings);
    if (frames.length) job.groundingFrames = headings.map((h) => proxiedStreetView(at.lat, at.lng, (h + 360) % 360));
    log(job, frames.length ? `Pulled ${frames.length} Street View frames at your viewpoint` : "No Street View; grounding from the place name");
    if (frames.length && hasOpenAI()) {
      job.grounding = await describeLocation(label, frames).catch(() => "");
    }
    job.grounding ||= `${label} — a real-world location.`;
    saveFilm(job);

    if (hasOpenAI()) {
      const planned = await planShots({
        place: label,
        grounding: job.grounding,
        conditions,
        tempC: place.weather?.tempC,
        localTime: place.weather?.localTime,
        sceneIdea: modifiers.sceneDescription,
        era: modifiers.era,
      });
      job.shots = planned.shots;
      if (planned.fallback) log(job, "Shot planner fell back to the house template");
    } else {
      job.shots = fallbackShots(label, job.grounding, conditions);
    }
    job.progress = { clipsDone: 0, clipsTotal: job.shots.length };
    log(job, `Shot list: ${job.shots.map((s) => s.shotId.replace(/_/g, " ")).join(" → ")}`);

    // Narration is written in parallel with the visuals.
    const shots = job.shots;
    const scriptPromise: Promise<Script> = hasOpenAI()
      ? writeDialogue({
          place: label,
          conditions,
          localTime: place.weather?.localTime,
          shots,
          sceneIdea: modifiers.sceneDescription,
        }).then((s) => (s.lines.length ? s : templateScript(place.placeName, conditions)))
      : Promise.resolve(templateScript(place.placeName, conditions));

    // ---- stills
    job.stage = "stills";
    saveFilm(job);
    let stills: { shotId: string; url: string }[];
    if (demo) {
      stills = await Promise.all(
        shots.map(async (s, i) => ({
          shotId: s.shotId,
          url: toDataUrl(
            await demoComposite({
              background: frames[i % Math.max(frames.length, 1)],
              selfie: s.shotId === "detail_cutaway" ? undefined : seedImage ?? userImages[i % userImages.length],
              title: place.placeName,
              subtitle: s.shotId.replace(/_/g, " "),
              width: 1280,
              height: 720,
              variant: i,
            }),
          ),
        })),
      );
    } else {
      const refs = await Promise.all([seedImage, ...userImages].filter((x): x is string => Boolean(x)).slice(0, 5).map(toFalUrl));
      const results = await mapLimit(shots, CONCURRENCY, async (s) => {
        const prompt = stillPrompt(s, conditions, modifiers.era);
        const url =
          s.shotId === "detail_cutaway"
            ? await generateImage(prompt, "16:9")
            : (await generateIdentityImage({ prompt, refs, numImages: 1, aspect: "16:9" }))[0];
        if (!url) throw new Error("no still");
        return { shotId: s.shotId, url };
      });
      stills = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    }
    job.stills = stills;
    log(job, `Framed ${stills.length}/${shots.length} stills`);
    if (stills.length < 2) throw new Error("Couldn't frame enough shots. Try another place or fewer constraints.");

    // ---- clips
    job.stage = "clips";
    job.progress = { clipsDone: 0, clipsTotal: stills.length };
    saveFilm(job);
    const byId = new Map(shots.map((s) => [s.shotId as string, s]));
    if (demo) {
      job.clips = stills.map((st) => ({ shotId: st.shotId, url: st.url, durationSec: byId.get(st.shotId)?.durationSec ?? 4, animated: false }));
      job.progress.clipsDone = stills.length;
      log(job, "Demo mode: animating stills with camera moves");
    } else {
      const results = await mapLimit(stills, CONCURRENCY, async (st) => {
        const shot = byId.get(st.shotId)!;
        try {
          const url = await imageToVideo(st.url, shot.motionPrompt, shot.durationSec);
          return { shotId: st.shotId, url, durationSec: shot.durationSec, animated: true };
        } catch {
          // Never drop a shot: fall back to a Ken Burns move on its still.
          log(job, `Clip for ${st.shotId.replace(/_/g, " ")} failed; using a camera move on the still`);
          return { shotId: st.shotId, url: st.url, durationSec: shot.durationSec, animated: false };
        } finally {
          job.progress.clipsDone++;
          saveFilm(job);
        }
      });
      job.clips = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    }
    saveFilm(job);

    // ---- voice
    job.stage = "voice";
    saveFilm(job);
    job.script = await scriptPromise;
    const narration = await tts(job.script.lines.map((l) => l.text).join(" "));
    log(job, narration ? "Recorded narration" : "No narration voice available; music-only cut");

    // ---- stitching
    job.stage = "stitching";
    saveFilm(job);
    try {
      await stitchAndUpload(job, narration);
      job.stage = "done";
      log(job, "That's a wrap");
    } catch (e) {
      console.error("[film] stitch failed", e);
      playlistFallback(job, "Stitching unavailable — returning raw clips.");
    }
    saveFilm(job);
  } catch (e) {
    console.error("[film] pipeline failed", e);
    if ((job.clips?.length ?? 0) >= 2) {
      playlistFallback(job, e instanceof Error ? e.message : "Film pipeline error");
    } else {
      job.stage = "failed";
      job.error = e instanceof Error ? e.message : "Film generation failed";
      saveFilm(job);
    }
  }
}

/** New narration + re-cut on the existing clips (no new visuals). */
export async function remixFilmJob(job: FilmJob) {
  const conditions = job.conditions ?? resolveConditions(job.input.place.weather, job.input.modifiers);
  try {
    job.stage = "voice";
    job.videoUrl = undefined;
    job.videoUrlVertical = undefined;
    job.clipPlaylist = undefined;
    job.error = undefined;
    log(job, "Remixing narration");
    job.script = hasOpenAI()
      ? await writeDialogue({
          place: placeLabel(job),
          conditions,
          localTime: job.input.place.weather?.localTime,
          shots: job.shots ?? [],
          sceneIdea: job.input.modifiers.sceneDescription,
        })
      : templateScript(job.input.place.placeName, conditions);
    if (!job.script.lines.length) job.script = templateScript(job.input.place.placeName, conditions);
    const narration = await tts(job.script.lines.map((l) => l.text).join(" "));
    job.stage = "stitching";
    saveFilm(job);
    await stitchAndUpload(job, narration);
    job.stage = "done";
    log(job, "Remix ready");
  } catch {
    playlistFallback(job, "Remix stitching failed — returning raw clips.");
  } finally {
    job.remixing = false;
    saveFilm(job);
  }
}
