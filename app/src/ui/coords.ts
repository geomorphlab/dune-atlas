// Cursor coordinate readout next to the scale bar (bottom left): "24.53° S, 15.21° E".
// Mouse: follows the cursor; when the cursor leaves the map the last position stays, dimmed.
// Touch screens (no hover): hidden until the map is tapped, then shows the last tapped point.
// A DOM control, so it is never part of image exports (those draw the map canvas only).
import type { IControl, Map as MlMap, MapMouseEvent } from "maplibre-gl";

/** "24.53° S, 15.21° E" (2 decimals, hemisphere letters; longitude wrapped to -180..180) */
export function formatLatLon(lat: number, lon: number): string {
  const w = ((((lon + 180) % 360) + 360) % 360) - 180;
  const part = (v: number, pos: string, neg: string) => {
    const r = Math.round(Math.abs(v) * 100) / 100;
    return `${r.toFixed(2)}° ${r === 0 || v >= 0 ? pos : neg}`;
  };
  return `${part(Math.max(-90, Math.min(90, lat)), "N", "S")}, ${part(w === -180 && lon > 0 ? 180 : w, "E", "W")}`;
}

export class CoordsControl implements IControl {
  readonly el: HTMLDivElement;
  #map: MlMap | null = null;
  #touch: boolean;
  #onMove = (e: MapMouseEvent) => { if (!this.#touch) this.show(e.lngLat.lat, e.lngLat.lng); };
  #onOut = () => this.el.classList.add("stale");
  #onClick = (e: MapMouseEvent) => { if (this.#touch) this.show(e.lngLat.lat, e.lngLat.lng); };

  constructor(opts: { touch?: boolean } = {}) {
    this.#touch = opts.touch ?? !!globalThis.matchMedia?.("(hover: none)").matches;
    this.el = document.createElement("div");
    this.el.className = "maplibregl-ctrl atlas-coords";
    this.el.title = this.#touch ? "Last tapped point (latitude, longitude)" : "Cursor position (latitude, longitude)";
    this.el.hidden = true;
  }
  /** show a position (also used for the last tapped point on touch screens) */
  show(lat: number, lon: number) {
    this.el.textContent = formatLatLon(lat, lon);
    this.el.hidden = false;
    this.el.classList.remove("stale");
  }
  onAdd(map: MlMap): HTMLElement {
    this.#map = map;
    map.on("mousemove", this.#onMove);
    map.on("mouseout", this.#onOut);
    map.on("click", this.#onClick);
    return this.el;
  }
  onRemove() {
    this.#map?.off("mousemove", this.#onMove);
    this.#map?.off("mouseout", this.#onOut);
    this.#map?.off("click", this.#onClick);
    this.el.remove();
    this.#map = null;
  }
}
