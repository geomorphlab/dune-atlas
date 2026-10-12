// Click-to-cell side panel (bottom sheet on narrow screens). Structure: header | compact u*,th
// control (persistent, synced with the layer panel) | content. Content is built once per cell;
// threshold / bin / axis changes only refresh the dynamic parts so sliders keep focus.
import type { CellData, CellStore } from "../cell/cellstore";
import { fieldValue } from "../cell/cellstore";
import { analyseCell, EXCESS_CLASSES, EXCESS_COLORS, FLUX_MODES, MODE_DEFINED_BY, MODE_KEYS, MODE_STYLE, ROSE_ARROW_KEYS, modeDefined, type CellView, type FluxMode, type ModeKey } from "../cell/analysis";
import { roseSvg, SPEED_COLORS, roseBinChoices } from "../cell/roses";
import { modesPlotSvg } from "../cell/modesplot";
import { linePlotSvg } from "../cell/lineplot";
import { AUX_META, aridityClass } from "../cell/auxinfo";
import { fieldInfo } from "../cell/fieldinfo";
import { citationFile, triggerDownload } from "../cell/downloads";
import { cellNetcdf, csvBundle, exportBaseName, type ExportMeta } from "../cell/export";
import type { CellStoreAttrs } from "../cell/cellstore";
import { CELL_SOURCE_IDS, citationHtml, citationSources } from "../cell/citation";
import { isPublishedField } from "../util/constants";
import { compassPoint } from "../util/angles";
import { escapeHtml, fmtLat, fmtLon, fmtNum, MISSING } from "../util/format";
import { mathHtml, mathOnly, textOnly } from "../util/math";
import { formatUt, thresholdControl } from "./threshold";
import type { ThresholdDef } from "../registry/types";
import type { Store } from "../store";
import { h, nextId } from "./dom";

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
}

const deg = (v: number) => (Number.isFinite(v) ? `${v.toFixed(0)}° (${compassPoint(v)})` : MISSING);

/** Default table labels from the source metadata: symbol = math part, quantity = text part. */
export function defaultFieldLabel(v: string): FieldLabel {
  const info = fieldInfo(v);
  const quantity = textOnly(info.longName) || textOnly(info.description).split(".")[0] || "";
  return { symbolTex: mathOnly(info.longName), quantity };
}

export const MODES_OPEN_KEY = "duneAtlas.cellPanel.modesOpen";
function readModesOpen(): boolean {
  try { return localStorage.getItem(MODES_OPEN_KEY) !== "0"; } catch { return true; }
}
const WIDTH_KEY = "duneAtlas.cellPanel.width", HEIGHT_KEY = "duneAtlas.cellPanel.height";
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
  #cell: CellData | null = null;
  #utIndex: number;
  #req = 0;
  #opts: CellPanelOptions;
  #windBins: number;
  #fluxBins: number;
  #fluxAxis: "pct" | "abs" = "pct";
  /** 'Modes vs threshold' expanded by default; a collapse is remembered (localStorage) */
  #modesOpen = readModesOpen();
  #storeAttrs: Partial<CellStoreAttrs> | undefined;
  #dyn: Record<string, HTMLElement> = {};
  /** compact u*,th control, created once and re-used across cells (one store subscription) */
  #thr: HTMLElement | null = null;
  #fluxMode: FluxMode = "flat";
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

  async show(store: CellStore | Promise<CellStore>, iy: number, ix: number) {
    const req = ++this.#req;
    this.#root.hidden = false;
    document.body.classList.add("cell-open");
    this.#frame({ iy, ix }).innerHTML = `<p class="status" role="status">Loading ERA5-Land cell ${iy}, ${ix}…</p>`;
    try {
      const s = await store;
      const t0 = performance.now();
      const cell = await s.query(iy, ix);
      if (req !== this.#req) return;
      this.#cell = cell;
      this.#storeAttrs = s.attrs;
      this.render();
      this.#root.dataset.loadMs = String(Math.round(performance.now() - t0));
    } catch (e) {
      if (req !== this.#req) return;
      this.#frame({ iy, ix }).innerHTML = `<p class="status error" role="alert">Could not load this cell: ${escapeHtml(String((e as Error)?.message ?? e))}</p>`;
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
    const head = h("header", { class: "cell-head" }, h("h2", { id: "cell-title" }, title), close);
    this.#root.setAttribute("aria-labelledby", "cell-title");
    const content = h("div", { class: "cell-body" });
    const kids: HTMLElement[] = [head];
    if (this.#opts.threshold) {
      this.#thr ??= h("div", { class: "cell-threshold" }, thresholdControl(this.#opts.threshold.def, this.#opts.threshold.store, { compact: true, idPrefix: "cell-" }));
      kids.push(this.#thr);
    }
    kids.push(content);
    // the handle sits outside the scrolling area so it spans the full panel edge
    this.#root.replaceChildren(this.#handle, h("div", { class: "cell-scroll" }, ...kids));
    this.#content = content;
    return content;
  }

  /** build all sections for the current cell */
  render() {
    const cell = this.#cell!;
    const body = this.#frame(cell);
    if (!cell.hasData) {
      body.innerHTML = `<div class="empty-state"><p><strong>No wind data here.</strong></p>
        <p>This 0.1° ERA5-Land cell (row ${cell.iy}, column ${cell.ix}; centre ${fmtLat(cell.lat)}, ${fmtLon(cell.lon)}) is ocean or outside the ERA5-Land land mask, so it has no wind histogram or wind-regime parameters.</p>
        <p class="help">Click a land cell to see its wind and sand-flux roses.</p></div>`;
      return;
    }
    const d = (k: string, tag: keyof HTMLElementTagNameMap = "div", cls = "") => (this.#dyn[k] = h(tag, { class: cls }));
    this.#dyn = {};
    // meta
    body.append(h("p", { class: "cell-meta", html: cell.dune ? '<span class="badge dune">Dunes present</span>' : '<span class="badge">No dunes mapped</span>' }, d("meta", "span")));
    // wind rose
    const edges = [0, 2.5, 5, 7.5, 10, 12.5, 20];
    const choices = roseBinChoices(cell.bins.uaCentres.length);
    if (!choices.includes(this.#windBins)) this.#windBins = choices[Math.min(1, choices.length - 1)];
    if (!choices.includes(this.#fluxBins)) this.#fluxBins = choices[Math.min(2, choices.length - 1)];
    this.#figSize = this.#sizeFor(this.#root.clientWidth || 390);
    body.append(h("section", { class: "fig", "aria-labelledby": "wr-h" },
      h("h3", { id: "wr-h" }, "Wind rose"),
      binSlider("Sectors", this.#windBins, choices, (n) => { this.#windBins = n; this.update(); }),
      d("windSvg", "div", "fig-svg"),
      h("ul", { class: "fig-legend", html: edges.slice(0, -1).map((e, k) => `<li><span class="swatch" style="background:${SPEED_COLORS[k]}"></span>${e}–${edges[k + 1]}</li>`).join("") + "<li>m/s at 10 m</li>" }),
      d("windCap", "p", "caption")));
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
    body.append(h("section", { class: "fig", "aria-labelledby": "fr-h" },
      h("h3", { id: "fr-h" }, "Sand flux rose (time-averaged, transport toward)"),
      h("label", { class: "inline" }, "Flux ", modeSel),
      binSlider("Sectors", this.#fluxBins, choices, (n) => { this.#fluxBins = n; this.update(); }),
      axisSel,
      d("fluxSvg", "div", "fig-svg"),
      d("fluxClassLegend", "ul", "fig-legend"),
      d("fluxLegend", "ul", "fig-legend arrows"),
      d("fluxKv", "dl", "kv"),
      d("fluxCap", "p", "caption")));
    // modes (polar), collapsed by default
    const det = h("details", { class: "fig modes", open: this.#modesOpen },
      h("summary", { html: `Modes vs threshold (polar: angle = direction, radius = ${mathHtml("$u_{*,th}$")})` }),
      d("modesSvg", "div", "fig-svg"),
      h("ul", { class: "fig-legend arrows", html: MODE_KEYS.map((k) => { const s = MODE_STYLE[k]; return `<li><svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${s.color}" stroke-width="2" ${"dash" in s ? `stroke-dasharray="${s.dash}"` : ""}/></svg>${mathHtml(s.tex)} ${escapeHtml(s.label.replace(/^\S+ /, ""))}</li>`; }).join("") }),
      d("modesCap", "p", "caption"));
    det.addEventListener("toggle", () => {
      this.#modesOpen = det.open;
      try { localStorage.setItem(MODES_OPEN_KEY, det.open ? "1" : "0"); } catch { /* ignore */ }
    });
    body.append(det);
    // flux divergence vs threshold (cells-aux), if available
    if (cell.aux?.series.qsdiv && Array.from(cell.aux.series.qsdiv).some(Number.isFinite)) {
      body.append(h("section", { class: "fig qsdiv", "aria-labelledby": "qd-h" },
        h("h3", { id: "qd-h", html: `Flux divergence ${mathHtml("$\\nabla\\cdot\\vec{q}_s$")} vs threshold` }),
        d("qsdivSvg", "div", "fig-svg"),
        d("qsdivCap", "p", "caption")));
    }
    // table + downloads
    body.append(h("section", { class: "summary", "aria-labelledby": "tb-h" }, d("tableHead", "h3"), d("table", "div", "table-wrap"),
      h("p", { class: "caption" }, "Angles are compass bearings of the transport direction; fluxes converted from m²/s to m²/yr; — = not defined (e.g. no crest flux).")));
    body.append(this.#downloads(cell));
    this.#dyn.tableHead.id = "tb-h";
    this.update();
  }

  /** refresh the parts that depend on threshold / bins / axis */
  update() {
    const cell = this.#cell;
    if (!cell || !cell.hasData || !this.#content) return;
    const v = analyseCell(cell, this.#utIndex, { windSectors: this.#windBins, fluxSectors: this.#fluxBins, fluxMode: this.#fluxMode });
    const size = this.#figSize;
    const ua = cell.bins.uaCentres;
    const D = this.#dyn;
    D.meta.innerHTML = ` Threshold ${mathHtml("$u_{*,th}$")} = <strong>${formatUt(v.ut)}</strong> (≈ ${v.thresholdWind10m.toFixed(1)} m/s wind at 10 m)`;
    D.windSvg.innerHTML = roseSvg({
      id: "wind-rose", values: v.windRose.freq, colors: SPEED_COLORS, title: "Wind rose",
      desc: `Frequency of hourly 10 m winds by the direction they blow from, ${v.windRose.sectors} sectors, stacked by speed class; 1950–2024; sums to 100 %.`,
      ringFormat: (x) => `${x}%`, axisLabel: "% of hours", size, uaCentres: ua,
    });
    D.windCap.textContent = `Direction the wind blows FROM (meteorological), ${v.windRose.sectors} sectors of ${360 / v.windRose.sectors}°; radius = % of the ${v.windRose.totalHours.toLocaleString("en")} counted hourly samples (sums to 100 %; hours > 20 m/s are not in the histogram). ERA5-Land 10 m wind 1950–2024.`;
    const s = MODE_STYLE;
    const arrows = ROSE_ARROW_KEYS.map((k) => ({ bearing: v.modes[k], color: s[k].color, label: `${s[k].label}: ${deg(v.modes[k])}`, axis: k === "ab", dash: "dash" in s[k] ? (s[k] as { dash: string }).dash : undefined }));
    const pct = this.#fluxAxis === "pct";
    const anyFlux = v.fluxSectors.some((x) => x > 0);
    const w = 360 / v.fluxSectors.length;
    D.fluxSvg.innerHTML = roseSvg({
      id: "flux-rose", values: pct ? v.fluxStackPct : v.fluxStack, colors: EXCESS_COLORS,
      title: "Sand flux rose (time-averaged, transport toward)",
      desc: `Time-averaged ${v.fluxMode === "flat" ? "flat-bed" : "crest"} sand flux by the direction sand moves toward, ${v.fluxSectors.length} sectors of ${w} degrees, stacked by excess shear ${v.fluxMode === "flat" ? "u*f" : "uc"}/u*,th, ${pct ? "percent of total flux" : "m²/yr"}, at u*,th ${formatUt(v.ut)}.`,
      ringFormat: (x) => (pct ? `${Number(x.toPrecision(2))}%` : `${Number(x.toPrecision(2))}`), arrows,
      centreText: anyFlux ? undefined : "no transport", axisLabel: pct ? "% of total flux" : "m²/yr per sector", size, uaCentres: ua,
    });
    const ratioTex = v.fluxMode === "flat" ? "$u_{*f}/u_{*,th}$" : "$u_c/u_{*,th}$";
    D.fluxClassLegend.innerHTML = EXCESS_CLASSES.map((c, k) => `<li><span class="swatch" style="background:${EXCESS_COLORS[k]}"></span>${c}</li>`).join("") + `<li>${mathHtml(ratioTex)}</li>`;
    D.fluxLegend.innerHTML = arrows.map((a) => `<li><svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${a.color}" stroke-width="2" ${a.dash ? `stroke-dasharray="${a.dash}"` : ""}/></svg>${escapeHtml(a.label)}</li>`).join("");
    D.fluxKv.innerHTML = `
        <dt>DP</dt><dd>${fmtNum(v.drift.dp)} m²/yr</dd>
        <dt>RDP</dt><dd>${fmtNum(v.drift.rdp)} m²/yr</dd>
        <dt>RDP/DP</dt><dd>${fmtNum(v.drift.ratio)}</dd>
        <dt>RDD</dt><dd>${deg(v.drift.rddBearing)}</dd>`;
    const fm = FLUX_MODES.find((m) => m.id === v.fluxMode)!;
    const what = v.fluxMode === "flat"
      ? `saturated flat-bed flux (q from ${mathHtml("$u_{*f}$")})`
      : `saturated crest flux with speed-up about the mode direction ${mathHtml(v.fluxMode === "elongation" ? "$\\alpha_E$" : "$\\alpha_H$")} at this threshold, ${mathHtml("$u_c = u_{*f}(1 + \\beta \\, h/w \\, |\\sin(\\theta - \\alpha)|)$")}`;
    const totalTxt = Number.isFinite(v.fluxTotal) ? `${fmtNum(v.fluxTotal)} m²/yr` : `${MISSING} (mode direction undefined at this threshold)`;
    D.fluxCap.innerHTML = `<strong>${escapeHtml(fm.label)}</strong>: ${mathHtml(fm.totalTex)} = ${totalTxt}. Direction sand moves TOWARD; ${v.fluxSectors.length} sectors of ${w}°. Radius = ${pct ? "% of the total flux in each sector (sums to 100 %)" : `time-averaged flux in each sector, m²/yr (sums to ${escapeHtml(fm.totalText)})`}. Time-averaged ${what}, Σ<sub>speed</sub> n·q / Σ<sub>all</sub> n from the wind histogram, computed in your browser. Colours split each sector by the excess shear ${mathHtml(ratioTex)} of the winds carrying the flux (only ${mathHtml(v.fluxMode === "flat" ? "$u_{*f} > u_{*,th}$" : "$u_c > u_{*,th}$")} transports sand). DP, RDP, RDP/DP, RDD and the arrows are the map fields at this threshold; a direction is hidden where the flux defining it is zero.`;
    D.modesCap.innerHTML = `Mode bearings (toward) for ${mathHtml("$u_{*,th}$")} = ${v.utValues[0].toFixed(2)} m/s (centre) to ${v.utValues[v.utValues.length - 1].toFixed(2)} m/s (rim); ${mathHtml("$\\alpha_H$")} is an axis, drawn both ways. Traces break where a mode is undefined (no defining flux). Dashed ring and dots: current threshold.`;
    D.modesSvg.innerHTML = modesPlotSvg({ x: v.utValues, currentIndex: v.utIndex, size: Math.min(size, 420), series: MODE_KEYS.map((k) => ({ label: s[k].label, color: s[k].color, dash: "dash" in s[k] ? (s[k] as { dash: string }).dash : undefined, values: v.modeSeries[k], axis: k === "ab", width: k === "ao" ? 2.8 : undefined })) });
    if (D.qsdivSvg && cell.aux?.series.qsdiv) {
      const q = Array.from(cell.aux.series.qsdiv, (x) => x * 1000);
      D.qsdivSvg.innerHTML = linePlotSvg({ x: v.utValues, y: q, currentIndex: v.utIndex, xLabel: "u*,th (m/s)", yLabel: "m/kyr", title: "Saturated flux divergence vs threshold friction velocity", width: Math.min(size, 420) });
      D.qsdivCap.innerHTML = `Saturated flux divergence of this cell (m/kyr; < 0 = flux convergence, deposition) for every ${mathHtml("$u_{*,th}$")}; dot and dashed line: current threshold (${fmtNum(q[v.utIndex])} m/kyr). Divergence of the time-averaged flux vector (RDP, RDD) following Gunn (2026), Methods M6; no data at coasts.`;
    }
    D.tableHead.innerHTML = `Cell summary at ${mathHtml("$u_{*,th}$")} = ${formatUt(v.ut)}`;
    D.table.innerHTML = this.#table(cell, v);
  }

  #table(cell: CellData, v: CellView): string {
    const label = this.#opts.fieldLabel ?? defaultFieldLabel;
    const rows = cell.fieldVars.filter(isPublishedField).map((id) => {
      const info = fieldInfo(id);
      const lab = label(id);
      const raw = fieldValue(cell, id, v.utIndex);
      const undefinedMode = id in MODE_DEFINED_BY && !modeDefined(cell, id as ModeKey, v.utIndex);
      const val = Number.isFinite(raw) && !undefinedMode ? info.toDisplay(raw) : NaN;
      const shown = !Number.isFinite(val) ? MISSING
        : info.kind === "direction" || info.kind === "axis" ? `${val.toFixed(1)}°`
        : info.kind === "fraction" ? val.toFixed(3)
        : fmtNum(val);
      const units = info.kind === "direction" || info.kind === "axis" ? info.displayUnits.replace(/^°\s*/, "") : info.displayUnits;
      return `<tr data-field="${id}"><td class="sym">${lab.symbolTex ? mathHtml(`$${lab.symbolTex}$`) : MISSING}</td><th scope="row">${escapeHtml(lab.quantity)}</th><td class="num">${shown}${Number.isFinite(val) && units && units !== "–" ? ` <span class="unit">${mathHtml(units)}</span>` : ""}</td></tr>`;
    }).join("");
    const aux = cell.aux;
    let auxRows = "";
    if (aux) {
      const q = aux.series.qsdiv?.[v.utIndex];
      if (aux.series.qsdiv) auxRows += `<tr data-field="qsdiv"><td class="sym">${mathHtml(`$${AUX_META.qsdiv.symbolTex}$`)}</td><th scope="row">Saturated flux divergence (&lt; 0 deposition)</th><td class="num">${Number.isFinite(q) ? `${fmtNum(q * 1000)} <span class="unit">m/kyr</span>` : MISSING}</td></tr>`;
      const ai = aux.scalars.ai_mean, vf = aux.scalars.ai_valid_frac, sf = aux.scalars.ai_sat_frac;
      if ("ai_mean" in aux.scalars) {
        const sat = sf > 0;
        const val = Number.isFinite(ai) ? `${sat ? "≥ " : ""}${ai.toFixed(3)} <span class="unit">(${aridityClass(ai)})</span>` : MISSING;
        const note = [Number.isFinite(vf) ? `${(100 * vf).toFixed(0)} % of cell valid` : "", sat ? `${(100 * sf).toFixed(0)} % saturated` : ""].filter(Boolean).join(", ");
        auxRows += `<tr data-field="ai_mean"><td class="sym">${mathHtml(`$${AUX_META.ai_mean.symbolTex}$`)}</td><th scope="row">Aridity index (cell mean, threshold-independent${note ? `; ${note}` : ""})</th><td class="num"${sat ? ' title="Some pixels are at the source saturation value 6.5535, so the mean is a lower bound"' : ""}>${val}</td></tr>`;
      }
      if ("tot_cov_mean" in aux.scalars) {
        const vc = aux.scalars.tot_cov_mean, nm = aux.scalars.tot_cov_n_months;
        const months = Number.isFinite(nm) ? `${nm.toFixed(0)} of 300 months` : "";
        const tip = Number.isFinite(nm) ? ` title="Mean over the ${nm.toFixed(0)} months of 2001–2025 with a valid MODIS value"` : "";
        auxRows += `<tr data-field="tot_cov_mean"><td class="sym">${mathHtml(`$${AUX_META.tot_cov_mean.symbolTex}$`)}</td><th scope="row">Vegetation cover (mean 2001–2025${months ? `; <span class="subtext">${months}</span>` : ""})</th><td class="num"${tip}>${Number.isFinite(vc) ? `${vc.toFixed(1)} <span class="unit">%</span>` : MISSING}</td></tr>`;
      }
    }
    const extra = `${auxRows}
      <tr><td class="sym">${MISSING}</td><th scope="row">Dunes (canonical mask)</th><td class="num">${cell.dune ? "yes" : "no"}</td></tr>
      <tr><td class="sym">${MISSING}</td><th scope="row">Cell centre (lat, lon)</th><td class="num">${cell.lat.toFixed(1)}°, ${cell.lon.toFixed(1)}°</td></tr>
      <tr><td class="sym">${MISSING}</td><th scope="row">ERA5-Land cell (row, column; index)</th><td class="num">${cell.iy}, ${cell.ix}; ${cell.id}</td></tr>
      <tr><td class="sym">${MISSING}</td><th scope="row">Hours counted</th><td class="num">${cell.totalHours.toLocaleString("en")} h</td></tr>`;
    return `<table><thead><tr><th scope="col">Symbol</th><th scope="col">Quantity</th><th scope="col">Value</th></tr></thead><tbody>${rows}${extra}</tbody></table>`;
  }

  /** export metadata: dataset, version, permalink (from the app) + the cell store attrs */
  #exportMeta(): ExportMeta {
    const m = this.#opts.exportMeta?.() ?? { datasetId: "era5-land", datasetTitle: "ERA5-Land 1950–2024 (0.1°)", dataVersion: "", permalink: globalThis.location?.href ?? "" };
    return { ...m, storeAttrs: this.#storeAttrs, generated: new Date() };
  }

  #downloads(cell: CellData) {
    const btn = (label: string, title: string, fn: () => void) => {
      const b = h("button", { type: "button", title }, label);
      b.addEventListener("click", fn);
      return b;
    };
    const base = () => exportBaseName(cell, this.#exportMeta().datasetId);
    const copy = btn("Copy citation", "Copy the citation text to the clipboard", () => {
      const t = citationFile(cell);
      void navigator.clipboard?.writeText(t).then(() => { copy.textContent = "Copied"; setTimeout(() => { copy.textContent = "Copy citation"; }, 1500); }, () => triggerDownload(`${base()}_citation.txt`, t, "text/plain"));
    });
    return h("section", { class: "downloads", "aria-labelledby": "dl-h" },
      h("h3", { id: "dl-h" }, "Download & cite"),
      h("div", { class: "buttons" },
        btn("NetCDF (.nc)", "Wind histogram, all fields vs threshold, flux roses and metadata in one NetCDF-3 file (CF-1.8)", () => triggerDownload(`${base()}.nc`, cellNetcdf(cell, this.#exportMeta()), "application/x-netcdf")),
        btn("CSV bundle (.zip)", "wind_histogram.csv, fields_by_threshold.csv, flux_rose.csv, metadata.json and README.txt", () => { void csvBundle(cell, this.#exportMeta()).then((z) => triggerDownload(`${base()}.zip`, z, "application/zip")); }),
        btn("Citation (TXT)", "Citation text file", () => triggerDownload(`${base()}_citation.txt`, citationFile(cell), "text/plain")),
        copy),
      h("div", { class: "cite-wrap", html: citationHtml(citationSources(CELL_SOURCE_IDS)) }));
  }
}
