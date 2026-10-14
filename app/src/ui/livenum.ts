// Live numbers that change with the u*,th / d slider (PI round 5 item 2, both builds). Moving the slider
// must not change the length of any wrapped text, or the layer and cell panels reflow and shift vertically.
// Rules (docs/mars-app.md §2b):
//  * every live number is set in tabular figures (CSS `font-variant-numeric: tabular-nums` on both panels);
//  * every live number is wrapped with its unit in one `span.live-num` (inline-block, nowrap) whose
//    min-width (ch) is RESERVED for the longest value over the whole slider axis: from the 64 values
//    of the open cell when they are at hand (stored fields, qsdiv series), else from a fixed format
//    per quantity whose widest possible text is known (e.g. bearings "359° (NNW)", "100.0 %",
//    "0.00 m/s"); the text around the slots is identical at every slider position;
//  * slider readouts are padded to the widest value of the axis with figure spaces (U+2007).
// With constant slot widths and constant surrounding text, line breaks (and the table's auto column
// widths, which depend only on the cells' min/max-content widths) are the same at every position.
import { MISSING } from "../util/format";

export const FIGURE_SPACE = "\u2007";

const NARROW = new Set([..."ijlftrI.,:;'!|()[]/"]);
const WIDE = new Set([..."mwMW%—@"]);
/** Conservative advance width (in ch = width of "0") of HTML/text in the UI fonts with tabular figures:
 *  digits and figure spaces 1, wide glyphs 1.6, narrow 0.6, space 0.5, upper case 1.3, other 1.1;
 *  text inside <sup>/<sub> at 0.8. Tags and entities other than &nbsp;/&amp; are ignored. */
export function textWidthCh(html: string): number {
  let w = 0;
  const re = /<(\/?)(sup|sub)\b[^>]*>|<[^>]*>|&nbsp;|&amp;|&lt;|&gt;|&[a-z#0-9]+;|[\s\S]/gi;
  let scale = 1, m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = m[0];
    if (m[2]) { scale = m[1] ? 1 : 0.8; continue; }
    if (t.startsWith("<")) continue;
    const c = t === "&nbsp;" ? " " : t === "&amp;" ? "&" : t === "&lt;" ? "<" : t === "&gt;" ? ">" : t.startsWith("&") ? "?" : t;
    const cw = /[0-9\u2007]/.test(c) ? 1 : c === " " || c === "\u00a0" ? 0.5 : WIDE.has(c) ? 1.6 : NARROW.has(c) ? 0.6
      : /[A-Z]/.test(c) ? 1.3 : 1.1;
    w += cw * scale;
  }
  return w;
}

/** Reserved slot width (ch) for a set of possible texts: the widest, rounded up to 0.5 ch, + 0.5 ch. */
export function reserveCh(samples: Iterable<string>): number {
  let w = 0;
  for (const s of samples) w = Math.max(w, textWidthCh(s));
  return Math.ceil(w * 2) / 2 + 0.5;
}

/** Reserve over the slider axis: the texts of all n positions (plus the missing marker). */
export function axisReserve(n: number, text: (k: number) => string, extra: string[] = [MISSING]): number {
  return reserveCh([...Array.from({ length: n }, (_, k) => text(k)), ...extra]);
}

/** A live-number slot: value (and unit) kept together, fixed minimum width, tabular figures. */
export function live(html: string, widthCh: number, align: "right" | "left" = "right"): string {
  return `<span class="live-num${align === "left" ? " left" : ""}" style="min-width:${widthCh}ch">${html}</span>`;
}

/** Pad a slider readout to `width` characters with leading figure spaces (digit-wide, tabular). */
export const padFigure = (s: string, width: number) => FIGURE_SPACE.repeat(Math.max(0, width - [...s].length)) + s;

/** Bearings as shown in the panels, "deg° (compass)", for every whole degree: slot width for any bearing. */
export const bearingReserve = (deg: (v: number) => string) => reserveCh([...Array.from({ length: 360 }, (_, i) => deg(i)), MISSING]);

/** fmtNum (3 significant figures, ×10ⁿ outside 0.001 .. 1e5): the widest possible text. */
export const FMTNUM_WIDEST = ["-8.88×10<sup>-10</sup>", "-0.00888", "-88888"];
