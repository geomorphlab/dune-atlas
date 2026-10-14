// Mars entry point (replaces main.ts in the Mars build, VITE_BODY=mars): the Earth shell line by
// line - map, registry-driven overlays, the global control (median grain diameter d on Mars),
// click-to-cell panel - with the Mars cell store (hourly series), the body-aware scale bar, the
// Mars basemaps (pmtiles hillshade, OpenPlanetaryMap, Esri OnMars imagery) and Mars texts.
import { storageKey } from "../body";
import "maplibre-gl/dist/maplibre-gl.css";
import "katex/dist/katex.min.css";
import "../style.css";
import maplibregl from "maplibre-gl";
import { loadRegistry } from "../registry/load"; // Mars registry via the checked patches of registry/load.ts
import { applyDatasetLayers, layersForDatasetSwitch, resolveSource, selectDataset } from "../registry/merge";
import { CONFIG } from "./config";
import { parseUrlState, serializeUrlState, type UrlState } from "../urlstate";
import { Store, type AppState } from "../store";
import { defaultBasemap, setBasemap } from "../map/basemaps";
import { OverlayManager, ensureSelectedCellLayers, restoreOverlays } from "../map/overlays";
import { setLayerPanelOpen, renderLayerPanel } from "../ui/layerPanel";
import { versionFromPrefix } from "../cell/export";
import { CellPanel, readPlotChoice, defaultFieldLabel, type FieldLabel } from "./ui/cellPanel";
import { MarsCellStore } from "./cell/cellstore";
import { cellFeature, cellFromIndex, snapToCell, type Grid } from "../cell/snap";
import { centreOnCell } from "../map/centre";
import { terseQuantity } from "../ui/terse";
import { mathOnly } from "../util/math";
import { shareFromHash, shareUrl, type ShareState } from "../share/shortlink";
import { appShareState, DEFAULT_VIEW, initialAppState, LAST_VIEW, resolveInitialState, resumeQuery } from "../defaultview";
import { mapExportPixelRatio } from "../export/png";
import { loadMathRenderer } from "../export/texsvg";
import { exportMapPng, type MapExportRequest } from "../export/mapExport";
import { Tour, shouldShowTour, tourSeen } from "../ui/tour";
import { autostartTour, wireTourBubble } from "../ui/tourBubble";
import { LoadingIndicator, WHEEL_ZOOM_RATE } from "../ui/loading";
import { TOUR_STEPS } from "./ui/helpText";
import { Tools } from "../ui/tools";
import { CoordsControl } from "../ui/coords";
import { escapeClosesCell } from "../ui/keys";
import { tourHooks } from "../ui/tourHooks";
import { ensurePmtiles } from "../map/adapters";
import { BodyScaleControl } from "./map/scale";
import { clampPmtilesBasemaps, prepareMarsBasemaps } from "./map/basemaps";
import { ESRI_STATS } from "./map/esri";
import { globePolarCaps, marsPolarCapOptions } from "./map/globecaps";
import { EXAMPLE_CELL, MARS_GRID, R_MARS } from "./body";

const { registry: reg, errors } = loadRegistry();
if (errors.length) console.warn("registry merge:", errors);
const dataBase = CONFIG.dataBase ?? reg.dataBase;
// relative pmtiles:// basemap tiles resolved against the data base; esri-mars:// protocol for the Esri basemaps
reg.basemaps = prepareMarsBasemaps(reg.basemaps, dataBase);
// (pmtiles protocol and the archive-depth clamp: after the first basemap is applied, below)
// ---- initial state: short share link (#v=…) > ?query permalink > the default view
// (defaultview.ts). Wind dataset: the link's; query permalinks without one are the registry
// defaultDataset (ERA5-Land, as they were written); with no view state in the URL, a returning
// user's explicit choice (localStorage) or the default view's. Layer definitions follow it.
const DATASET_KEY = storageKey("dataset"); // "duneAtlasMars.dataset": same origin as Earth (body.ts)
const storedDataset = (() => { try { return localStorage.getItem(DATASET_KEY) ?? undefined; } catch { return undefined; } })();
// planet button return (?resume=1, review U11): this atlas's last view, stored per body on every view change
const LAST_VIEW_KEY = storageKey(LAST_VIEW);
const storedView = (() => { try { return localStorage.getItem(LAST_VIEW_KEY); } catch { return null; } })();
const query0 = parseUrlState(location.search);
const start = resolveInitialState(shareFromHash(location.hash), resumeQuery(query0, storedView), reg.defaultDataset, storedDataset);
const url: UrlState = start.url;
const initDataset = selectDataset(reg, start.dataset)?.id ?? "";
applyDatasetLayers(reg, initDataset);

// ---- initial state (the resolved view over the registry's layer defaults) ----
const registryOrder = reg.layers.map((l) => l.id);
const init: AppState = initialAppState(reg, url, initDataset);
// plotted quantity of the cell panel: the link's, else the visitor's last choice (per body), else DP
if (!init.plotY) { const p = readPlotChoice(); if (p) init.plotY = p; }
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
map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE); // faster wheel zoom (review U9)
const loading = new LoadingIndicator(map); // first draw; again on dataset / projection / basemap changes
loading.begin();
map.keyboard.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
if (!init.embed) map.addControl(new maplibregl.FullscreenControl(), "top-right");
map.addControl(new BodyScaleControl({ maxWidth: 120, radius: R_MARS }), "bottom-left"); // Mars radius, not the Earth ellipsoid
map.addControl(new CoordsControl(), "bottom-left"); // cursor lat, lon, beside the scale bar
map.addControl(new maplibregl.AttributionControl({
  compact: true,
  customAttribution: [
    `Winds: <a href="https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/" target="_blank" rel="noopener">MCMC FV3 Mars GCM beta 1</a> (NASA Ames)`,
    `Dunes: USGS Mars Global Digital Dune Database and <a href="https://doi.org/10.1016/j.icarus.2020.114018" target="_blank" rel="noopener">Fenton (2020)</a>; method: <a href="https://doi.org/10.1038/s41467-026-75466-y" target="_blank" rel="noopener">Gunn (2026)</a>, transport: <a href="https://doi.org/10.1017/jfm.2023.343" target="_blank" rel="noopener">Pähtz &amp; Durán (2023)</a>`,
  ],
}), "bottom-right");
map.getCanvas().setAttribute("aria-label", "Map of Mars. Click a cell to show its wind and sand-flux roses.");
map.getCanvas().style.cursor = "crosshair";

const datasetPrefix = () => selectDataset(reg, store.state.dataset)?.prefix;
const overlays = new OverlayManager(map, reg, dataBase, init.utIndex, { order: init.order, datasetPrefix: datasetPrefix(), dunesOnly: !!init.dunesOnly });
overlays.onError = (l, e) => console.warn(`[dune-atlas] layer '${l.id}': data could not be loaded`, e);

// globe polar caps (map/polarcap.ts, docs/mars-app.md 5b): basemap cap + dune fill/invert caps, globe only
const polarCaps = globePolarCaps(map, marsPolarCapOptions(dataBase, reg.basemaps, reg.layers));

function applyBasemap() {
  const b = reg.basemaps.find((x) => x.id === store.state.basemap) ?? defaultBasemap(reg.basemaps);
  setBasemap(map, b, store.state.projection);
}

/** grid of the current dataset's cell store (from its root attrs); the Mars 2° grid until opened */
let grid: Grid = MARS_GRID;

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
// pmtiles basemaps: overzoom from the archive's own maxzoom when it is shallower than the registry's (dev subsets)
if (reg.basemaps.some((b) => b.tiles?.some((t) => t.startsWith("pmtiles://")))) {
  void clampPmtilesBasemaps(reg.basemaps, ensurePmtiles(), (b) => { if (b.id === store.state.basemap) applyBasemap(); });
}

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
/** map PNG (camera button): landscape, selected cell outlined, white or transparent background (export/mapExport.ts) */
function exportMap(o: MapExportRequest) {
  const sc = store.state.cell;
  let selectedCell: { lat: number; lon: number } | null = null;
  try { if (sc) { const c = cellFromIndex(sc[0], sc[1], grid); selectedCell = { lat: c.lat, lon: c.lon }; } } catch { /* outside the grid */ }
  return exportMapPng(map, { reg, state: store.state, shareLink: shareLinkNow(), settle: () => overlays.settled(), selectedCell }, o);
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
  return { symbolTex: mathOnly(l.titleTex) || d.symbolTex, quantity: terseQuantity(l.title) || d.quantity };
}

let cellStore: Promise<MarsCellStore> | null = null;
const getCellStore = (): Promise<MarsCellStore> => (cellStore ??= (() => {
  const ds = selectDataset(reg, store.state.dataset);
  const p = MarsCellStore.open(resolveSource(ds?.cellStore ?? CONFIG.cellStorePath, dataBase, ds?.prefix), {
    useSuffixRequest: CONFIG.useSuffixRequest, aux: (ds?.cellAuxStores ?? (ds?.cellAuxStore ? [ds.cellAuxStore] : CONFIG.cellAuxPaths)).map((p) => resolveSource(p, dataBase, ds?.prefix)),
  });
  // a store opened for a dataset that is no longer selected (rapid switching) must not set the grid
  p.then((s) => { if (cellStore === p) { grid = s.grid; updateSelectedCell(); } }).catch((e) => console.warn("[dune-atlas] cell store could not be opened", e));
  return p;
})());
const panel = new CellPanel(document.getElementById("cell-panel")!, init.utIndex, {
  windSectors: CONFIG.windRoseSectors, fluxSectors: CONFIG.fluxRoseSectors,
  onClose: () => store.set({ cell: null }), plot: { get: () => store.state.plotY, set: (id) => store.set({ plotY: id }) }, onCentre: (c) => { centreOnCell(map, c, Math.abs(grid.dlat)); }, fieldLabel, threshold: { def: reg.threshold, store }, shareLink: () => shareLinkNow(),
  exportMeta: () => {
    const ds = selectDataset(reg, store.state.dataset);
    return { datasetId: ds?.id ?? "", datasetTitle: ds?.title ?? "", dataVersion: versionFromPrefix(ds?.prefix), permalink: fullScreenUrl() };
  },
});
if (init.cell) void panel.show(getCellStore(), init.cell[0], init.cell[1]);

// ---- help, tour (with the Display and example-cell demonstrations), share, export ----
// example cell: the Nili Patera dune field (9° N, 67° E; body.ts)
const tour = new Tour(TOUR_STEPS, { hooks: tourHooks({
  layerPanel: layerPanelEl, store, panel: panel as unknown as Parameters<typeof tourHooks>[0]["panel"], cellRoot: document.getElementById("cell-panel")!,
  exampleCell: async () => { const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, (await getCellStore()).grid); return c ? [c.iy, c.ix] : null; },
}) });
const tools = new Tools({ startTour: () => tourStart.fromHelp(), shareLink: shareLinkNow, exportMap, openAbout });
map.addControl({ onAdd: () => tools.el, onRemove: () => tools.el.remove() }, "top-right");
const autostart = shouldShowTour({ embed: init.embed, tourParam: !!url.tour, seen: tourSeen() });
// "Start tour" bubble by the Help button (PI request); the automatic first-visit start also has a time-out
// fallback in case the map never reports idle
const tourStart = wireTourBubble(tour, { autostart });
if (autostart) autostartTour(map, () => { if (!tour.active) tour.start(); });

map.on("click", async (e) => {
  try { grid = (await getCellStore()).grid; } catch { /* keep the fallback grid */ }
  const c = snapToCell(e.lngLat.lng, e.lngLat.lat, grid);
  if (c) store.set({ cell: [c.iy, c.ix] });
});
document.addEventListener("keydown", (e) => { if (escapeClosesCell(e) && store.state.cell && !tour.active && !tools.open && !tourStart.bubble.shown) store.set({ cell: null }); });

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
    dunesOnly: s.dunesOnly || undefined,
    plot: s.plotY && s.plotY !== "dpm" ? s.plotY : undefined,
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
    try { localStorage.setItem(LAST_VIEW_KEY, q); } catch { /* private mode */ }
  }, 250);
}
map.on("moveend", scheduleUrl);
if (query0.resume) scheduleUrl(); // drop resume=1 from the address

store.subscribe((s, ch) => {
  if (ch.has("basemap") || ch.has("projection") || ch.has("dataset")) loading.begin();
  if (ch.has("basemap")) applyBasemap();
  if (ch.has("projection")) { map.setProjection({ type: s.projection }); polarCaps.sync(); }
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
  if (ch.has("dunesOnly")) overlays.setDunesOnly(!!s.dunesOnly);   // 'Dunes only' (map/dunemask.ts)
  if (ch.has("order")) overlays.setOrder(s.order);
  if (ch.has("layers")) overlays.sync(s.layers);
  if (ch.has("utIndex")) { overlays.setThreshold(s.utIndex); panel.setThreshold(s.utIndex); }
  if (ch.has("plotY")) panel.setPlotQuantity(s.plotY);
  if (ch.has("cell")) {
    updateSelectedCell();
    if (s.cell) void panel.show(getCellStore(), s.cell[0], s.cell[1]);
    else panel.close();
  }
  scheduleUrl();
});

// expose for debugging in the console
(window as unknown as { duneAtlas: unknown }).duneAtlas = { map, store, registry: reg, body: "mars", esriStats: ESRI_STATS };
