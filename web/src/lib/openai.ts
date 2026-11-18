import "server-only";
import OpenAI from "openai";
import type { Conditions, Script, Shot, ShotId, WeatherMood } from "./types";

/**
 * LLM provider. OpenAI (GPT-4o) when OPENAI_API_KEY is set; otherwise the
 * free Google Gemini API through its OpenAI-compatible endpoint, so the same
 * Chat Completions calls (vision, JSON mode) work unchanged.
 */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
type Provider = "openai" | "gemini";

export function llmProvider(): Provider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}
/** True when any LLM (OpenAI or Gemini) is configured. */
export function hasOpenAI() {
  return llmProvider() !== null;
}

let client: OpenAI | null = null;
let candidates: string[] | null = null;

const version = (id: string) => parseFloat(id.split("-")[1] ?? "0");

/**
 * Order Gemini models for reliability + speed: newest "flash-lite" first
 * (fast, rarely overloaded), then newest "flash". Pure, unit-tested.
 */
export function rankGeminiModels(ids: string[]): string[] {
  const clean = ids.map((id) => id.replace(/^models\//, ""));
  const lite = clean.filter((id) => /^gemini-\d+(\.\d+)?-flash-lite$/.test(id)).sort((a, b) => version(b) - version(a));
  const flash = clean.filter((id) => /^gemini-\d+(\.\d+)?-flash$/.test(id)).sort((a, b) => version(b) - version(a));
  return [...lite, ...flash];
}
/** Back-compat helper: best single model. */
export function pickGeminiModel(ids: string[]): string | null {
  return rankGeminiModels(ids).find((m) => !m.endsWith("-lite")) ?? null;
}

async function setup(): Promise<{ c: OpenAI; models: string[] }> {
  const provider = llmProvider();
  if (!provider) throw new Error("No LLM key (OPENAI_API_KEY or GEMINI_API_KEY)");
  client ??=
    provider === "openai"
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 })
      : new OpenAI({ apiKey: process.env.GEMINI_API_KEY, baseURL: GEMINI_BASE, timeout: 30_000, maxRetries: 0 });
  if (!candidates) {
    if (provider === "openai") candidates = [process.env.OPENAI_MODEL || "gpt-4o"];
    else {
      let ranked: string[] = [];
      try {
        const ids: string[] = [];
        for await (const m of client.models.list()) ids.push(m.id);
        ranked = rankGeminiModels(ids);
      } catch {
        /* use defaults */
      }
      const pinned = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
      candidates = [...new Set([...pinned, ...ranked, "gemini-3.5-flash-lite", "gemini-3.5-flash"])];
    }
  }
  return { c: client, models: candidates };
}

type ChatParams = Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">;

/**
 * One chat completion with model failover: on overload (503), rate limit
 * (429), retired model (404) or timeout, try the next candidate. The model
 * that works moves to the front for the next call.
 */
async function chat(params: ChatParams) {
  const { c, models } = await setup();
  let lastErr: unknown;
  for (const model of [...models]) {
    // o-series / gpt-5 reject custom temperatures.
    const p = /^(o\d|gpt-5)/.test(model) ? { ...params, temperature: undefined } : params;
    try {
      const res = await c.chat.completions.create({ ...p, model });
      if (candidates && candidates[0] !== model) candidates = [model, ...candidates.filter((m) => m !== model)];
      return res;
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number }).status;
      const retryable = status === undefined || [404, 408, 429, 500, 502, 503, 504].includes(status);
      if (!retryable) throw e;
      console.warn(`[llm] ${model} failed (${status ?? "timeout"}), trying next model`);
    }
  }
  throw lastErr;
}

export const FILM_LOOK =
  "Shot on a cinema camera, 35mm lens, shallow depth of field, natural film grain, cinematic color grade with soft teal shadows and warm highlights, true-to-life skin texture and detail, realistic natural lighting, high dynamic range, sharp focus on the subject.";
export const SAFETY_LINE =
  "Photorealistic but clearly a stylized travel film. No text, no watermarks, no distorted anatomy.";

export const SHOT_IDS: ShotId[] = [
  "establishing_drone",
  "walking_tracking",
  "portrait_moment",
  "detail_cutaway",
  "hero_finale",
];
const MOODS: WeatherMood[] = ["epic", "mellow", "upbeat", "moody"];

// ---------------------------------------------------------------- prompts

const GROUNDING_SYSTEM = `You are a location analyst for a film production. You will be shown 1–3 street-level photographs of a real place. Write a single dense paragraph (60–90 words) describing the visual environment for an image-generation prompt: architectural style and materials, color palette, terrain, vegetation, street furniture, signage style, notable landmarks visible, and overall atmosphere. Do NOT mention people, vehicles' license plates, readable text content, or the fact these are photographs. Do not speculate beyond what is visible. Output only the paragraph, no preamble.`;

const PLANNER_SYSTEM = `You are a film director planning a 15–25 second cinematic travel montage starring one person at a real location. You will receive: the location name, a visual description of the environment, the CURRENT weather and local time there, and an optional scene idea from the person.

Plan exactly 4 shots using ONLY these shot types: establishing_drone, walking_tracking, portrait_moment, detail_cutaway, hero_finale. Rules:
- Shot 1 must be establishing_drone. Final shot must be hero_finale.
- Exactly one detail_cutaway (a texture/object/food detail authentic to this specific place — be concrete, e.g. "azulejo tiles" not "local details").
- Every shot must visibly reflect the given weather and time of day.
- The person must appear in all shots except detail_cutaway.

For each shot output:
- imagePrompt: 40–70 words. Photorealistic. Describe the person's placement, framing (wide/medium/close), the environment (use the provided description faithfully), lighting consistent with weather/time, lens feel (e.g. "35mm, shallow DOF"). Refer to the subject only as "the person in the reference image".
- motionPrompt: 15–30 words of pure camera/subject motion for an image-to-video model (e.g. "slow aerial push-in, rain streaking, person turns toward camera"). No new scene elements.
- durationSec: 4 or 5.

Output STRICT JSON only, no markdown fences:
{"shots":[{"shotId":"...","imagePrompt":"...","motionPrompt":"...","durationSec":4}]}`;

const DIALOGUE_SYSTEM = `You write short first-person voiceover monologues for personal travel films. You will receive: location, current weather and local time there, the shot list, and an optional scene idea.

Write 3–4 spoken lines, total 40–55 words, in a warm, understated, slightly awed voice — like someone talking to a friend, not a travel ad. Rules:
- Reference the ACTUAL current weather naturally in at least one line (e.g. "it's actually raining here right now — everything smells like stone and salt").
- No clichés ("hidden gem", "bucket list", "wanderlust", "breathtaking").
- Present tense. First person. No hashtags, no emoji.
- Assign each line to one shot from the list (overShot).
- Pick one music mood: epic | mellow | upbeat | moody (match weather + place).

Output STRICT JSON only:
{"lines":[{"text":"...","overShot":"establishing_drone"}],"musicMood":"mellow"}`;

const PHOTO_SYSTEM = `You compile a single photorealistic image-generation prompt (60–90 words) for placing a person into a real location. Inputs: location name, environment description, weather/time fragments, optional user scene idea, optional era modifier.
Rules: refer to the subject only as "the person in the reference image"; face must match reference; candid travel-photo framing; specify lighting from the weather fragment; include camera feel ("shot on mirrorless, 35mm, natural skin texture"); if an era is given, restyle clothing/vehicles/signage to that era. If the user's scene idea conflicts with physical reality of the place, adapt it plausibly rather than refusing. Output only the prompt text.`;

// ---------------------------------------------------------------- calls

/** 1. Describe the real environment from Street View frames. */
export async function describeLocation(place: string, frames: string[]): Promise<string> {
  const res = await chat({
    temperature: 0.3,
    messages: [
      { role: "system", content: GROUNDING_SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: `Location: ${place}` },
          ...frames.slice(0, 3).map((url) => ({
            type: "image_url" as const,
            image_url: { url, detail: "low" as const },
          })),
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

function conditionsText(c: Conditions, w: { tempC?: number; localTime?: string }) {
  if (c.source === "none") return "Weather: unspecified (assume pleasant clear daylight).";
  return `Weather right now: ${c.spoken || c.weatherFragment}${w.tempC !== undefined ? `, ${w.tempC}°C` : ""}. Visual: ${c.weatherFragment}. Time of day: ${c.timeFragment}${w.localTime ? ` (local time ${w.localTime})` : ""}.`;
}

/** Validate + repair a shot list so the grammar always holds. */
export function parseShots(raw: string): Shot[] | null {
  const strict = parseShotsStrict(raw);
  if (strict) return strict;
  // Last resort: trust the order the director gave (first = drone, last = hero).
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
  } catch {
    return null;
  }
  const arr = ((data as { shots?: unknown[] })?.shots ?? []).filter(
    (s): s is Record<string, unknown> => Boolean(s) && typeof (s as Record<string, unknown>).imagePrompt === "string",
  );
  if (arr.length < 3) return null;
  const pick = [arr[0], arr[1], arr.length > 3 ? arr[2] : null, arr[arr.length - 1]].filter(
    (s): s is Record<string, unknown> => Boolean(s),
  );
  const ids: ShotId[] =
    pick.length === 4
      ? ["establishing_drone", "walking_tracking", "detail_cutaway", "hero_finale"]
      : ["establishing_drone", "walking_tracking", "hero_finale"];
  return pick.map((s, i) => ({
    shotId: ids[i],
    imagePrompt: String(s.imagePrompt),
    motionPrompt: String(s.motionPrompt ?? "slow cinematic push-in"),
    durationSec: s.durationSec === 5 ? 5 : 4,
  }));
}

function parseShotsStrict(raw: string): Shot[] | null {
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
  } catch {
    return null;
  }
  const arr = (data as { shots?: unknown[] })?.shots;
  if (!Array.isArray(arr)) return null;
  // Smaller models sometimes number shots ("1") or put the type elsewhere:
  // recover it from other fields, the prompt text, or the position.
  const POSITIONAL: ShotId[] = ["establishing_drone", "walking_tracking", "detail_cutaway", "hero_finale"];
  const inferId = (s: Record<string, unknown>, i: number): ShotId | null => {
    for (const k of ["shotId", "shotType", "type", "shot"]) {
      const v = String(s[k] ?? "").toLowerCase().replace(/[\s-]+/g, "_");
      if (SHOT_IDS.includes(v as ShotId)) return v as ShotId;
    }
    const text = String(s.imagePrompt ?? "").toLowerCase().replace(/[\s-]+/g, "_");
    const hit = SHOT_IDS.find((id) => text.includes(id));
    if (hit) return hit;
    return arr.length === 4 ? POSITIONAL[i] : null;
  };
  const shots: Shot[] = arr
    .map((s, i) => ({ s: s as Partial<Shot> & Record<string, unknown>, i }))
    .filter(({ s }) => s && typeof s.imagePrompt === "string")
    .map(({ s, i }) => ({ s, id: inferId(s, i) }))
    .filter((x): x is { s: Partial<Shot> & Record<string, unknown>; id: ShotId } => x.id !== null)
    .map(({ s, id }) => ({
      shotId: id,
      imagePrompt: String(s.imagePrompt),
      motionPrompt: String(s.motionPrompt ?? "slow cinematic push-in"),
      durationSec: s.durationSec === 5 ? 5 : 4,
    }));
  if (shots.length < 3) return null;
  // Enforce grammar: drone first, hero last, at most one cutaway, max 4.
  const drone = shots.find((s) => s.shotId === "establishing_drone");
  const hero = [...shots].reverse().find((s) => s.shotId === "hero_finale");
  if (!drone || !hero) return null;
  const middle = shots.filter((s) => s !== drone && s !== hero && s.shotId !== "establishing_drone" && s.shotId !== "hero_finale");
  const cut = middle.find((s) => s.shotId === "detail_cutaway");
  const person = middle.find((s) => s.shotId !== "detail_cutaway");
  const mid = [person, cut].filter((s): s is Shot => Boolean(s));
  return [drone, ...mid, hero].slice(0, 4);
}

export function fallbackShots(place: string, grounding: string, c: Conditions): Shot[] {
  const env = `${grounding} ${c.weatherFragment}, ${c.timeFragment}`.trim();
  return [
    {
      shotId: "establishing_drone",
      imagePrompt: `Wide aerial drone view over ${place}, the person in the reference image small in frame on the street below. ${env}. 24mm, cinematic.`,
      motionPrompt: "slow aerial push-in descending toward the person, gentle parallax",
      durationSec: 5,
    },
    {
      shotId: "walking_tracking",
      imagePrompt: `Medium tracking shot of the person in the reference image walking through ${place}, looking around with quiet wonder. ${env}. 35mm, shallow DOF.`,
      motionPrompt: "steady tracking shot alongside the person walking, natural stride",
      durationSec: 4,
    },
    {
      shotId: "detail_cutaway",
      imagePrompt: `Close-up detail of a textured surface authentic to ${place}, ${c.weatherFragment || "soft natural light"}. Macro, 50mm, shallow DOF.`,
      motionPrompt: "slow lateral slide across the detail, subtle focus pull",
      durationSec: 4,
    },
    {
      shotId: "hero_finale",
      imagePrompt: `Hero portrait of the person in the reference image standing in ${place}, turning to camera with a soft smile. ${env}. 50mm, shallow DOF.`,
      motionPrompt: "slow push-in as the person turns toward camera and smiles",
      durationSec: 5,
    },
  ];
}

/** 2. Plan 4 cinematic shots (retry once, then fall back to a template). */
export async function planShots(input: {
  place: string;
  grounding: string;
  conditions: Conditions;
  tempC?: number;
  localTime?: string;
  sceneIdea?: string;
  era?: string;
}): Promise<{ shots: Shot[]; fallback: boolean }> {
  const user = [
    `Location: ${input.place}`,
    `Environment: ${input.grounding}`,
    conditionsText(input.conditions, input),
    input.sceneIdea ? `Scene idea from the person: ${input.sceneIdea}` : "",
    input.era ? `Era restyle: set every shot in the ${input.era} — period-accurate clothing, vehicles, signage and film stock.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await chat({
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PLANNER_SYSTEM },
          {
            role: "user",
            content: attempt ? `${user}\n\nReturn ONLY valid JSON matching the schema exactly. 4 shots.` : user,
          },
        ],
      });
      const shots = parseShots(res.choices[0]?.message?.content ?? "");
      if (shots) return { shots, fallback: false };
      console.warn("[llm] planner returned unusable JSON", res.choices[0]?.message?.content?.slice(0, 200));
    } catch (e) {
      console.error("[llm] planShots failed:", (e as Error).message);
    }
  }
  return { shots: fallbackShots(input.place, input.grounding, input.conditions), fallback: true };
}

/** 3. First-person narration referencing the actual weather. */
export async function writeDialogue(input: {
  place: string;
  conditions: Conditions;
  localTime?: string;
  shots: Shot[];
  sceneIdea?: string;
}): Promise<Script> {
  try {
    const res = await chat({
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DIALOGUE_SYSTEM },
        {
          role: "user",
          content: [
            `Location: ${input.place}`,
            conditionsText(input.conditions, input),
            `Shots: ${input.shots.map((s) => s.shotId).join(", ")}`,
            input.sceneIdea ? `Scene idea: ${input.sceneIdea}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    const d = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Partial<Script>;
    const lines = (d.lines ?? [])
      .filter((l) => l && typeof l.text === "string" && l.text.trim())
      .slice(0, 4)
      .map((l) => ({ text: l.text.trim(), overShot: String(l.overShot ?? "") }));
    const musicMood = MOODS.includes(d.musicMood as WeatherMood) ? (d.musicMood as WeatherMood) : "mellow";
    return { lines, musicMood };
  } catch (e) {
    console.error("[llm] writeDialogue failed:", (e as Error).message);
    return { lines: [], musicMood: "mellow" };
  }
}

/** 4. One photoreal prompt for the three candidate photos. */
export async function compilePhotoPrompt(input: {
  place: string;
  grounding: string;
  conditions: Conditions;
  sceneIdea?: string;
  era?: string;
}): Promise<string> {
  const user = [
    `Location: ${input.place}`,
    `Environment: ${input.grounding || "(no street-level imagery; infer plausibly from the location)"}`,
    `Weather fragment: ${input.conditions.weatherFragment || "natural daylight"}`,
    `Time fragment: ${input.conditions.timeFragment || "daylight"}`,
    input.sceneIdea ? `Scene idea: ${input.sceneIdea}` : "",
    input.era ? `Era: ${input.era}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const res = await chat({
      temperature: 0.5,
      messages: [
        { role: "system", content: PHOTO_SYSTEM },
        { role: "user", content: user },
      ],
    });
    const p = res.choices[0]?.message?.content?.trim();
    if (p) return `${p} ${FILM_LOOK} ${SAFETY_LINE}`;
  } catch (e) {
    console.error("[llm] compilePhotoPrompt failed:", (e as Error).message);
    /* fall through */
  }
  return `Candid travel photo of the person in the reference image in ${input.place}. ${input.grounding} ${input.conditions.weatherFragment}, ${input.conditions.timeFragment}. ${input.sceneIdea ?? ""} ${FILM_LOOK} ${SAFETY_LINE}`;
}
