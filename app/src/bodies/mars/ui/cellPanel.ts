// Mars click-to-cell side panel (replaces ui/cellPanel.ts in the Mars build). Same structure,
// sections, controls and exports as the Earth panel (header | compact grain-size control |
// content), computed from the hourly series of cells.zarr (u, v, T, rho) with the per-hour
// threshold of Pahtz & Duran (2023) at the selected median grain diameter d (mars/cell/analysis.ts).
// Kept close to ui/cellPanel.ts line by line: port Earth changes here when they matter on Mars.
import { groupedBody, wireTableGroups } from "../../../ui/tablegroups";
import { utTex } from "../../../export/labels"; // plot-export legend: the slider value
import { terseQuantity } from "../../../ui/terse";
import { storageKey } from "../../../body";
import type { CellData } from "../../../cell/cellstore";
import { cellFromIndex, type Grid } from "../../../cell/snap";
import { fieldValue } from "../../../cell/cellstore";
import { EXCESS_CLASSES, EXCESS_COLORS, FLUX_MODES, MODE_DEFINED_BY, MODE_KEYS, MODE_STYLE, ROSE_ARROW_KEYS, modeDefined, type FluxMode, type ModeKey } from "../../../cell/analysis";
import { roseSvg, SPEED_COLORS, roseBinChoices, type RoseSvgOptions } from "../../../cell/roses";
import { modesPlotSvg } from "../../../cell/modesplot";
import { DARK_THEME, LIGHT_THEME, seriesColor, type PlotTheme } from "../../../cell/plottheme";
import { composePlotSvg, PLOT_BACKGROUND, katexTex, plotFilename, svgToPngBlob, type PlotExportSpec, type PlotKey } from "../../../export/plotExport";
import { downloadBlob } from "../../../export/mapExport";
import { EXPORT_DPI, PLOT_EXPORT_WIDTH } from "../../../export/png";
import { loadMathRenderer, unitsTex, type MathRenderer } from "../../../export/texsvg";
import { EXPORT_TEXT } from "./helpText";
import { fieldSeries, PLOT_STORAGE, plotQuantities, plotSlug, qplotNotes, qplotSvg, resolvePlot, valueText, type PlotQuantity, type QPlotAxis } from "../../../cell/qplot";
import { AUX_META } from "../cell/auxinfo";
import { datasetInfo, type DatasetInfo } from "../cell/datasetinfo";
import { fieldInfo } from "../../../cell/fieldinfo";
import { latLonText, triggerDownload } from "../../../cell/downloads";
import { cellDataset, cellNetcdf, csvBundle, exportBaseName, type ExportMeta } from "../cell/export";
import { CELL_SOURCE_IDS } from "../citation";
import { citationHtml, citationSources, citationText } from "../../../cell/citation";
import { isPublishedField } from "../../../util/constants";
import { compassPoint } from "../../../util/angles";
import { escapeHtml, fmtLat, fmtLon, fmtNum, MISSING } from "../../../util/format";
import { mathHtml, mathOnly, textOnly } from "../../../util/math";
import { formatUt, thresholdControl } from "../../../ui/threshold"; // Mars grain-size control via the checked patches of ui/threshold.ts
import type { ThresholdDef } from "../../../registry/types";
import type { Store } from "../../../store";
import { h, nextId } from "../../../ui/dom";
import { CENTRE_ICON } from "../../../map/centre";
import { axisReserve, bearingReserve, FMTNUM_WIDEST, lazyWidth, live, reserveCh } from "../../../ui/livenum";
import { thresholdStats } from "../cell/marsflux";
import { M } from "../../../cell/marsphysics";
import type { MarsCellData, MarsCellStore, MarsCellStoreAttrs } from "../cell/cellstore";
import { analyseMarsCell, type MarsCellView } from "../cell/analysis";
import { MARS_SPEED_EDGES, speedClassLabels } from "../cell/marsflux";
import { MARS_GRID } from "../body";

type CellView = MarsCellView;
type CellStoreAttrs = MarsCellStoreAttrs;
/** radius / x axis of the d plots: log10(d / µm) (the 64 values are log-spaced) */
const logD = (d: ArrayLike<number>) => Array.from(d, (x) => Math.log10(x));
const fmtUt = (v: number) => `${v.toFixed(2)} m/s`;
/** citation file of a cell download (TXT, clipboard) */
function citationFile(cell: { lat: number; lon: number }, datasetId?: string, setting?: string): string {
  const ds = datasetInfo(datasetId);
  // centre with hemisphere letters, the wind dataset and the grain size the values are taken at
  return citationText([`Mars Dune Atlas (map.geomorphlab.org/mars), ${ds.name} ${ds.resolution} cell, centre ${latLonText(cell.lat, cell.lon)}`,
    `Wind dataset: ${ds.name} ${ds.resolution}, ${ds.period}`, ...(setting ? [`Values at ${setting}`] : [])].join("\n"), citationSources(CELL_SOURCE_IDS, datasetId));
}

export interface FieldLabel {
  /** TeX symbol (without $), "" if none */
  symbolTex: string;
  /** plain-language quantity name */
  quantity: string;
}

export interface CellPanelOptions {
  windSectors: number;
  fluxSectors: number;
  onClose: () => void;
  /** labels for the summary table (from the registry titles / source long names) */
  fieldLabel?: (v: string) => FieldLabel;
  /** dataset id / title / version and the cell permalink for the downloads */
  exportMeta?: () => Omit<ExportMeta, "storeAttrs" | "generated">;
  /** if given, a compact synced u*,th control is shown at the top of the panel */
  threshold?: { def: ThresholdDef; store: Store };
  /** short link to the current view (plot exports) */
  shareLink?: () => string;
  /** 'Centre map on this cell' (header button next to the title; map/centre.ts) */
  onCentre?: (c: { lon: number; lat: number }) => void;
  /** quantity of the "<quantity> vs grain diameter" plot (app state plotY: share links; cell/qplot.ts) */
  plot?: { get(): string | undefined; set(id: string): void };
}

const deg = (v: number) => (Number.isFinite(v) ? `${v.toFixed(0)}° (${compassPoint(v)})` : MISSING);
/** a mode's readout: bearings with their compass point; the αH axis (0–180°) without one */
const modeDeg = (k: ModeKey, v: number) => (k !== "ab" ? deg(v) : Number.isFinite(v) ? `${v.toFixed(0)}° (axis)` : MISSING);
const BEARING_W = lazyWidth(() => bearingReserve(deg));
/** widest cell title, e.g. "89.9°S, 179.9°W" (ui/livenum.ts width estimate) */
const TITLE_W = lazyWidth(() => reserveCh([`${fmtLat(-89.9)}, ${fmtLon(-179.9)}`], true));
/** plain-text units for width estimates (TeX / KaTeX markup dropped) */
const plainUnits = (u: string) => u.replace(/\$|\\mathrm|[{}]|\\,/g, "").replace(/\^2/g, "²").replace(/\^\{?-1\}?/g, "⁻¹");
/** Fixed formats of the per-hour threshold statistics (computed per d in the browser, so their 64 values
 *  are not at hand): widest possible text of each (u*,th < 10 m/s, wind < 100 m/s, percentages). */
const STAT_W = {
  ut: lazyWidth(() => reserveCh([fmtUt(9.99), MISSING], true)),
  range: lazyWidth(() => reserveCh([`${(9.99).toFixed(2)}–${(9.99).toFixed(2)}&nbsp;m/s`, MISSING])),
  wind: lazyWidth(() => reserveCh([`${(99.9).toFixed(1)}&nbsp;m/s`, MISSING])),
  pct: lazyWidth(() => reserveCh([`${(100).toFixed(1)}&nbsp;%`, MISSING])),
  pct2: lazyWidth(() => reserveCh([`${(100).toFixed(2)}&nbsp;%`, MISSING])),
};
/** Slider-stable slot widths of one cell (ui/livenum.ts): from its 64 stored values where they exist,
 *  else from the widest text of the quantity's fixed format. `invalid`: the cell has hours outside the
 *  transport law's validity at the smallest d (the fraction only decreases with d: Ga grows with d), so
 *  the validity clause is shown at every d (0.00 % where none) and the sentence keeps its length. */
interface Reserves { ut: number; dp: number; rdp: number; ratio: number; total: number; dpTotal: number; qsdiv: number; invalid: boolean }
const RESERVES = new WeakMap<MarsCellData, Reserves>();
function reserves(cell: MarsCellData, dValues: ArrayLike<number>): Reserves {
  let r = RESERVES.get(cell);
  if (r) return r;
  const n = dValues.length, f = (id: string, k: number, scale = 1) => fmtNum(fieldValue(cell, id, k) * scale);
  const q = cell.aux?.series.qsdiv;
  r = {
    ut: axisReserve(n, (k) => formatUt(dValues[k])),
    dp: axisReserve(n, (k) => `${f("dpm", k, M.S2Y)}&nbsp;m²/yr`),
    rdp: axisReserve(n, (k) => `${f("rdpm", k, M.S2Y)}&nbsp;m²/yr`),
    ratio: axisReserve(n, (k) => f("qha_rdp_dp", k)),
    total: reserveCh([...FMTNUM_WIDEST.map((x) => `${x}&nbsp;m²/yr.`), `${MISSING}.`]),
    dpTotal: axisReserve(n, (k) => `${f("dpm", k, M.S2Y)}&nbsp;m²/yr.`, [`${MISSING}.`]),
    qsdiv: q ? axisReserve(n, (k) => `${fmtNum(q[k] * 1000)}&nbsp;m/kyr.`, [`${MISSING}.`]) : 0,
    invalid: cell.series.u.length > 0 && thresholdStats(cell.series, cell.dValuesUm[0]).fracInvalid > 0,
  };
  RESERVES.set(cell, r);
  return r;
}

/** vegetation cover caveat (Earth table only; exported for the shared module interface) */
export const VEG_CAVEAT = "Total cover includes non-photosynthetic vegetation (dry and dead plant material) as well as green vegetation, so it can be substantial where little green vegetation is visible; compare it with the aridity index.";

/** the stored choice of the plotted quantity (per body) */
export const readPlotChoice = (): string | undefined => { try { return localStorage.getItem(storageKey(PLOT_STORAGE)) ?? undefined; } catch { return undefined; } };
/** notes of the quantity plot */
const QSDIV_NOTE = "Negative values (flux convergence) imply deposition. Divergence of the time-averaged flux vector (RDP, RDD) on the Mars sphere (R = 3389.5 km) following Gunn (2026), Methods M6.";
const UT_MEDIAN_NOTE = "Median over the hours of the threshold friction velocity of each hour, from d and that hour's air density and temperature (Pähtz & Durán 2023).";
/** slot width of the plot's live value: the widest of the cell's 64 values of that quantity (ui/livenum.ts) */
const PLOT_RESERVES = new WeakMap<object, Map<string, number>>();
function plotReserve(cell: object, q: PlotQuantity, ys: number[]): number {
  let m = PLOT_RESERVES.get(cell);
  if (!m) PLOT_RESERVES.set(cell, (m = new Map()));
  let w = m.get(q.id);
  if (w === undefined) m.set(q.id, (w = reserveCh([...ys.map((y) => `${valueText(q, y)}.`), `${MISSING}.`])));
  return w;
}
/** median threshold friction velocity at every grain size (computed once per cell, when first plotted) */
const UT_MEDIAN = new WeakMap<object, number[]>();
function utMedianSeries(cell: MarsCellData): number[] {
  let s = UT_MEDIAN.get(cell);
  if (!s) UT_MEDIAN.set(cell, (s = cell.dValuesUm.map((d) => thresholdStats(cell.series, d).utMedian)));
  return s;
}

/** Default table labels from the source metadata: symbol = math part, quantity = text part. */
export function defaultFieldLabel(v: string): FieldLabel {
  const info = fieldInfo(v);
  const quantity = terseQuantity(textOnly(info.longName) || textOnly(info.description).split(".")[0] || "");
  return { symbolTex: mathOnly(info.longName), quantity };
}

/** Collapsible panel sections in panel order (every section heading is a disclosure, open by default; a
 *  collapse / expand is remembered in localStorage under duneAtlasMars.cellPanel.<key>Open). The summary table is
 *  back after the plots, without the key-numbers box; its rows fold in groups (ui/tablegroups.ts). */
export const PANEL_SECTIONS = ["windRose", "fluxRose", "modes", "qsdiv", "summary", "downloads"] as const;
export type PanelSection = (typeof PANEL_SECTIONS)[number];
export const sectionOpenKey = (k: PanelSection) => storageKey(`cellPanel.${k}Open`); // per body (body.ts)
/** cell-centre coordinate: up to 2 decimals (0.1° and 0.25° centres exact), no trailing zeros */
const SUP: Record<string, string> = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
/** number as plain text (exports): 3 significant digits, ×10ⁿ outside 0.01 .. 10⁴ */
export function fmtPlain(v: number): string {
  if (!Number.isFinite(v)) return MISSING;
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e4 || a < 1e-2)) { const [m, e] = v.toExponential(2).split("e"); return `${Number(m)}×10${String(Number(e)).replace(/./g, (c) => SUP[c] ?? c)}`; }
  return String(Number(v.toPrecision(3)));
}
const coord = (v: number) => String(Number(v.toFixed(2)));
/** Same location: either cell centre lies inside the other cell (cell sizes from the grids). */
export function sameLocation(a: { lat: number; lon: number; grid?: Grid }, b: { lat: number; lon: number }, gb: Grid): boolean {
  const ha = a.grid ? Math.abs(a.grid.dlat) / 2 : 0, hb = Math.abs(gb.dlat) / 2;
  const wa = a.grid ? Math.abs(a.grid.dlon) / 2 : 0, wb = Math.abs(gb.dlon) / 2;
  const dLat = Math.abs(a.lat - b.lat), dLon0 = Math.abs(a.lon - b.lon) % 360, dLon = Math.min(dLon0, 360 - dLon0);
  return dLat <= Math.max(ha, hb) + 1e-9 && dLon <= Math.max(wa, wb) + 1e-9;
}
export const MODES_OPEN_KEY = sectionOpenKey("modes");
const SECTION_DEFAULT_OPEN: Record<PanelSection, boolean> = { windRose: true, fluxRose: true, modes: true, qsdiv: true, summary: true, downloads: true };
function readSectionOpen(): Record<PanelSection, boolean> {
  const out = { ...SECTION_DEFAULT_OPEN };
  for (const k of PANEL_SECTIONS) {
    try { const v = localStorage.getItem(sectionOpenKey(k)); if (v === "0" || v === "1") out[k] = v === "1"; } catch { /* private mode */ }
  }
  return out;
}
const WIDTH_KEY = storageKey("cellPanel.width"), HEIGHT_KEY = storageKey("cellPanel.height");
export const PANEL_MIN_W = 320;
const isNarrow = () => !!globalThis.matchMedia?.("(max-width: 720px)").matches;

function binSlider(label: string, value: number, choices: number[], onChange: (n: number) => void): HTMLElement {
  const id = nextId("bins");
  const v0 = choices.includes(value) ? value : choices[Math.min(1, choices.length - 1)];
  const input = h("input", { type: "range", id, min: 0, max: choices.length - 1, step: 1, value: choices.indexOf(v0) }) as HTMLInputElement;
  const out = h("output", { for: id }, String(v0));
  input.setAttribute("aria-valuetext", `${v0} sectors`);
  input.addEventListener("input", () => {
    const n = choices[Number(input.value)];
    out.textContent = String(n);
    input.setAttribute("aria-valuetext", `${n} sectors`);
    onChange(n);
  });
  return h("div", { class: "bin-row" }, h("label", { for: id }, label), input, out);
}

export class CellPanel {
  #root: HTMLElement;
  #content: HTMLElement | null = null;
  /** the scrolling element (persistent while the panel is open) */
  #scroll: HTMLElement | null = null;
  #cell: MarsCellData | null = null;
  #utIndex: number;
  #req = 0;
  #opts: CellPanelOptions;
  #windBins: number;
  #fluxBins: number;
  #fluxAxis: "pct" | "abs" = "pct";
  /** open state of the collapsible sections (localStorage) */
  #open = readSectionOpen();
  /** a collapsible section: <details> whose <summary> holds the section's <h3> heading */
  #section(key: PanelSection, cls: string, title: HTMLElement, ...children: (Node | null | undefined)[]) {
    const det = h("details", { class: `section ${cls}`, "data-section": key, open: this.#open[key] }, h("summary", {}, title), ...children);
    det.addEventListener("toggle", () => {
      this.#open[key] = det.open;
      try { localStorage.setItem(sectionOpenKey(key), det.open ? "1" : "0"); } catch { /* ignore */ }
    });
    return det;
  }
  #storeAttrs: Partial<CellStoreAttrs> | undefined;
  #dyn: Record<string, HTMLElement> = {};
  /** export specs of the plots as last rendered (same settings as on screen) */
  #plots: Partial<Record<PlotKey, PlotExportSpec>> = {};
  #lastView: CellView | null = null;
  /** compact u*,th control, created once and re-used across cells (one store subscription) */
  #thr: HTMLElement | null = null;
  #fluxMode: FluxMode = "flat";
  /** quantity of the "<quantity> vs grain diameter" plot (null: the app state / stored choice / DP) */
  #plotY: string | null = null;
  #plotName = "dp-vs-grain-diameter";
  #plotGroups(cell: MarsCellData) {
    const q = cell.aux?.series.qsdiv;
    return plotQuantities(cell.fieldVars.filter(isPublishedField), [...(q && Array.from(q).some(Number.isFinite) ? ["qsdiv"] : []), ...(cell.series.u.length ? ["ut_median"] : [])]);
  }
  #plotQ(cell: MarsCellData) { return resolvePlot(this.#plotGroups(cell), this.#plotY ?? this.#opts.plot?.get() ?? readPlotChoice()); }
  #plotSeries(cell: MarsCellData, q: PlotQuantity, n: number): number[] {
    if (q.id === "qsdiv") return Array.from({ length: n }, (_, k) => (cell.aux?.series.qsdiv?.[k] ?? NaN) * 1000);
    if (q.id === "ut_median") return utMedianSeries(cell);
    return fieldSeries(cell as unknown as CellData, q.id, n);
  }
  #setPlot(id: string) {
    this.#plotY = id;
    try { localStorage.setItem(storageKey(PLOT_STORAGE), id); } catch { /* private mode */ }
    this.#opts.plot?.set(id);
    this.update();
  }
  /** the app state changed the plotted quantity (share link, another control) */
  setPlotQuantity(id: string | undefined) { if (!id || id === this.#plotY) return; this.#plotY = id; this.update(); }
  #handle: HTMLElement;
  #figSize = 260;
  #ro: ResizeObserver | null = null;
  #roTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, utIndex: number, opts: CellPanelOptions) {
    this.#root = root;
    this.#utIndex = utIndex;
    this.#opts = opts;
    this.#windBins = opts.windSectors;
    this.#fluxBins = opts.fluxSectors;
    this.#handle = this.#makeResizeHandle();
    this.#restoreSize();
    if (typeof ResizeObserver !== "undefined") {
      this.#ro = new ResizeObserver(() => {
        clearTimeout(this.#roTimer);
        this.#roTimer = setTimeout(() => this.#onResize(), 120);
      });
      this.#ro.observe(root);
    }
  }

  /** figure size (px) for the current panel width */
  #sizeFor(width: number): number {
    return Math.round(Math.max(220, Math.min(560, width - 28)));
  }

  #onResize() {
    const w = this.#root.clientWidth;
    if (!w) return;
    const s = this.#sizeFor(w);
    if (Math.abs(s - this.#figSize) >= 8) { this.#figSize = s; this.update(); }
  }

  #restoreSize() {
    try {
      const w = Number(localStorage.getItem(WIDTH_KEY));
      if (w >= PANEL_MIN_W) document.documentElement.style.setProperty("--cell-w", `${w}px`);
      const hh = Number(localStorage.getItem(HEIGHT_KEY));
      if (hh > 0) document.documentElement.style.setProperty("--cell-h", `${hh}vh`);
    } catch { /* no storage */ }
  }

  /** Drag handle: left edge (desktop, width) or top edge (bottom sheet, height). Keyboard:
   *  arrow keys resize by 20 px / 5 vh. */
  #makeResizeHandle(): HTMLElement {
    const hd = h("div", { class: "resize-handle", role: "separator", tabindex: "0", "aria-orientation": "vertical", "aria-label": "Resize panel (drag, or use the arrow keys)" });
    const setW = (w: number) => {
      const max = Math.max(PANEL_MIN_W, 0.7 * window.innerWidth);
      const v = Math.round(Math.max(PANEL_MIN_W, Math.min(max, w)));
      document.documentElement.style.setProperty("--cell-w", `${v}px`);
      try { localStorage.setItem(WIDTH_KEY, String(v)); } catch { /* ignore */ }
    };
    const setH = (vh: number) => {
      const v = Math.round(Math.max(25, Math.min(90, vh)));
      document.documentElement.style.setProperty("--cell-h", `${v}vh`);
      try { localStorage.setItem(HEIGHT_KEY, String(v)); } catch { /* ignore */ }
    };
    let start: { x: number; y: number; w: number; h: number } | null = null;
    hd.addEventListener("pointerdown", (e) => {
      start = { x: e.clientX, y: e.clientY, w: this.#root.getBoundingClientRect().width, h: this.#root.getBoundingClientRect().height };
      hd.setPointerCapture?.(e.pointerId);
      document.body.classList.add("resizing");
      e.preventDefault();
    });
    hd.addEventListener("pointermove", (e) => {
      if (!start) return;
      if (isNarrow()) setH(((start.h + (start.y - e.clientY)) / window.innerHeight) * 100);
      else setW(start.w + (start.x - e.clientX));
    });
    const end = (e: PointerEvent) => { start = null; hd.releasePointerCapture?.(e.pointerId); document.body.classList.remove("resizing"); };
    hd.addEventListener("pointerup", end);
    hd.addEventListener("pointercancel", end);
    hd.addEventListener("keydown", (e) => {
      const r = this.#root.getBoundingClientRect();
      if (isNarrow()) {
        if (e.key === "ArrowUp") setH((r.height / window.innerHeight) * 100 + 5);
        else if (e.key === "ArrowDown") setH((r.height / window.innerHeight) * 100 - 5);
        else return;
      } else {
        if (e.key === "ArrowLeft") setW(r.width + 20);
        else if (e.key === "ArrowRight") setW(r.width - 20);
        else return;
      }
      e.preventDefault();
    });
    return hd;
  }

  close() {
    this.#req++;
    this.#cell = null;
    this.#root.hidden = true;
    this.#root.replaceChildren();
    this.#content = null;
    document.body.classList.remove("cell-open");
  }

  /** Show a cell. Re-showing the same location (the same cell, or the cell of another wind dataset
   *  that contains the shown centre - a dataset switch) keeps the current content until the new
   *  data are in, then re-renders at the same scroll position; another location starts at the top.
   *  Collapsed sections are kept in both cases (#open). */
  async show(store: MarsCellStore | Promise<MarsCellStore>, iy: number, ix: number) {
    const req = ++this.#req;
    this.#root.hidden = false;
    document.body.classList.add("cell-open");
    const prev = this.#cell && this.#content?.isConnected && this.#scroll ? { cell: this.#cell, scrollTop: this.#scroll.scrollTop } : null;
    const loading = () => { this.#frame({ iy, ix }).innerHTML = `<p class="status" role="status">Loading ${this.#ds().name} data for this cell…</p>`; };
    if (prev) this.#setBusy(true);
    else loading();
    try {
      const s = await store;
      if (req !== this.#req) return;
      let same = false;
      const g = s.grid ?? prev?.cell.grid ?? MARS_GRID;
      try { same = !!prev && sameLocation(prev.cell, cellFromIndex(iy, ix, g), g); } catch { /* index outside the grid: query reports it */ }
      if (prev && !same) { this.#setBusy(false); loading(); }
      const t0 = performance.now();
      const cell = await s.query(iy, ix);
      if (req !== this.#req) return;
      this.#cell = cell;
      this.#storeAttrs = s.attrs;
      this.render(same ? prev!.scrollTop : 0);
      this.#root.dataset.loadMs = String(Math.round(performance.now() - t0));
    } catch (e) {
      if (req !== this.#req) return;
      this.#setBusy(false);
      this.#frame({ iy, ix }).innerHTML = `<p class="status error" role="alert" title="${escapeHtml(String((e as Error)?.message ?? e))}">The data for this cell could not be loaded. Click the cell again to retry.</p>`;
    }
  }

  setThreshold(i: number) {
    this.#utIndex = i;
    if (this.#cell?.hasData) this.update();
  }

  /** header + (persistent) compact threshold + empty content container */
  #frame(c: { iy: number; ix: number; lat?: number; lon?: number }): HTMLElement {
    const close = h("button", { type: "button", class: "close", "aria-label": "Close cell panel" }, "×");
    close.addEventListener("click", () => this.#opts.onClose());
    const title = c.lat !== undefined && c.lon !== undefined ? `${fmtLat(c.lat)}, ${fmtLon(c.lon)}` : `Cell ${c.iy}, ${c.ix}`;
    // title in a reserved, non-wrapping width (the widest coordinate text) so the centre button next to it never
    // moves between cells and the header keeps one line (embed / narrow layouts: the title ellipsises)
    const h2 = h("h2", { id: "cell-title", style: `flex: 0 1 ${TITLE_W()}ch; min-width: 0` }, title);
    const titleRow = h("div", { class: "cell-title-row" }, h2);
    if (this.#opts.onCentre && c.lat !== undefined && c.lon !== undefined) {
      const at = { lon: c.lon, lat: c.lat };
      const btn = h("button", { type: "button", class: "centre-btn", "aria-label": "Centre map on this cell", title: "Centre map on this cell", html: CENTRE_ICON });
      btn.addEventListener("click", () => this.#opts.onCentre!(at));
      titleRow.append(btn);
    }
    const head = h("header", { class: "cell-head" }, titleRow, close);
    this.#root.setAttribute("aria-labelledby", "cell-title");
    const content = h("div", { class: "cell-body" });
    const kids: HTMLElement[] = [head];
    if (this.#opts.threshold) {
      this.#thr ??= h("div", { class: "cell-threshold" }, thresholdControl(this.#opts.threshold.def, this.#opts.threshold.store, { compact: true, idPrefix: "cell-" }));
      kids.push(this.#thr);
    }
    kids.push(content);
    // the handle sits outside the scrolling area so it spans the full panel edge; the scrolling
    // element is kept across re-renders (its scroll position is restored by render)
    if (!this.#scroll || this.#scroll.parentElement !== this.#root) {
      this.#scroll = h("div", { class: "cell-scroll" });
      this.#root.replaceChildren(this.#handle, this.#scroll);
    }
    this.#scroll.replaceChildren(...kids);
    this.#content = content;
    return content;
  }

  #setBusy(on: boolean) {
    if (!this.#content) return;
    this.#content.classList.toggle("busy", on);
    if (on) this.#content.setAttribute("aria-busy", "true"); else this.#content.removeAttribute("aria-busy");
  }

  /** set the scroll position after a re-render; again after layout settles (fonts, KaTeX) if it
   *  was clamped by a not yet complete layout */
  #restoreScroll(top: number) {
    const el = this.#scroll;
    if (!el) return;
    el.scrollTop = top;
    if (top > 0) globalThis.requestAnimationFrame?.(() => { if (this.#scroll === el && el.scrollTop < top - 1) el.scrollTop = top; });
  }

  /** build all sections for the current cell; keeps the scroll position unless `scrollTop` is given */
  render(scrollTop: number = this.#scroll?.scrollTop ?? 0) {
    this.#renderBody();
    this.#restoreScroll(scrollTop);
  }

  #renderBody() {
    const cell = this.#cell!;
    const body = this.#frame(cell);
    if (!cell.hasData) {
      const ds = this.#ds(cell);
      body.innerHTML = `<div class="empty-state"><p><strong>No ${escapeHtml(ds.name)} data for this cell</strong></p>
        <p>Every Mars cell should carry the hourly wind series; this one has no valid hours in the store (missing or damaged shard). Choose a nearby cell.</p>
        <p class="help">${ds.resolution} cell: row ${cell.iy}, column ${cell.ix}; centre ${fmtLat(cell.lat)}, ${fmtLon(cell.lon)}.</p></div>`;
      return;
    }
    const d = (k: string, tag: keyof HTMLElementTagNameMap = "div", cls = "") => (this.#dyn[k] = h(tag, { class: cls }));
    this.#dyn = {};
    // meta: dune badge and the grain-size / per-hour threshold lines (the summary table follows the plots)
    body.append(h("p", { class: "cell-meta", html: cell.dune ? '<span class="badge dune">Dunes present</span>' : '<span class="badge">No dunes mapped</span>' }, d("meta", "span", "meta-lines")));
    // wind rose
    const edges = MARS_SPEED_EDGES;
    const choices = roseBinChoices(cell.bins.uaCentres.length);
    if (!choices.includes(this.#windBins)) this.#windBins = choices[Math.min(1, choices.length - 1)];
    if (!choices.includes(this.#fluxBins)) this.#fluxBins = choices[Math.min(2, choices.length - 1)];
    this.#figSize = this.#sizeFor(this.#root.clientWidth || 390);
    body.append(this.#section("windRose", "fig wind", h("h3", { id: "wr-h" }, "Wind rose"),
      binSlider("Sectors", this.#windBins, choices, (n) => { this.#windBins = n; this.update(); }),
      d("windSvg", "div", "fig-svg"),
      h("ul", { class: "fig-legend", html: speedClassLabels(edges).map((lab, k) => `<li><span class="swatch" style="background:${SPEED_COLORS[k]}"></span>${lab}</li>`).join("") + "<li>m/s, lowest model level</li>" }),
      d("windCap", "p", "caption"), this.#exportMenu("wind-rose")));
    // flux rose
    const axisName = nextId("faxis");
    const axisSel = h("div", { class: "axis-toggle", role: "radiogroup", "aria-label": "Flux rose radial axis" },
      ...(["pct", "abs"] as const).map((v) => {
        const id = nextId("fa");
        const r = h("input", { type: "radio", name: axisName, id, value: v, checked: this.#fluxAxis === v }) as HTMLInputElement;
        r.addEventListener("change", () => { if (r.checked) { this.#fluxAxis = v; this.update(); } });
        return h("label", { for: id, class: "inline" }, r, v === "pct" ? " % of total" : " m²/yr");
      }));
    const modeSel = h("select", { "aria-label": "Flux rose mode" }, ...FLUX_MODES.map((m) => h("option", { value: m.id }, m.label))) as HTMLSelectElement;
    modeSel.value = this.#fluxMode;
    modeSel.addEventListener("change", () => { this.#fluxMode = modeSel.value as FluxMode; this.update(); });
    body.append(this.#section("fluxRose", "fig flux", h("h3", { id: "fr-h" }, "Sand flux rose (time-averaged, transport toward)"),
      h("label", { class: "inline" }, "Flux ", modeSel),
      binSlider("Sectors", this.#fluxBins, choices, (n) => { this.#fluxBins = n; this.update(); }),
      axisSel,
      d("fluxSvg", "div", "fig-svg"),
      d("fluxClassLegend", "ul", "fig-legend"),
      d("fluxLegend", "ul", "fig-legend arrows"),
      d("fluxKv", "dl", "kv"),
      d("fluxCap", "p", "caption"), this.#exportMenu("flux-rose")));
    // modes (polar)
    body.append(this.#section("modes", "fig modes", h("h3", { id: "md-h", html: `Modes vs grain diameter (polar: angle = direction, radius = ${mathHtml("$d$")}, log scale)` }),
      d("modesSvg", "div", "fig-svg"),
      h("ul", { class: "fig-legend arrows", html: MODE_KEYS.map((k) => { const s = MODE_STYLE[k]; return `<li><svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${s.color}" stroke-width="2" ${"dash" in s ? `stroke-dasharray="${s.dash}"` : ""}/></svg>${mathHtml(s.tex)} ${escapeHtml(s.label.replace(/^\S+ /, ""))}</li>`; }).join("") }),
      d("modesCap", "p", "caption"), this.#exportMenu("modes")));
    // "<quantity> vs grain diameter" (cell/qplot.ts): a y-axis selector, DP by default; the
    // section keeps its id "qsdiv" (stored open state, links)
    const groups = this.#plotGroups(cell);
    const qsel = h("select", { class: "qplot-select", "aria-label": "Quantity plotted against the grain diameter" },
      ...groups.map((g) => h("optgroup", { label: g.title }, ...g.items.map((q) => h("option", { value: q.id }, q.title))))) as HTMLSelectElement;
    qsel.addEventListener("change", () => this.#setPlot(qsel.value));
    body.append(this.#section("qsdiv", "fig qsdiv", d("qsdivHead", "h3"), h("label", { class: "inline qplot-row" }, "Plot ", qsel),
      d("qsdivSvg", "div", "fig-svg"), d("qsdivCap", "p", "caption"), this.#exportMenu("qsdiv")));
    this.#dyn.qplotSel = qsel;
    this.#dyn.qsdivHead.id = "qd-h";
    // summary table (rows in collapsible groups), then downloads
    body.append(this.#section("summary", "summary", d("tableHead", "h3"), d("table", "div", "table-wrap"),
      h("p", { class: "caption" }, "Angles are compass bearings of the transport direction; fluxes converted from m²/s to m²/yr; — = not defined (e.g. no crest flux).")));
    wireTableGroups(this.#dyn.table);
    body.append(this.#downloads(cell));
    this.#dyn.tableHead.id = "tb-h";
    this.update();
  }

  /** refresh the parts that depend on threshold / bins / axis */
  update() {
    const cell = this.#cell;
    if (!cell || !cell.hasData || !this.#content) return;
    const v = analyseMarsCell(cell, this.#utIndex, { windSectors: this.#windBins, fluxSectors: this.#fluxBins, fluxMode: this.#fluxMode });
    const size = this.#figSize;
    const ua = cell.bins.uaCentres;
    const D = this.#dyn;
    const st = v.stats;
    const R = reserves(cell, v.utValues);
    const num = (x: number, digits: number, unit = "") => (Number.isFinite(x) ? `${x.toFixed(digits)}${unit}` : MISSING);
    const dsk = this.#ds(cell);
    // one value per row, each slot at the end of its row (no hole beside a shorter value; ui/livenum.ts)
    // the per-hour threshold lines (no box): one statement per line, its varying-length
    // value at the end (no hole; ui/livenum.ts)
    const line = (k: string, val: string) => `<span class="meta-line">${k}: ${val}</span>`;
    D.meta.innerHTML = [
      line(`Grain diameter ${mathHtml("$d$")}`, `<strong>${live(formatUt(v.ut), R.ut, "left")}</strong>`),
      line(`Threshold ${mathHtml("$u_{*,th}$")}, median over the hours`, `<strong>${live(Number.isFinite(st.utMedian) ? fmtUt(st.utMedian) : MISSING, STAT_W.ut(), "left")}</strong>`),
      line(`${mathHtml("$u_{*,th}$")}, 5–95 % of the hours`, live(Number.isFinite(st.utP05) ? `${st.utP05.toFixed(2)}–${st.utP95.toFixed(2)}&nbsp;m/s` : MISSING, STAT_W.range(), "left")),
      line(`Lowest-level wind at threshold (median height ${st.zMedian.toFixed(2)} m)`, `≈ ${live(num(v.thresholdWind10m, 1, "&nbsp;m/s"), STAT_W.wind(), "left")}`),
      line("Hours above threshold", live(num(100 * st.fracAbove, 1, "&nbsp;%"), STAT_W.pct(), "left")),
      ...(R.invalid ? [line("Hours outside the transport law's validity (Ga√s ≤ 81)", live(num(100 * st.fracInvalid, 2, "&nbsp;%"), STAT_W.pct2(), "left"))] : []),
    ].join("");
    const windOpts: RoseSvgOptions = {
      id: "wind-rose", values: v.windRose.freq, colors: SPEED_COLORS, title: "Wind rose",
      desc: `Frequency of the hourly lowest-level winds by the direction they blow from, ${v.windRose.sectors} sectors, stacked by speed class; one Mars year; sums to 100 %.`,
      ringFormat: (x: number) => `${x}%`, axisLabel: "% of hours", size, uaCentres: ua,
    };
    D.windSvg.innerHTML = roseSvg(windOpts);
    this.#lastView = v;
    const dsw = this.#ds(cell);
    D.windCap.textContent = `Direction the wind blows FROM (meteorological), ${v.windRose.sectors} sectors of ${360 / v.windRose.sectors}°; radius = % of the ${v.windRose.totalHours.toLocaleString("en")} hourly samples (sums to 100 %). ${dsw.name} lowest-level wind (height in this cell ${v.stats.zMin.toFixed(2)}–${v.stats.zMax.toFixed(2)} m), ${dsw.period}.`;
    const s = MODE_STYLE;
    const arrows = ROSE_ARROW_KEYS.map((k) => ({ bearing: v.modes[k], color: s[k].color, label: `${s[k].label}: ${modeDeg(k, v.modes[k])}`, axis: k === "ab", dash: "dash" in s[k] ? (s[k] as { dash: string }).dash : undefined }));
    const pct = this.#fluxAxis === "pct";
    const anyFlux = v.fluxSectors.some((x) => x > 0);
    const w = 360 / v.fluxSectors.length;
    const fluxOpts: RoseSvgOptions = {
      id: "flux-rose", values: pct ? v.fluxStackPct : v.fluxStack, colors: EXCESS_COLORS,
      title: "Sand flux rose (time-averaged, transport toward)",
      desc: `Time-averaged ${v.fluxMode === "flat" ? "flat-bed" : "crest"} sand flux by the direction sand moves toward, ${v.fluxSectors.length} sectors of ${w} degrees, stacked by excess shear ${v.fluxMode === "flat" ? "u*" : "uc"}/u*,th of each hour, ${pct ? "percent of total flux" : "m²/yr"}, at grain diameter d = ${formatUt(v.ut)}.`,
      ringFormat: (x) => (pct ? `${Number(x.toPrecision(2))}%` : `${Number(x.toPrecision(2))}`), arrows,
      centreText: anyFlux ? undefined : "no transport", axisLabel: pct ? "% of total flux" : "m²/yr per sector", size, uaCentres: ua,
    };
    D.fluxSvg.innerHTML = roseSvg(fluxOpts);
    const ratioTex = v.fluxMode === "flat" ? "$u_{*}/u_{*,th}$" : "$u_c/u_{*,th}$";
    D.fluxClassLegend.innerHTML = `<li class="key-label">${mathHtml(ratioTex)}:</li>` + EXCESS_CLASSES.map((c, k) => `<li><span class="swatch" style="background:${EXCESS_COLORS[k]}"></span>${c}</li>`).join("");
    D.fluxLegend.innerHTML = arrows.map((a, i) => `<li><svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${a.color}" stroke-width="2" ${a.dash ? `stroke-dasharray="${a.dash}"` : ""}/></svg>${escapeHtml(s[ROSE_ARROW_KEYS[i]].label)}: ${live(modeDeg(ROSE_ARROW_KEYS[i], v.modes[ROSE_ARROW_KEYS[i]]), BEARING_W(), "left")}</li>`).join("");
    D.fluxKv.innerHTML = `
        <dt>DP</dt><dd>${live(`${fmtNum(v.drift.dp)}&nbsp;m²/yr`, R.dp, "left")}</dd>
        <dt>RDP</dt><dd>${live(`${fmtNum(v.drift.rdp)}&nbsp;m²/yr`, R.rdp, "left")}</dd>
        <dt>RDP/DP</dt><dd>${live(fmtNum(v.drift.ratio), R.ratio, "left")}</dd>
        <dt>RDD</dt><dd>${live(deg(v.drift.rddBearing), BEARING_W(), "left")}</dd>`;
    const fm = FLUX_MODES.find((m) => m.id === v.fluxMode)!;
    const what = v.fluxMode === "flat"
      ? `saturated flat-bed flux (q from ${mathHtml("$u_{*}$")})`
      : `saturated crest flux with speed-up about the mode direction ${mathHtml(v.fluxMode === "elongation" ? "$\\alpha_E$" : "$\\alpha_H$")} at this grain diameter, ${mathHtml("$u_c = u_{*}(1 + \\beta \\, h/w \\, |\\sin(\\theta - \\alpha)|)$")}`;
    // one slot for the total (or —); the note on — is part of the fixed text of the crest modes
    // the total ends the caption's first line (a block), so the room kept for longer values is not a hole
    const totalTxt = live(`${Number.isFinite(v.fluxTotal) ? `${fmtNum(v.fluxTotal)}&nbsp;m²/yr` : MISSING}.`, v.fluxMode === "flat" ? R.dpTotal : R.total, "left");
    D.fluxCap.innerHTML = `<span class="cap-lead"><strong>${escapeHtml(fm.label)}</strong>${v.fluxMode === "flat" ? "" : ` (${MISSING} = mode direction undefined at this grain diameter)`}: ${mathHtml(fm.totalTex)} = ${totalTxt}</span> Direction sand moves TOWARD; ${v.fluxSectors.length} sectors of ${w}°. Radius = ${pct ? "% of the total flux in each sector (sums to 100 %)" : `time-averaged flux in each sector, m²/yr (sums to ${escapeHtml(fm.totalText)})`}. Time-averaged ${what}, Σ<sub>hours</sub> q / N over the ${v.windRose.totalHours.toLocaleString("en")} hourly samples, with ${mathHtml("$u_*$")} of each hour from the lowest-level wind at its height z (smooth-wall mixing-length profile, Pähtz &amp; Durán 2023 eq. 2.2) and the threshold ${mathHtml("$u_{*,th}$")} of each hour from ${mathHtml("$d$")} and that hour's air density and temperature. Colours split each sector by the excess shear ${mathHtml(ratioTex)} of the hours carrying the flux (only ${mathHtml(v.fluxMode === "flat" ? "$u_{*} > u_{*,th}$" : "$u_c > u_{*,th}$")} transports sand). DP, RDP, RDP/DP, RDD and the arrows are the map fields at this grain diameter; a direction is hidden where the flux defining it is zero.`;
    D.modesCap.innerHTML = `Mode bearings (toward) for ${mathHtml("$d$")} = ${formatUt(v.utValues[0])} (centre) to ${formatUt(v.utValues[v.utValues.length - 1])} (rim), radius logarithmic in ${mathHtml("$d$")}; ${mathHtml("$\\alpha_H$")} is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current grain diameter. Where RDP/DP is low (below about 0.3), transport in opposing directions nearly cancels, so RDD is poorly defined and can swing by up to 180° with a small change of grain diameter. The modes depend on the whole flux rose rather than on its resultant: ${mathHtml("$\\alpha_T$")} follows the crest orientation ${mathHtml("$\\alpha_H$")} that maximises gross transport across crests, so it can stay steady and differ from RDD.`;
    const modesOpts = (t: PlotTheme) => ({ x: logD(v.utValues), currentIndex: v.utIndex, size: Math.min(size, 420), theme: t, series: MODE_KEYS.map((k) => ({ label: s[k].label, color: seriesColor(s[k].color, t), dash: "dash" in s[k] ? (s[k] as { dash: string }).dash : undefined, values: v.modeSeries[k], axis: k === "ab", width: k === "ao" ? 2.8 : undefined })) });
    D.modesSvg.innerHTML = modesPlotSvg(modesOpts(DARK_THEME));
    // "<quantity> vs grain diameter": title, plot, live value (a slot ending the caption's first line) and notes
    const pq = this.#plotQ(cell), pys = this.#plotSeries(cell, pq, v.utValues.length);
    const pax: QPlotAxis = { x: logD(v.utValues), currentIndex: v.utIndex, word: "grain diameter", xLabel: "d (µm, log scale)", xLabelTex: "$d$ ($\\mathrm{\\mu m}$, log scale)" };
    if ((D.qplotSel as HTMLSelectElement).value !== pq.id) (D.qplotSel as HTMLSelectElement).value = pq.id;
    D.qsdivHead.innerHTML = `${mathHtml(pq.titleTex)} vs grain diameter`;
    D.qsdivSvg.innerHTML = qplotSvg(pq, pys, pax, Math.min(size, 420));
    D.qsdivCap.innerHTML = `<span class="cap-lead">At the current grain diameter: ${live(`${valueText(pq, pys[v.utIndex])}.`, plotReserve(cell, pq, pys), "left")}</span> ${escapeHtml(qplotNotes(pq, pys, pax, pq.id === "qsdiv" ? QSDIV_NOTE : pq.id === "ut_median" ? UT_MEDIAN_NOTE : ""))}`;
    D.tableHead.innerHTML = `Cell summary at ${mathHtml("$d$")} = ${live(formatUt(v.ut), R.ut, "left")}`;
    D.table.innerHTML = this.#table(cell, v);
    // export specs: the same options, re-rendered in the light theme on export
    const L = LIGHT_THEME;
    // export labels: symbols and units as TeX (drawn as SVG paths in the exported images)
    const texLabel = (k: keyof typeof s) => `${s[k].tex}${s[k].label.slice(s[k].label.indexOf(" "))}`;
    const fmTex = fm.label.replace("(αE)", "($\\alpha_E$)").replace("(αH)", "($\\alpha_H$)");
    const perSector = pct ? "% of total flux" : "$\\mathrm{m^{2}\\,yr^{-1}}$ per sector";
    this.#plots = {
      "wind-rose": {
        key: "wind-rose", title: "Wind rose (direction the wind blows from)", thresholdDependent: false, caption: unitsTex(D.windCap.textContent ?? ""),
        svg: (t) => roseSvg({ ...windOpts, id: "x-wind-rose", theme: t }),
        legend: [{ kind: "swatches", items: speedClassLabels(MARS_SPEED_EDGES).map((lab, k) => ({ color: SPEED_COLORS[k], shape: "box" as const, label: `${lab} $\\mathrm{m\\,s^{-1}}$` })) }],
      },
      "flux-rose": {
        key: "flux-rose", title: `Sand flux rose (time-averaged, transport toward): ${fmTex}, ${perSector}`, thresholdDependent: true, caption: unitsTex(katexTex(D.fluxCap)),
        svg: (t) => roseSvg({ ...fluxOpts, id: "x-flux-rose", theme: t, axisLabel: perSector, arrows: arrows.map((a) => ({ ...a, color: seriesColor(a.color, t) })) }),
        legend: [
          { kind: "swatches", items: EXCESS_CLASSES.map((c, k) => ({ color: EXCESS_COLORS[k], shape: "box" as const, label: `${ratioTex} ${c}` })) },
          { kind: "swatches", items: ROSE_ARROW_KEYS.map((k, i) => ({ k, a: arrows[i] })).filter(({ a }) => Number.isFinite(a.bearing)).map(({ k, a }) => ({ color: seriesColor(a.color, L), shape: a.axis ? "line" as const : "arrow" as const, dash: a.dash, label: `${texLabel(k)}: ${modeDeg(k, v.modes[k])}` })) },
          { kind: "text", text: `$DP$ = ${fmtPlain(v.drift.dp)} $\\mathrm{m^{2}\\,yr^{-1}}$ · $RDP$ = ${fmtPlain(v.drift.rdp)} $\\mathrm{m^{2}\\,yr^{-1}}$ · $RDP/DP$ = ${fmtPlain(v.drift.ratio)} · $RDD$ = ${deg(v.drift.rddBearing)} · median $u_{*,th}$ = ${fmtPlain(v.stats.utMedian)} $\\mathrm{m\\,s^{-1}}$` },
        ],
      },
      modes: {
        key: "modes", title: "Dune-orientation modes vs median grain diameter (angle = direction toward, radius = $d$, log scale)", thresholdDependent: true, caption: unitsTex(katexTex(D.modesCap)),
        svg: (t) => modesPlotSvg({ ...modesOpts(t), radiusLabel: "radius: $d$ ($\\mathrm{\\mu m}$, log scale)" }),
        legend: [{ kind: "swatches", items: [...MODE_KEYS.map((k) => ({ color: seriesColor(s[k].color, L), shape: "line" as const, dash: "dash" in s[k] ? (s[k] as { dash: string }).dash : undefined, label: texLabel(k) })), { color: L.current, shape: "line" as const, dash: "4 3", label: utTex(v.ut) }] }],
      },
    };
    this.#plotName = plotSlug(pq, "grain diameter");
    this.#plots.qsdiv = {
      key: "qsdiv", title: `${pq.titleTex} vs median grain diameter $d$`, thresholdDependent: true, caption: unitsTex(katexTex(D.qsdivCap)),
      svg: (t) => qplotSvg(pq, pys, pax, Math.min(size, 420), t, true),
      legend: [{ kind: "swatches", items: [{ color: "#e3a33b", shape: "line", label: `${pq.titleTex}${pq.unitsTex ? ` (${pq.unitsTex})` : ""}` }, { color: "#e3a33b", shape: "dot", label: utTex(v.ut) }] }],
    };
  }

  /** scroll position of the panel content (tour: restored exactly after the example cell) */
  get scrollTop(): number { return this.#scroll?.scrollTop ?? 0; }
  set scrollTop(v: number) { this.#restoreScroll(v); }
  /** the cell shown (null: closed / loading the first cell) */
  get shownCell(): { iy: number; ix: number } | null { return this.#cell ? { iy: this.#cell.iy, ix: this.#cell.ix } : null; }

  /** export spec of a plot as last rendered (tests, exports) */
  plotSpec(key: PlotKey): PlotExportSpec | undefined { return this.#plots[key]; }

  #exportMenu(key: PlotKey): HTMLElement {
    const items = h("div", { class: "export-items" });
    // white background by default, transparent on request
    const tid = nextId("exp-tr");
    const tr = h("input", { type: "checkbox", id: tid, class: "export-transparent" }) as HTMLInputElement;
    for (const [label, fmt] of [[EXPORT_TEXT.png, "png"], [EXPORT_TEXT.svg, "svg"]] as const) {
      const b = h("button", { type: "button", "data-format": fmt }, label);
      b.addEventListener("click", () => { void this.exportPlot(key, fmt, tr.checked); (b.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); });
      items.append(b);
    }
    items.append(h("label", { for: tid, class: "inline" }, tr, ` ${EXPORT_TEXT.plotTransparent}`));
    return h("details", { class: "export-menu", "data-plot": key }, h("summary", { title: "Export this plot (light theme, with data source and link)" }, EXPORT_TEXT.plotMenu), items);
  }

  /** the export file of a plot: name and content (SVG text; PNG is rasterised in the browser) */
  plotExport(key: PlotKey, pxWidth = PLOT_EXPORT_WIDTH, math: MathRenderer | null = null, transparent = false): { name: (ext: "png" | "svg") => string; svg: string; width: number; height: number; plotHeight: number; pxWidth: number; pxHeight: number } | null {
    const spec = this.#plots[key], cell = this.#cell, v = this.#lastView;
    if (!spec || !cell || !v) return null;
    const ds = this.#ds(cell);
    const ctx = { cell: { lat: cell.lat, lon: cell.lon, iy: cell.iy, ix: cell.ix }, dataset: ds, ut: v.ut, shareLink: this.#opts.shareLink?.() ?? globalThis.location?.href ?? "", date: new Date() };
    const out = composePlotSvg(spec, ctx, pxWidth, math, transparent ? null : PLOT_BACKGROUND);
    const fname = (ext: "png" | "svg") => plotFilename(key, ds.id, cell, spec.thresholdDependent ? v.ut : null, ext);
    // the quantity plot's file name follows the selection: ..._dp-vs-grain-diameter_...
    return { ...out, name: (ext) => (key === "qsdiv" ? fname(ext).replace("_qsdiv_", `_${this.#plotName}_`) : fname(ext)) };
  }

  /** SVG (vector, same proportions) or PNG PLOT_EXPORT_WIDTH px wide, tagged 300 dpi */
  async exportPlot(key: PlotKey, fmt: "png" | "svg", transparent = false) {
    const x = this.plotExport(key, PLOT_EXPORT_WIDTH, await loadMathRenderer(), transparent);
    if (!x) return;
    if (fmt === "svg") triggerDownload(x.name("svg"), x.svg, "image/svg+xml");
    else downloadBlob(x.name("png"), await svgToPngBlob(x.svg, x.pxWidth, x.pxHeight, EXPORT_DPI));
  }

  #table(cell: MarsCellData, v: CellView): string {
    const label = this.#opts.fieldLabel ?? defaultFieldLabel;
    const n = v.utValues.length;
    /** value cell of field `id` at slider position k: [html, plain text for the width estimate] */
    const valueAt = (id: string, k: number): [string, string] => {
      const info = fieldInfo(id);
      const raw = fieldValue(cell, id, k);
      const undefinedMode = id in MODE_DEFINED_BY && !modeDefined(cell, id as ModeKey, k);
      const val = Number.isFinite(raw) && !undefinedMode ? info.toDisplay(raw) : NaN;
      const shown = !Number.isFinite(val) ? MISSING
        : info.kind === "direction" || info.kind === "axis" ? `${val.toFixed(1)}°`
        : info.kind === "fraction" ? val.toFixed(3)
        : fmtNum(val);
      const units = info.kind === "direction" || info.kind === "axis" ? info.displayUnits.replace(/^°\s*/, "") : info.displayUnits;
      const withUnit = Number.isFinite(val) && units && units !== "–";
      return [`${shown}${withUnit ? `&nbsp;<span class="unit">${mathHtml(units)}</span>` : ""}`, `${shown}${withUnit ? `&nbsp;${plainUnits(units)}` : ""}`];
    };
    const ids = cell.fieldVars.filter(isPublishedField);
    const qs = cell.aux?.series.qsdiv;
    const qsText = (k: number) => (Number.isFinite(qs![k]) ? `${fmtNum(qs![k] * 1000)}&nbsp;m/kyr` : MISSING);
    // one value-column slot width for every slider-dependent row and every slider position (ui/livenum.ts)
    const W = reserveCh([...ids.flatMap((id) => Array.from({ length: n }, (_, k) => valueAt(id, k)[1])), ...(qs ? Array.from({ length: n }, (_, k) => qsText(k)) : []),
      `${(9.999).toFixed(3)}&nbsp;m/s`]);
    const rows = ids.map((id) => {
      const lab = label(id);
      return `<tr data-field="${id}"><td class="sym">${lab.symbolTex ? mathHtml(`$${lab.symbolTex}$`) : MISSING}</td><th scope="row">${escapeHtml(lab.quantity)}</th><td class="num">${live(valueAt(id, v.utIndex)[0], W)}</td></tr>`;
    }).join("");
    const aux = cell.aux;
    let auxRows = "";
    if (aux) {
      const q = aux.series.qsdiv?.[v.utIndex];
      if (aux.series.qsdiv) auxRows += `<tr data-field="qsdiv"><td class="sym">${mathHtml(`$${AUX_META.qsdiv.symbolTex}$`)}</td><th scope="row" title="Negative values (flux convergence) imply deposition">Saturated flux divergence</th><td class="num">${live(Number.isFinite(q) ? `${fmtNum(q * 1000)}&nbsp;<span class="unit">m/kyr</span>` : MISSING, W)}</td></tr>`;
      const rho = aux.scalars.rho_mean, el = aux.scalars.elev_mean;
      if ("rho_mean" in aux.scalars) auxRows += `<tr data-field="rho_mean"><td class="sym">${mathHtml(`$${AUX_META.rho_mean.symbolTex}$`)}</td><th scope="row" title="Near-surface air density, mean over the year; grain-size independent">Mean air density</th><td class="num">${Number.isFinite(rho) ? `${rho.toPrecision(3)} <span class="unit">kg/m³</span>` : MISSING}</td></tr>`;
      if ("elev_mean" in aux.scalars) auxRows += `<tr data-field="elev_mean"><td class="sym">${mathHtml(`$${AUX_META.elev_mean.symbolTex}$`)}</td><th scope="row" title="Cell mean of the MOLA–HRSC DEM">Elevation</th><td class="num">${Number.isFinite(el) ? `${Math.round(el).toLocaleString("en")} <span class="unit">m</span>` : MISSING}</td></tr>`;
    }
    const ds = this.#ds(cell);
    const extra = `${auxRows}
      <tr data-field="dunes"><td class="sym">${MISSING}</td><th scope="row" title="${escapeHtml(`Yes: ${ds.dunesRule}; value in brackets: dune area fraction of the cell`)}">Dunes present</th><td class="num">${cell.dune ? "yes" : "no"}${cell.dune ? ` <span class="unit">(${(100 * cell.duneFrac).toPrecision(2)} %)</span>` : ""}</td></tr>
      <tr data-field="rho_median"><td class="sym">${mathHtml("$\\rho_f$")}</td><th scope="row" title="Lowest-layer air density, median over the hours">Median air density</th><td class="num">${Number.isFinite(v.stats.rhoMedian) ? `${v.stats.rhoMedian.toPrecision(3)} <span class="unit">kg/m³</span>` : MISSING}</td></tr>
      <tr data-field="ut_median"><td class="sym">${mathHtml("$u_{*,th}$")}</td><th scope="row" title="Threshold friction velocity at this d, median over the hours">Median threshold friction velocity</th><td class="num">${live(Number.isFinite(v.stats.utMedian) ? `${v.stats.utMedian.toFixed(3)}&nbsp;<span class="unit">m/s</span>` : MISSING, W)}</td></tr>
      <tr data-field="centre"><td class="sym">${MISSING}</td><th scope="row" title="Latitude, longitude of the cell centre">Cell centre</th><td class="num">${coord(cell.lat)}°, ${coord(cell.lon)}°</td></tr>`;
    return `<table><thead><tr><th scope="col">Symbol</th><th scope="col">Quantity</th><th scope="col">Value</th></tr></thead>${groupedBody(rows + extra)}</table>`;
  }

  /** the slider setting the cell values are taken at (Citation TXT) */
  #citeSetting(): string { return `median grain diameter d = ${formatUt(this.#lastView?.ut ?? NaN).replace(/\u2007/g, "")}`; }

  /** wind dataset of the panel (export metadata id; else from the cell grid) */
  #ds(cell?: CellData): DatasetInfo {
    const id = this.#opts.exportMeta?.().datasetId;
    return cell ? cellDataset(cell, id) : datasetInfo(id);
  }

  /** export metadata: dataset, version, permalink (from the app) + the cell store attrs */
  #exportMeta(): ExportMeta {
    const m = this.#opts.exportMeta?.() ?? { datasetId: "fv3-beta1", datasetTitle: "MCMC FV3", dataVersion: "v1", permalink: globalThis.location?.href ?? "" };
    return { ...m, storeAttrs: this.#storeAttrs as unknown as ExportMeta["storeAttrs"], generated: new Date(), utIndex: this.#utIndex };
  }

  #downloads(cell: MarsCellData) {
    const btn = (label: string, title: string, fn: () => void) => {
      const b = h("button", { type: "button", title }, label);
      b.addEventListener("click", fn);
      return b;
    };
    const base = () => exportBaseName(cell, this.#exportMeta().datasetId);
    const copy = btn("Copy citation", "Copy the citation text to the clipboard", () => {
      const t = citationFile(cell, this.#exportMeta().datasetId, this.#citeSetting());
      void navigator.clipboard?.writeText(t).then(() => { copy.textContent = "Copied"; setTimeout(() => { copy.textContent = "Copy citation"; }, 1500); }, () => triggerDownload(`${base()}_citation.txt`, t, "text/plain"));
    });
    return this.#section("downloads", "downloads", h("h3", { id: "dl-h" }, "Download & cite"),
      h("div", { class: "buttons" },
        btn("NetCDF (.nc)", "Hourly wind and air series, all fields vs grain size, flux roses and metadata in one NetCDF-3 file (CF-1.8)", () => triggerDownload(`${base()}.nc`, cellNetcdf(cell, this.#exportMeta()), "application/x-netcdf")),
        btn("CSV bundle (.zip)", "wind_series.csv, fields_by_grain_size.csv, flux_rose.csv, rose_16_sectors.csv (16 sectors, degrees), metadata.json and README.txt", () => { void csvBundle(cell, this.#exportMeta()).then((z) => triggerDownload(`${base()}.zip`, z, "application/zip")); }),
        btn("Citation (TXT)", "Citation text file", () => triggerDownload(`${base()}_citation.txt`, citationFile(cell, this.#exportMeta().datasetId, this.#citeSetting()), "text/plain")),
        copy),
      h("div", { class: "cite-wrap", html: citationHtml(citationSources(CELL_SOURCE_IDS, this.#exportMeta().datasetId)) }));
  }
}
