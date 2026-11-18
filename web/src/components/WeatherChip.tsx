import type { Weather } from "@/lib/types";
import { weatherEmoji } from "@/lib/weather";

export function WeatherChip({ weather }: { weather: Weather }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm">
      <span aria-hidden>{weatherEmoji(weather.code, weather.isDay)}</span>
      <span className="font-medium">{weather.tempC}°C</span>
      <span className="text-muted">· {weather.description}</span>
      <span className="text-faint">· {weather.localTime}</span>
    </span>
  );
}
