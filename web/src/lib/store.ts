"use client";

import { create } from "zustand";
import type {
  Modifiers,
  PlaceResult,
  PublicFilmJob,
  PublicPhotoJob,
  Viewpoint,
} from "./types";

export type Step = "landing" | "upload" | "map" | "generating" | "results";

interface AppState {
  step: Step;
  userImages: string[];
  pin: { lat: number; lng: number } | null;
  place: PlaceResult | null;
  placeLoading: boolean;
  viewpoint: Viewpoint | null;
  modifiers: Modifiers;
  photoJob: PublicPhotoJob | null;
  selectedCandidate: number;
  filmJob: PublicFilmJob | null;
  showFilm: boolean;

  setStep: (s: Step) => void;
  setUserImages: (imgs: string[]) => void;
  setPin: (p: { lat: number; lng: number } | null) => void;
  setPlace: (p: PlaceResult | null) => void;
  setPlaceLoading: (b: boolean) => void;
  setViewpoint: (v: Viewpoint | null) => void;
  setModifiers: (m: Partial<Modifiers>) => void;
  setPhotoJob: (j: PublicPhotoJob | null) => void;
  setSelectedCandidate: (i: number) => void;
  setFilmJob: (j: PublicFilmJob | null) => void;
  setShowFilm: (b: boolean) => void;
  anotherPlace: () => void;
  reset: () => void;
}

const initial = {
  step: "landing" as Step,
  userImages: [] as string[],
  pin: null,
  place: null,
  placeLoading: false,
  viewpoint: null,
  modifiers: { useLiveWeather: true } as Modifiers,
  photoJob: null,
  selectedCandidate: 0,
  filmJob: null,
  showFilm: false,
};

export const useApp = create<AppState>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setUserImages: (userImages) => set({ userImages }),
  // A new pin invalidates the Street View viewpoint.
  setPin: (pin) => set({ pin, viewpoint: null, place: null }),
  setPlace: (place) => set({ place }),
  setPlaceLoading: (placeLoading) => set({ placeLoading }),
  setViewpoint: (viewpoint) => set({ viewpoint }),
  setModifiers: (m) => set((s) => ({ modifiers: { ...s.modifiers, ...m } })),
  setPhotoJob: (photoJob) => set({ photoJob }),
  setSelectedCandidate: (selectedCandidate) => set({ selectedCandidate }),
  setFilmJob: (filmJob) => set({ filmJob }),
  setShowFilm: (showFilm) => set({ showFilm }),
  anotherPlace: () =>
    set({ step: "map", photoJob: null, filmJob: null, showFilm: false, selectedCandidate: 0 }),
  reset: () => set({ ...initial, modifiers: { useLiveWeather: true } }),
}));
