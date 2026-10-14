// "Loading map..." indicator: shown on the first draw and while the map redraws after a
// dataset, projection or basemap change; hidden when the map is idle (all tiles loaded), or after `timeoutMs`.
import { h } from "./dom";

export const LOADING_TEXT = "Loading map\u2026";
/** wheel zoom rate (MapLibre default 1/450): faster scroll zoom */
export const WHEEL_ZOOM_RATE = 1 / 250;

type IdleMap = { once(ev: "idle", fn: () => void): unknown; areTilesLoaded?(): boolean; loaded?(): boolean };

export class LoadingIndicator {
  el: HTMLElement;
  #map: IdleMap;
  #gen = 0;
  #timeoutMs: number;
  constructor(map: IdleMap, parent: HTMLElement = document.body, timeoutMs = 30000) {
    this.#map = map;
    this.#timeoutMs = timeoutMs;
    this.el = h("div", { class: "map-loading", role: "status", "aria-live": "polite", hidden: true }, LOADING_TEXT);
    parent.append(this.el);
  }
  get shown() { return !this.el.hidden; }
  /** show until the map is next idle (at least `minMs` after this call, so a change applied asynchronously
   *  after the call still counts) */
  begin(minMs = 250) {
    const g = ++this.#gen, t0 = Date.now();
    this.el.hidden = false;
    const wait = () => this.#map.once("idle", () => {
      if (g !== this.#gen) return;
      if (Date.now() - t0 < minMs) { setTimeout(() => { if (g !== this.#gen) return; if (this.#map.areTilesLoaded?.() !== false && this.#map.loaded?.() !== false) this.end(g); else wait(); }, minMs); return; }
      this.end(g);
    });
    wait();
    setTimeout(() => this.end(g), this.#timeoutMs);
  }
  end(g = this.#gen) { if (g === this.#gen) this.el.hidden = true; }
}
