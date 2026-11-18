import { describe, expect, it } from "vitest";
import {
  buildWeather,
  describeCode,
  localClock,
  resolveConditions,
  timeFragmentFor,
  weatherFragmentFor,
} from "@/lib/weather";
import type { Weather } from "@/lib/types";

describe("WMO code → description", () => {
  it.each([
    [0, "clear sky"],
    [2, "partly cloudy"],
    [3, "overcast"],
    [45, "fog"],
    [53, "drizzle"],
    [63, "rain"],
    [73, "snow"],
    [81, "rain showers"],
    [85, "snow showers"],
    [95, "thunderstorm"],
  ])("code %i is %s", (code, desc) => expect(describeCode(code)).toBe(desc));
});

describe("weather fragments", () => {
  it("adds wind and golden-hour modifiers", () => {
    const f = weatherFragmentFor(1, true, 30, 18, 20);
    expect(f).toContain("scattered clouds");
    expect(f).toContain("strong wind");
    expect(f).toContain("golden hour warmth");
  });
  it("no golden hour when overcast or cloudy", () => {
    expect(weatherFragmentFor(3, true, 5, 18, 90)).not.toContain("golden");
    expect(weatherFragmentFor(63, true, 5, 18, 10)).not.toContain("golden");
  });
  it("night clear sky mentions stars", () => {
    expect(weatherFragmentFor(0, false, 0, 23, 0)).toContain("stars");
  });
  it("maps local hour to light", () => {
    expect(timeFragmentFor(6, true)).toBe("early morning light");
    expect(timeFragmentFor(18, true)).toBe("golden hour, low sun");
    expect(timeFragmentFor(20, false)).toBe("blue hour, dusk");
    expect(timeFragmentFor(2, false)).toBe("night");
  });
});

describe("local clock", () => {
  it("formats time in the target timezone", () => {
    const at = new Date("2026-11-18T12:30:00Z");
    expect(localClock("Asia/Kolkata", at).hour).toBeCloseTo(18);
    expect(localClock("Asia/Kolkata", at).label).toBe("6:00 pm");
    expect(localClock("Europe/Lisbon", at).hour).toBeCloseTo(12.5);
  });
  it("survives a bad timezone", () => {
    expect(localClock("Not/AZone").hour).toBe(12);
  });
});

const lisbonRain: Weather = buildWeather(
  { temperature_2m: 14.4, precipitation: 1.2, weather_code: 63, cloud_cover: 95, wind_speed_10m: 12, is_day: 1 },
  "Europe/Lisbon",
  new Date("2026-11-18T18:40:00Z"),
);

describe("resolveConditions (one source of truth for photo + film)", () => {
  it("uses live weather by default", () => {
    const c = resolveConditions(lisbonRain, { useLiveWeather: true });
    expect(c.source).toBe("live");
    expect(c.weatherFragment).toContain("rain falling");
    expect(c.timeFragment).toBe("golden hour, low sun");
    expect(c.label).toBe("rain · 14°C · 6:40 pm");
  });
  it("override wins over live weather", () => {
    const c = resolveConditions(lisbonRain, { useLiveWeather: true, override: "snow" });
    expect(c.source).toBe("override");
    expect(c.weatherFragment).toContain("snow falling");
    expect(c.weatherFragment).not.toContain("rain");
    expect(c.spoken).toBe("snow");
  });
  it("night override forces night time-of-day", () => {
    expect(resolveConditions(lisbonRain, { useLiveWeather: true, override: "night" }).timeFragment).toBe("night");
  });
  it("live weather off → neutral", () => {
    const c = resolveConditions(lisbonRain, { useLiveWeather: false });
    expect(c.source).toBe("none");
    expect(c.weatherFragment).toBe("");
  });
  it("missing weather → neutral", () => {
    expect(resolveConditions(null, { useLiveWeather: true }).source).toBe("none");
  });
});
