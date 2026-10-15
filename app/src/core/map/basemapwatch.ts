// Notice for a basemap that cannot be loaded: its provider is down, or blocked on the user's network
// (e.g. OpenTopoMap and OpenPlanetaryMap in mainland China, tested October 2026). After each basemap switch
// the tile errors of the basemap's own sources are counted; when FAIL_AFTER of them have failed and none has
// loaded, a notice asks the user to choose another basemap. A style basemap whose style file cannot be
// fetched fails at once. The notice goes as soon as a tile loads or the basemap changes; × closes it.
// Errors of the atlas's own layers (data, labels, selected cell) are not counted.
import { fill, t, tr } from "../../i18n";
import { basemapKey } from "../../i18n/keys";
import type { BasemapDef } from "../registry/types";
import { basemapStyle } from "./basemaps";
import { h } from "../ui/dom";

export const BASEMAP_FAILED_TEXT = (title: string) =>
  `The basemap “${title}” could not be loaded from its provider. It may be blocked on your network or temporarily unavailable. Please choose another basemap.`;
export const BASEMAP_NOTICE_CLOSE = "Close";
/** tile errors (with no tile loaded) before the notice is shown */
export const FAIL_AFTER = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ev = any;
export interface WatchMap {
  on(ev: string, fn: (e: Ev) => void): unknown;
  getStyle(): { sources?: Record<string, unknown> } | undefined;
}

/** MapLibre stops drawing when a tile request fails with a network error (blocked host, dropped
 *  connection) after its last frame: no further frame, no 'idle', and after a basemap switch the globe stays
 *  blank until the page is reloaded (maplibre-gl-js issue #8716, MapLibre 5.24). Workaround from that issue:
 *  ask for a new frame on every error of a source or tile (frames are coalesced; the requests stop once
 *  MapLibre has no tile left to try). */
export function repaintOnTileErrors(map: { on(ev: string, fn: (e: Ev) => void): unknown; triggerRepaint(): void }) {
  map.on("error", (e: Ev) => { if (e?.sourceId) map.triggerRepaint(); });
}

/** host of a style URL ("" when it is not a URL) */
const hostOf = (u: string | undefined) => { try { return new URL(u ?? "").host; } catch { return ""; } };

export class BasemapWatch {
  readonly el: HTMLElement;
  #text: HTMLElement;
  #b: BasemapDef | null = null;
  #sources: Set<string> | null = null;
  #styleLoaded = false;
  #errors = 0;
  #loaded = 0;
  #closed = false;

  constructor(map: WatchMap, parent: HTMLElement = document.body) {
    this.#text = h("span", {});
    const close = h("button", { type: "button", class: "close", "aria-label": BASEMAP_NOTICE_CLOSE, title: BASEMAP_NOTICE_CLOSE }, "×");
    close.addEventListener("click", () => { this.#closed = true; this.el.hidden = true; });
    this.el = h("div", { class: "basemap-notice", role: "status", "aria-live": "polite", hidden: true }, this.#text, close);
    parent.append(this.el);
    // registered before the app's own 'style.load' handler adds its layers: the sources are the basemap's
    map.on("style.load", () => {
      this.#styleLoaded = true;
      if (this.#b?.kind === "style") this.#sources = new Set(Object.keys(map.getStyle()?.sources ?? {}));
    });
    map.on("error", (e: Ev) => this.#onError(e));
    map.on("sourcedata", (e: Ev) => {
      if (e?.tile && this.#sources?.has(e.sourceId)) { this.#loaded++; this.#update(); }
    });
  }

  /** a new basemap is being applied */
  start(b: BasemapDef) {
    this.#b = b;
    this.#styleLoaded = false;
    this.#errors = 0; this.#loaded = 0; this.#closed = false;
    const s = b.kind === "style" ? null : basemapStyle(b);
    this.#sources = s && typeof s === "object" ? new Set(Object.keys(s.sources)) : null;
    this.el.hidden = true;
  }

  get shown() { return !this.el.hidden; }

  #onError(e: Ev) {
    const b = this.#b;
    if (!b) return;
    const id: string | undefined = e?.sourceId;
    if (id) {
      if (!this.#sources?.has(id)) return;
      this.#errors++;
    } else {
      // the style file of a style basemap (before it has loaded)
      if (b.kind !== "style" || this.#styleLoaded) return;
      const host = hostOf(b.style), where = String(e?.error?.url ?? e?.error?.message ?? "");
      if (!host || !where.includes(host)) return;
      this.#errors += FAIL_AFTER;
    }
    this.#update();
  }

  #update() {
    const b = this.#b;
    if (!b) return;
    if (this.#loaded > 0) { this.el.hidden = true; return; }
    if (this.#errors >= FAIL_AFTER && !this.#closed && this.el.hidden) {
      this.#text.textContent = fill(t("basemap.failed"), { title: tr(basemapKey(b.id), b.title.trim()) });
      this.el.hidden = false;
    }
  }
}
