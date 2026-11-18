export type WeatherMood = "epic" | "mellow" | "upbeat" | "moody";
export type WeatherOverride = "clear" | "rain" | "snow" | "golden" | "night";

export interface Weather {
  tempC: number;
  code: number; // WMO weather code
  description: string;
  isDay: boolean;
  windKmh: number;
  precipitation: number;
  cloudCover: number;
  timezone: string; // IANA
  localTime: string; // "6:40 pm"
  localHour: number; // fractional hour, e.g. 18.66
  weatherFragment: string;
  timeFragment: string;
}

export interface Modifiers {
  useLiveWeather: boolean;
  override?: WeatherOverride;
  sceneDescription?: string;
  era?: string;
}

export interface Viewpoint {
  lat: number;
  lng: number;
  heading: number; // 0 = north
}

export interface PlaceResult {
  lat: number;
  lng: number;
  placeName: string;
  country: string;
  streetViewImages: string[];
  weather: Weather | null;
}

/** What the scene will actually look like after modifiers are applied. */
export interface Conditions {
  weatherFragment: string;
  timeFragment: string;
  /** Human-readable, e.g. "light rain · 14°C · 6:40 pm" */
  label: string;
  /** Short phrase for narration, e.g. "light rain" */
  spoken: string;
  source: "live" | "override" | "none";
}

export type ShotId =
  | "establishing_drone"
  | "walking_tracking"
  | "portrait_moment"
  | "detail_cutaway"
  | "hero_finale";

export interface Shot {
  shotId: ShotId;
  imagePrompt: string;
  motionPrompt: string;
  durationSec: number;
}

export interface Script {
  lines: { text: string; overShot: string }[];
  musicMood: WeatherMood;
}

export type PhotoStage = "queued" | "grounding" | "generating" | "done" | "failed";

export interface PhotoJobInput {
  userImages: string[];
  place: PlaceResult;
  modifiers: Modifiers;
  viewpoint?: Viewpoint;
}

export interface PhotoJob {
  id: string;
  stage: PhotoStage;
  input: PhotoJobInput;
  createdAt: number;
  grounding?: string;
  /** Proxied Street View frames the grounding was read from. */
  groundingFrames?: string[];
  prompt?: string;
  candidates: string[];
  demo?: boolean;
  error?: string;
}

export type FilmStage =
  | "queued"
  | "planning"
  | "stills"
  | "clips"
  | "voice"
  | "stitching"
  | "done"
  | "failed";

export interface FilmJobInput {
  userImages: string[];
  place: PlaceResult;
  modifiers: Modifiers;
  viewpoint?: Viewpoint;
  seedImage?: string;
}

export interface FilmJob {
  jobId: string;
  input: FilmJobInput;
  createdAt: number;
  conditions?: Conditions;
  grounding?: string;
  groundingFrames?: string[];
  shots?: Shot[];
  stills?: { shotId: string; url: string }[];
  /** animated=false means the shot is a Ken Burns move over its still. */
  clips?: { shotId: string; url: string; durationSec: number; animated: boolean }[];
  script?: Script;
  videoUrl?: string;
  videoUrlVertical?: string;
  clipPlaylist?: string[];
  stage: FilmStage;
  progress: { clipsDone: number; clipsTotal: number };
  log: { at: number; msg: string }[];
  remixing?: boolean;
  demo?: boolean;
  error?: string;
}

/** Status payloads never echo selfies back to the client. */
export type PublicPhotoJob = Omit<PhotoJob, "input">;
export type PublicFilmJob = Omit<FilmJob, "input">;
