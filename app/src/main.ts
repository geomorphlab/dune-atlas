// Entry point: map shell + registry-driven overlays + global u*,th control + click-to-cell panel.
import "maplibre-gl/dist/maplibre-gl.css";
import "katex/dist/katex.min.css";
import "./style.css";
import maplibregl from "maplibre-gl";
import { loadRegistry } from "./registry/load";
import { applyDatasetLayers, layersForDatasetSwitch, resolveSource, selectDataset } from "./registry/merge";
import { CONFIG } from "./config";
import { parseUrlState, serializeUrlState, type UrlState } from "./urlstate";
import { Store, type AppState } from "./store";
import { defaultBasemap, setBasemap } from "./map/basemaps";
import { OverlayManager, ensureSelectedCellLayers, restoreOverlays } from "./map/overlays";
import { setLayerPanelOpen, renderLayerPanel } from "./ui/layerPanel";
import { versionFromPrefix } from "./cell/export";
import { CellPanel, defaultFieldLabel, type FieldLabel } from "./ui/cellPanel";
import { CellStore } from "./cell/cellstore";
import { cellFeature, cellFromIndex, snapToCell, ERA5_LAND_GRID, type Grid } from "./cell/snap";
import { C3S_NOTICE } from "./cell/citation";
import { mathOnly } from "./util/math";
import { shareFromHash, shareUrl, type ShareState } from "./share/shortlink";
import { appShareState, DEFAULT_VIEW, initialAppState, resolveInitialState } from "./defaultview";
import { mapExportPixelRatio } from "./export/png";
import { loadMathRenderer } from "./export/texsvg";
import { captureMap, composeWithStrip, downloadBlob, mapExportFilename, mapStripSvg } from "./export/mapExport";
import { Tour, shouldShowTour, tourSeen } from "./ui/tour";
import { TOUR_STEPS } from "./ui/helpText";
import { Tools } from "./ui/tools";
import { CoordsControl } from "./ui/coords";
import { tourHooks } from "./ui/tourHooks";

const { registry: reg, errors } = loadRegistry();
if (errors.length) console.warn("registry merge:", errors);
const dataBase = CONFIG.dataBase ?? reg.dataBase;
// ---- initial state: short share link (#v=…) > ?query permalink > the default view
// (defaultview.ts). Wind dataset: the link's; query permalinks without one are the registry
// defaultDataset (ERA5-Land, as they were written); with no view state in the URL, a returning
// user's explicit choice (localStorage) or the default view's. Layer definitions follow it.
const DATASET_KEY = "duneAtlas.dataset";
const storedDataset = (() => { try { return localStorage.getItem(DATASET_KEY) ?? undefined; } catch { return undefined; } })();
const start = resolveInitialState(shareFromHash(location.hash), parseUrlState(location.search), reg.defaultDataset, storedDataset);
const url: UrlState = start.url;
const initDataset = selectDataset(reg, start.dataset)?.id ?? "";
applyDatasetLayers(reg, initDataset);

// ---- initial state (the resolved view over the registry's layer defaults) ----
const registryOrder = reg.layers.map((l) => l.id);
const init: AppState = initialAppState(reg, url, initDataset);
const store = new Store(init);
// a dataset switch swaps the layer definitions (sources, colour limits, citations) and resets
// colour-limit overrides of the swapped layers in the same state change
store.intercept((patch, cur) => {
  if (patch.dataset === undefined || patch.dataset === cur.dataset) return patch;
  const changed = applyDatasetLayers(reg, patch.dataset);
  try { localStorage.setItem(DATASET_KEY, patch.dataset); } catch { /* private mode */ }
  return { ...patch, layers: layersForDatasetSwitch(patch.layers ?? cur.layers, changed) };
});
if (init.embed) document.body.classList.add("embed");

// ---- map (2D only: no pitch, no rotation, no 3D terrain) ----
const map = new maplibregl.Map({
  container: "map",
  style: { version: 8, sources: {}, layers: [] },
  center: [url.lon ?? DEFAULT_VIEW.lon, url.lat ?? DEFAULT_VIEW.lat],
  zoom: url.zoom ?? DEFAULT_VIEW.zoom,
  attributionControl: false,
  maxPitch: 0,
  pitch: 0,
  bearing: start.bearing,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  // 300-dpi exports render at pixel ratio 3.125; the default 4096 px cap would lower that
  maxCanvasSize: [16384, 16384],
});
map.touchZoomRotate.disableRotation();
map.keyboard.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
if (!init.embed) map.addControl(new maplibregl.FullscreenControl(), "top-right");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), "bottom-left");
map.addControl(new CoordsControl(), "bottom-left"); // cursor lat, lon, beside the scale bar
map.addControl(new maplibregl.AttributionControl({
  compact: true,
  customAttribution: [
    "Contains modified Copernicus Climate Change Service information",
    `Dune and wind-regime data: <a href="https://doi.org/10.1038/s41467-026-75466-y" target="_blank" rel="noopener">Gunn (2026)</a>, CC BY 4.0`,
  ],
}), "bottom-right");
map.getCanvas().setAttribute("aria-label", "Map. Click a land cell to show its wind and sand-flux roses.");
map.getCanvas().style.cursor = "crosshair";

const datasetPrefix = () => selectDataset(reg, store.state.dataset)?.prefix;
const overlays = new OverlayManager(map, reg, dataBase, init.utIndex, { order: init.order, datasetPrefix: datasetPrefix() });
overlays.onError = (l, e) => console.warn(`[dune-atlas] layer '${l.id}': data could not be loaded`, e);

function applyBasemap() {
  const b = reg.basemaps.find((x) => x.id === store.state.basemap) ?? defaultBasemap(reg.basemaps);
  setBasemap(map, b, store.state.projection);
}

/** grid of the current dataset's cell store (from its root attrs); ERA5-Land until opened */
let grid: Grid = ERA5_LAND_GRID;

function selectedCellFeature(): GeoJSON.FeatureCollection | null {
  const c = store.state.cell;
  if (!c) return null;
  try { return cellFeature(cellFromIndex(c[0], c[1], grid), grid); } catch { return null; }
}
function updateSelectedCell() {
  if (map.getSource("selected-cell")) ensureSelectedCellLayers(map, selectedCellFeature());
}

map.on("style.load", () => {
  // every style swap: projection, selected-cell highlight, all active overlays in drawing order
  if (restoreOverlays(map, overlays, store.state.layers, selectedCellFeature())) map.setProjection({ type: store.state.projection });
});
applyBasemap();

// ---- panels ----
const fullScreenUrl = () => {
  const s = currentUrlState();
  delete s.embed;
  return `${location.origin}${location.pathname}${serializeUrlState(s)}`;
};
const layerPanelEl = document.getElementById("layer-panel")!;
renderLayerPanel(layerPanelEl, reg, store, { fullScreenUrl: init.embed ? fullScreenUrl : undefined, initialOpen: start.panel });

// ---- share link, map export, help & tour ----
function shareState(): ShareState {
  const c = map.getCenter();
  return appShareState(store.state, { lon: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }, !layerPanelEl.classList.contains("collapsed"));
}
const shareLinkNow = () => shareUrl(`${location.origin}${location.pathname}`, shareState());
async function exportMap(o: { basemap: boolean }) {
  const c = map.getCenter();
  const view = { lon: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(), proj: store.state.projection };
  const link = shareLinkNow(), date = new Date(), cssWidth = map.getCanvas().clientWidth;
  // one size: W = clamp(on-screen width x 1.5, 1600, 2400) px, text relative to W, tagged 300 dpi
  const canvas = await captureMap(map, { scale: mapExportPixelRatio(cssWidth), includeBasemap: o.basemap, isOwnLayer: (id) => id.startsWith("ov-"), settle: () => overlays.settled() });
  const math = await loadMathRenderer(); // symbols as SVG paths (lazy chunk); null: plain text
  const { blob } = await composeWithStrip(canvas, (pxWidth) => mapStripSvg({ reg, state: store.state, view, width: cssWidth, includeBasemap: o.basemap, shareLink: link, date }, pxWidth, math));
  downloadBlob(mapExportFilename(store.state.dataset, view, date), blob);
}
function openAbout() {
  setLayerPanelOpen(layerPanelEl, true);
  const about = layerPanelEl.querySelector("details.about") as HTMLDetailsElement | null;
  if (!about) return;
  about.open = true;
  about.scrollIntoView({ block: "start" });
  (about.querySelector("summary") as HTMLElement | null)?.focus();
}

/** Table labels: registry title (plain language) + TeX symbol from titleTex / source long_name. */
function fieldLabel(v: string): FieldLabel {
  const l = reg.layers.find((x) => x.type === "zarr-field" && x.variable === v);
  const d = defaultFieldLabel(v);
  if (!l) return d;
  return { symbolTex: mathOnly(l.titleTex) || d.symbolTex, quantity: l.title.replace(/\s*\([^)]*\)\s*$/, "") || d.quantity };
}

let cellStore: Promise<CellStore> | null = null;
const getCellStore = (): Promise<CellStore> => (cellStore ??= (() => {
  const ds = selectDataset(reg, store.state.dataset);
  const p = CellStore.open(resolveSource(ds?.cellStore ?? CONFIG.cellStorePath, dataBase, ds?.prefix), {
    useSuffixRequest: CONFIG.useSuffixRequest, aux: (ds?.cellAuxStores ?? (ds?.cellAuxStore ? [ds.cellAuxStore] : CONFIG.cellAuxPaths)).map((p) => resolveSource(p, dataBase, ds?.prefix)),
  });
  // a store opened for a dataset that is no longer selected (rapid switching) must not set the grid
  p.then((s) => { if (cellStore === p) { grid = s.grid; updateSelectedCell(); } }).catch((e) => console.warn("[dune-atlas] cell store could not be opened", e));
  return p;
})());
const panel = new CellPanel(document.getElementById("cell-panel")!, init.utIndex, {
  windSectors: CONFIG.windRoseSectors, fluxSectors: CONFIG.fluxRoseSectors,
  onClose: () => store.set({ cell: null }), fieldLabel, threshold: { def: reg.threshold, store }, shareLink: () => shareLinkNow(),
  exportMeta: () => {
    const ds = selectDataset(reg, store.state.dataset);
    return { datasetId: ds?.id ?? "", datasetTitle: ds?.title ?? "", dataVersion: versionFromPrefix(ds?.prefix), permalink: fullScreenUrl() };
  },
});
if (init.cell) void panel.show(getCellStore(), init.cell[0], init.cell[1]);

// ---- help, tour (with the Display and example-cell demonstrations), share, export ----
// example cell: a dune cell in the Namib Sand Sea, the containing cell of the current dataset
const EXAMPLE_CELL = { lon: 15.2, lat: -24.5 };
const tour = new Tour(TOUR_STEPS, { hooks: tourHooks({
  layerPanel: layerPanelEl, store, panel, cellRoot: document.getElementById("cell-panel")!,
  exampleCell: async () => { const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, (await getCellStore()).grid); return c ? [c.iy, c.ix] : null; },
}) });
const tools = new Tools({ startTour: () => tour.start(), shareLink: shareLinkNow, exportMap, openAbout });
map.addControl({ onAdd: () => tools.el, onRemove: () => tools.el.remove() }, "top-right");
if (shouldShowTour({ embed: init.embed, tourParam: !!url.tour, seen: tourSeen() })) map.once("idle", () => setTimeout(() => { if (!tour.active) tour.start(); }, 500));

map.on("click", async (e) => {
  try { grid = (await getCellStore()).grid; } catch { /* keep the fallback grid */ }
  const c = snapToCell(e.lngLat.lng, e.lngLat.lat, grid);
  if (c) store.set({ cell: [c.iy, c.ix] });
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && store.state.cell && !tour.active && !tools.open) store.set({ cell: null }); });

// ---- state -> map/panels/URL ----
function currentUrlState(): UrlState {
  const s = store.state;
  const c = map.getCenter();
  return {
    lon: c.lng, lat: c.lat, zoom: map.getZoom(),
    basemap: s.basemap,
    layers: reg.layers.filter((l) => s.layers[l.id]?.visible).map((l) => ({ id: l.id, opacity: s.layers[l.id].opacity, cfg: s.layers[l.id].cfg })),
    ut: s.utIndex,
    cell: s.cell ?? undefined,
    proj: s.projection,
    embed: s.embed || undefined,
    order: s.order.join(",") === registryOrder.join(",") ? undefined : s.order,
    // always explicit: permalinks without a dataset are read as the registry defaultDataset
    dataset: (reg.datasets?.length ?? 0) > 1 ? s.dataset : undefined,
  };
}
// opened without view state: the address stays bare (map.geomorphlab.org) while the state equals
// the opening one, and becomes bare again when it returns to it (e.g. after the tour's demo cell)
const openingQuery = start.source === "default" ? serializeUrlState(currentUrlState()) : null;
let urlTimer: number | undefined;
function scheduleUrl() {
  clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const q = serializeUrlState(currentUrlState());
    history.replaceState(null, "", q === openingQuery ? (store.state.embed ? "?embed=1" : location.pathname) : q || location.pathname);
  }, 250);
}
map.on("moveend", scheduleUrl);

store.subscribe((s, ch) => {
  if (ch.has("basemap")) applyBasemap();
  if (ch.has("projection")) map.setProjection({ type: s.projection });
  if (ch.has("dataset")) {
    // re-resolve '{dataset}' sources and the cell store; keep the selected location by re-snapping
    const prev = s.cell ? (() => { try { return cellFromIndex(s.cell![0], s.cell![1], grid); } catch { return null; } })() : null;
    overlays.setDatasetPrefix(datasetPrefix());
    overlays.reattach(s.layers);
    cellStore = null;
    const want = getCellStore();
    void want.then((cs) => {
      if (cellStore !== want) return; // superseded by a later switch
      const c = prev ? snapToCell(prev.lon, prev.lat, cs.grid) : null;
      const cur = store.state.cell;
      if (c && cur && cur[0] === c.iy && cur[1] === c.ix) void panel.show(cs, c.iy, c.ix); // same indices: reload data
      else store.set({ cell: c ? [c.iy, c.ix] : null });
    });
  }
  if (ch.has("order")) overlays.setOrder(s.order);
  if (ch.has("layers")) overlays.sync(s.layers);
  if (ch.has("utIndex")) { overlays.setThreshold(s.utIndex); panel.setThreshold(s.utIndex); }
  if (ch.has("cell")) {
    updateSelectedCell();
    if (s.cell) void panel.show(getCellStore(), s.cell[0], s.cell[1]);
    else panel.close();
  }
  scheduleUrl();
});

// expose for debugging in the console
(window as unknown as { duneAtlas: unknown }).duneAtlas = { map, store, registry: reg, notice: C3S_NOTICE };
