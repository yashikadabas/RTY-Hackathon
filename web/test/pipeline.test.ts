import { describe, expect, it } from "vitest";
import { esc, wrap } from "@/lib/film/cards";
import { audioFilter, montageFilter, totalDuration, type Segment } from "@/lib/film/stitch";
import { fallbackShots, parseShots } from "@/lib/openai";
import { bearing } from "@/lib/utils";
import { parseImages, parseModifiers } from "@/lib/validate";

const shot = (shotId: string, d = 4) => ({ shotId, imagePrompt: `p ${shotId}`, motionPrompt: "m", durationSec: d });

describe("parseShots repairs the director's JSON", () => {
  it("accepts a valid 4-shot plan", () => {
    const raw = JSON.stringify({
      shots: [shot("establishing_drone", 5), shot("walking_tracking"), shot("detail_cutaway"), shot("hero_finale", 5)],
    });
    const s = parseShots(raw)!;
    expect(s.map((x) => x.shotId)).toEqual(["establishing_drone", "walking_tracking", "detail_cutaway", "hero_finale"]);
  });
  it("reorders so drone is first and hero is last", () => {
    const raw = JSON.stringify({
      shots: [shot("hero_finale"), shot("detail_cutaway"), shot("establishing_drone"), shot("portrait_moment")],
    });
    const s = parseShots(raw)!;
    expect(s[0].shotId).toBe("establishing_drone");
    expect(s.at(-1)!.shotId).toBe("hero_finale");
    expect(s.filter((x) => x.shotId === "detail_cutaway")).toHaveLength(1);
  });
  it("strips markdown fences, unknown ids, and coerces durations", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        shots: [shot("establishing_drone", 9), shot("selfie_stick"), shot("walking_tracking"), shot("hero_finale", 5)],
      }) +
      "\n```";
    const s = parseShots(raw)!;
    expect(s.map((x) => x.shotId)).not.toContain("selfie_stick");
    expect(s[0].durationSec).toBe(4);
  });
  it("caps at 4 shots with at most one cutaway", () => {
    const raw = JSON.stringify({
      shots: [
        shot("establishing_drone"),
        shot("detail_cutaway"),
        shot("detail_cutaway"),
        shot("walking_tracking"),
        shot("portrait_moment"),
        shot("hero_finale"),
      ],
    });
    const s = parseShots(raw)!;
    expect(s.length).toBeLessThanOrEqual(4);
    expect(s.filter((x) => x.shotId === "detail_cutaway").length).toBeLessThanOrEqual(1);
  });
  it("rejects garbage and plans without a drone or hero", () => {
    expect(parseShots("not json")).toBeNull();
    expect(parseShots(JSON.stringify({ shots: [shot("walking_tracking"), shot("portrait_moment"), shot("hero_finale")] }))).toBeNull();
  });
  it("fallback template follows the grammar", () => {
    const s = fallbackShots("Lisbon", "", { weatherFragment: "rain", timeFragment: "night", label: "", spoken: "rain", source: "override" });
    expect(s).toHaveLength(4);
    expect(s[0].shotId).toBe("establishing_drone");
    expect(s[3].shotId).toBe("hero_finale");
  });
});

describe("ffmpeg graph builders", () => {
  const card: Segment = { kind: "card", png: Buffer.alloc(0) };
  const segs: Segment[] = [
    card,
    { kind: "video", url: "x", durationSec: 5 },
    { kind: "video", url: "y", durationSec: 4 },
    { kind: "still", url: "z", durationSec: 4, move: 1 },
    { kind: "video", url: "w", durationSec: 5 },
    card,
  ];
  it("total length = Σ segments − crossfades", () => {
    // 2 + 5 + 4 + 4 + 5 + 2 = 22, minus 5 × 0.5
    expect(totalDuration(segs)).toBeCloseTo(19.5);
  });
  it("chains xfade with cumulative offsets", () => {
    const f = montageFilter([2, 5, 4, 2], false);
    expect(f).toContain("[0:v][1:v]xfade=transition=fade:duration=0.5:offset=1.500[x1]");
    expect(f).toContain("[x1][2:v]xfade=transition=fade:duration=0.5:offset=6.000[x2]");
    expect(f).toContain("[x2][3:v]xfade=transition=fade:duration=0.5:offset=9.500[mv]");
    expect(f.endsWith("[mv]format=yuv420p[v]")).toBe(true);
  });
  it("adds the film grade when enabled", () => {
    const f = montageFilter([2, 5], true);
    expect(f).toContain("curves=");
    expect(f).toContain("vignette");
    expect(f).toContain("noise=alls=6");
  });
  it("ducks music under narration", () => {
    const a = audioFilter(20, true, 1500);
    expect(a).toContain("volume=0.22");
    expect(a).toContain("adelay=1500|1500");
    expect(a).toContain("amix=inputs=2:normalize=0");
    expect(audioFilter(20, false, 0)).not.toContain("amix");
  });
});

describe("cards", () => {
  it("escapes XML in place names", () => {
    expect(esc(`Rock & "Roll" <Bar>`)).toBe("Rock &amp; &quot;Roll&quot; &lt;Bar&gt;");
  });
  it("wraps long titles", () => {
    expect(wrap("Llanfairpwllgwyngyll and the surrounding coastline", 22).every((l) => l.length <= 30)).toBe(true);
  });
});

describe("input validation + geometry", () => {
  it("only accepts image data URLs and https, max 5", () => {
    const img = "data:image/jpeg;base64,AAAA";
    expect(parseImages([img, "javascript:alert(1)", "data:text/html;base64,AA"])).toEqual([img]);
    expect(parseImages(Array(9).fill(img))).toHaveLength(5);
    expect(parseImages([])).toBeNull();
  });
  it("sanitises modifiers", () => {
    const m = parseModifiers({ override: "tornado", sceneDescription: "x".repeat(500), useLiveWeather: false });
    expect(m.override).toBeUndefined();
    expect(m.sceneDescription!.length).toBe(240);
    expect(m.useLiveWeather).toBe(false);
  });
  it("bearing points toward the pin", () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0);
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90);
  });
});

import { pickGeminiModel } from "@/lib/openai";

describe("Gemini model auto-pick", () => {
  it("picks the newest stable flash model", () => {
    expect(
      pickGeminiModel([
        "models/gemini-2.0-flash",
        "models/gemini-2.5-flash",
        "models/gemini-2.5-flash-lite",
        "models/gemini-2.5-pro",
        "models/gemini-3.0-flash-preview-tts",
        "models/text-embedding-004",
      ]),
    ).toBe("gemini-2.5-flash");
  });
  it("returns null when nothing matches", () => {
    expect(pickGeminiModel(["models/embedding-001"])).toBeNull();
  });
});

import { rankGeminiModels } from "@/lib/openai";

describe("Gemini model failover order", () => {
  it("prefers newest lite models, then newest flash", () => {
    expect(
      rankGeminiModels([
        "models/gemini-2.5-flash",
        "models/gemini-3.1-flash-lite",
        "models/gemini-3.8-flash",
        "models/gemini-3.5-flash-lite",
        "models/gemini-2.5-pro",
      ]),
    ).toEqual(["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash"]);
  });
});

describe("parseShots tolerates numbered shot ids", () => {
  it("infers types from prompt text or position", () => {
    const raw = JSON.stringify({
      shots: [
        { shotId: "1", imagePrompt: "An establishing_drone shot over Lisbon", motionPrompt: "m", durationSec: 5 },
        { shotId: "2", imagePrompt: "Tracking the person walking", motionPrompt: "m", durationSec: 4 },
        { shotId: "3", imagePrompt: "Azulejo tiles close-up", motionPrompt: "m", durationSec: 4 },
        { shotId: "4", imagePrompt: "The person turns to camera", motionPrompt: "m", durationSec: 5 },
      ],
    });
    expect(parseShots(raw)!.map((s) => s.shotId)).toEqual(["establishing_drone", "walking_tracking", "detail_cutaway", "hero_finale"]);
  });
});

describe("parseShots positional fallback", () => {
  it("maps 5 un-typed shots by order", () => {
    const sh = (n: number) => ({ shotId: `shot_${n}`, imagePrompt: `prompt ${n}`, motionPrompt: "m", durationSec: 4 });
    const s = parseShots(JSON.stringify({ shots: [1, 2, 3, 4, 5].map(sh) }))!;
    expect(s.map((x) => x.shotId)).toEqual(["establishing_drone", "walking_tracking", "detail_cutaway", "hero_finale"]);
    expect(s[3].imagePrompt).toBe("prompt 5");
  });
});
