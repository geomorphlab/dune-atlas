// Entry point of both atlases: map shell + registry-driven overlays + the global slider control (Earth u*,th,
// Mars d) + click-to-cell panel. What differs per body comes from the @body modules (hooks: @body/app).
import { storageKey } from "./core/body";
import "maplibre-gl/dist/maplibre-gl.css";
import "katex/dist/katex.min.css";
import "./core/style.css";
import maplibregl from "maplibre-gl";
import { loadRegistry } from "./core/registry/load";
import { applyDatasetLayers, layersForDatasetSwitch, resolveSource, selectDataset } from "./core/registry/merge";
import { CONFIG } from "./core/config";
import { parseUrlState, serializeUrlState, type UrlState } from "./core/urlstate";
import { Store, type AppState } from "./core/store";
import { defaultBasemap, setBasemap } from "./core/map/basemaps";
import { BasemapWatch, repaintOnTileErrors } from "./core/map/basemapwatch";
import { OverlayManager, ensureSelectedCellLayers, restoreOverlays } from "./core/map/overlays";
import { setLayerPanelOpen, renderLayerPanel } from "./core/ui/layerPanel";
import { versionFromPrefix } from "./core/cell/export";
import { CellPanel, readPlotChoice, defaultFieldLabel, type FieldLabel } from "./core/ui/cellPanel";
import { cellFeature, cellFromIndex, snapToCell, type Grid } from "./core/cell/snap";
import { APP_HOOKS as HOOKS, type BodyCellStore } from "@body/app";
import { centreOnCell } from "./core/map/centre";
import { NoTranslateAttribution } from "./core/map/attribution";
import { terseQuantity } from "./core/ui/terse";
import { mathOnly } from "./core/util/math";
import { shareFromHash, shareUrl, type ShareState } from "./core/share/shortlink";
import { appShareState, DEFAULT_VIEW, initialAppState, LAST_VIEW, resolveInitialState, resumeQuery } from "./core/defaultview";
import { mapExportPixelRatio } from "./core/export/png";
import { loadMathRenderer } from "./core/export/texsvg";
import { exportMapPng, type MapExportRequest } from "./core/export/mapExport";
import { Tour, shouldShowTour, tourSeen } from "./core/ui/tour";
import { autostartTour, wireTourBubble } from "./core/ui/tourBubble";
import { LoadingIndicator, WHEEL_ZOOM_RATE } from "./core/ui/loading";
import { TOUR_STEPS } from "./core/ui/helpText";
import { Tools } from "./core/ui/tools";
import { CoordsControl } from "./core/ui/coords";
import { escapeClosesCell } from "./core/ui/keys";
import { tourHooks } from "./core/ui/tourHooks";
import { SearchBox, searchZoom } from "./core/ui/search";
import { loadPlaces, placeBounds, placesAvailable, placesNoteHtml, type Place } from "./core/search/places";
import { ensureRtlPlugin, LOCAL_IDEOGRAPH_FONTS, PlaceLabels, placesNeedRtl, type Tone } from "./core/map/placelabels";
// the RTL text plugin as an asset of the build (self-hosted; the package exports only its source entry)
import rtlPluginUrl from "../node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js?url";
import { formatCoord } from "./core/search/coords";
import { datasetInfo } from "./core/cell/datasetinfo";
import { PROFILE } from "@body/profile";
import { BoxDrawer } from "./core/map/boxdraw";
import { boxCells, fetchRegion, normaliseBox, regionNetcdf, regionReadme, type Box, type RegionMeta, type RegionSelection } from "./core/export/region";
import { REGION_TEXT, type RegionContext } from "./core/ui/regionExport";
import { AUX_META } from "./core/cell/auxinfo";
import { cfUnits } from "./core/cell/export";
import { isPublishedField } from "./core/util/constants";
import { writeZip } from "./core/cell/zip";
import { triggerDownload } from "./core/cell/downloads";
import { DATA_LICENSE_URL } from "./core/ui/bulkguide";
import { BODY } from "./core/body";

const { registry: reg, errors } = loadRegistry();
if (errors.length) console.warn("registry merge:", errors);
const dataBase = CONFIG.dataBase ?? reg.dataBase;
if (HOOKS.prepareBasemaps) reg.basemaps = HOOKS.prepareBasemaps(reg.basemaps, dataBase);
// ---- initial state: short share link (#v=…) > ?query permalink > the default view
// (defaultview.ts). Wind dataset: the link's; query permalinks without one are the registry
// defaultDataset (Earth: ERA5-Land, as they were written); with no view state in the URL, a returning
// user's explicit choice (localStorage) or the default view's. Layer definitions follow it.
const DATASET_KEY = storageKey("dataset"); // "duneAtlas.dataset" / "duneAtlasMars.dataset" (body.ts)
const storedDataset = (() => { try { return localStorage.getItem(DATASET_KEY) ?? undefined; } catch { return undefined; } })();
// planet button return (?resume=1): this atlas's last view, stored per body on every view change
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
// dune-field name labels ('Show names'): the link's setting; opened without view state, the visitor's
// last choice on this atlas (per body); never where the body's place list is not shown (Earth for now)
const PLACES = loadPlaces();
const NAMES_KEY = storageKey("names");
if (!placesAvailable(PLACES)) delete init.names;
else if (start.source === "default") { try { if (localStorage.getItem(NAMES_KEY) === "1") init.names = true; } catch { /* private mode */ } }
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
  // CJK glyphs of labels drawn from local fonts (map/placelabels.ts)
  localIdeographFontFamily: LOCAL_IDEOGRAPH_FONTS,
});
map.touchZoomRotate.disableRotation();
map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE); // faster wheel zoom
const loading = new LoadingIndicator(map); // first draw; again on dataset / projection / basemap changes
loading.begin();
map.keyboard.disableRotation();
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
if (!init.embed) map.addControl(new maplibregl.FullscreenControl(), "top-right");
map.addControl(HOOKS.scaleControl(), "bottom-left");
map.addControl(new CoordsControl(), "bottom-left"); // cursor lat, lon, beside the scale bar
// attribution: follows the selected dataset
const attributionFor = (ds: string) => new NoTranslateAttribution({
  compact: true,
  customAttribution: HOOKS.attribution(ds),
});
let attribution = attributionFor(store.state.dataset);
map.addControl(attribution, "bottom-right");
store.subscribe((s, ch) => {
  if (!ch.has("dataset")) return;
  map.removeControl(attribution);
  map.addControl((attribution = attributionFor(s.dataset)), "bottom-right");
});
map.getCanvas().setAttribute("aria-label", HOOKS.mapAriaLabel);
map.getCanvas().style.cursor = "crosshair";

const datasetPrefix = () => selectDataset(reg, store.state.dataset)?.prefix;
const overlays = new OverlayManager(map, reg, dataBase, init.utIndex, { order: init.order, datasetPrefix: datasetPrefix(), dunesOnly: !!init.dunesOnly });
overlays.onError = (l, e) => console.warn(`[dune-atlas] layer '${l.id}': data could not be loaded`, e);
const mapExtras = HOOKS.onMapCreated?.(map, reg, dataBase);
// dune-field name labels: colours follow the basemap's tone; Arabic-script names load the RTL text plugin
const basemapTone = (): Tone => reg.basemaps.find((b) => b.id === store.state.basemap)?.tone ?? "dark";
const placeLabels = new PlaceLabels(map, {
  list: PLACES, bodyRadiusKm: PROFILE.radiusM / 1000, tone: basemapTone,
  popup: (focus) => new maplibregl.Popup({ className: "place-popup", closeButton: true, closeOnClick: false, maxWidth: "300px", focusAfterOpen: focus }),
});
placeLabels.setVisible(!!store.state.names);
if (placesNeedRtl(PLACES)) ensureRtlPlugin(maplibregl.setRTLTextPlugin, rtlPluginUrl);

// notice when the chosen basemap cannot be loaded (provider down or blocked); set up before the app's
// 'style.load' handler below, so it sees the basemap's own sources
const basemapWatch = new BasemapWatch(map);
// keep drawing when tiles fail with network errors (blocked basemap; otherwise the globe can stay blank)
repaintOnTileErrors(map);
function applyBasemap() {
  const b = reg.basemaps.find((x) => x.id === store.state.basemap) ?? defaultBasemap(reg.basemaps);
  basemapWatch.start(b);
  setBasemap(map, b, store.state.projection);
}

/** grid of the current dataset's cell store (from its root attrs); the body's default grid until opened */
let grid: Grid = HOOKS.defaultGrid;

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
  if (restoreOverlays(map, overlays, store.state.layers, selectedCellFeature())) { map.setProjection({ type: store.state.projection }); placeLabels.attach(); }
});
applyBasemap();
HOOKS.afterFirstBasemap?.(reg, applyBasemap, store);

// ---- panels ----
const fullScreenUrl = () => {
  const s = currentUrlState();
  delete s.embed;
  return `${location.origin}${location.pathname}${serializeUrlState(s)}`;
};
const layerPanelEl = document.getElementById("layer-panel")!;
// search box (typed coordinates; named places once the body's list is enabled): fly there and open the cell
const search = new SearchBox({
  ...PROFILE.search, places: PLACES, namesNoteHtml: placesNoteHtml(PLACES),
  goTo: (lat, lon) => goToPoint(lat, lon),
  goToPlace: (p) => goToPlace(p),
});
renderLayerPanel(layerPanelEl, reg, store, { fullScreenUrl: init.embed ? fullScreenUrl : undefined, initialOpen: start.panel, search: search.el });

// ---- share link, map export, help & tour ----
function shareState(): ShareState {
  const c = map.getCenter();
  return appShareState(store.state, { lon: c.lng, lat: c.lat, zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }, !layerPanelEl.classList.contains("collapsed"));
}
const shareLinkNow = () => shareUrl(`${location.origin}${location.pathname}`, shareState());
/** map PNG (camera button): map with the strip below, white or transparent background (export/mapExport.ts) */
function exportMap(o: MapExportRequest) {
  return exportMapPng(map, { reg, state: store.state, shareLink: shareLinkNow(), settle: () => overlays.settled(),
    // the name labels: credited while shown; without the basemap (white or transparent background) in their light-basemap colours
    namesCredit: placeLabels.visible ? PLACES.credit : undefined,
    prepare: (withBasemap) => { if (withBasemap || !placeLabels.visible) return; placeLabels.setTone("light"); return () => placeLabels.setTone(basemapTone()); } }, o);
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

let cellStore: Promise<BodyCellStore> | null = null;
const getCellStore = (): Promise<BodyCellStore> => (cellStore ??= (() => {
  const ds = selectDataset(reg, store.state.dataset);
  const p = HOOKS.openCellStore(resolveSource(ds?.cellStore ?? CONFIG.cellStorePath, dataBase, ds?.prefix), {
    useSuffixRequest: CONFIG.useSuffixRequest, aux: (ds?.cellAuxStores ?? (ds?.cellAuxStore ? [ds.cellAuxStore] : CONFIG.cellAuxPaths)).map((p) => resolveSource(p, dataBase, ds?.prefix)),
  });
  // a store opened for a dataset that is no longer selected (rapid switching) must not set the grid
  p.then((s) => { if (cellStore === p) { grid = s.grid; updateSelectedCell(); } }).catch((e) => console.warn("[dune-atlas] cell store could not be opened", e));
  return p;
})());
const otherStores = new Map<string, Promise<BodyCellStore>>();
function openOtherStore(id: string): Promise<BodyCellStore> {
  let p = otherStores.get(id);
  if (!p) {
    const ds = selectDataset(reg, id);
    p = HOOKS.openCellStore(resolveSource(ds?.cellStore ?? CONFIG.cellStorePath, dataBase, ds?.prefix), { useSuffixRequest: CONFIG.useSuffixRequest, aux: [] });
    p.catch(() => otherStores.delete(id));   // retried on the next cell
    otherStores.set(id, p);
  }
  return p;
}
const panel = new CellPanel(document.getElementById("cell-panel")!, init.utIndex, {
  windSectors: CONFIG.windRoseSectors, fluxSectors: CONFIG.fluxRoseSectors,
  onClose: () => store.set({ cell: null }), plot: { get: () => store.state.plotY, set: (id) => store.set({ plotY: id }) }, onCentre: (c) => { centreOnCell(map, c, Math.abs(grid.dlat)); }, fieldLabel, threshold: { def: reg.threshold, store }, shareLink: () => shareLinkNow(),
  // the other wind datasets at the same location (Earth cell panel line), their stores opened on first use
  otherDatasets: () => (reg.datasets ?? []).filter((d) => d.id !== store.state.dataset).map((d) => ({ id: d.id, open: () => openOtherStore(d.id) })),
  exportMeta: () => {
    const ds = selectDataset(reg, store.state.dataset);
    return { datasetId: ds?.id ?? "", datasetTitle: ds?.title ?? "", dataVersion: versionFromPrefix(ds?.prefix), permalink: fullScreenUrl() };
  },
});
if (init.cell) void panel.show(getCellStore(), init.cell[0], init.cell[1]);

// ---- help, tour (with the Display and example-cell demonstrations), share, export ----
// example cell: the body's (Earth: Namib Sand Sea; Mars: Nili Patera), the containing cell of the current dataset
const EXAMPLE_CELL = HOOKS.exampleCell;
const tour = new Tour(TOUR_STEPS, { hooks: tourHooks({
  layerPanel: layerPanelEl, store, panel, cellRoot: document.getElementById("cell-panel")!,
  exampleCell: async () => { const c = snapToCell(EXAMPLE_CELL.lon, EXAMPLE_CELL.lat, (await getCellStore()).grid); return c ? [c.iy, c.ix] : null; },
}) });
// "Download a region": the box drawn on the map or typed (map/boxdraw.ts, ui/regionExport.ts, export/region.ts)
const boxDrawer = new BoxDrawer(map);
async function regionContext(): Promise<RegionContext> {
  const cs = await getCellStore();
  const ds = datasetInfo(store.state.dataset);
  const nHours = (cs as { nHours?: number }).nHours, series = nHours !== undefined, bins = cs.bins;
  const n = cs.utValues.length;
  const title = (v: string) => reg.layers.find((l) => l.type === "zarr-field" && l.variable === v)?.title ?? v;
  return {
    grid: cs.grid,
    shape: { nThr: n, wind: series ? { kind: "series", nHours } : { kind: "hist", nUm: bins.umCentres.length, nUa: bins.uaCentres.length } },
    fields: cs.fieldVars.filter((v) => isPublishedField(v)).map((v) => ({ id: v, label: title(v) })),
    aux: Object.entries(AUX_META).map(([id, m]) => ({ id, label: m.longName })),
    wind: { label: series ? REGION_TEXT.windSeries : REGION_TEXT.windHist },
    axis: { name: PROFILE.control.exportName, count: n, current: Math.min(store.state.utIndex, n - 1), currentText: PROFILE.control.format(cs.utValues[Math.min(store.state.utIndex, n - 1)]) },
    datasetName: `${ds.name} ${ds.resolution}`,
  };
}
async function runRegion(box: Box, sel: RegionSelection, o: { onProgress: (d: number, n: number) => void; signal: AbortSignal }) {
  const cs = await getCellStore();
  const g = cs.grid, cells = boxCells(box, g);
  const data = await fetchRegion(cs, cells, { onProgress: o.onProgress, signal: o.signal, wind: sel.wind });
  const ds = selectDataset(reg, store.state.dataset);
  const t = reg.threshold;
  const meta: RegionMeta = {
    datasetId: ds?.id ?? "", datasetTitle: ds?.title ?? "", dataVersion: versionFromPrefix(ds?.prefix), permalink: fullScreenUrl(), box, body: BODY,
    axis: { name: t.dim ?? "ut", units: t.units === "µm" ? "um" : cfUnits(t.units), longName: PROFILE.control.exportName, values: cs.utValues },
    storeAttrs: cs.attrs as RegionMeta["storeAttrs"], generated: new Date(),
  };
  const nc = regionNetcdf(data, cells, g, sel, meta);
  const b = normaliseBox(box), f = (v: number) => String(Math.round(v * 100) / 100).replace("-", "m");
  const name = `${PROFILE.filePrefix}_region_${meta.datasetId}_lat${f(b.south)}to${f(b.north)}_lon${f(b.west)}to${f(b.east)}`;
  const withData = data.filter(Boolean).length;
  const readme = regionReadme(sel, meta, { rows: cells.iys.length, cols: cells.ixs.length, withData }, `${name}.nc`, DATA_LICENSE_URL);
  const zip = await writeZip([{ name: `${name}.nc`, data: nc }, { name: "README.txt", data: readme }]);
  triggerDownload(`${name}.zip`, zip, "application/zip");
  return { name: `${name}.zip`, cells: data.length, withData };
}
const tools = new Tools({ startTour: () => tourStart.fromHelp(), shareLink: shareLinkNow, exportMap, openAbout, utIndex: () => store.state.utIndex,
  region: { lonRange: PROFILE.search.lonRange, context: regionContext, draw: () => boxDrawer.draw(), show: (b) => boxDrawer.show(b), run: runRegion } });
map.addControl({ onAdd: () => tools.el, onRemove: () => tools.el.remove() }, "top-right");
const autostart = shouldShowTour({ embed: init.embed, tourParam: !!url.tour, seen: tourSeen() });
// "Help and Tour" bubble by the Help button; the automatic first-visit start also has a time-out
// fallback in case the map never reports idle
const tourStart = wireTourBubble(tour, { autostart });
if (autostart) autostartTour(map, () => { if (!tour.active) tour.start(); });

/** search box: fly to a typed point at a zoom where a cell is visible; select the cell when it has data */
async function goToPoint(lat: number, lon: number): Promise<string> {
  const where = formatCoord(lat, lon, PROFILE.search.lonRange, 2);
  const cs = await getCellStore().catch(() => null);
  const g = cs?.grid ?? grid;
  const lng = lon > 180 ? lon - 360 : lon;
  map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), searchZoom(g.dlat)), essential: true });
  if (!cs) return `${where}: the cell data could not be loaded.`;
  const c = snapToCell(lng, lat, g);
  if (!c) return `${where}: outside the grid of the wind dataset.`;
  const d = await cs.query(c.iy, c.ix);
  if (!d.hasData) {
    const why = datasetInfo(store.state.dataset).nonLandReason;
    return `${where}: no data for this cell${why ? ` (${why.charAt(0).toLowerCase()}${why.slice(1)})` : ""}.`;
  }
  store.set({ cell: [c.iy, c.ix] });
  return `${where}: cell panel opened.`;
}
function goToPlace(p: Place): string {
  // fly to the feature and open its popup (the same as clicking its name label); focus stays in the search box
  if (placeLabels.available) placeLabels.show(p, { focus: false });
  else map.fitBounds(placeBounds(p, PROFILE.radiusM / 1000), { padding: 40, maxZoom: 9, essential: true });
  return p.line1;
}

map.on("click", async (e) => {
  if (boxDrawer.active) return;   // the click that ends drawing a region box
  if (placeLabels.onClick(e)) return;   // a click on a name label: its popup, not the cell
  placeLabels.closePopup();
  try { grid = (await getCellStore()).grid; } catch { /* keep the fallback grid */ }
  const c = snapToCell(e.lngLat.lng, e.lngLat.lat, grid);
  if (c) store.set({ cell: [c.iy, c.ix] });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && placeLabels.popupOpen) { placeLabels.closePopup(); return; }   // Esc: the name popup first
  if (escapeClosesCell(e) && store.state.cell && !tour.active && !tools.open && !tourStart.bubble.shown) store.set({ cell: null }); });

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
    names: s.names || undefined,
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
  if (ch.has("projection")) { map.setProjection({ type: s.projection }); mapExtras?.onProjection?.(); boxDrawer.refresh(); }
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
  if (ch.has("names")) {   // 'Show names' (map/placelabels.ts): remembered per body
    placeLabels.setVisible(!!s.names);
    try { localStorage.setItem(NAMES_KEY, s.names ? "1" : "0"); } catch { /* private mode */ }
  }
  if (ch.has("basemap")) placeLabels.setTone(basemapTone());
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
(window as unknown as { duneAtlas: unknown }).duneAtlas = { map, store, registry: reg, ...HOOKS.debug };
