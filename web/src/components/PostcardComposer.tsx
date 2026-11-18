"use client";

import { useEffect, useRef, useState } from "react";
import { proxied } from "@/lib/client-api";
import type { PlaceResult } from "@/lib/types";
import { slugify } from "@/lib/utils";

const W = 1080;
const H = 1350;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function PostcardComposer({
  photo,
  place,
  weatherLine,
  onClose,
}: {
  photo: string;
  place: PlaceResult;
  weatherLine: string;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      const img = await loadImage(proxied(photo));
      await document.fonts.ready;
      if (cancelled) return;
      // Cover-fit photo.
      const s = Math.max(W / img.width, H / img.height);
      const iw = img.width * s;
      const ih = img.height * s;
      ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
      // Bottom gradient.
      const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Inner frame.
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      roundRect(ctx, 36, 36, W - 72, H - 72, 28);
      ctx.stroke();
      // Copy.
      ctx.fillStyle = "#e0a35e";
      ctx.font = "600 26px var(--font-geist-sans), Helvetica, Arial";
      ctx.letterSpacing = "8px";
      ctx.fillText("WISH YOU WERE HERE", 84, H - 290);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#fff";
      const name = place.placeName.length > 22 ? `${place.placeName.slice(0, 21)}…` : place.placeName;
      ctx.font = "italic 400 112px Fraunces, Georgia, serif";
      ctx.fillText(name, 80, H - 170);
      ctx.font = "400 34px Helvetica, Arial";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText([place.country, weatherLine].filter(Boolean).join("  ·  "), 84, H - 110);
      ctx.font = "600 24px Helvetica, Arial";
      ctx.letterSpacing = "6px";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.textAlign = "right";
      ctx.fillText("✦ ONLOCATION", W - 84, 96);
      ctx.textAlign = "left";
      ctx.letterSpacing = "0px";
      setReady(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo, place, weatherLine]);

  function download() {
    canvas.current?.toBlob(
      (b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `postcard-${slugify(place.placeName)}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Postcard"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div className="card elevated w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvas} width={W} height={H} className="w-full rounded-xl bg-surface-2" />
        <div className="mt-4 flex justify-between gap-2">
          <button ref={closeBtn} className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" disabled={!ready} onClick={download}>
            Download postcard
          </button>
        </div>
      </div>
    </div>
  );
}
