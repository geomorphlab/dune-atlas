// Body-aware scale bar: MapLibre's ScaleControl measures with the Earth radius (LngLat.distanceTo,
// 6371008.8 m); this control does the same measurement - the great-circle distance between two
// points maxWidth px apart at the vertical centre of the map - on a sphere of radius `radius`, and
// draws the same element (class maplibregl-ctrl-scale, so it looks identical). Metric units only.
import type { IControl, Map as MlMap } from "maplibre-gl";

/** great-circle distance (m) on a sphere of radius R (haversine) */
export function sphereDistance(lon1: number, lat1: number, lon2: number, lat2: number, R: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** MapLibre's rounding of the bar length: 1, 2, 3, 5 x 10^n (getRoundNum) */
export function roundScale(num: number): number {
  const pow10 = 10 ** (`${Math.floor(num)}`.length - 1);
  let d = num / pow10;
  d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : d >= 1 ? 1 : (() => { const x = Math.pow(10, Math.ceil(-Math.log(d) / Math.LN10)); return Math.round(d * x) / x; })();
  return pow10 * d;
}

/** bar width (px) and label for a distance of `maxMeters` over `maxWidth` px (as MapLibre's setScale) */
export function scaleFor(maxWidth: number, maxMeters: number): { width: number; label: string } {
  let unit = "m", dist = maxMeters;
  if (maxMeters >= 1000) { dist = maxMeters / 1000; unit = "km"; }
  const d = roundScale(dist);
  return { width: maxWidth * (d / dist), label: `${d.toLocaleString()} ${unit}` };
}

export class BodyScaleControl implements IControl {
  #map: MlMap | null = null;
  #el: HTMLDivElement | null = null;
  #maxWidth: number;
  #radius: number;
  #on = () => this.update();
  constructor(opts: { maxWidth?: number; radius: number }) {
    this.#maxWidth = opts.maxWidth ?? 100;
    this.#radius = opts.radius;
  }
  onAdd(map: MlMap): HTMLElement {
    this.#map = map;
    this.#el = document.createElement("div");
    this.#el.className = "maplibregl-ctrl maplibregl-ctrl-scale";
    map.on("move", this.#on);
    this.update();
    return this.#el;
  }
  onRemove() {
    this.#el?.remove();
    this.#map?.off("move", this.#on);
    this.#map = null;
  }
  update() {
    const map = this.#map, el = this.#el;
    if (!map || !el) return;
    const y = map.getContainer().clientHeight / 2;
    const x = (map.getContainer().clientWidth - this.#maxWidth) / 2; // centre of the view (MapLibre: left half-width)
    const a = map.unproject([x, y]), b = map.unproject([x + this.#maxWidth, y]);
    const m = sphereDistance(a.lng, a.lat, b.lng, b.lat, this.#radius);
    if (!(m > 0) || !Number.isFinite(m)) return;
    const s = scaleFor(this.#maxWidth, m);
    el.style.width = `${s.width}px`;
    el.innerHTML = s.label;
  }
}
