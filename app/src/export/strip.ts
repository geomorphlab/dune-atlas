// Information strip appended BELOW exported images (map, panel plots): a transparent SVG with dark
// text, legible on white and on slides. Layout, top to bottom: separator (full width, padded from
// the image), colour bars / legends / map keys, then the descriptive text. Pure string builder
// (tested).
//
// Sizing is RELATIVE to the image width W: the strip is laid out in STRIP_UNITS (= 1000) units
// across, whatever the pixel width, so text keeps the same size relative to the figure. With the
// image filling a 16:9 slide (13.33 in wide), body text 0.018 W ~ 17 pt and the heading
// 0.024 W ~ 23 pt.
import { richLine, richText, richWidth, splitTex, textWidth, wrapRich, type MathRenderer } from "./texsvg";

export type StripItem =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; muted?: boolean }
  | { kind: "colorbar"; title: string; detail: string; colors: string[]; ticks: { pos: number; label: string }[] }
  | { kind: "swatches"; items: { color: string; label: string; shape: "box" | "line" | "arrow" | "dot"; dash?: string }[] }
  /** scale.px is in strip units */
  | { kind: "mapkeys"; bearing: number; northNote?: string; scale?: { px: number; label: string } | null; scaleNote?: string };

/** the only colours of the strip apart from data colours (colour bars, swatches) */
export const STRIP_COLORS = { text: "#1d2329", muted: "#47515b", rule: "#8d969f" };
export const STRIP_FONT = "Helvetica, Arial, sans-serif";
/** layout width of every strip (units); the SVG width / height attributes set the pixel size */
export const STRIP_UNITS = 1000;
/** sizes as fractions of the image width W */
export const STRIP_REL = {
  /** body text, legends, colour-bar ticks and units */
  text: 0.018,
  /** colour-bar titles */
  barTitle: 0.018,
  /** heading */
  title: 0.024,
  /** colour bars: 3 per row, then wrap */
  colorbar: { width: 0.28, height: 0.022 },
  /** padding: image to separator, and the sides */
  pad: { top: 0.015, side: 0.02 },
  /** line widths: separator / ticks, scale bar, legend lines */
  line: { rule: 0.0012, bold: 0.0022, swatch: 0.0032 },
} as const;
const U = STRIP_UNITS;
/** font sizes in strip units */
export const STRIP_FS = { text: STRIP_REL.text * U, barTitle: STRIP_REL.barTitle * U, title: STRIP_REL.title * U };
export const STRIP_PAD = { top: STRIP_REL.pad.top * U, side: STRIP_REL.pad.side * U };
/** colour-bar size in strip units; the gap spreads 3 bars over the inner width */
export const COLORBAR = {
  width: STRIP_REL.colorbar.width * U, height: STRIP_REL.colorbar.height * U,
  gap: (U - 2 * STRIP_REL.pad.side * U - 3 * STRIP_REL.colorbar.width * U) / 2,
};
/** a slide 13.33 in wide: points of a size given as a fraction of W when the image fills it */
export const slidePt = (fraction: number) => fraction * 13.333 * 72;

const f = (v: number) => (Math.round(v * 100) / 100).toString();
let gradSeq = 0;

/** greedy word wrap (plain text; Helvetica / Arial widths); text with math: wrapRich */
export function wrapText(text: string, width: number, fs: number): string[] {
  return wrapRich(text.replace(/\$/g, "\uFF04"), width, fs).map((l) => l.map((g) => (g.t === "text" ? g.s : "")).join("").replace(/\uFF04/g, "$"));
}

/** colour bars per row (3: fixed relative size) */
export const colorbarsPerRow = () => Math.max(1, Math.floor((U - 2 * STRIP_PAD.side + COLORBAR.gap + 1e-6) / (COLORBAR.width + COLORBAR.gap)));

/** Build the strip, laid out STRIP_UNITS wide. `pxWidth` sets the pixel size (width / height
 *  attributes; viewBox in units): `height` is in units, `pxHeight` = height x pxWidth / units. */
export function stripSvg(items: StripItem[], opts: { pxWidth?: number; math?: MathRenderer | null } = {}): { svg: string; height: number; pxHeight: number } {
  const math = opts.math ?? null;
  const width = U, pad = STRIP_PAD.side, inner = width - 2 * pad, FS = STRIP_FS;
  const LW = { rule: STRIP_REL.line.rule * U, bold: STRIP_REL.line.bold * U, swatch: STRIP_REL.line.swatch * U };
  const p: string[] = [];
  // text may contain TeX ($...$): formulas become SVG paths when a renderer is given
  const text = (x: number, yy: number, s: string, fs: number, o: { bold?: boolean; muted?: boolean; anchor?: "start" | "middle" | "end"; cls?: string } = {}) =>
    p.push(richText(s, x, yy, fs, { ...o, fill: o.muted ? STRIP_COLORS.muted : STRIP_COLORS.text, math }));
  const lines = (s: string, w: number, fs: number, bold = false) => wrapRich(s, w, fs, { bold, math });
  const line = (segs: ReturnType<typeof lines>[number], x: number, yy: number, fs: number, o: { bold?: boolean; muted?: boolean; cls?: string }) =>
    p.push(richLine(segs, x, yy, fs, { ...o, fill: o.muted ? STRIP_COLORS.muted : STRIP_COLORS.text, math }));
  // separator: full width, padded from the image
  p.push(`<line class="separator" x1="0" x2="${f(width)}" y1="${STRIP_PAD.top}" y2="${STRIP_PAD.top}" stroke="${STRIP_COLORS.rule}" stroke-width="${f(LW.rule)}"/>`);
  let y = STRIP_PAD.top + 0.6 * FS.text;
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    if (it.kind === "heading" || it.kind === "text") {
      const fs = it.kind === "heading" ? FS.title : FS.text;
      const bold = it.kind === "heading";
      for (const l of lines(it.text, inner, fs, bold)) { y += fs * 1.28; line(l, pad, y, fs, { bold, muted: it.kind === "text" && it.muted, cls: bold ? "title" : "desc" }); }
      y += 0.35 * fs; k++;
      continue;
    }
    if (it.kind === "colorbar") {
      // consecutive colour bars: a grid of fixed-size bars, as many per row as fit, then wrap
      const bars: Extract<StripItem, { kind: "colorbar" }>[] = [];
      while (k < items.length && items[k].kind === "colorbar") bars.push(items[k++] as Extract<StripItem, { kind: "colorbar" }>);
      const cols = colorbarsPerRow(), bw = COLORBAR.width, bh = COLORBAR.height;
      for (let r = 0; r < bars.length; r += cols) {
        let rowH = 0;
        const row = bars.slice(r, r + cols);
        // bars of a row share one baseline: room for the longest (wrapped) title
        const titleLines = Math.max(...row.map((b) => lines(b.title, bw, FS.barTitle, true).length));
        row.forEach((b, c) => {
          const x0 = pad + c * (bw + COLORBAR.gap);
          let yy = y + FS.barTitle * 1.1;
          for (const l of lines(b.title, bw, FS.barTitle, true)) { line(l, x0, yy, FS.barTitle, { bold: true, cls: "bar-title" }); yy += FS.barTitle * 1.22; }
          yy = y + FS.barTitle * 1.1 + titleLines * FS.barTitle * 1.22 - FS.barTitle * 0.6;
          const gid = `strip-grad-${++gradSeq}`;
          const stops = b.colors.map((col, i) => `<stop offset="${f((100 * i) / Math.max(1, b.colors.length - 1))}%" stop-color="${col}"/>`).join("");
          p.push(`<defs><linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>`);
          p.push(`<rect class="colorbar" x="${f(x0)}" y="${f(yy)}" width="${f(bw)}" height="${f(bh)}" fill="url(#${gid})" stroke="${STRIP_COLORS.rule}" stroke-width="${f(LW.rule)}"/>`);
          yy += bh;
          // tick marks for all ticks; labels where they do not overlap (the ends first)
          const lw = (l: string) => textWidth(l, FS.text) + 0.45 * FS.text;
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
          const tl = 0.33 * FS.text; // tick length
          b.ticks.forEach((t, i) => {
            const tx = x0 + t.pos * bw;
            p.push(`<line class="tick" x1="${f(tx)}" x2="${f(tx)}" y1="${f(yy)}" y2="${f(yy + tl)}" stroke="${STRIP_COLORS.text}" stroke-width="${f(LW.rule)}"/>`);
            if (show.has(i)) text(tx, yy + tl + FS.text, t.label, FS.text, { anchor: t.pos < 0.02 ? "start" : t.pos > 0.98 ? "end" : "middle", cls: "tick-label" });
          });
          yy += tl + FS.text + 0.2 * FS.text;
          if (b.detail) for (const l of lines(b.detail, bw, FS.text)) { yy += FS.text * 1.25; line(l, x0, yy, FS.text, { muted: true, cls: "bar-detail" }); }
          rowH = Math.max(rowH, yy - y + 0.55 * FS.text);
        });
        y += rowH + 0.35 * FS.text;
      }
      continue;
    }
    if (it.kind === "swatches") {
      const fs = FS.text, sw = 1.65 * fs, sh = fs;
      let x = pad, yy = y + fs * 1.25;
      for (const s of it.items) {
        const lw = sw + 0.55 * fs + richWidth(splitTex(s.label, math), fs, false, math) + 1.5 * fs;
        if (x + lw > width - pad && x > pad) { x = pad; yy += fs * 1.6; }
        const my = yy - fs * 0.35;
        if (s.shape === "box") p.push(`<rect class="swatch" x="${f(x)}" y="${f(my - sh / 2)}" width="${sw}" height="${sh}" fill="${s.color}" stroke="${STRIP_COLORS.rule}" stroke-width="${f(LW.rule)}"/>`);
        else if (s.shape === "dot") p.push(`<circle class="swatch" cx="${f(x + sw / 2)}" cy="${f(my)}" r="${f(0.33 * fs)}" fill="${s.color}"/>`);
        else {
          // a muted underlay keeps light line colours (e.g. white streamlines) visible on white
          p.push(`<line class="swatch" x1="${f(x - LW.rule)}" x2="${f(x + sw + LW.rule)}" y1="${f(my)}" y2="${f(my)}" stroke="${STRIP_COLORS.rule}" stroke-width="${f(2 * LW.swatch)}" stroke-opacity="0.5"/>`);
          p.push(`<line class="swatch" x1="${f(x)}" x2="${f(x + sw)}" y1="${f(my)}" y2="${f(my)}" stroke="${s.color}" stroke-width="${f(LW.swatch)}"${s.dash ? ` stroke-dasharray="${s.dash.split(" ").map((d) => f(Number(d) * LW.swatch * 0.6)).join(" ")}"` : ""}/>`);
          if (s.shape === "arrow") p.push(`<path class="swatch" d="M${f(x + sw + 0.1 * fs)},${f(my)} l${f(-0.5 * fs)},${f(-0.3 * fs)} v${f(0.6 * fs)} z" fill="${s.color}"/>`);
        }
        text(x + sw + 0.55 * fs, yy, s.label, fs, { cls: "legend-label" });
        x += lw;
      }
      y = yy + fs * 0.7;
      k++;
      continue;
    }
    // map keys: north arrow + scale bar (sizes relative to the text size)
    const fs = FS.text, q = fs / 18.67;
    const yy = y + 48 * q;
    const cx = pad + 16 * q;
    p.push(`<g class="north" transform="translate(${f(cx)} ${f(yy - 14 * q)}) rotate(${f(-it.bearing)}) scale(${f(q)})"><path d="M0,-24 L10,10 L0,4 L-10,10 Z" fill="${STRIP_COLORS.text}"/></g>`);
    text(cx, yy + fs + 2 * q, "N", fs, { bold: true, anchor: "middle", cls: "legend-label" });
    const x = pad + 60 * q;
    if (it.northNote) text(x, yy - 26 * q, it.northNote, fs, { muted: true, cls: "legend-label" });
    if (it.scale) {
      const w = it.scale.px;
      p.push(`<path class="scalebar" d="M${f(x)},${f(yy - 10 * q)} v${f(10 * q)} h${f(w)} v${f(-10 * q)}" fill="none" stroke="${STRIP_COLORS.text}" stroke-width="${f(LW.bold)}"/>`);
      text(x + w + 10 * q, yy, `${it.scale.label}${it.scaleNote ? ` (${it.scaleNote})` : ""}`, fs, { cls: "legend-label" });
    } else if (it.scaleNote) text(x, yy, it.scaleNote, fs, { muted: true, cls: "legend-label" });
    y = yy + fs + 12 * q;
    k++;
  }
  const height = Math.ceil(y + pad);
  const pxW = opts.pxWidth ?? width, pxHeight = (height * pxW) / width;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(pxW)}" height="${f(pxHeight)}" viewBox="0 0 ${f(width)} ${height}" font-family="${STRIP_FONT}">${p.join("")}</svg>`;
  return { svg, height, pxHeight };
}
