// Equivalence snapshot of one atlas build (refactor gate; docs/records/refactor-baseline.md).
// Writes a JSON file with everything a visitor can see or that the app requests, computed from the
// app modules under the same module resolution as the build:
//   registry   merged registry per wind dataset (after the dataset switch), keys sorted
//   info       every layer's info-popover HTML per dataset
//   help       help panel, tour and share/export texts
//   layerPanel layer-panel DOM (default state) per dataset
//   urls       every data URL the registry resolves to per dataset (layers, cell store, sidecars, basemaps)
//   exports    image-export texts and names (map and plot strips as SVG, file names, scale bars), legends
//              of every layer, the slider readouts and ⓘ, modes and line plots, the coordinates tooltip
//   cells      (--live) per scenario cell: the recorded data requests (method, URL, byte range) of
//              opening the cell store and showing the cell, the cell-panel DOM at three slider
//              positions, and SHA-256 of every per-cell download (NetCDF, CSV bundle, citation)
// Run from app/:
//   npx vite-node ../tools/checks/snapshot.ts -- out-earth.json [--live]
//   VITE_BODY=mars npx vite-node ../tools/checks/snapshot.ts -- out-mars.json [--live]
// --live reads https://data.geomorphlab.org (set NODE_USE_ENV_PROXY=1 behind a proxy).
import fs from "node:fs";
import crypto from "node:crypto";
import { Window } from "happy-dom";

const args = process.argv.slice(2).filter((a) => a !== "--");
const OUT = args.find((a) => !a.startsWith("--"))!;
const LIVE = args.includes("--live");
const DATA = "https://data.geomorphlab.org";

const w = new Window({ url: "https://map.geomorphlab.org/" });
const blobs: Blob[] = [];
const G: Record<string, unknown> = {
  window: w, document: w.document, HTMLElement: w.HTMLElement, Node: w.Node, Element: w.Element, SVGElement: w.SVGElement,
  CustomEvent: w.CustomEvent, Event: w.Event, getComputedStyle: w.getComputedStyle.bind(w), requestAnimationFrame: (f: () => void) => setTimeout(f, 0),
  localStorage: w.localStorage, sessionStorage: w.sessionStorage, location: w.location, navigator: w.navigator, ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
};
for (const [k, v] of Object.entries(G)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
// fixed clock: exports carry a generation time
const RealDate = Date;
const FIXED = RealDate.parse("2026-10-14T00:00:00Z");
class FixedDate extends RealDate { constructor(...a: unknown[]) { if (a.length) super(...(a as [number])); else super(FIXED); } static now() { return FIXED; } }
globalThis.Date = FixedDate as DateConstructor;
let lastName = "";
w.document.addEventListener("duneatlas:download", (e) => { lastName = (e as unknown as CustomEvent<{ name: string }>).detail.name; });
URL.createObjectURL = ((b: Blob) => { blobs.push(b); return "blob:x"; }) as typeof URL.createObjectURL;
URL.revokeObjectURL = () => {};

const sortKeys = (v: unknown): unknown => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) : v;

const { BODY } = await import("../../app/src/core/body");
const { loadRegistry } = await import("../../app/src/core/registry/load");
const { applyDatasetLayers, resolveSource, selectDataset } = await import("../../app/src/core/registry/merge");
const { infoHtml, renderLayerPanel } = await import("../../app/src/core/ui/layerPanel");
const help = await import("../../app/src/core/ui/helpText");
const { Store } = await import("../../app/src/core/store");
const { initialAppState } = await import("../../app/src/core/defaultview");
const { parseUrlState } = await import("../../app/src/core/urlstate");
const { CONFIG } = await import("../../app/src/core/config");
const { CellPanel } = await import("../../app/src/core/ui/cellPanel");
const { snapToCell } = await import("../../app/src/core/cell/snap");
const { versionFromPrefix } = await import("../../app/src/core/cell/export");
// the Mars cell store moved with the refactor (src/mars -> src/bodies/mars); either layout is read
const marsCellStore = async () => { try { return await import("../../app/src/bodies/mars/cell/cellstore"); } catch { return await import(/* @vite-ignore */ "../../app/src/mars/cell/cellstore"); } };
const cellStoreMod = BODY === "mars" ? await marsCellStore() : await import("../../app/src/core/cell/cellstore");
const StoreClass = (cellStoreMod as unknown as Record<string, { open: (s: string, o: unknown) => Promise<{ grid: unknown }> }>)[BODY === "mars" ? "MarsCellStore" : "CellStore"];

const out: Record<string, unknown> = { body: BODY };
const reg0 = loadRegistry().registry;
const datasets = reg0.datasets?.length ? reg0.datasets.map((d) => d.id) : [""];
const regFor = (ds: string) => { const r = loadRegistry().registry; if (ds && ds !== r.defaultDataset) applyDatasetLayers(r, ds); return r; };

out.registry = Object.fromEntries(datasets.map((ds) => [ds, sortKeys(regFor(ds))]));
out.info = Object.fromEntries(datasets.map((ds) => { const r = regFor(ds); return [ds, Object.fromEntries(r.layers.map((l) => [l.id, infoHtml(l, ds || undefined)]))]; }));
// the help-panel, tour and share/export texts (the About texts are covered by the layerPanel section)
const HELP_KEYS = ["DATASET_INFO_TEXT", "EXPORT_TEXT", "HELP_ABOUT_LINK", "HELP_BUTTON_LABEL", "HELP_RESTART", "HELP_SECTIONS", "HELP_TITLE", "SHARE_TEXT", "TOUR_FALLBACK", "TOUR_LABELS", "TOUR_STEPS"];
out.help = sortKeys({ ...Object.fromEntries(Object.entries(help).filter(([k, v]) => typeof v !== "function" && HELP_KEYS.includes(k))), stepLabel: help.TOUR_LABELS.step(2, 7) });

const stateFor = (ds: string) => { const r = regFor(ds); return { r, s: new Store(initialAppState(r, parseUrlState(ds ? `?dataset=${ds}` : ""), ds || r.defaultDataset || "")) }; };
out.layerPanel = Object.fromEntries(datasets.map((ds) => {
  const { r, s } = stateFor(ds);
  const el = w.document.createElement("aside");
  renderLayerPanel(el as unknown as HTMLElement, r, s, {});
  return [ds, el.innerHTML];
}));

out.urls = Object.fromEntries(datasets.map((ds) => {
  const r = regFor(ds), d = selectDataset(r, ds || r.defaultDataset), base = CONFIG.dataBase ?? r.dataBase;
  const urls = new Set<string>();
  JSON.stringify(r.layers, (k, v) => { if (typeof v === "string" && /^(source|invertSource|url)$/.test(k) && !/\s/.test(v)) urls.add(resolveSource(v, base, d?.prefix)); if (k === "tiles" && Array.isArray(v)) v.forEach((t) => urls.add(String(t))); return v; });
  for (const b of r.basemaps as { style?: string; tiles?: string[] }[]) { if (b.style) urls.add(String(b.style)); for (const t of b.tiles ?? []) urls.add(String(t)); }
  urls.add(resolveSource(d?.cellStore ?? CONFIG.cellStorePath, base, d?.prefix));
  for (const p of d?.cellAuxStores ?? (d?.cellAuxStore ? [d.cellAuxStore] : CONFIG.cellAuxPaths)) urls.add(resolveSource(p, base, d?.prefix));
  return [ds, [...urls].sort()];
}));

{
  const ex = await import("../../app/src/core/export/mapExport");
  const px = await import("../../app/src/core/export/plotExport");
  const lab = await import("../../app/src/core/export/labels");
  const th = await import("../../app/src/core/ui/threshold");
  const lg = await import("../../app/src/core/ui/legend");
  const lc = await import("../../app/src/core/layerconfig");
  const mp = await import("../../app/src/core/cell/modesplot");
  const lp = await import("../../app/src/core/cell/lineplot");
  const ad = await import("../../app/src/core/map/adapters");
  const co = await import("../../app/src/core/ui/coords");
  const di = await import("../../app/src/core/cell/datasetinfo");
  const date = new Date();
  const views = [
    { lon: 15.2, lat: -24.5, zoom: 5.3, bearing: 0, pitch: 0, proj: "mercator" as const },
    { lon: 160, lat: 62, zoom: 2.2, bearing: 10, pitch: 0, proj: "globe" as const },
    { lon: -30, lat: 0, zoom: 3, bearing: 0, pitch: 0, proj: "globe" as const },
  ];
  out.exports = Object.fromEntries(datasets.map((ds) => {
    const { r, s } = stateFor(ds);
    const t = r.threshold, vals = t.values;
    const x = BODY === "mars" ? vals.map(Math.log10) : vals;
    const layers = Object.fromEntries(r.layers.map((l) => [l.id, { ...(s.state.layers[l.id] ?? { opacity: 1 }), visible: true, cfg: l.invertSource ? { invert: true } : s.state.layers[l.id]?.cfg }]));
    const strips: Record<string, string> = {};
    for (const [k, v] of views.entries()) for (const dunesOnly of [false, true]) {
      const c = { reg: r, state: { ...s.state, layers, dunesOnly }, view: v, width: 1600, includeBasemap: true, shareLink: "https://map.geomorphlab.org/#v=x", date };
      strips[`map${k}${dunesOnly ? "-dunesonly" : ""}`] = ex.mapStripSvg(c as never, 1600, null);
      strips[`mapDefault${k}`] = ex.mapStripSvg({ ...c, state: { ...s.state, dunesOnly } } as never, 1600, null);
    }
    const cell = { lat: -24.5, lon: 15.25, iy: 1, ix: 2 };
    const pctx = { cell, dataset: di.datasetInfo(ds || undefined), ut: vals[t.defaultIndex], shareLink: "https://map.geomorphlab.org/#v=x", date };
    for (const key of px.PLOT_KEYS) for (const dep of [false, true]) {
      const spec = { key, title: `Title ${key}`, svg: () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"></svg>', legend: [], caption: "Caption", thresholdDependent: dep };
      strips[`plot-${key}-${dep}`] = px.composePlotSvg(spec as never, pctx as never, 1200, null);
    }
    const names = [ex.mapExportFilename(ds || "x", views[0], date), ex.mapExportFilename(ds || "x", views[1], date),
      ...px.PLOT_KEYS.flatMap((k) => [px.plotFilename(k, ds || "x", cell, vals[t.defaultIndex], "png"), px.plotFilename(k, ds || "x", cell, null, "svg")])];
    const scale = [0, 30, 60, 80].flatMap((lat) => [2, 2.5, 4, 7, 10].map((zoom) => ex.scaleBar({ lat, zoom })));
    const mpp = [0, 45, 70].flatMap((lat) => [1, 4, 8].map((zoom) => lc.metersPerPixel(lat, zoom)));
    const fakeMap = { getCenter: () => ({ lng: 20, lat: 30 }), project: () => ({ x: 400, y: 300 }), unproject: ([px0]: [number, number]) => ({ lng: 20 + (px0 - 400) * 0.01, lat: 30 }) };
    const legends = Object.fromEntries(r.layers.map((l) => [l.id, [lg.legendHtml(l, s.state.layers[l.id]?.cfg), ...(l.invertSource ? [lg.legendHtml(l, { invert: true } as never)] : [])]]));
    const series = [{ label: "A", color: "#f00", values: x.map((_, i) => (i * 7) % 360) }, { label: "B", color: "#0f0", values: x.map((_, i) => (i * 3) % 180), axis: true }];
    const plots = [mp.modesPlotSvg({ x, series, currentIndex: t.defaultIndex }), mp.modesPlotSvg({ x, series, currentIndex: 0, radiusLabel: "r" }),
      lp.linePlotSvg({ x, y: x.map((_, i) => Math.sin(i / 5)), currentIndex: t.defaultIndex, xLabel: "x", yLabel: "y", title: "t" })];
    const coords = [false, true].map((touch) => new co.CoordsControl({ touch }).el.title);
    return [ds, sortKeys({ strips, names, scale, mpp, viewMpp: ad.viewMetersPerPixel(fakeMap as never), projection: ex.PROJECTION_TEXT, legends,
      readouts: vals.map((v) => [th.formatUt(v), lab.utTex(v)]), thresholdInfo: th.thresholdInfoHtml(t), plots, coords })];
  }));
}

if (LIVE) {
  const realFetch = globalThis.fetch;
  let log: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const hd = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    log.push(`${init?.method ?? "GET"} ${u.replace(DATA, "")} ${hd.get("range") ?? ""}`.trim());
    return realFetch(input, init);
  }) as typeof fetch;
  const sha = async (b: Blob) => crypto.createHash("sha256").update(new Uint8Array(await b.arrayBuffer())).digest("hex").slice(0, 16);
  const scenarios: [string, number, number][] = BODY === "mars"
    ? [["fv3-beta1", 67, 9], ["fv3-beta1", -40, 80], ["fv3-beta1", 0, -85]]
    : [["era5-land", 15.2, -24.5], ["era5", 15.2, -24.5], ["era5-land", 134, -25], ["era5-land", -30, 0]];
  const cells: Record<string, unknown>[] = [];
  for (const [ds, lon, lat] of scenarios) {
    log = [];
    const r = regFor(ds), d = selectDataset(r, ds)!, base = CONFIG.dataBase ?? r.dataBase;
    const cs = await StoreClass.open(resolveSource(d.cellStore ?? CONFIG.cellStorePath, base, d.prefix), {
      useSuffixRequest: CONFIG.useSuffixRequest, aux: (d.cellAuxStores ?? (d.cellAuxStore ? [d.cellAuxStore] : CONFIG.cellAuxPaths)).map((p) => resolveSource(p, base, d.prefix)),
    });
    const c = snapToCell(lon, lat, cs.grid as never)!;
    w.document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = w.document.getElementById("cell-panel") as unknown as HTMLElement;
    const st = new Store(initialAppState(r, parseUrlState(`?dataset=${ds}`), ds));
    const ut0 = st.state.utIndex;
    const panel = new CellPanel(root, ut0, {
      windSectors: CONFIG.windRoseSectors, fluxSectors: CONFIG.fluxRoseSectors, onClose: () => {}, threshold: { def: r.threshold, store: st }, shareLink: () => "https://map.geomorphlab.org/#v=x",
      exportMeta: () => ({ datasetId: d.id, datasetTitle: d.title, dataVersion: versionFromPrefix(d.prefix), permalink: `https://map.geomorphlab.org/?dataset=${ds}` }),
    } as never);
    await panel.show(cs as never, c.iy, c.ix);
    await new Promise((res) => setTimeout(res, 50));
    const requests = [...log].sort();
    const dom: Record<string, string> = { [String(ut0)]: root.innerHTML };
    for (const k of [0, 63]) { panel.setThreshold(k); await new Promise((res) => setTimeout(res, 10)); dom[String(k)] = root.innerHTML; }
    panel.setThreshold(ut0);
    const downloads: Record<string, string> = {};
    for (const b of [...root.querySelectorAll(".buttons button")] as HTMLButtonElement[]) {
      if (/^Copy/.test(b.textContent ?? "")) continue;
      blobs.length = 0; lastName = "";
      b.click();
      for (let i = 0; i < 200 && !blobs.length; i++) await new Promise((res) => setTimeout(res, 20));
      downloads[`${b.textContent} -> ${lastName}`] = blobs.length ? await sha(blobs[0]) : "none";
    }
    cells.push({ dataset: ds, lon, lat, iy: c.iy, ix: c.ix, requests, dom, downloads });
  }
  out.cells = cells;
  globalThis.fetch = realFetch;
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`${OUT}: ${Object.keys(out).join(", ")}`);
process.exit(0);
