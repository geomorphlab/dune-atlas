// Layer-type adapters: one function per registry `type` that adds a layer to the map and returns
// a handle. To add a new layer type: write an adapter here, register it in ADAPTERS, add the
// type to registry/layers.schema.json `$defs/layer/properties/type/enum` (and any semantic
// checks to src/registry/validate.ts). See docs/architecture.md.
import maplibregl, { type Map as MlMap, type AddLayerObject, type GeoJSONSource } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { ZarrLayer } from "@carbonplan/zarr-layer";
import type { LayerDef, LayerType, ThresholdDef } from "../registry/types";
import { resolveSource } from "../registry/merge";
import { DEFAULT_VECTOR_FILL, DIRECTION_MASK_VAR, effectiveDisplay, isAxis, maskVarOf, metersPerPixel, spacingToPx, vectorColors, type LayerConfig } from "../layerconfig";
import { fetchRootAttrs, storeGeoFromAttrs, type StoreGeo } from "./zarrgeo";
import { MaskedFieldStore } from "./maskedstore";
import { fragmentFor, symlogUniforms } from "./shader";
import { FieldReader } from "./fieldreader";
import { applyMask, arrowFeatures, arrowheadsAlong, buildScreenField, evenStreamlines, gcDeg, geoPolylines, readWindow, sampleUnitSphere, splitByScreenGap, type ArrowSeed, type Grid } from "./vectors";
import { GlobeLinesLayer, POLE_LAT } from "./globelines";
import { mathToAxisDeg, mathToBearingDeg } from "../util/angles";

export interface AdapterContext {
  map: MlMap;
  dataBase: string;
  /** resolve a registry source (dataBase + '{dataset}' expansion) */
  resolve?: (source: string) => string;
  threshold: ThresholdDef;
  utIndex: number;
  /** insert below this map layer id (keeps registry order and basemap labels on top) */
  beforeId?: string;
  cfg?: LayerConfig;
  /** resolve the store URL of another variable (directional magnitude pairing) */
  sourceOfVariable?: (v: string) => string | undefined;
  /** report a runtime data error (marks the layer 'not available' in the panel) */
  onDataError?: (err: unknown) => void;
  /** false once the style this layer was requested for has been replaced (basemap switch):
   *  async adapters check it before touching the map and throw StaleLayerError */
  alive?: () => boolean;
}

/** Thrown by an adapter whose style was replaced while it was loading (nothing was added). */
export class StaleLayerError extends Error {
  constructor() { super("style replaced while the layer was loading"); }
}
function assertAlive(ctx: AdapterContext) {
  if (ctx.alive && !ctx.alive()) throw new StaleLayerError();
}

/** Map objects created by one handle. A basemap switch replaces the style, and the next style
 *  gets new layers / sources with the SAME ids, so a handle may only touch (style, remove) the
 *  instances it created itself. */
export class Owned {
  #layers = new Map<string, unknown>();
  #sources = new Map<string, unknown>();
  constructor(private map: MlMap) {}
  addSource(id: string, spec: Parameters<MlMap["addSource"]>[1]) {
    if (!this.map.getSource(id)) this.map.addSource(id, spec);
    this.#sources.set(id, this.map.getSource(id));
  }
  addLayer(spec: Parameters<MlMap["addLayer"]>[0], before?: string) {
    this.map.addLayer(spec, before && this.map.getLayer(before) ? before : undefined);
    const inst = this.map.getLayer(spec.id);
    if (inst) this.#layers.set(spec.id, inst);
  }
  /** this handle's layer is on the map (not a same-id layer of a later style) */
  has(id: string): boolean {
    const inst = this.#layers.get(id);
    return inst !== undefined && this.map.getLayer(id) === inst;
  }
  hasSource(id: string): boolean {
    const inst = this.#sources.get(id);
    return inst !== undefined && this.map.getSource(id) === inst;
  }
  /** owned layer ids that are on the map, in the given order */
  live(ids: string[]): string[] { return ids.filter((x) => this.has(x)); }
  remove() {
    for (const id of this.#layers.keys()) if (this.has(id)) this.map.removeLayer(id);
    for (const id of this.#sources.keys()) if (this.hasSource(id)) this.map.removeSource(id);
    this.#layers.clear();
    this.#sources.clear();
  }
}

export interface LayerHandle {
  /** MapLibre layer ids owned by this handle (bottom to top) */
  layerIds: string[];
  setOpacity(opacity: number): void;
  setThreshold?(index: number): void;
  /** apply a config change in place; return false to have the manager re-create the layer */
  applyConfig?(cfg: LayerConfig | undefined): boolean;
  remove(): void;
}

export type LayerAdapter = (layer: LayerDef, ctx: AdapterContext, opacity: number) => LayerHandle | Promise<LayerHandle>;

let pmtilesProtocol: Protocol | null = null;
export function ensurePmtiles(): Protocol {
  if (!pmtilesProtocol) {
    pmtilesProtocol = new Protocol();
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
  }
  return pmtilesProtocol;
}

let cogRegistered: Promise<void> | null = null;
function ensureCog(): Promise<void> {
  // lazily loaded: geotiff.js is only fetched if a COG layer is shown
  cogRegistered ??= import("@geomatico/maplibre-cog-protocol").then(({ cogProtocol }) => {
    maplibregl.addProtocol("cog", cogProtocol);
  });
  return cogRegistered;
}

const res = (ctx: AdapterContext, src: string) => (ctx.resolve ? ctx.resolve(src) : resolveSource(src, ctx.dataBase));

export function thresholdSelector(dim: string, index: number) {
  return { [dim]: { selected: index, type: "index" as const } };
}

/** Cell-edge bounds of a field store (cached per URL); null if the metadata has none. */
const geoCache = new Map<string, Promise<StoreGeo | null>>();
export function storeGeo(url: string): Promise<StoreGeo | null> {
  let p = geoCache.get(url);
  if (!p) {
    p = fetchRootAttrs(url).then(storeGeoFromAttrs).catch((e) => { console.warn(`[dune-atlas] no georeferencing for ${url}:`, e); return null; });
    geoCache.set(url, p);
  }
  return p;
}

/** Options for the zarr-layer of a colour-map layer: renderingMode '2d' (no depth fighting
 *  between overlapping rasters), explicit cell-edge `bounds` from the store
 *  metadata (see zarrgeo.ts: zarr-layer would otherwise snap the extent to ±180 and shift the
 *  raster half a cell east), and for directional fields a masked virtual store (direction shown
 *  only where the paired magnitude is > 0). Exported for tests. */
export function zarrLayerSource(layer: LayerDef, src: string, geo: StoreGeo | null, maskSrc: string | undefined) {
  const maskVar = maskVarOf(layer);
  const store = maskVar && maskSrc ? MaskedFieldStore.fromUrls(src, layer.variable!, maskSrc, maskVar) : undefined;
  return {
    source: src,
    // '2d': drawn without the depth test. zarr-layer's default '3d' makes MapLibre enable depth
    // test + depth writes (LEQUAL) for the custom layer; two rasters whose meshes are tessellated
    // differently (e.g. the 30" aridity pyramid and a 0.1 deg wind field: different region sizes
    // and subdivisions) then z-fight on the globe and the lower layer shows through in
    // triangular wedges. Overlays are flat drapes, so 2d is correct; the globe back side is
    // still clipped by MapLibre's projection.
    renderingMode: "2d" as const,
    ...(store ? { store } : {}),
    ...(geo ? { bounds: geo.bounds, latIsAscending: geo.latIsAscending } : {}),
  };
}

/** zarr-field: colour map via @carbonplan/zarr-layer, or arrows / streamlines for directional fields. */
export const zarrFieldAdapter: LayerAdapter = async (layer, ctx, opacity) => {
  const eff = effectiveDisplay(layer, ctx.cfg);
  if (eff.mode !== "colormap") return vectorFieldHandle(layer, ctx, opacity);
  const id = `ov-${layer.id}`;
  const src = res(ctx, layer.source);
  const maskVar = maskVarOf(layer);
  const maskSrc = maskVar ? ctx.sourceOfVariable?.(maskVar) : undefined;
  if (maskVar && !maskSrc) console.warn(`[dune-atlas] ${layer.id}: mask variable ${maskVar} has no layer; direction shown unmasked`);
  const geo = await storeGeo(src);
  assertAlive(ctx);
  const z = new ZarrLayer({
    id,
    ...zarrLayerSource(layer, src, geo, maskSrc),
    variable: layer.variable!,
    clim: eff.clim,
    colormap: eff.colors,
    selector: layer.thresholdAware ? thresholdSelector(ctx.threshold.dim, ctx.utIndex) : {},
    opacity,
    customFrag: fragmentFor(layer.variable!, { ...layer.display, clim: eff.clim, log: eff.log, colourScale: eff.scale }),
    ...(eff.scale === "symlog" ? { uniforms: symlogUniforms(eff) } : {}),
    minzoom: layer.minzoom,
    maxzoom: layer.maxzoom,
    zarrVersion: 3,
    onLoadingStateChange: (st) => { if (st.error) ctx.onDataError?.(st.error); },
  });
  const own = new Owned(ctx.map);
  own.addLayer(z as unknown as maplibregl.CustomLayerInterface, ctx.beforeId);
  let applied = eff;
  return {
    get layerIds() { return own.live([id]); },
    setOpacity: (o) => { z.setOpacity(o); ctx.map.triggerRepaint(); },
    setThreshold: layer.thresholdAware ? (i) => { void z.setSelector(thresholdSelector(ctx.threshold.dim, i)); } : undefined,
    applyConfig: (cfg) => {
      const next = effectiveDisplay(layer, cfg);
      if (next.mode !== applied.mode || next.scale !== applied.scale) return false; // shader/renderer changes
      if (next.scale === "symlog" && (next.linthresh !== applied.linthresh || next.centred !== applied.centred)) z.setUniforms(symlogUniforms(next));
      if (next.colors !== applied.colors) z.setColormap(next.colors);
      if (next.clim[0] !== applied.clim[0] || next.clim[1] !== applied.clim[1]) z.setClim(next.clim);
      applied = next;
      ctx.map.triggerRepaint();
      return true;
    },
    remove: () => own.remove(),
  };
};

/** Default directional-magnitude pairing used when the registry entry has no display.magnitudeVar
 *  (= the default direction-validity mask). */
export const DEFAULT_MAGNITUDE: Record<string, string> = DIRECTION_MASK_VAR;

export const DEFAULT_ARROW_SPACING_PX = 36;
export const DEFAULT_DSEP_PX = 30;
/** cap on screen-field nodes (one unproject + one project each) */
const MAX_NODES = 20_000;

/** Ground resolution (m per CSS px) at the view centre: great-circle distance between points 25 px
 *  either side of the centre (valid in mercator and globe); Web-Mercator formula as fallback. */
export function viewMetersPerPixel(map: MlMap): number {
  const c = map.project(map.getCenter());
  const a = map.unproject([c.x - 25, c.y]), b = map.unproject([c.x + 25, c.y]);
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lng - a.lng) * rad;
  const hv = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  const d = 2 * R * Math.asin(Math.min(1, Math.sqrt(hv)));
  return Number.isFinite(d) && d > 0 ? d / 50 : metersPerPixel(map.getCenter().lat, map.getZoom());
}

/** Arrows / streamlines from the zarr field as a GeoJSON line layer; recomputed on moveend and
 *  threshold change. Streamlines: Jobard–Lefer in screen space (map/vectors.ts) on a unit-vector
 *  field sampled from the pyramid level whose cell size is <= dsep/4 px at the current zoom.
 *  The spacing is set on the ground (km) and converted to screen px (dsep) at the view centre on
 *  every recompute (zoom changes), clamped to DSEP_PX_CLAMP; it never feeds back into the
 *  stored km or the slider. Directions are masked where the paired magnitude is <= 0 / NaN. */
function vectorFieldHandle(layer: LayerDef, ctx: AdapterContext, opacity: number): LayerHandle {
  const map = ctx.map;
  const eff = effectiveDisplay(layer, ctx.cfg);
  const axis = isAxis(layer);
  const id = `ov-${layer.id}-vec`, src = `ovsrc-${layer.id}-vec`;
  const own = new Owned(map);
  own.addSource(src, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  own.addLayer({ id, type: "line", source: src, layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": eff.vecColor, "line-width": eff.mode === "arrows" ? 1.4 : 1.2, "line-opacity": ["*", opacity, ["get", "a"]] } }, ctx.beforeId);
  // globe: the same lines from a custom layer placed by the globe projection itself (reaches and
  // crosses the poles; a GeoJSON layer ends at ±85.05°). Only one of the two draws at a time.
  const gid = `${id}-globe`;
  const globe = new GlobeLinesLayer(gid, eff.vecColor, opacity, eff.mode === "arrows" ? 1.4 : 1.2);
  own.addLayer(globe as never, ctx.beforeId);
  const isGlobe = () => map.getProjection?.()?.type === "globe";
  const dirReader = FieldReader.open(res(ctx, layer.source), layer.variable!);
  const magVar = layer.display?.magnitudeVar ?? DEFAULT_MAGNITUDE[layer.variable!];
  const magSrc = eff.mode === "arrows" && magVar ? ctx.sourceOfVariable?.(magVar) : undefined;
  const magReader = magSrc ? FieldReader.open(magSrc, magVar!).catch(() => null) : Promise.resolve(null);
  // direction-validity mask (all modes): no arrows / streamlines where the mask var is <= 0 / NaN
  const maskVar = maskVarOf(layer);
  const maskSrc = maskVar ? ctx.sourceOfVariable?.(maskVar) : undefined;
  const maskReader = maskSrc ? (maskSrc === magSrc && maskVar === magVar ? magReader : FieldReader.open(maskSrc, maskVar!).catch(() => null)) : Promise.resolve(null);
  dirReader.catch((e) => ctx.onDataError?.(e));
  let ut = ctx.utIndex, alive = true, token = 0, op = opacity, km = eff.spacingKm;
  const conv = axis ? mathToAxisDeg : mathToBearingDeg;
  const toBearing = (g: Grid) => { for (let i = 0; i < g.data.length; i++) { const v = g.data[i]; g.data[i] = Number.isFinite(v) ? conv(v) : NaN; } return g; };

  const compute = async () => {
    const my = ++token;
    const t0 = performance.now();
    const canvas = map.getCanvas();
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const b = map.getBounds();
    const globeView = isGlobe();
    // continuous west..east (may extend beyond ±180 at the antimeridian: the reader joins the
    // columns of both ends of the global grid); the whole width only when the view spans >= 360°
    let bounds: [number, number, number, number] = [b.getWest(), Math.max(-90, b.getSouth()), b.getEast(), Math.min(90, b.getNorth())];
    if (globeView) {
      // globe: the latitudes of the visible surface, NOT clamped to the Web-Mercator limit; a
      // visible pole reads all longitudes up to ±90 (the grids have pole rows)
      const lats: number[] = [];
      for (let y = 0; y <= H; y += H / 16) for (let x = 0; x <= W; x += W / 16) {
        const ll = map.unproject([x, y]), back = map.project(ll);
        if (Math.hypot(back.x - x, back.y - y) <= 2) lats.push(ll.lat);
      }
      const poleOn = (lat: number) => { const p = map.project([0, lat]); if (!(p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H)) return false; return Math.abs(map.unproject(p).lat - lat) < 1; };
      bounds = readWindow(lats, [bounds[0], bounds[2]], { poleVisible: { north: poleOn(POLE_LAT), south: poleOn(-POLE_LAT) } });
    }
    if (bounds[2] < bounds[0]) bounds[2] += 360;
    if (bounds[2] - bounds[0] >= 360) bounds = [-180, bounds[1], 180, bounds[3]];
    const c = map.project(map.getCenter());
    const p1 = map.unproject([c.x, c.y - 50]), p0 = map.unproject([c.x, c.y + 50]);
    // degrees of arc per px at the centre (great circle: also at a pole, where both have one latitude)
    const degPerPx = Math.max(1e-6, gcDeg([p1.lng, p1.lat], [p0.lng, p0.lat]) / 100);
    // km is the only user state; the px value is internal to this recompute
    const dsep = spacingToPx(km, viewMetersPerPixel(map)).px;
    let reader: FieldReader;
    try { reader = await dirReader; } catch { return; }
    const area = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]);
    const spacing = eff.mode === "arrows" ? dsep : dsep / 4;
    const level = reader.chooseLevel(spacing * degPerPx, area);
    let dir: Grid;
    try { dir = toBearing(await reader.read(level, ut, bounds)); } catch (e) { ctx.onDataError?.(e); return; }
    const mk = await maskReader;
    if (mk) {
      let m: Grid | null = null;
      try { m = await mk.read(Math.min(level, mk.levels.length - 1), ut, bounds); } catch { m = null; }
      applyMask(dir, m);
    }
    if (my !== token || !alive) return;
    let features: GeoJSON.Feature[];
    if (eff.mode === "arrows") {
      const seeds: ArrowSeed[] = [];
      for (let y = dsep / 2; y < H; y += dsep) for (let x = dsep / 2; x < W; x += dsep) {
        const ll = map.unproject([x, y]);
        const back = map.project(ll);
        if (Math.hypot(back.x - x, back.y - y) > 2) continue; // off the globe
        const ll2 = map.unproject([x, y + dsep]);
        seeds.push({ lon: ll.lng, lat: ll.lat, len: 0.8 * gcDeg([ll.lng, ll.lat], [ll2.lng, ll2.lat]) || 0.8 * dsep * degPerPx });
      }
      let mag: Grid | null = null;
      const mr = await magReader;
      if (mr) { try { mag = await mr.read(mr.chooseLevel(dsep * degPerPx, area), ut, bounds); } catch { mag = null; } }
      if (my !== token || !alive) return;
      features = arrowFeatures(seeds, dir, { axis, mag });
    } else {
      // screen node grid
      const cell = Math.max(dsep / 4, Math.sqrt((W * H) / MAX_NODES));
      const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1;
      const lon = new Float64Array(nx * ny).fill(NaN), lat = new Float64Array(nx * ny).fill(NaN);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = i * cell, y = j * cell;
        const ll = map.unproject([x, y]);
        const back = map.project(ll);
        if (Math.hypot(back.x - x, back.y - y) > 1) continue; // off the globe
        lon[j * nx + i] = ll.lng; lat[j * nx + i] = ll.lat;
      }
      const field = buildScreenField(lon, lat, nx, ny, cell, axis, (lo, la) => sampleUnitSphere(dir, lo, la, axis));
      const lines = evenStreamlines(field, { width: W, height: H, dsep, maxLines: 2500, budgetMs: 250 });
      const un = (p: [number, number]) => { const ll = map.unproject(p); return [ll.lng, ll.lat] as [number, number]; };
      // screen vertices -> lon/lat pieces drawn the short way (split at the antimeridian, and at any
      // step longer than a few line spacings - a discontinuity, never a real streamline step)
      const maxSeg = Math.max(1, 4 * dsep * degPerPx);
      if (globeView) {
        // globe: screen pieces (split at any jump longer than a few line spacings) -> lon/lat
        const gap = 4 * dsep;
        const glines = lines.flatMap((l) => splitByScreenGap(l.pts, gap).map((pc) => pc.map(un)));
        if (!axis) glines.push(...arrowheadsAlong(lines, Math.max(60, 3 * dsep), 4.5).flatMap((hd) => splitByScreenGap(hd, gap).map((pc) => pc.map(un))));
        globe.setLines(glines);
        if (own.hasSource(src)) (map.getSource(src) as GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
        if (import.meta.env?.DEV) console.debug(`[dune-atlas] ${layer.id} streamlines (globe): ${glines.length} lines, level ${level}, window ${bounds.map((v) => v.toFixed(1))}, ${Math.round(performance.now() - t0)} ms`);
        return;
      }
      features = lines.flatMap((l) => {
        const pieces = geoPolylines(l.pts.map(un), maxSeg);
        return pieces.length ? [{ type: "Feature", properties: { a: 1 }, geometry: pieces.length === 1 ? { type: "LineString", coordinates: pieces[0] } : { type: "MultiLineString", coordinates: pieces } } as GeoJSON.Feature] : [];
      });
      if (!axis) {
        const heads = arrowheadsAlong(lines, Math.max(60, 3 * dsep), 4.5);
        features.push({ type: "Feature", properties: { a: 1 }, geometry: { type: "MultiLineString", coordinates: heads.flatMap((hd) => geoPolylines(hd.map(un), maxSeg)) } });
      }
    }
    if (globeView) {
      // arrows on the globe: the same lon/lat polylines from the custom layer
      const gl: [number, number][][] = [], ga: number[] = [];
      for (const f of features) {
        const g = f.geometry as GeoJSON.MultiLineString | GeoJSON.LineString, a = Number((f.properties as { a?: number })?.a ?? 1);
        for (const l of g.type === "LineString" ? [g.coordinates] : g.coordinates) { gl.push(l as [number, number][]); ga.push(a); }
      }
      globe.setLines(gl, ga);
      features = [];
    } else globe.setLines([]);
    if (own.hasSource(src)) (map.getSource(src) as GeoJSONSource).setData({ type: "FeatureCollection", features });
    if (import.meta.env?.DEV) console.debug(`[dune-atlas] ${layer.id} ${eff.mode}: ${features.length} features, level ${level}, ${Math.round(performance.now() - t0)} ms`);
  };
  const onMove = () => { void compute(); };
  map.on("moveend", onMove);
  // globe <-> flat map: the other line layer draws; recompute for the new projection
  const onProj = () => { globe.setLines([]); void compute(); };
  map.on("projectiontransition", onProj);
  void compute();
  return {
    get layerIds() { return own.live([id, gid]); },
    setOpacity: (o) => { op = o; if (own.has(id)) map.setPaintProperty(id, "line-opacity", ["*", op, ["get", "a"]]); globe.setStyle({ opacity: o }); },
    setThreshold: layer.thresholdAware ? (i) => { if (i !== ut) { ut = i; void compute(); } } : undefined,
    applyConfig: (cfg) => {
      const next = effectiveDisplay(layer, cfg);
      if (next.mode !== eff.mode) return false;
      if (own.has(id)) map.setPaintProperty(id, "line-color", next.vecColor);
      globe.setStyle({ color: next.vecColor });
      if (next.spacingKm !== km) { km = next.spacingKm; void compute(); }
      return true;
    },
    remove: () => {
      alive = false;
      map.off("moveend", onMove);
      map.off("projectiontransition", onProj);
      own.remove();
    },
  };
}

const DEFAULT_VECTOR_STYLE: Record<string, Record<string, unknown>> = {
  fill: { "fill-color": DEFAULT_VECTOR_FILL, "fill-opacity": 0.55 },
};
const OPACITY_PROP: Record<string, string> = { fill: "fill-opacity", circle: "circle-opacity", raster: "raster-opacity" };
const GEOM_FILTER: Record<string, unknown> = {
  fill: ["==", ["geometry-type"], "Polygon"],
  circle: ["==", ["geometry-type"], "Point"],
};

/** Shared by vector-ish adapters: one MapLibre layer per style key (fill, circle; outlines are
 *  not drawn, a registry `line` style is ignored), opacity scaling, the user fill colour, and the
 *  optional 'invert' complement fill (layer.invertSource). */
function addStyledLayers(layer: LayerDef, ctx: AdapterContext, opacity: number, sourceSpec: Parameters<MlMap["addSource"]>[1], kinds: string[], extra: (kind: string) => Partial<AddLayerObject>): LayerHandle {
  const map = ctx.map;
  const sourceId = `ovsrc-${layer.id}`;
  const own = new Owned(map);
  own.addSource(sourceId, sourceSpec);
  const style = layer.style ?? DEFAULT_VECTOR_STYLE;
  const ids: string[] = [];
  const base: Record<string, number> = {};
  let op = opacity;
  let col = vectorColors(layer, ctx.cfg);
  const invId = `ov-${layer.id}-invert`, invSrc = `ovsrc-${layer.id}-invert`;
  const fillBase = typeof style.fill?.["fill-opacity"] === "number" ? (style.fill["fill-opacity"] as number) : 0.55;
  const ensureInvert = () => {
    if (!layer.invertSource || own.has(invId)) return;
    ensurePmtiles();
    own.addSource(invSrc, { type: "vector", url: `pmtiles://${res(ctx, layer.invertSource)}` });
    const first = ids[0] && own.has(ids[0]) ? ids[0] : ctx.beforeId;
    own.addLayer({ id: invId, type: "fill", source: invSrc, "source-layer": layer.invertSourceLayer ?? "", paint: { "fill-color": col.fill, "fill-opacity": fillBase * op } } as AddLayerObject, first);
  };
  for (const kind of kinds) {
    if (!(kind in style)) continue;
    const paint = { ...style[kind] } as Record<string, unknown>;
    const opp = OPACITY_PROP[kind];
    base[kind] = typeof paint[opp] === "number" ? (paint[opp] as number) : 1;
    paint[opp] = base[kind] * opacity;
    if (kind === "fill") paint["fill-color"] = col.fill;
    const id = `ov-${layer.id}-${kind}`;
    own.addLayer({ id, type: kind, source: sourceId, paint, minzoom: layer.minzoom ?? 0, maxzoom: layer.maxzoom ?? 24, ...extra(kind) } as AddLayerObject, ctx.beforeId);
    ids.push(id);
  }
  const applyVisibility = () => {
    const fillId = `ov-${layer.id}-fill`;
    if (col.invert) ensureInvert();
    if (own.has(invId)) map.setLayoutProperty(invId, "visibility", col.invert ? "visible" : "none");
    if (own.has(fillId)) map.setLayoutProperty(fillId, "visibility", col.invert ? "none" : "visible");
  };
  applyVisibility();
  return {
    get layerIds() { return own.live([invId, ...ids]); },
    setOpacity: (o: number) => {
      op = o;
      for (const kind of Object.keys(base)) if (own.has(`ov-${layer.id}-${kind}`)) map.setPaintProperty(`ov-${layer.id}-${kind}`, OPACITY_PROP[kind], base[kind] * o);
      if (own.has(invId)) map.setPaintProperty(invId, "fill-opacity", fillBase * o);
    },
    applyConfig: (cfg) => {
      col = vectorColors(layer, cfg);
      if (own.has(`ov-${layer.id}-fill`)) map.setPaintProperty(`ov-${layer.id}-fill`, "fill-color", col.fill);
      if (own.has(`ov-${layer.id}-circle`)) map.setPaintProperty(`ov-${layer.id}-circle`, "circle-color", col.fill);
      applyVisibility();
      if (own.has(invId)) map.setPaintProperty(invId, "fill-color", col.fill);
      return true;
    },
    remove: () => own.remove(),
  };
}

/** pmtiles-vector: PMTiles archive of vector tiles via the pmtiles:// protocol. */
export const pmtilesVectorAdapter: LayerAdapter = (layer, ctx, opacity) => {
  ensurePmtiles();
  return addStyledLayers(layer, ctx, opacity, { type: "vector", url: `pmtiles://${res(ctx, layer.source)}` }, ["fill", "circle"], () => ({ "source-layer": layer.sourceLayer! }) as Partial<AddLayerObject>);
};

/** geojson-points: a GeoJSON file (points; polygons are also filled, e.g. the fixture dunes). */
export const geojsonAdapter: LayerAdapter = (layer, ctx, opacity) => {
  const style = layer.style ?? { ...DEFAULT_VECTOR_STYLE, circle: { "circle-radius": 4, "circle-color": DEFAULT_VECTOR_FILL, "circle-opacity": 1 } };
  return addStyledLayers({ ...layer, style }, ctx, opacity, { type: "geojson", data: res(ctx, layer.source) }, ["fill", "circle"], (k) => ({ filter: GEOM_FILTER[k] }) as Partial<AddLayerObject>);
};

/** pmtiles-raster: raster tiles from a PMTiles archive. */
export const pmtilesRasterAdapter: LayerAdapter = (layer, ctx, opacity) => {
  ensurePmtiles();
  return addStyledLayers({ ...layer, style: layer.style ?? { raster: {} } }, ctx, opacity, { type: "raster", url: `pmtiles://${res(ctx, layer.source)}`, tileSize: 256 }, ["raster"], () => ({}));
};

/** cog: Cloud-Optimised GeoTIFF (must be EPSG:3857; RGB/paletted, or single band with a
 *  `#color:` fragment in the source URL - see @geomatico/maplibre-cog-protocol). */
export const cogAdapter: LayerAdapter = async (layer, ctx, opacity) => {
  await ensureCog();
  assertAlive(ctx);
  return addStyledLayers({ ...layer, style: layer.style ?? { raster: {} } }, ctx, opacity, { type: "raster", url: `cog://${res(ctx, layer.source)}`, tileSize: 256 }, ["raster"], () => ({}));
};

export const ADAPTERS: Record<LayerType, LayerAdapter> = {
  "zarr-field": zarrFieldAdapter,
  "pmtiles-vector": pmtilesVectorAdapter,
  "pmtiles-raster": pmtilesRasterAdapter,
  cog: cogAdapter,
  "geojson-points": geojsonAdapter,
};
