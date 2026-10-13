// Information strip appended BELOW exported images (map, panel plots): a transparent SVG with dark
// text, legible on white. Pure string builder (tested; rasterised in the browser for PNGs).
import { escapeHtml } from "../util/format";

export type StripItem =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; muted?: boolean; small?: boolean }
  | { kind: "colorbar"; title: string; detail: string; colors: string[]; ticks: { pos: number; label: string }[] }
  | { kind: "swatches"; items: { color: string; label: string; shape: "box" | "line" | "arrow" | "dot"; dash?: string }[] }
  | { kind: "mapkeys"; bearing: number; northNote?: string; scale?: { px: number; label: string } | null; scaleNote?: string };

/** the only colours of the strip apart from data colours (colour bars, swatches) */
export const STRIP_COLORS = { text: "#1d2329", muted: "#47515b", rule: "#8d969f" };
export const STRIP_FONT = "Helvetica, Arial, sans-serif";

const f = (v: number) => (Math.round(v * 100) / 100).toString();
let gradSeq = 0;
const charW = (fs: number) => 0.56 * fs;

/** greedy word wrap with an approximate glyph width (no font metrics needed) */
export function wrapText(text: string, width: number, fs: number): string[] {
  const max = Math.max(8, Math.floor(width / charW(fs)));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if (!line) line = w;
      else if ((line + " " + w).length <= max) line += " " + w;
      else { out.push(line); line = w; }
      while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max); }
    }
    out.push(line);
  }
  return out;
}

/** Build the strip: `width` in CSS px; the SVG is `width*scale` px wide (viewBox in CSS px). */
export function stripSvg(items: StripItem[], width: number, opts: { scale?: number; rule?: boolean } = {}): { svg: string; height: number } {
  const pad = 12, inner = width - 2 * pad;
  const p: string[] = [];
  let y = pad;
  const text = (x: number, yy: number, s: string, fs: number, o: { bold?: boolean; muted?: boolean; anchor?: string } = {}) =>
    p.push(`<text x="${f(x)}" y="${f(yy)}" font-size="${fs}"${o.bold ? ' font-weight="700"' : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""} fill="${o.muted ? STRIP_COLORS.muted : STRIP_COLORS.text}">${escapeHtml(s)}</text>`);
  if (opts.rule !== false) p.push(`<line x1="${pad}" x2="${f(width - pad)}" y1="0.5" y2="0.5" stroke="${STRIP_COLORS.rule}" stroke-width="1"/>`);
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    if (it.kind === "heading" || it.kind === "text") {
      const fs = it.kind === "heading" ? 13 : it.small ? 10 : 11.5;
      for (const line of wrapText(it.text, inner, fs)) { y += fs * 1.3; text(pad, y, line, fs, { bold: it.kind === "heading", muted: it.kind === "text" && it.muted }); }
      y += 3; k++;
      continue;
    }
    if (it.kind === "colorbar") {
      // consecutive colour bars share rows of columns
      const bars: Extract<StripItem, { kind: "colorbar" }>[] = [];
      while (k < items.length && items[k].kind === "colorbar") bars.push(items[k++] as Extract<StripItem, { kind: "colorbar" }>);
      const cols = Math.max(1, Math.min(bars.length, Math.floor(inner / 230)));
      const cw = inner / cols;
      for (let r = 0; r < bars.length; r += cols) {
        let rowH = 0;
        bars.slice(r, r + cols).forEach((b, c) => {
          const x0 = pad + c * cw, bw = cw - 18;
          let yy = y + 12;
          for (const line of wrapText(b.title, bw, 11)) { text(x0, yy, line, 11, { bold: true }); yy += 13; }
          const gid = `strip-grad-${++gradSeq}`;
          const stops = b.colors.map((col, i) => `<stop offset="${f((100 * i) / Math.max(1, b.colors.length - 1))}%" stop-color="${col}"/>`).join("");
          p.push(`<defs><linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>`);
          p.push(`<rect class="colorbar" x="${f(x0)}" y="${f(yy - 6)}" width="${f(bw)}" height="11" fill="url(#${gid})" stroke="${STRIP_COLORS.rule}" stroke-width="0.6"/>`);
          yy += 5;
          // tick marks for all ticks; labels only where they do not overlap (ends first)
          const lw = (l: string) => l.length * charW(9.5) + 4;
          const span = (t: { pos: number; label: string }) => {
            const tx = x0 + t.pos * bw, w = lw(t.label);
            return t.pos < 0.02 ? [tx, tx + w] : t.pos > 0.98 ? [tx - w, tx] : [tx - w / 2, tx + w / 2];
          };
          const order = b.ticks.map((t, i) => i).sort((i, j) => (i === 0 || i === b.ticks.length - 1 ? -1 : 0) - (j === 0 || j === b.ticks.length - 1 ? -1 : 0));
          const placed: number[][] = [];
          const show = new Set<number>();
          for (const i of order) {
            const [a0, a1] = span(b.ticks[i]);
            if (placed.every(([c0, c1]) => a1 <= c0 || a0 >= c1)) { placed.push([a0, a1]); show.add(i); }
          }
          b.ticks.forEach((t, i) => {
            const tx = x0 + t.pos * bw;
            p.push(`<line x1="${f(tx)}" x2="${f(tx)}" y1="${f(yy)}" y2="${f(yy + 3)}" stroke="${STRIP_COLORS.text}" stroke-width="0.8"/>`);
            if (show.has(i)) text(tx, yy + 13, t.label, 9.5, { anchor: t.pos < 0.02 ? "start" : t.pos > 0.98 ? "end" : "middle" });
          });
          yy += 15;
          for (const line of wrapText(b.detail, bw, 9.5)) { yy += 12; text(x0, yy, line, 9.5, { muted: true }); }
          rowH = Math.max(rowH, yy - y + 4);
        });
        y += rowH + 4;
      }
      continue;
    }
    if (it.kind === "swatches") {
      let x = pad, yy = y + 14;
      for (const s of it.items) {
        const lw = 22 + it.items.length * 0 + s.label.length * charW(10.5) + 14;
        if (x + lw > width - pad && x > pad) { x = pad; yy += 16; }
        if (s.shape === "box") p.push(`<rect x="${f(x)}" y="${f(yy - 9)}" width="16" height="10" fill="${s.color}" stroke="${STRIP_COLORS.rule}" stroke-width="0.6"/>`);
        else if (s.shape === "dot") p.push(`<circle cx="${f(x + 8)}" cy="${f(yy - 4)}" r="3.5" fill="${s.color}"/>`);
        else {
          // a muted underlay keeps light line colours (e.g. white streamlines) visible on white
          p.push(`<line x1="${f(x - 1)}" x2="${f(x + 17)}" y1="${f(yy - 4)}" y2="${f(yy - 4)}" stroke="${STRIP_COLORS.rule}" stroke-width="4" stroke-opacity="0.55"/>`);
          p.push(`<line x1="${f(x)}" x2="${f(x + 16)}" y1="${f(yy - 4)}" y2="${f(yy - 4)}" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`);
          if (s.shape === "arrow") p.push(`<path d="M${f(x + 17)},${f(yy - 4)} l-5,-3 v6 z" fill="${s.color}"/>`);
        }
        text(x + 21, yy, s.label, 10.5);
        x += lw;
      }
      y = yy + 6;
      k++;
      continue;
    }
    // map keys: north arrow + scale bar
    const yy = y + 30;
    const cx = pad + 12;
    p.push(`<g class="north" transform="translate(${f(cx)} ${f(yy - 10)}) rotate(${f(-it.bearing)})"><path d="M0,-14 L6,6 L0,2 L-6,6 Z" fill="${STRIP_COLORS.text}"/></g>`);
    text(cx, yy + 12, "N", 10, { bold: true, anchor: "middle" });
    let x = pad + 40;
    if (it.northNote) { text(x, yy - 14, it.northNote, 10, { muted: true }); }
    if (it.scale) {
      const sx = x, w = it.scale.px;
      p.push(`<path class="scalebar" d="M${f(sx)},${f(yy - 6)} v6 h${f(w)} v-6" fill="none" stroke="${STRIP_COLORS.text}" stroke-width="1.4"/>`);
      text(sx + w + 6, yy, `${it.scale.label}${it.scaleNote ? ` (${it.scaleNote})` : ""}`, 10.5);
    } else if (it.scaleNote) text(x, yy, it.scaleNote, 10.5, { muted: true });
    y = yy + 18;
    k++;
  }
  const height = Math.ceil(y + pad - 4);
  const sc = opts.scale ?? 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width * sc)}" height="${f(height * sc)}" viewBox="0 0 ${f(width)} ${height}" font-family="${STRIP_FONT}">${p.join("")}</svg>`;
  return { svg, height };
}
