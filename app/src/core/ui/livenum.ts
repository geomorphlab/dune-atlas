// Live numbers that change with the u*,th / d slider (both builds). Moving the slider
// must not change the length of any wrapped text, or the layer and cell panels reflow and shift vertically.
// Rules (docs/guide/mars.md §2b):
//  * every live number is set in tabular figures (CSS `font-variant-numeric: tabular-nums` on both panels);
//  * every live number is wrapped with its unit in one `span.live-num` (inline-block, nowrap) whose
//    min-width (ch) is RESERVED for the longest value over the whole slider axis: from the 64 values
//    of the open cell when they are at hand (stored fields, qsdiv series), else from a fixed format
//    per quantity whose widest possible text is known (e.g. bearings "359° (NNW)", "100.0 %",
//    "0.00 m/s"); the text around the slots is identical at every slider position;
//  * the slot width is MEASURED in the UI font (canvas measureText, `measuredWidthCh`), so a slot is as wide
//    as its widest value and no wider; in running text a slot ends its line or block where the values differ
//    in length (left-aligned, nothing after it), so the room kept for longer values is never a hole mid-text;
//  * slider readouts are padded to the widest value of the axis with figure spaces (U+2007).
// With constant slot widths and constant surrounding text, line breaks (and the table's auto column
// widths, which depend only on the cells' min/max-content widths) are the same at every position.
import { MISSING } from "../util/format";

export const FIGURE_SPACE = "\u2007";

const NARROW = new Set([..."ijlftrI.,:;'!|()[]/"]);
const WIDE = new Set([..."mwMW%—@"]);
/** Conservative advance width (in ch = width of "0") of HTML/text in the UI fonts with tabular figures:
 *  digits and figure spaces 1, wide glyphs 1.6, narrow 0.6, space 0.5, upper case 1.3, other 1.1;
 *  text inside <sup>/<sub> at 0.8. Tags and entities other than &nbsp;/&amp; are ignored. Used where the
 *  real font cannot be measured (no canvas: tests, server-side); `measuredWidthCh` otherwise. */
export function textWidthCh(html: string): number {
  let w = 0;
  for (const [c, scale] of glyphs(html)) {
    const cw = /[0-9\u2007]/.test(c) ? 1 : c === " " || c === "\u00a0" ? 0.5 : WIDE.has(c) ? 1.6 : NARROW.has(c) ? 0.6
      : /[A-Z]/.test(c) ? 1.3 : 1.1;
    w += cw * scale;
  }
  return w;
}

/** the characters of an HTML fragment with their size factor (<sup>/<sub> 0.8); tags dropped */
function glyphs(html: string): [string, number][] {
  const out: [string, number][] = [];
  const re = /<(\/?)(sup|sub)\b[^>]*>|<[^>]*>|&nbsp;|&amp;|&lt;|&gt;|&[a-z#0-9]+;|[\s\S]/gi;
  let scale = 1, m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = m[0];
    if (m[2]) { scale = m[1] ? 1 : 0.8; continue; }
    if (t.startsWith("<")) continue;
    out.push([t === "&nbsp;" ? "\u00a0" : t === "&amp;" ? "&" : t === "&lt;" ? "<" : t === "&gt;" ? ">" : t.startsWith("&") ? "?" : t, scale]);
  }
  return out;
}

/** Text measurer: advance width in px of plain text at a given font (canvas 2D `measureText`). */
export type Measure = (text: string, font: string) => number;
let measurer: Measure | null | undefined;
let uiFamily = "";
/** Use `m` to measure (tests: a fake; `null`: the estimate only); `undefined` restores the default. */
export function setMeasurer(m: Measure | null | undefined, family = "system-ui, sans-serif") { measurer = m; uiFamily = m ? family : ""; WIDTHS.clear(); generation++; }
let generation = 0;
function defaultMeasurer(): Measure | null {
  if (measurer !== undefined) return measurer;
  measurer = null;
  try {
    const ctx = globalThis.document?.createElement("canvas").getContext?.("2d") as CanvasRenderingContext2D | null | undefined;
    if (ctx && typeof ctx.measureText === "function" && ctx.measureText("0").width > 0) {
      measurer = (t, font) => { ctx.font = font; return ctx.measureText(t).width; };
      const root = globalThis.document.documentElement;
      uiFamily = (root && globalThis.getComputedStyle?.(root).fontFamily) || "system-ui, sans-serif";
    }
  } catch { measurer = null; }
  return measurer;
}
const WIDTHS = new Map<string, number>();
const REF_PX = 100;
/** Width in ch of HTML/text measured in the UI font (canvas measureText, bold or regular): every digit and
 *  figure space is measured as "0" (tabular figures: one advance, the width of "0" = 1 ch); <sup>/<sub>
 *  at 0.85. Falls back to the conservative `textWidthCh` estimate when no canvas is available. */
export function measuredWidthCh(html: string, bold = false): number {
  const m = defaultMeasurer();
  if (!m) return textWidthCh(html);
  const key = `${bold ? 1 : 0}|${html}`;
  const hit = WIDTHS.get(key);
  if (hit !== undefined) return hit;
  const font = (px: number) => `${bold ? 700 : 400} ${px}px ${uiFamily}`;
  const ch = m("0", font(REF_PX));
  let w = 0, run = "", runScale = 1;
  const flush = () => { if (run) w += m(run, font(REF_PX * runScale)); run = ""; };
  for (const [c0, scale] of glyphs(html)) {
    const c = /[0-9\u2007]/.test(c0) ? "0" : c0;
    const sc = scale === 1 ? 1 : 0.85;
    if (sc !== runScale) { flush(); runScale = sc; }
    run += c;
  }
  flush();
  const r = w / ch;
  WIDTHS.set(key, r);
  return r;
}

/** Reserved slot width (ch) for a set of possible texts: the widest, measured in the UI font where possible
 *  (rounded up to 0.1 ch, + 0.2 ch for sub-pixel rounding), else the conservative estimate (rounded up to
 *  0.5 ch, + 0.5 ch). The slot is then as wide as its widest value, with no visible hole beside it. */
export function reserveCh(samples: Iterable<string>, bold = false): number {
  let w = 0;
  const measured = !!defaultMeasurer();
  for (const s of samples) w = Math.max(w, measuredWidthCh(s, bold));
  return measured ? Math.ceil(w * 10) / 10 + 0.2 : Math.ceil(w * 2) / 2 + 0.5;
}

/** Reserve over the slider axis: the texts of all n positions (plus the missing marker). */
export function axisReserve(n: number, text: (k: number) => string, extra: string[] = [MISSING], bold = false): number {
  return reserveCh([...Array.from({ length: n }, (_, k) => text(k)), ...extra], bold);
}

/** A live-number slot: value (and unit) kept together, fixed minimum width, tabular figures. */
export function live(html: string, widthCh: number, align: "right" | "left" = "right"): string {
  return `<span class="live-num${align === "left" ? " left" : ""}" style="min-width:${widthCh}ch">${html}</span>`;
}

/** Pad a slider readout to `width` characters with leading figure spaces (digit-wide, tabular). */
export const padFigure = (s: string, width: number) => FIGURE_SPACE.repeat(Math.max(0, width - [...s].length)) + s;

/** A width computed on first use (after the style sheet is applied, so the measured font is the UI font). */
export function lazyWidth(f: () => number): () => number {
  let w: number | undefined, g = -1;
  return () => { if (g !== generation) { w = f(); g = generation; } return w!; };
}

/** Bearings as shown in the panels, "deg° (compass)", for every whole degree: slot width for any bearing. */
export const bearingReserve = (deg: (v: number) => string) => reserveCh([...Array.from({ length: 360 }, (_, i) => deg(i)), MISSING]);

/** fmtNum (3 significant figures, ×10ⁿ outside 0.001 .. 1e5): the widest possible text. */
export const FMTNUM_WIDEST = ["-8.88×10<sup>-10</sup>", "-0.00888", "-88888"];
