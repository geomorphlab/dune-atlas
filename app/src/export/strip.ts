// Information strip appended BELOW exported images (map, panel plots): a transparent SVG with dark
// text, legible on white and on slides. Layout, top to bottom: separator (full width, padded from
// the image), colour bars / legends / map keys, then the descriptive text. Sizes are CSS px (1 px =
// 1/96 in); exports are rasterised at 300 dpi (EXPORT_PIXEL_RATIO). Pure string builder (tested).
import { escapeHtml } from "../util/format";

export type StripItem =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; muted?: boolean }
  | { kind: "colorbar"; title: string; detail: string; colors: string[]; ticks: { pos: number; label: string }[] }
  | { kind: "swatches"; items: { color: string; label: string; shape: "box" | "line" | "arrow" | "dot"; dash?: string }[] }
  | { kind: "mapkeys"; bearing: number; northNote?: string; scale?: { px: number; label: string } | null; scaleNote?: string };

/** the only colours of the strip apart from data colours (colour bars, swatches) */
export const STRIP_COLORS = { text: "#1d2329", muted: "#47515b", rule: "#8d969f" };
export const STRIP_FONT = "Helvetica, Arial, sans-serif";
/** points -> CSS px */
export const pt = (v: number) => (v * 96) / 72;
/** font sizes (CSS px): body / legend / colour-bar text 14 pt, colour-bar titles 15 pt, titles 19 pt */
export const STRIP_FS = { text: pt(14), barTitle: pt(15), title: pt(19) };
/** fixed colour-bar size: 2.75 in x 0.22 in */
export const COLORBAR = { width: 2.75 * 96, height: 0.22 * 96, gap: 0.45 * 96 };
/** padding between the image and the separator, and around the strip content */
export const STRIP_PAD = { top: 14, side: 16 };

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

/** colour bars per row for a strip of `width` */
export const colorbarsPerRow = (width: number) => Math.max(1, Math.floor((width - 2 * STRIP_PAD.side + COLORBAR.gap) / (COLORBAR.width + COLORBAR.gap)));

/** Build the strip of `width` CSS px. `scale` sets the pixel size: width/height = viewBox x scale. */
export function stripSvg(items: StripItem[], width: number, opts: { scale?: number } = {}): { svg: string; height: number } {
  const pad = STRIP_PAD.side, inner = width - 2 * pad, FS = STRIP_FS;
  const p: string[] = [];
  const text = (x: number, yy: number, s: string, fs: number, o: { bold?: boolean; muted?: boolean; anchor?: string; cls?: string } = {}) =>
    p.push(`<text${o.cls ? ` class="${o.cls}"` : ""} x="${f(x)}" y="${f(yy)}" font-size="${f(fs)}"${o.bold ? ' font-weight="700"' : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""} fill="${o.muted ? STRIP_COLORS.muted : STRIP_COLORS.text}">${escapeHtml(s)}</text>`);
  // separator: full width, padded from the image
  p.push(`<line class="separator" x1="0" x2="${f(width)}" y1="${STRIP_PAD.top}" y2="${STRIP_PAD.top}" stroke="${STRIP_COLORS.rule}" stroke-width="1.5"/>`);
  let y = STRIP_PAD.top + 10;
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    if (it.kind === "heading" || it.kind === "text") {
      const fs = it.kind === "heading" ? FS.title : FS.text;
      for (const line of wrapText(it.text, inner, fs)) { y += fs * 1.28; text(pad, y, line, fs, { bold: it.kind === "heading", muted: it.kind === "text" && it.muted, cls: it.kind === "heading" ? "title" : "desc" }); }
      y += 6; k++;
      continue;
    }
    if (it.kind === "colorbar") {
      // consecutive colour bars: a grid of fixed-size bars, as many per row as fit, then wrap
      const bars: Extract<StripItem, { kind: "colorbar" }>[] = [];
      while (k < items.length && items[k].kind === "colorbar") bars.push(items[k++] as Extract<StripItem, { kind: "colorbar" }>);
      const cols = colorbarsPerRow(width), bw = COLORBAR.width, bh = COLORBAR.height;
      for (let r = 0; r < bars.length; r += cols) {
        let rowH = 0;
        const row = bars.slice(r, r + cols);
        // bars of a row share one baseline: room for the longest (wrapped) title
        const titleLines = Math.max(...row.map((b) => wrapText(b.title, bw, FS.barTitle).length));
        row.forEach((b, c) => {
          const x0 = pad + c * (bw + COLORBAR.gap);
          let yy = y + FS.barTitle * 1.1;
          for (const line of wrapText(b.title, bw, FS.barTitle)) { text(x0, yy, line, FS.barTitle, { bold: true, cls: "bar-title" }); yy += FS.barTitle * 1.22; }
          yy = y + FS.barTitle * 1.1 + titleLines * FS.barTitle * 1.22 - FS.barTitle * 0.6;
          const gid = `strip-grad-${++gradSeq}`;
          const stops = b.colors.map((col, i) => `<stop offset="${f((100 * i) / Math.max(1, b.colors.length - 1))}%" stop-color="${col}"/>`).join("");
          p.push(`<defs><linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>`);
          p.push(`<rect class="colorbar" x="${f(x0)}" y="${f(yy)}" width="${f(bw)}" height="${f(bh)}" fill="url(#${gid})" stroke="${STRIP_COLORS.rule}" stroke-width="1"/>`);
          yy += bh;
          // tick marks for all ticks; labels where they do not overlap (the ends first)
          const lw = (l: string) => l.length * charW(FS.text) + 8;
          const span = (t: { pos: number; label: string }) => {
            const tx = x0 + t.pos * bw, w = lw(t.label);
            return t.pos < 0.02 ? [tx, tx + w] : t.pos > 0.98 ? [tx - w, tx] : [tx - w / 2, tx + w / 2];
          };
          const isEnd = (i: number) => i === 0 || i === b.ticks.length - 1;
          const order = b.ticks.map((_, i) => i).sort((i, j) => Number(isEnd(j)) - Number(isEnd(i)));
          const placed: number[][] = [];
          const show = new Set<number>();
          for (const i of order) {
            const [a0, a1] = span(b.ticks[i]);
            if (placed.every(([c0, c1]) => a1 <= c0 || a0 >= c1)) { placed.push([a0, a1]); show.add(i); }
          }
          b.ticks.forEach((t, i) => {
            const tx = x0 + t.pos * bw;
            p.push(`<line class="tick" x1="${f(tx)}" x2="${f(tx)}" y1="${f(yy)}" y2="${f(yy + 6)}" stroke="${STRIP_COLORS.text}" stroke-width="1.5"/>`);
            if (show.has(i)) text(tx, yy + 6 + FS.text, t.label, FS.text, { anchor: t.pos < 0.02 ? "start" : t.pos > 0.98 ? "end" : "middle", cls: "tick-label" });
          });
          yy += 6 + FS.text + 4;
          if (b.detail) for (const line of wrapText(b.detail, bw, FS.text)) { yy += FS.text * 1.25; text(x0, yy, line, FS.text, { muted: true, cls: "bar-detail" }); }
          rowH = Math.max(rowH, yy - y + 10);
        });
        y += rowH + 6;
      }
      continue;
    }
    if (it.kind === "swatches") {
      const fs = FS.text, sw = 30, sh = 18;
      let x = pad, yy = y + fs * 1.25;
      for (const s of it.items) {
        const lw = sw + 10 + s.label.length * charW(fs) + 28;
        if (x + lw > width - pad && x > pad) { x = pad; yy += fs * 1.6; }
        const my = yy - fs * 0.35;
        if (s.shape === "box") p.push(`<rect class="swatch" x="${f(x)}" y="${f(my - sh / 2)}" width="${sw}" height="${sh}" fill="${s.color}" stroke="${STRIP_COLORS.rule}" stroke-width="1"/>`);
        else if (s.shape === "dot") p.push(`<circle class="swatch" cx="${f(x + sw / 2)}" cy="${f(my)}" r="6" fill="${s.color}"/>`);
        else {
          // a muted underlay keeps light line colours (e.g. white streamlines) visible on white
          p.push(`<line class="swatch" x1="${f(x - 1)}" x2="${f(x + sw + 1)}" y1="${f(my)}" y2="${f(my)}" stroke="${STRIP_COLORS.rule}" stroke-width="7" stroke-opacity="0.5"/>`);
          p.push(`<line class="swatch" x1="${f(x)}" x2="${f(x + sw)}" y1="${f(my)}" y2="${f(my)}" stroke="${s.color}" stroke-width="3.5"${s.dash ? ` stroke-dasharray="${s.dash.split(" ").map((d) => Number(d) * 1.8).join(" ")}"` : ""}/>`);
          if (s.shape === "arrow") p.push(`<path class="swatch" d="M${f(x + sw + 2)},${f(my)} l-9,-5.5 v11 z" fill="${s.color}"/>`);
        }
        text(x + sw + 10, yy, s.label, fs, { cls: "legend-label" });
        x += lw;
      }
      y = yy + fs * 0.7;
      k++;
      continue;
    }
    // map keys: north arrow + scale bar
    const fs = FS.text;
    const yy = y + 48;
    const cx = pad + 16;
    p.push(`<g class="north" transform="translate(${f(cx)} ${f(yy - 14)}) rotate(${f(-it.bearing)})"><path d="M0,-24 L10,10 L0,4 L-10,10 Z" fill="${STRIP_COLORS.text}"/></g>`);
    text(cx, yy + fs + 2, "N", fs, { bold: true, anchor: "middle", cls: "legend-label" });
    const x = pad + 60;
    if (it.northNote) text(x, yy - 26, it.northNote, fs, { muted: true, cls: "legend-label" });
    if (it.scale) {
      const w = it.scale.px;
      p.push(`<path class="scalebar" d="M${f(x)},${f(yy - 10)} v10 h${f(w)} v-10" fill="none" stroke="${STRIP_COLORS.text}" stroke-width="2.5"/>`);
      text(x + w + 10, yy, `${it.scale.label}${it.scaleNote ? ` (${it.scaleNote})` : ""}`, fs, { cls: "legend-label" });
    } else if (it.scaleNote) text(x, yy, it.scaleNote, fs, { muted: true, cls: "legend-label" });
    y = yy + fs + 12;
    k++;
  }
  const height = Math.ceil(y + pad);
  const sc = opts.scale ?? 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width * sc)}" height="${f(height * sc)}" viewBox="0 0 ${f(width)} ${height}" font-family="${STRIP_FONT}">${p.join("")}</svg>`;
  return { svg, height };
}
