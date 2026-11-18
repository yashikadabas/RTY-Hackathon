// Synthesises the four placeholder music beds (sine-pad chords) with ffmpeg.
// Replace public/audio/*.mp3 with licensed tracks (same names) before launch.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const ffmpeg = createRequire(import.meta.url)("@ffmpeg-installer/ffmpeg").path;

const pad = (freqs, lfo, gain) =>
  freqs
    .map((f, i) => `${gain}*sin(2*PI*${f}*t)*(0.75+0.25*sin(2*PI*${lfo + i * 0.03}*t))`)
    .join("+");

// 4-chord progressions, 6s per chord → 24s loop.
const beds = {
  mellow: [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]],
  epic: [[110, 164.81, 220, 261.63], [98, 146.83, 196, 246.94], [87.31, 130.81, 174.61, 220], [98, 146.83, 196, 293.66]],
  upbeat: [[261.63, 329.63, 392], [293.66, 369.99, 440], [246.94, 329.63, 392], [261.63, 329.63, 440]],
  moody: [[146.83, 174.61, 220], [130.81, 155.56, 196], [116.54, 146.83, 174.61], [130.81, 164.81, 196]],
};
const lfo = { mellow: 0.12, epic: 0.08, upbeat: 2, moody: 0.1 };
const gain = { mellow: 0.09, epic: 0.08, upbeat: 0.07, moody: 0.09 };

mkdirSync("public/audio", { recursive: true });
for (const [name, chords] of Object.entries(beds)) {
  const expr = chords
    .map((c, i) => `between(t,${i * 6},${i * 6 + 6})*(${pad(c, lfo[name], gain[name])})`)
    .join("+");
  execFileSync(ffmpeg, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", `aevalsrc='${expr}':s=44100:d=24`,
    "-af", "lowpass=f=1800,aecho=0.8:0.7:120|240:0.35|0.2,afade=t=in:d=1,afade=t=out:st=23:d=1,loudnorm=I=-16:TP=-2:LRA=11",
    "-ac", "2", "-b:a", "96k", `public/audio/${name}.mp3`,
  ]);
  console.log(`public/audio/${name}.mp3`);
}
