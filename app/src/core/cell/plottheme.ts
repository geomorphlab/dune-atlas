// Colours of the panel plots (wind / flux roses, modes vs threshold, qsdiv vs threshold). DARK is
// the on-screen theme (dark panel); LIGHT is used for image exports (transparent background, dark
// text, legible on white).
import type { MathRenderer } from "../export/texsvg";
import { richText } from "../export/texsvg";
import { escapeHtml } from "../util/format";
import { texToPlain } from "../util/plaintext";

export interface PlotTheme {
  /** exports: TeX in labels drawn as SVG paths; on screen (absent): TeX shown as plain text */
  math?: MathRenderer | null;
  name: "dark" | "light";
  /** text (labels, compass letters, axis ticks) */
  text: string;
  grid: string;
  gridStrong: string;
  zero: string;
  label: string;
  ring: string;
  /** outline drawn behind ring labels / around markers to separate them from the plot */
  halo: string;
  /** current-threshold ring / line */
  current: string;
  currentLine: string;
  markerStroke: string;
  /** font sizes (CSS px): compass letters, ring / radius tick labels, axis titles and tick labels */
  fs: { compass: number; ring: number; axis: number; tick: number };
  /** line-width multiplier (grid, markers, current threshold) */
  lw: number;
}

export const DARK_THEME: PlotTheme = {
  name: "dark", text: "currentColor", grid: "#56606b", gridStrong: "#7a8590", zero: "#9aa5b1", label: "#aab4bf", ring: "#c3ccd5",
  halo: "#11161c", current: "#ffd166", currentLine: "#f1f3f5", markerStroke: "#11161c",
  fs: { compass: 11, ring: 9, axis: 10, tick: 10 }, lw: 1,
};

export const LIGHT_THEME: PlotTheme = {
  name: "light", text: "#1d2329", grid: "#c2c8cf", gridStrong: "#8d969f", zero: "#5f6973", label: "#47515b", ring: "#2f3740",
  halo: "#ffffff", current: "#b7791f", currentLine: "#2f3740", markerStroke: "#ffffff",
  // exports use exportPlotTheme (sizes relative to the exported width); these are the defaults
  fs: { compass: 11, ring: 9, axis: 10, tick: 10 }, lw: 1.5,
};

/** Light theme for an export where one plot unit is drawn `unitsPerPlotUnit` strip units wide
 *  (strip: 1000 units = the image width W): labels `labelRel` x W, lines `lineRel` x W per lw. */
export function exportPlotTheme(unitsPerPlotUnit: number, o: { labelRel?: number; lineRel?: number; units?: number } = {}): PlotTheme {
  const U = o.units ?? 1000, fs = ((o.labelRel ?? 0.018) * U) / unitsPerPlotUnit;
  return { ...LIGHT_THEME, fs: { compass: fs, ring: fs, axis: fs, tick: fs }, lw: ((o.lineRel ?? 0.0042) * U) / unitsPerPlotUnit };
}

/** On-screen series / arrow colours that are too light on white, and their light-theme versions. */
const LIGHT_SERIES: Record<string, string> = { "#f1f3f5": "#2f3740", "#69db7c": "#2b8a3e", "#ffd166": "#b7791f" };
export const seriesColor = (c: string, t: PlotTheme) => (t.name === "light" ? LIGHT_SERIES[c.toLowerCase()] ?? c : c);

/** A plot label that may contain TeX ($...$): formulas as SVG paths when the theme has a math
 *  renderer (exports), else plain text (on screen). */
export function plotLabel(T: PlotTheme, s: string, x: number, y: number, fs: number, o: { anchor?: "start" | "middle" | "end"; fill?: string; cls?: string } = {}): string {
  const fill = o.fill ?? T.text;
  if (T.math && s.includes("$")) return richText(s, x, y, fs, { anchor: o.anchor, fill, cls: o.cls, math: T.math });
  const r = (v: number) => (Math.round(v * 100) / 100).toString();
  return `<text${o.cls ? ` class="${o.cls}"` : ""} font-size="${r(fs)}" x="${r(x)}" y="${r(y)}"${o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : ""} fill="${fill}">${escapeHtml(texToPlain(s))}</text>`;
}
