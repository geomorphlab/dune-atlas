// "<quantity> vs threshold" (Earth, x = u*,th) / "<quantity> vs grain diameter" (Mars, x = d) plot of the cell
// panel: a y-axis selector over every scalar the cell has per slider position - the 23
// sand-flux fields, the flux divergence and (Mars) the per-hour threshold statistics. Names, symbols and units
// are the layer list's (registry/field_names.json; one name per quantity). Direction fields use a fixed
// 0-360° (axes 0-180°) y axis with breaks where the bearing wraps (PLOT_DIRECTIONS switches them off);
// ±60,000 sentinels (infinite ratios) and missing values are left out of the autoscale and marked.
// Shared by both builds (src/ui/cellPanel.ts, src/bodies/mars/ui/cellPanel.ts).
import { fieldValue, type CellData } from "./cellstore";
import { FIELD_NAMES, fieldInfo } from "./fieldinfo";
import { modeDefined, MODE_DEFINED_BY, type ModeKey } from "./analysis";
import { linePlotSvg, type LinePlotOptions } from "./lineplot";
import type { PlotTheme } from "./plottheme";
import { compassPoint } from "../util/angles";
import { fmtNum, MISSING } from "../util/format";
import { textOnly } from "../util/math";
import { csvName } from "./csvnames";

/** include the direction fields (RDD, αT, αE, αH, αO) in the selector */
export const PLOT_DIRECTIONS = true;
/** the default quantity (divergence is niche) */
export const DEFAULT_PLOT = "dpm";
/** stored ratio clip (pipeline fields.F16_MAX): |value| >= this is an infinite ratio */
export const SENTINEL = 6.0e4;
/** storage name (per body, body.ts storageKey) of the selected quantity */
export const PLOT_STORAGE = "cellPanel.plotY";

export type QKind = "flux" | "direction" | "axis" | "fraction" | "ratio" | "divergence" | "speed";
export interface PlotQuantity {
  id: string;
  /** option text and plain title, e.g. "Drift potential (DP)" */
  title: string;
  /** name with the symbol in TeX, e.g. "Drift potential $DP$" */
  titleTex: string;
  /** the symbol as plain text (y-axis label), e.g. "DP" */
  symbol: string;
  /** units: plain (screen) and TeX (exports); "" for dimensionless */
  units: string;
  unitsTex: string;
  kind: QKind;
}
/** selector groups (the layer list's groups and order) */
export const PLOT_GROUPS: { title: string; ids: string[] }[] = [
  { title: "Drift potential", ids: ["dpm", "rdpm", "rdpa", "qha_rdp_dp", "qsdiv"] },
  { title: "Bedform orientation", ids: ["at", "ab", "ae", "ao"] },
  { title: "Crest-normal/parallel fluxes", ids: ["qncb", "qacb", "qnlb", "qalb", "qnle", "qale", "qace"] },
  { title: "Ratios & morphology indices", ids: ["sige_sigh", "qhab_nl_nc", "qhab_ac_nc", "qhne_ac_nl"] },
  { title: "Wind statistics", ids: ["uft", "ufm", "qhbf", "qhef", "ut_median"] },
];
/** quantities that are not stored fields (the panel supplies their values) */
export const EXTRA_QUANTITIES: Record<string, PlotQuantity> = {
  qsdiv: { id: "qsdiv", title: "Saturated flux divergence (∇·qs)", titleTex: "Saturated flux divergence $\\nabla\\cdot\\vec{q}_s$", symbol: "∇·qs", units: "m/kyr", unitsTex: "$\\mathrm{m\\,kyr^{-1}}$", kind: "divergence" },
  ut_median: { id: "ut_median", title: "Median threshold friction velocity (u*,th)", titleTex: "Median threshold friction velocity $u_{*,th}$", symbol: "u*,th", units: "m/s", unitsTex: "$\\mathrm{m\\,s^{-1}}$", kind: "speed" },
};

/** the trailing symbol of a title: "(DP)" -> DP; a trailing ⟨...⟩ term */
export function plainSymbol(title: string): string {
  const t = title.trim();
  if (t.endsWith("⟩") && t.includes("⟨")) return t.slice(t.lastIndexOf("⟨"));
  const m = /\(((?:[^()]|\([^()]*\))*)\)\s*$/.exec(t);
  return m ? m[1] : textOnly(t);
}

/** a stored field as a plot quantity (null: not a field, or a direction field while PLOT_DIRECTIONS is off) */
export function fieldQuantity(id: string): PlotQuantity | null {
  const n = FIELD_NAMES[id];
  if (!n) return null;
  const info = fieldInfo(id);
  const kind: QKind = info.kind;
  if (!PLOT_DIRECTIONS && (kind === "direction" || kind === "axis")) return null;
  const units = kind === "flux" ? "m²/yr" : kind === "direction" ? "° (bearing, toward)" : kind === "axis" ? "° (axis, 0–180)" : kind === "fraction" ? "fraction (0–1)" : "";
  const unitsTex = kind === "flux" ? "$\\mathrm{m^{2}\\,yr^{-1}}$" : kind === "direction" || kind === "axis" ? "°" : "";
  return { id, title: n.title, titleTex: n.titleTex, symbol: plainSymbol(n.title), units, unitsTex, kind };
}

/** the selector's quantities for a cell: groups of the available ids (fields of the cell, extras given) */
export function plotQuantities(fieldVars: readonly string[], extras: string[]): { title: string; items: PlotQuantity[] }[] {
  const have = new Set([...fieldVars, ...extras]);
  return PLOT_GROUPS.map((g) => ({ title: g.title, items: g.ids.filter((id) => have.has(id)).map((id) => EXTRA_QUANTITIES[id] ?? fieldQuantity(id)).filter((q): q is PlotQuantity => !!q) }))
    .filter((g) => g.items.length);
}
/** the quantity to show: the requested one if available, else the default (or the first) */
export function resolvePlot(groups: { items: PlotQuantity[] }[], want: string | null | undefined): PlotQuantity {
  const all = groups.flatMap((g) => g.items);
  return all.find((q) => q.id === want) ?? all.find((q) => q.id === DEFAULT_PLOT) ?? all[0];
}

/** values of a stored field over the n slider positions in display units; undefined modes NaN; ±Infinity -> ±SENTINEL */
export function fieldSeries(cell: Pick<CellData, "fieldVars" | "fields" | "utValues"> & Partial<CellData>, id: string, n: number): number[] {
  const info = fieldInfo(id);
  return Array.from({ length: n }, (_, k) => {
    const raw = fieldValue(cell as CellData, id, k);
    if (id in MODE_DEFINED_BY && !modeDefined(cell as CellData, id as ModeKey, k)) return NaN;
    if (raw === Infinity || raw === -Infinity) return Math.sign(raw) * SENTINEL;
    return Number.isFinite(raw) ? info.toDisplay(raw) : NaN;
  });
}

const isOff = (v: number) => Number.isFinite(v) && Math.abs(v) >= SENTINEL * 0.999;
/** the live value with its unit (caption slot) */
export function valueText(q: PlotQuantity, v: number): string {
  if (isOff(v)) return v > 0 ? "infinite (60,000 in the data)" : "−infinite (−60,000 in the data)";
  if (!Number.isFinite(v)) return MISSING;
  switch (q.kind) {
    case "direction": return `${v.toFixed(0)}° (${compassPoint(v)})`;
    case "axis": return `${v.toFixed(0)}° (axis)`;
    case "fraction": return v.toFixed(3);
    case "speed": return `${v.toFixed(3)}&nbsp;m/s`;
    case "flux": return `${fmtNum(v)}&nbsp;m²/yr`;
    case "divergence": return `${fmtNum(v)}&nbsp;m/kyr`;
    default: return fmtNum(v);
  }
}

/** log y axis: positive quantity (flux, ratio, speed) with every value > 0 spanning at least two decades */
export function useLogY(q: PlotQuantity, ys: number[]): boolean {
  if (!(q.kind === "flux" || q.kind === "ratio" || q.kind === "speed")) return false;
  const fin = ys.filter((v) => Number.isFinite(v) && !isOff(v));
  return fin.length > 1 && fin.every((v) => v > 0) && Math.max(...fin) / Math.min(...fin) >= 100;
}

export interface QPlotAxis {
  /** x values as plotted (Earth u*,th in m/s; Mars log10 d) */
  x: number[];
  currentIndex: number;
  /** "threshold" | "grain diameter" */
  word: string;
  /** x-axis label: screen (plain) and export (TeX) */
  xLabel: string;
  xLabelTex: string;
}

/** line-plot options for a quantity (screen or export labels) */
export function qplotOptions(q: PlotQuantity, ys: number[], ax: QPlotAxis, width: number, theme?: PlotTheme, exportLabels = false): LinePlotOptions {
  const dir = q.kind === "direction" || q.kind === "axis";
  const yLabel = exportLabels
    ? `${q.titleTex.slice(q.titleTex.indexOf("$")) || q.symbol}${q.unitsTex ? ` (${q.unitsTex})` : ""}`
    : `${q.symbol}${q.units ? ` (${q.units.replace(/ \(.*\)$/, "")})` : ""}`;
  return {
    x: ax.x, y: ys, currentIndex: ax.currentIndex, xLabel: exportLabels ? ax.xLabelTex : ax.xLabel, yLabel,
    title: `${q.title} vs ${ax.word}`, width, theme,
    ...(dir ? { yRange: [0, q.kind === "axis" ? 180 : 360] as [number, number], yTicks: q.kind === "axis" ? [0, 45, 90, 135, 180] : [0, 90, 180, 270, 360], wrap: q.kind === "axis" ? 180 : 360 } : {}),
    sentinel: SENTINEL, logY: useLogY(q, ys),
  };
}
export function qplotSvg(q: PlotQuantity, ys: number[], ax: QPlotAxis, width: number, theme?: PlotTheme, exportLabels = false): string {
  return linePlotSvg(qplotOptions(q, ys, ax, width, theme, exportLabels));
}

/** caption after the live-value line: what is plotted and the notes the series needs (constant while the
 *  slider moves: it depends on the quantity and the cell's 64 values only) */
export function qplotNotes(q: PlotQuantity, ys: number[], ax: QPlotAxis, extra = ""): string {
  const notes: string[] = [`${q.title} of this cell for every ${ax.word}; dot and dashed line: current ${ax.word}.`];
  if (q.kind === "direction") notes.push("Compass bearing toward which sand moves (0–360°); the line breaks where it crosses north.");
  if (q.kind === "axis") notes.push("An axis (0–180°): the line breaks where it wraps from 180° to 0°.");
  if (useLogY(q, ys)) notes.push("Logarithmic y axis.");
  if (ys.some(isOff)) notes.push("Triangles at the top or bottom edge: infinite ratio (its denominator, a net flux, is zero; ±60,000 in the data), not plotted.");
  if (ys.some((v) => !Number.isFinite(v))) notes.push(`Gaps: not defined at that ${ax.word}${q.kind === "divergence" ? " (or no data at coasts)" : ""}.`);
  if (extra) notes.push(extra);
  return notes.join(" ");
}

/** file-name part of a quantity: dp-vs-threshold, alpha-h-vs-grain-diameter */
export const plotSlug = (q: PlotQuantity, word: string) => `${csvName(q.id).replace(/_/g, "-")}-vs-${word.replace(/\s+/g, "-")}`;
