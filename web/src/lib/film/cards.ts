import "server-only";
import sharp from "sharp";

export function esc(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Greedy word wrap at `max` characters per line. */
export function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/** Title / end card as PNG (dark radial gradient, accent bar, serif title). */
export async function renderCard(opts: {
  title: string;
  subtitle: string;
  width: number;
  height: number;
}): Promise<Buffer> {
  const { width: W, height: H } = opts;
  const portrait = H > W;
  const short = Math.min(W, H);
  const fs = Math.round(short * 0.075);
  const lines = wrap(opts.title, portrait ? 16 : 22);
  const lh = fs * 1.15;
  const top = H / 2 - ((lines.length - 1) * lh) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1c1712"/><stop offset="1" stop-color="#08090b"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect x="${W / 2 - short * 0.03}" y="${top - fs * 1.4}" width="${short * 0.06}" height="${Math.max(2, short * 0.004)}" fill="#e0a35e"/>
    ${lines
      .map(
        (l, i) =>
          `<text x="50%" y="${top + i * lh}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${fs}" fill="#f3f4f6">${esc(l)}</text>`,
      )
      .join("")}
    <text x="50%" y="${top + (lines.length - 1) * lh + fs * 1.3}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(short * 0.024)}" letter-spacing="${Math.round(short * 0.006)}" fill="#8b909b">${esc(opts.subtitle.toUpperCase())}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
