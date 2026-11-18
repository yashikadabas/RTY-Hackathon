"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { UploadDropzone } from "@/components/UploadDropzone";
import { PlacePanel } from "@/components/PlacePanel";
import { GeneratingScreen } from "@/components/GeneratingScreen";
import { ResultsGrid } from "@/components/ResultsGrid";
import { FilmView } from "@/components/FilmView";
import { LandingPage } from "@/components/LandingPage";

const GlobeMap = dynamic(() => import("@/components/GlobeMap").then((m) => m.GlobeMap), { ssr: false });

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Home() {
  const { step, reset, setStep, showFilm } = useApp();

  if (step === "landing") return <LandingPage onStart={() => setStep("upload")} />;

  return (
    <main className="min-h-screen px-4 pb-10 pt-4 sm:px-6">
      <header className="mx-auto flex max-w-7xl items-center justify-between py-2">
        <button onClick={reset} className="font-display text-xl tracking-tightest">
          ✦ Onlocation
        </button>
        <button className="btn btn-ghost !py-2 text-sm" onClick={reset}>
          Start over
        </button>
      </header>
      <AnimatePresence mode="wait">
        <motion.section key={step + (showFilm ? "-film" : "")} {...fade} className="mx-auto mt-6 max-w-7xl">
          {step === "upload" && <UploadDropzone />}
          {step === "map" && (
            <div className="grid gap-4 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[1fr_420px]">
              <div className="h-[55vh] lg:h-full">
                <GlobeMap />
              </div>
              <PlacePanel />
            </div>
          )}
          {step === "generating" && <GeneratingScreen />}
          {step === "results" && !showFilm && <ResultsGrid />}
          {step === "results" && showFilm && <FilmView />}
        </motion.section>
      </AnimatePresence>
    </main>
  );
}
