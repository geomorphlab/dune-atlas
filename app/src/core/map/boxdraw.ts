// Latitude-longitude box of the region export (ui/regionExport.ts): drawn by dragging on the map, or shown for
// typed bounds. The box edges follow parallels and meridians: the outline is densified (at most 1° per segment)
// so that it curves correctly on the globe; longitudes are unwrapped while dragging, so a box can cross the
// antimeridian; while drawing the map does not pan (on the globe: does not rotate); Esc cancels. Works in the
// globe and flat (Web Mercator) views; the outline is drawn again after a basemap or projection change.
import type { GeoJSONSource, Map as MlMap, MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import { normaliseBox, type Box } from "../export/region";

export const BOX_SOURCE = "region-box";
export const BOX_LAYERS = ["region-box-fill", "region-box-line"];
const MERC_LAT = 85.0511;

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

/** Closed outline of a box (unwrapped longitudes west..east), with at most `step` degrees per segment along the
 *  parallels and meridians; `flat` clamps the latitudes to the Web Mercator range. */
export function boxRing(b0: Box, step = 1, flat = false): [number, number][] {
  const b = normaliseBox(b0);
  const clamp = (y: number) => (flat ? Math.max(-MERC_LAT, Math.min(MERC_LAT, y)) : y);
  const s = clamp(b.south), n = clamp(b.north);
  const seg = (a: number, z: number) => Math.max(1, Math.ceil(Math.abs(z - a) / step));
  const out: [number, number][] = [];
  const nx = seg(b.west, b.east), ny = seg(s, n);
  for (let i = 0; i <= nx; i++) out.push([b.west + ((b.east - b.west) * i) / nx, s]);          // south edge, west to east
  for (let j = 1; j <= ny; j++) out.push([b.east, s + ((n - s) * j) / ny]);                     // east edge, up
  for (let i = nx - 1; i >= 0; i--) out.push([b.west + ((b.east - b.west) * i) / nx, n]);      // north edge, back west
  for (let j = ny - 1; j >= 0; j--) out.push([b.west, s + ((n - s) * j) / ny]);                 // west edge, down
  return out;
}

export function boxFeature(b: Box | null, flat = false): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: b ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [boxRing(b, 1, flat)] } }] : [] };
}

/** Box from the drag start and the current point (longitudes unwrapped along the drag). */
export function dragBox(start: { lng: number; lat: number }, cur: { lng: number; lat: number }): Box {
  return { west: Math.min(start.lng, cur.lng), east: Math.max(start.lng, cur.lng), south: Math.min(start.lat, cur.lat), north: Math.max(start.lat, cur.lat) };
}

export class BoxDrawer {
  #map: MlMap;
  #box: Box | null = null;
  #drawing = false;
  #start: { lng: number; lat: number } | null = null;
  #cur: { lng: number; lat: number; raw: number } | null = null;
  #swallowClick = false;
  #done: ((b: Box | null) => void) | null = null;
  #accent: string;

  constructor(map: MlMap, o: { color?: string } = {}) {
    this.#map = map;
    this.#accent = o.color ?? "#ffd166";
    map.on("style.load", () => this.#render());
    map.on("mousedown", this.#down);
    map.on("touchstart", this.#down);
    map.on("mousemove", this.#move);
    map.on("touchmove", this.#move);
    map.on("mouseup", this.#up);
    map.on("touchend", this.#up);
  }

  /** drawing, or the click right after the drag (the map's cell selection must ignore it) */
  get active(): boolean { return this.#drawing || this.#swallowClick; }
  get box(): Box | null { return this.#box; }

  /** Start drawing; resolves with the drawn box, or null when cancelled (Esc). */
  draw(): Promise<Box | null> {
    this.#finish(null);
    this.#drawing = true;
    const m = this.#map;
    m.dragPan.disable();
    m.boxZoom?.disable();
    m.getCanvas().style.cursor = "crosshair";
    m.getContainer().classList.add("drawing-box");
    globalThis.document?.addEventListener("keydown", this.#key, true);
    return new Promise((r) => { this.#done = r; });
  }

  /** show a box (typed bounds) or none */
  show(b: Box | null) { this.#box = b; this.#render(); }
  clear() { this.show(null); }
  /** draw again (after a projection change: the flat view clamps the outline to the Web Mercator latitudes) */
  refresh() { this.#render(); }
  cancel() { if (this.#drawing) this.#finish(null); }

  #key = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !this.#drawing) return;
    e.preventDefault();
    e.stopPropagation();
    this.#finish(null);
  };

  #down = (e: MapMouseEvent | MapTouchEvent) => {
    if (!this.#drawing) return;
    if ("points" in e && e.points?.length > 1) return;
    if (!Number.isFinite(e.lngLat?.lat) || !Number.isFinite(e.lngLat?.lng)) return;   // off the globe
    e.preventDefault();
    this.#start = { lng: e.lngLat.lng, lat: e.lngLat.lat };
    this.#cur = { lng: e.lngLat.lng, lat: e.lngLat.lat, raw: e.lngLat.lng };
  };

  #move = (e: MapMouseEvent | MapTouchEvent) => {
    if (!this.#drawing || !this.#start || !this.#cur) return;
    if (!Number.isFinite(e.lngLat?.lat) || !Number.isFinite(e.lngLat?.lng)) return;
    e.preventDefault();
    // unwrap: follow the drag across the antimeridian instead of jumping by 360°
    const lng = this.#cur.lng + wrap180(e.lngLat.lng - this.#cur.raw);
    this.#cur = { lng, lat: e.lngLat.lat, raw: e.lngLat.lng };
    this.#box = dragBox(this.#start, this.#cur);
    this.#render();
  };

  #up = () => {
    if (!this.#drawing || !this.#start) return;
    const b = this.#box && this.#box.east - this.#box.west > 0 && this.#box.north - this.#box.south > 0 ? this.#box : null;
    this.#swallowClick = true;
    setTimeout(() => { this.#swallowClick = false; }, 0);
    this.#finish(b);
  };

  #finish(b: Box | null) {
    const was = this.#drawing;
    this.#drawing = false;
    this.#start = this.#cur = null;
    if (was) {
      const m = this.#map;
      m.dragPan.enable();
      m.boxZoom?.enable();
      m.getCanvas().style.cursor = "crosshair";
      m.getContainer().classList.remove("drawing-box");
      globalThis.document?.removeEventListener("keydown", this.#key, true);
      if (!b) this.#render();
    }
    const done = this.#done;
    this.#done = null;
    done?.(b);
  }

  #render() {
    const m = this.#map;
    if (!m.isStyleLoaded?.() && !m.getStyle?.()) return;
    const flat = (m.getProjection?.()?.type ?? "mercator") !== "globe";
    const data = boxFeature(this.#box, flat);
    const src = m.getSource(BOX_SOURCE) as GeoJSONSource | undefined;
    if (src) { src.setData(data); return; }
    if (!this.#box) return;   // no layers on the map until a box exists
    try {
      m.addSource(BOX_SOURCE, { type: "geojson", data });
      m.addLayer({ id: BOX_LAYERS[0], type: "fill", source: BOX_SOURCE, paint: { "fill-color": this.#accent, "fill-opacity": 0.12 } });
      m.addLayer({ id: BOX_LAYERS[1], type: "line", source: BOX_SOURCE, paint: { "line-color": this.#accent, "line-width": 2 } });
    } catch { /* style not ready: drawn on style.load */ }
  }
}
