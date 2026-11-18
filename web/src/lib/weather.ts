/**
 * Weather & time engine. Pure and side-effect free: turns Open-Meteo data
 * into human copy and image-prompt fragments, and resolves user overrides.
 */
import type { Conditions, Modifiers, Weather, WeatherOverride } from "./types";

export function describeCode(code: number): string {
  if (code === 0) return "clear sky";
  if (code <= 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain showers";
  if (code <= 86) return "snow showers";
  return "thunderstorm";
}

export function weatherEmoji(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 3) return isDay ? "⛅" : "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

export function weatherFragmentFor(
  code: number,
  isDay: boolean,
  windKmh: number,
  localHour: number,
  cloudCover: number,
): string {
  let f: string;
  if (code === 0)
    f = isDay
      ? "clear blue sky, crisp sunlight"
      : "clear night, visible stars, ambient city light";
  else if (code <= 3) f = "soft diffused light, scattered clouds";
  else if (code <= 48) f = "thick atmospheric fog, muted colors, mysterious mood";
  else if (code <= 67) f = "rain falling, wet reflective streets, umbrellas, moody overcast sky";
  else if (code <= 77 || (code >= 83 && code <= 86))
    f = "snow falling, snow-dusted surfaces, cold breath visible";
  else if (code <= 82) f = "heavy rain shower, dramatic sky, water streaming";
  else f = "storm clouds, dramatic lightning in the distance";

  if (windKmh > 25) f += ", strong wind, hair and clothing blowing";
  if (localHour >= 17 && localHour < 19.5 && code <= 3 && cloudCover < 60)
    f += ", golden hour warmth";
  return f;
}

export function timeFragmentFor(localHour: number, isDay: boolean): string {
  if (localHour >= 5 && localHour < 8) return "early morning light";
  if (localHour >= 8 && localHour < 11) return "bright mid-morning light";
  if (localHour >= 11 && localHour < 15) return "midday light";
  if (localHour >= 15 && localHour < 17) return "warm afternoon light";
  if (localHour >= 17 && localHour < 19.5) return "golden hour, low sun";
  if (localHour >= 19.5 && localHour < 21) return "blue hour, dusk";
  return isDay ? "daylight" : "night";
}

/** Local clock in an IANA timezone → { label: "6:40 pm", hour: 18.66 } */
export function localClock(timezone: string, now = new Date()): { label: string; hour: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    })
      .format(now)
      .toLowerCase()
      .replace(/\s+/g, " ");
    return { label, hour: h + m / 60 };
  } catch {
    return { label: "midday", hour: 12 };
  }
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  precipitation: number;
  weather_code: number;
  cloud_cover: number;
  wind_speed_10m: number;
  is_day: number;
}

export function buildWeather(current: OpenMeteoCurrent, timezone: string, now = new Date()): Weather {
  const { label, hour } = localClock(timezone, now);
  const isDay = current.is_day === 1;
  const code = current.weather_code;
  return {
    tempC: Math.round(current.temperature_2m),
    code,
    description: describeCode(code),
    isDay,
    windKmh: Math.round(current.wind_speed_10m),
    precipitation: current.precipitation,
    cloudCover: current.cloud_cover,
    timezone,
    localTime: label,
    localHour: hour,
    weatherFragment: weatherFragmentFor(code, isDay, current.wind_speed_10m, hour, current.cloud_cover),
    timeFragment: timeFragmentFor(hour, isDay),
  };
}

export async function fetchWeather(lat: number, lng: number): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day&timezone=auto`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { current: OpenMeteoCurrent; timezone: string };
    return buildWeather(data.current, data.timezone);
  } catch {
    return null;
  }
}

const OVERRIDES: Record<WeatherOverride, { weather: string; time?: string; spoken: string }> = {
  clear: { weather: "clear blue sky, crisp sunlight", spoken: "clear skies" },
  rain: {
    weather: "rain falling, wet reflective streets, umbrellas, moody overcast sky",
    spoken: "rain",
  },
  snow: { weather: "snow falling, snow-dusted surfaces, cold breath visible", spoken: "snow" },
  golden: {
    weather: "golden hour, low warm sun, long shadows",
    time: "golden hour, low sun",
    spoken: "golden-hour light",
  },
  night: {
    weather: "night, city lights glowing, deep blue sky",
    time: "night",
    spoken: "a clear night",
  },
};

export const OVERRIDE_LABELS: Record<WeatherOverride, string> = {
  clear: "☀️ Clear",
  rain: "🌧️ Rain",
  snow: "❄️ Snow",
  golden: "🌅 Golden hour",
  night: "🌙 Night",
};

/**
 * Resolve what conditions the scene will show. Override wins over live
 * weather; live weather can be switched off. Used by BOTH photo and film
 * pipelines (and the narration + title card) so they always agree.
 */
export function resolveConditions(weather: Weather | null, modifiers: Modifiers): Conditions {
  if (modifiers.override) {
    const o = OVERRIDES[modifiers.override];
    const time = o.time ?? weather?.timeFragment ?? "daylight";
    const temp = weather ? ` · ${weather.tempC}°C` : "";
    return {
      weatherFragment: o.weather,
      timeFragment: time,
      label: `${o.spoken}${temp}${weather ? ` · ${weather.localTime}` : ""}`,
      spoken: o.spoken,
      source: "override",
    };
  }
  if (!modifiers.useLiveWeather || !weather) {
    return { weatherFragment: "", timeFragment: "", label: "Shot on location", spoken: "", source: "none" };
  }
  return {
    weatherFragment: weather.weatherFragment,
    timeFragment: weather.timeFragment,
    label: `${weather.description} · ${weather.tempC}°C · ${weather.localTime}`,
    spoken: `${weather.description}, ${weather.tempC} degrees, ${weather.localTime} local time`,
    source: "live",
  };
}
