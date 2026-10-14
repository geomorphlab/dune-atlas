// Cell-panel helpers shared by the two bodies' panels (src/bodies/<body>/cellPanel.ts): table labels, the
// stored plot choice, section keys and number formats.
import { storageKey } from "../body";
import type { Grid } from "../cell/snap";
import { PLOT_STORAGE } from "../cell/qplot";
import { fieldInfo } from "../cell/fieldinfo";
import { terseQuantity } from "./terse";
import { mathOnly, textOnly } from "../util/math";
import { MISSING } from "../util/format";

const SUP: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

export interface FieldLabel {
  /** TeX symbol (without $), "" if none */
  symbolTex: string;
  /** plain-language quantity name */
  quantity: string;
}

/** the stored choice of the plotted quantity (per body) */
export const readPlotChoice = (): string | undefined => { try { return localStorage.getItem(storageKey(PLOT_STORAGE)) ?? undefined; } catch { return undefined; } };

/** Default table labels from the source metadata: symbol = math part, quantity = text part. */
export function defaultFieldLabel(v: string): FieldLabel {
  const info = fieldInfo(v);
  const quantity = terseQuantity(textOnly(info.longName) || textOnly(info.description).split(".")[0] || "");
  return { symbolTex: mathOnly(info.longName), quantity };
}

/** Collapsible panel sections in panel order (every section heading is a disclosure, open by default; a
 *  collapse / expand is remembered in localStorage under the body's storage key, e.g. duneAtlas.cellPanel.<key>Open). The summary table is
 *  back after the plots, without the key-numbers box; its rows fold in groups (ui/tablegroups.ts). */
export const PANEL_SECTIONS = ["windRose", "fluxRose", "modes", "qsdiv", "summary", "downloads"] as const;

export type PanelSection = (typeof PANEL_SECTIONS)[number];

export const sectionOpenKey = (k: PanelSection) => storageKey(`cellPanel.${k}Open`); // per body (body.ts)

/** number as plain text (exports): 3 significant digits, ×10ⁿ outside 0.01 .. 10⁴ */
export function fmtPlain(v: number): string {
  if (!Number.isFinite(v)) return MISSING;
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) { const [m, e] = v.toExponential(2).split("e"); return `${Number(m)}×10${String(Number(e)).replace(/./g, (c) => SUP[c] ?? c)}`; }
  return String(Number(v.toPrecision(3)));
}

/** Same location: either cell centre lies inside the other cell (cell sizes from the grids). */
export function sameLocation(a: { lat: number; lon: number; grid?: Grid }, b: { lat: number; lon: number }, gb: Grid): boolean {
  const ha = a.grid ? Math.abs(a.grid.dlat) / 2 : 0, hb = Math.abs(gb.dlat) / 2;
  const wa = a.grid ? Math.abs(a.grid.dlon) / 2 : 0, wb = Math.abs(gb.dlon) / 2;
  const dLat = Math.abs(a.lat - b.lat), dLon0 = Math.abs(a.lon - b.lon) % 360, dLon = Math.min(dLon0, 360 - dLon0);
  return dLat <= Math.max(ha, hb) + 1e-9 && dLon <= Math.max(wa, wb) + 1e-9;
}

export const MODES_OPEN_KEY = sectionOpenKey("modes");

export const PANEL_MIN_W = 320;
