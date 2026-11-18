"use client";

import { useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX = 5;

async function downscale(file: File, maxEdge = 1024): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function UploadDropzone() {
  const { userImages, setUserImages, setStep } = useApp();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const imgs = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX - userImages.length);
    const urls = await Promise.all(imgs.map((f) => downscale(f).catch(() => null)));
    setUserImages([...userImages, ...urls.filter((u): u is string => Boolean(u))].slice(0, MAX));
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl fade-up">
      <p className="eyebrow">Step 1 of 2 · The star</p>
      <h2 className="font-display mt-3 text-4xl tracking-tightest sm:text-5xl">Who&apos;s on location?</h2>
      <p className="mt-3 max-w-lg text-muted">
        Add 1–5 clear photos of one person. More angles means a closer likeness in every shot. Photos
        are only used as likeness references and are never stored by Onlocation.
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void add(e.dataTransfer.files);
        }}
        className={cn(
          "mt-8 cursor-pointer rounded-3xl border border-dashed p-10 text-center transition-colors",
          drag ? "border-accent bg-accent/5" : "border-border-strong bg-surface hover:bg-surface-2",
        )}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-xl">
          {busy ? <span className="spin inline-block h-5 w-5 rounded-full border-2 border-accent border-t-transparent" /> : "↑"}
        </div>
        <p className="mt-4 font-medium">Drop photos here, or click to browse</p>
        <p className="mt-1 text-sm text-faint">JPG, PNG or HEIC · face clearly visible · up to {MAX}</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {Array.from({ length: MAX }).map((_, i) => {
          const src = userImages[i];
          return src ? (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Reference photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setUserImages(userImages.filter((_, j) => j !== i))}
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </div>
          ) : (
            <div key={i} className="aspect-square rounded-2xl border border-dashed border-border" />
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-faint">{userImages.length}/{MAX} photos</p>
        <button className="btn btn-primary" disabled={!userImages.length} onClick={() => setStep("map")}>
          Pick a place →
        </button>
      </div>
    </div>
  );
}
