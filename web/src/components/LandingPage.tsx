"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const HeroGlobe = dynamic(() => import("./HeroGlobe"), { ssr: false });

const STEPS = [
  {
    n: "01",
    title: "Cast yourself",
    body: "Upload 1–5 photos. Every shot is generated from all of them at once, so your face stays you.",
  },
  {
    n: "02",
    title: "Scout a real street",
    body: "Spin the globe, drop a pin, and look around in Street View. The direction you face is the shot we frame.",
  },
  {
    n: "03",
    title: "Roll camera",
    body: "Three photos in seconds, then a directed, narrated short film in landscape and vertical.",
  },
];

const FEATURES = [
  { icon: "🛰️", title: "Grounded in Street View", body: "GPT-4o vision reads the actual frames at your viewpoint, so the architecture, materials and street furniture match the real place." },
  { icon: "🌦️", title: "Live weather, local time", body: "If it's raining in Lisbon at 6:40 pm, your film is wet streets and blue hour. Or override it with one tap." },
  { icon: "🎬", title: "A director, not a filter", body: "Drone establishing, tracking, a place-specific cutaway and a hero finale, crossfaded and graded like film." },
  { icon: "🎙️", title: "Narrated in your voice", body: "A warm first-person monologue that mentions the real conditions, over a mood-matched music bed." },
  { icon: "🪪", title: "Identity that holds", body: "Multi-reference generation plus face restoration keeps the same person across every shot." },
  { icon: "🛟", title: "Never returns nothing", body: "If a clip fails, the shot becomes a camera move on its still. If stitching fails, you get the raw clips." },
];

export function LandingPage({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="relative">
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-30 transition-all",
          scrolled ? "border-b border-border bg-background/70 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <span className="font-display whitespace-nowrap text-xl tracking-tightest">✦ Onlocation</span>
          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 sm:flex">
              <a href="#how" className="btn btn-ghost !py-2 text-sm">How it works</a>
              <a href="#features" className="btn btn-ghost !py-2 text-sm">Features</a>
            </div>
            <button className="btn btn-primary !py-2 text-sm" onClick={onStart}>Start creating</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 opacity-90 lg:left-[32%]">
          <HeroGlobe />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        <div className="pointer-events-none relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="eyebrow">Cinematic video in real environments</p>
            <h1 className="font-display mt-5 text-5xl leading-[1.02] tracking-tightest text-balance sm:text-7xl">
              Shoot a film of yourself <em className="text-accent">on location</em>, anywhere on Earth.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted text-balance">
              Drop a pin. We pull the real street from Street View and the weather there right now, then direct a
              narrated short film of you in it.
            </p>
            <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary !px-6 !py-3.5 text-base" onClick={onStart}>
                Start creating →
              </button>
              <a href="#how" className="btn btn-secondary !px-6 !py-3.5 text-base">See how it works</a>
            </div>
            <p className="mt-10 text-xs uppercase tracking-[0.18em] text-faint">
              Powered by Street View · Open-Meteo · GPT-4o · Nano Banana Pro · Kling · ElevenLabs
            </p>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-24">
        <p className="eyebrow">How it works</p>
        <h2 className="font-display mt-3 max-w-2xl text-4xl tracking-tightest sm:text-5xl">From a pin to a premiere in three steps.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="card p-7"
            >
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative border-y border-border bg-surface/40 py-24">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-5">
          <p className="eyebrow">Why it looks like the real place</p>
          <h2 className="font-display mt-3 max-w-2xl text-4xl tracking-tightest sm:text-5xl">Not a postcard cliché. That street, right now.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="card p-6"
              >
                <span className="text-2xl" aria-hidden>{f.icon}</span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <div className="spotlight card relative overflow-hidden px-6 py-16 text-center sm:px-16">
          <h2 className="font-display mx-auto max-w-2xl text-4xl tracking-tightest sm:text-5xl">Where do you want to be today?</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">Photos in about thirty seconds. A narrated film a few minutes later.</p>
          <button className="btn btn-primary mt-8 !px-6 !py-3.5 text-base" onClick={onStart}>Start creating →</button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-faint">
          <span>✦ Onlocation · built at the Buildathon, 18 Nov 2026</span>
          <span>Imagery © Esri · Street View © Google · Weather by Open-Meteo · Search © OpenStreetMap</span>
        </div>
      </footer>
    </div>
  );
}
