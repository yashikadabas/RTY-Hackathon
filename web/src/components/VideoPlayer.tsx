"use client";

import { useState } from "react";
import { proxied } from "@/lib/client-api";
import type { PublicFilmJob } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

function downloadHref(url: string, filename: string) {
  if (url.startsWith("/api/film/video/")) {
    return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(filename)}`;
  }
  return proxied(url, filename);
}

function Playlist({ urls }: { urls: string[] }) {
  const [i, setI] = useState(0);
  const isImage = (u: string) => u.startsWith("data:image") || /\.(jpe?g|png|webp)(\?|$)/.test(u);
  const src = urls[i];
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        {isImage(src) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxied(src)} alt={`Clip ${i + 1}`} className="aspect-video w-full object-cover" />
        ) : (
          <video key={src} src={proxied(src)} autoPlay muted playsInline controls className="aspect-video w-full" onEnded={() => setI((i + 1) % urls.length)} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {urls.map((_, j) => (
          <button key={j} className="chip" data-active={j === i} onClick={() => setI(j)}>
            Clip {j + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export function VideoPlayer({
  job,
  placeName,
  onRemix,
  remixing,
}: {
  job: PublicFilmJob;
  placeName: string;
  onRemix: () => void;
  remixing: boolean;
}) {
  const [aspect, setAspect] = useState<"wide" | "vertical">("wide");
  const src = aspect === "vertical" && job.videoUrlVertical ? job.videoUrlVertical : job.videoUrl;
  const filename = `onlocation-${slugify(placeName)}-${aspect}.mp4`;

  return (
    <div className="fade-up">
      {job.script?.lines.length ? (
        <blockquote className="font-display mx-auto mb-6 max-w-3xl text-center text-xl italic leading-relaxed text-muted sm:text-2xl">
          “{job.script.lines.map((l) => l.text).join(" ")}”
        </blockquote>
      ) : null}

      {job.error && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">{job.error}</p>
      )}

      {src ? (
        <div className={cn("mx-auto overflow-hidden rounded-2xl border border-border bg-black elevated", aspect === "vertical" ? "max-w-sm" : "max-w-5xl")}>
          <video
            key={src}
            src={src.startsWith("/") ? src : proxied(src)}
            autoPlay
            loop
            playsInline
            controls
            className={cn("w-full", aspect === "vertical" ? "aspect-[9/16]" : "aspect-video")}
          />
        </div>
      ) : job.clipPlaylist?.length ? (
        <div className="mx-auto max-w-5xl">
          <Playlist urls={job.clipPlaylist} />
        </div>
      ) : null}

      <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Aspect ratio">
          <button className="chip" data-active={aspect === "wide"} onClick={() => setAspect("wide")}>
            ▭ Landscape 16:9
          </button>
          <button
            className="chip"
            data-active={aspect === "vertical"}
            disabled={!job.videoUrlVertical}
            onClick={() => setAspect("vertical")}
          >
            ▯ Vertical 9:16
          </button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={onRemix} disabled={remixing}>
            {remixing ? "Remixing…" : "↻ Remix narration"}
          </button>
          {src && (
            <a className="btn btn-primary" href={downloadHref(src, filename)} download={filename}>
              Download film
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
