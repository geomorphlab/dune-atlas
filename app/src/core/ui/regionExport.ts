// "Download a region" popover (tools column): a latitude-longitude box drawn on the map or typed, a tick list of
// parameters and the threshold (grain-diameter) range, a live size estimate within the browser limits, and the
// download (zip: CF-1.8 NetCDF + README). The builders are export/region.ts; the drawing map/boxdraw.ts.
import { h, nextId } from "./dom";
import { estimateRegion, normaliseBox, REGION_LIMITS, sizeText, type Box, type RegionSelection, type RegionShape } from "../export/region";
import type { Grid } from "../cell/snap";

export interface RegionContext {
  grid: Grid;
  shape: RegionShape;
  fields: { id: string; label: string }[];
  aux: { id: string; label: string }[];
  /** the wind histogram (Earth) or hourly series (Mars), if the cells have one */
  wind: { label: string } | null;
  /** the slider quantity: its name in text, the number of values, the current one */
  axis: { name: string; count: number; current: number; currentText: string };
  datasetName: string;
}
export interface RegionOptions {
  /** the body's longitude convention of the typed bounds (Earth -180..180, Mars 0..360 east) */
  lonRange: 180 | 360;
  context(): Promise<RegionContext>;
  /** draw a box on the map (the popover is closed meanwhile); null = cancelled */
  draw(): Promise<Box | null>;
  /** show / hide the box on the map */
  show(b: Box | null): void;
  run(box: Box, sel: RegionSelection, o: { onProgress: (done: number, total: number) => void; signal: AbortSignal }): Promise<{ name: string; cells: number; withData: number }>;
}

export const REGION_TEXT = {
  button: "Download a region", title: "Download a region",
  intro: "All cells of the selected wind dataset in a latitude-longitude box, in one NetCDF file (CF-1.8) with a README.",
  draw: "Draw on map", drawHint: "Drag on the map to draw the box; Esc cancels.",
  north: "North", south: "South", west: "West", east: "East",
  params: "Parameters", fields: "Sand-flux fields", all: "all", none: "none", dune: "Dune flag",
  download: "Download (.zip)", cancel: "Cancel", working: "Fetching cells",
  empty: "Type the bounds or draw a box on the map.",
  loading: "Loading the grid of the wind dataset…", loadFailed: "The grid of the wind dataset could not be loaded.",
  windHist: "Wind histogram (hours per speed and direction bin)", windSeries: "Hourly wind and air series (u, v, T, ρ, z)",
};

/** the popover's state between openings (bounds and choices) */
export interface RegionState { box: Box | null; fields: Set<string> | null; wind: boolean; aux: Set<string> | null; dune: boolean; allThresholds: boolean }
export const newRegionState = (): RegionState => ({ box: null, fields: null, wind: false, aux: null, dune: true, allThresholds: true });

/** typed bounds -> a box, or the reason they cannot be used */
export function boundsFromInputs(v: { north: string; south: string; west: string; east: string }, lonRange: 180 | 360): Box | string {
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".").replace("−", "-")));
  const n = num(v.north), s = num(v.south), w = num(v.west), e = num(v.east);
  if (![n, s, w, e].every(Number.isFinite)) return "type all four bounds in degrees";
  if (Math.abs(n) > 90 || Math.abs(s) > 90) return "latitudes must be between -90 and 90";
  if (n <= s) return "north must be larger than south";
  const lo = lonRange === 360 ? 0 : -180, hi = lonRange === 360 ? 360 : 180;
  if (w < lo || w > hi || e < lo || e > hi) return `longitudes must be between ${lo} and ${hi}${lonRange === 360 ? "° E" : ""}`;
  if (w === e) return "west and east must differ";
  return { north: n, south: s, west: w, east: e };
}
/** a box -> the four input values in the body's convention */
export function inputsFromBox(b0: Box, lonRange: 180 | 360): { north: string; south: string; west: string; east: string } {
  const b = normaliseBox(b0);
  const r = (x: number) => String(Math.round(x * 100) / 100);
  const lon = (x: number) => (lonRange === 360 ? (((x % 360) + 360) % 360) : ((((x + 180) % 360) + 360) % 360) - 180);
  const east = b.width >= 360 ? (lonRange === 360 ? 360 : 180) : lon(b.east);
  const west = b.width >= 360 ? (lonRange === 360 ? 0 : -180) : lon(b.west);
  return { north: r(b.north), south: r(b.south), west: r(west), east: r(east === 0 && lonRange === 360 && b.width > 0 ? 360 : east) };
}

/** The popover body. `onDraw` closes the popover and starts drawing (tools.ts). */
export function regionForm(o: RegionOptions, st: RegionState, ctx: RegionContext, onDraw: () => void): HTMLElement {
  const id = nextId("region");
  const num = (k: "north" | "south" | "west" | "east", min: number, max: number) => h("input", { type: "number", id: `${id}-${k}`, class: "region-bound", step: "any", min: String(min), max: String(max), inputmode: "decimal" }) as HTMLInputElement;
  const lonMin = o.lonRange === 360 ? 0 : -180, lonMax = o.lonRange === 360 ? 360 : 180;
  const inp = { north: num("north", -90, 90), south: num("south", -90, 90), west: num("west", lonMin, lonMax), east: num("east", lonMin, lonMax) };
  if (st.box) { const v = inputsFromBox(st.box, o.lonRange); for (const k of Object.keys(inp) as (keyof typeof inp)[]) inp[k].value = v[k]; }
  const unit = (k: "north" | "south" | "west" | "east") => (k === "north" || k === "south" ? "° N" : "° E");
  const boundRow = (k: keyof typeof inp) => h("label", { for: inp[k].id, class: "region-bound-row" }, h("span", {}, REGION_TEXT[k]), inp[k], h("span", { class: "help" }, unit(k)));
  const draw = h("button", { type: "button", class: "region-draw" }, REGION_TEXT.draw) as HTMLButtonElement;
  draw.addEventListener("click", onDraw);
  const crossNote = h("p", { class: "help" }, o.lonRange === 360 ? "Negative latitudes are south. A west bound larger than the east bound crosses 0° E." : "Negative values are south and west. A west bound larger than the east bound crosses 180°.");

  // parameters
  const fieldSet = st.fields ?? new Set(ctx.fields.map((f) => f.id));
  const auxSet = st.aux ?? new Set(ctx.aux.map((a) => a.id));
  const cb = (label: string, checked: boolean, on: (v: boolean) => void, cls = "") => {
    const i = h("input", { type: "checkbox", id: nextId("rp"), checked }) as HTMLInputElement;
    i.addEventListener("change", () => { on(i.checked); update(); });
    return { input: i, el: h("label", { for: i.id, class: `inline region-param ${cls}` }, i, ` ${label}`) };
  };
  const fieldBoxes = ctx.fields.map((f) => cb(f.label, fieldSet.has(f.id), (v) => { if (v) fieldSet.add(f.id); else fieldSet.delete(f.id); }));
  const allNone = (v: boolean) => { for (const [k, b] of fieldBoxes.entries()) { b.input.checked = v; if (v) fieldSet.add(ctx.fields[k].id); else fieldSet.delete(ctx.fields[k].id); } update(); };
  const allBtn = h("button", { type: "button", class: "link-button" }, REGION_TEXT.all), noneBtn = h("button", { type: "button", class: "link-button" }, REGION_TEXT.none);
  allBtn.addEventListener("click", () => allNone(true));
  noneBtn.addEventListener("click", () => allNone(false));
  const wind = ctx.wind ? cb(ctx.wind.label, st.wind, (v) => { st.wind = v; }) : null;
  const auxBoxes = ctx.aux.map((a) => cb(a.label, auxSet.has(a.id), (v) => { if (v) auxSet.add(a.id); else auxSet.delete(a.id); }));
  const dune = cb(REGION_TEXT.dune, st.dune, (v) => { st.dune = v; });
  const rname = nextId("rrange");
  const radio = (all: boolean, label: string) => {
    const r = h("input", { type: "radio", name: rname, id: nextId("rr"), checked: st.allThresholds === all }) as HTMLInputElement;
    r.addEventListener("change", () => { if (r.checked) { st.allThresholds = all; update(); } });
    return h("label", { for: r.id, class: "inline region-range" }, r, ` ${label}`);
  };
  const params = h("fieldset", { class: "region-params" }, h("legend", {}, REGION_TEXT.params),
    h("div", { class: "region-fields-head" }, h("span", {}, REGION_TEXT.fields), " (", allBtn, ", ", noneBtn, ")"),
    h("div", { class: "region-fields" }, ...fieldBoxes.map((b) => b.el)),
    ...(wind ? [wind.el] : []), ...auxBoxes.map((b) => b.el), dune.el,
    h("div", { class: "region-ranges", role: "radiogroup", "aria-label": `Values of the ${ctx.axis.name}` },
      radio(true, `All ${ctx.axis.count} values of the ${ctx.axis.name}`), radio(false, `Current ${ctx.axis.name} only (${ctx.axis.currentText})`)));

  const est = h("p", { class: "region-estimate", role: "status", "aria-live": "polite" });
  const run = h("button", { type: "button", class: "run-region" }, REGION_TEXT.download) as HTMLButtonElement;
  const cancel = h("button", { type: "button", class: "cancel-region", hidden: true }, REGION_TEXT.cancel) as HTMLButtonElement;
  const bar = h("progress", { class: "region-progress", hidden: true, max: "1", value: "0", "aria-label": REGION_TEXT.working }) as HTMLProgressElement;
  const status = h("p", { class: "help region-status", role: "status", "aria-live": "polite" });
  const selection = (): RegionSelection => ({ fields: ctx.fields.filter((f) => fieldSet.has(f.id)).map((f) => f.id), wind: !!(wind && st.wind), aux: ctx.aux.filter((a) => auxSet.has(a.id)).map((a) => a.id), dune: st.dune, allThresholds: st.allThresholds, current: ctx.axis.current });
  let current: Box | null = st.box;
  function update() {
    st.fields = fieldSet; st.aux = auxSet;
    const raw = { north: inp.north.value, south: inp.south.value, west: inp.west.value, east: inp.east.value };
    const typed = Object.values(raw).some((v) => v.trim() !== "");
    const b = typed ? boundsFromInputs(raw, o.lonRange) : REGION_TEXT.empty;
    if (typeof b === "string") { current = null; st.box = null; o.show(null); est.textContent = typed ? `Bounds: ${b}.` : b; est.dataset.kind = typed ? "error" : ""; run.disabled = true; return; }
    current = b; st.box = b; o.show(b);
    const sel = selection();
    const e = estimateRegion(b, ctx.grid, sel, ctx.shape);
    const fmt = (x: number) => x.toLocaleString("en-GB");
    const what = `${fmt(e.cells)} cells (${fmt(e.rows)} rows × ${fmt(e.cols)} columns of ${ctx.datasetName}), about ${sizeText(e.bytes)}`;
    const nothing = !sel.fields.length && !sel.wind && !sel.aux.length && !sel.dune;
    est.dataset.kind = e.ok && !nothing ? "ok" : "error";
    est.textContent = e.reason === "empty" ? "No cell centre lies in this box; make it larger."
      : e.reason === "cells" ? `${what}: too many for the browser (at most ${fmt(REGION_LIMITS.cells)} cells). Make the box smaller.`
      : e.reason === "bytes" ? `${what}: too large for the browser (at most ${sizeText(REGION_LIMITS.bytes)}). Tick fewer parameters, choose the current value only, or make the box smaller.`
      : nothing ? `${what}. Tick at least one parameter.` : `${what}.`;
    run.disabled = !e.ok || nothing;
  }
  for (const i of Object.values(inp)) i.addEventListener("input", update);
  let ctl: AbortController | null = null;
  cancel.addEventListener("click", () => ctl?.abort());
  run.addEventListener("click", async () => {
    if (!current) return;
    ctl = new AbortController();
    run.disabled = true; cancel.hidden = false; bar.hidden = false; bar.value = 0;
    status.textContent = `${REGION_TEXT.working}…`;
    try {
      const r = await o.run(current, selection(), { signal: ctl.signal, onProgress: (d, n) => { bar.value = d / n; status.textContent = `${REGION_TEXT.working}: ${d.toLocaleString("en-GB")} of ${n.toLocaleString("en-GB")}`; } });
      status.textContent = `Downloaded ${r.name} (${r.withData.toLocaleString("en-GB")} of ${r.cells.toLocaleString("en-GB")} cells with data).`;
    } catch (e) {
      status.textContent = (e as Error)?.name === "AbortError" ? "Cancelled." : `The region could not be downloaded: ${(e as Error)?.message ?? e}`;
    } finally { ctl = null; cancel.hidden = true; bar.hidden = true; update(); }
  });
  const form = h("div", { class: "region-form" },
    h("p", { class: "help" }, REGION_TEXT.intro),
    h("div", { class: "region-bounds" }, boundRow("north"), boundRow("south"), boundRow("west"), boundRow("east")),
    crossNote, h("p", {}, draw), params, est, h("div", { class: "region-run" }, run, cancel), bar, status);
  update();
  return form;
}
