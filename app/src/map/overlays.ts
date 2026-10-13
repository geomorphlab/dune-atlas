// Keeps map overlays in sync with app state: lazily adds a layer the first time it is shown,
// removes it when hidden, applies per-layer config (colormap, clim, mode, colours, invert) in
// place or by re-creating the layer, re-attaches everything after a basemap (style) swap, and
// fans the global threshold out to every threshold-aware handle. Stacking follows the user's
// drawing order (top of the list = drawn on top), always above the basemap and below basemap
// labels / the selected-cell outline.
import type { Map as MlMap } from "maplibre-gl";
import type { LayerDef, Registry } from "../registry/types";
import type { LayerState } from "../store";
import type { LayerConfig } from "../layerconfig";
import { resolveSource } from "../registry/merge";
import { ADAPTERS, StaleLayerError, type LayerHandle } from "./adapters";

/** Bottom-most map layer of the selected-cell outline (overlays go below it). */
export const SELECTED_CELL_BOTTOM = "selected-cell-fill";

export function firstSymbolLayer(map: MlMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type === "symbol")?.id;
}

export class OverlayManager {
  #handles = new Map<string, LayerHandle>();
  #applied = new Map<string, LayerConfig | undefined>();
  #pending = new Map<string, Promise<void>>();
  #utIndex: number;
  #generation = 0;
  #desired: Record<string, LayerState> = {};
  /** layers whose adapter threw; not retried until the next style load */
  #failed = new Set<string>();
  onError: (layer: LayerDef, err: unknown) => void = (l, e) => console.warn(`[dune-atlas] layer '${l.id}':`, e);
  /** drawing order, top first */
  #order: string[];
  #datasetPrefix: string | undefined;

  constructor(private map: MlMap, private reg: Registry, private dataBase: string, utIndex: number, opts: { order?: string[]; datasetPrefix?: string } = {}) {
    this.#utIndex = utIndex;
    this.#order = opts.order ?? reg.layers.map((l) => l.id);
    this.#datasetPrefix = opts.datasetPrefix;
  }

  /** the anchor all overlays stay below */
  #topAnchor(): string | undefined {
    if (this.map.getLayer(SELECTED_CELL_BOTTOM)) return SELECTED_CELL_BOTTOM;
    return firstSymbolLayer(this.map);
  }

  /** Insert below the nearest present overlay ABOVE this one in the drawing order. */
  #beforeId(layerId: string): string | undefined {
    const i = this.#order.indexOf(layerId);
    for (let k = i - 1; k >= 0; k--) {
      const h = this.#handles.get(this.#order[k]);
      const first = h?.layerIds.find((x) => this.map.getLayer(x));
      if (first) return first;
    }
    return this.#topAnchor();
  }

  /** Apply a new drawing order to the layers already on the map (top first). */
  setOrder(order: string[]) {
    this.#order = order;
    let anchor = this.#topAnchor();
    for (const id of order) {
      const h = this.#handles.get(id);
      if (!h) continue;
      const ids = h.layerIds.filter((x) => this.map.getLayer(x));
      for (const x of ids) this.map.moveLayer(x, anchor); // keep the handle's own bottom-to-top order
      if (ids.length) anchor = ids[0];
    }
  }

  setDatasetPrefix(prefix: string | undefined) {
    this.#datasetPrefix = prefix;
  }

  #resolve = (src: string) => resolveSource(src, this.dataBase, this.#datasetPrefix);

  #sourceOfVariable = (v: string) => {
    const l = this.reg.layers.find((x) => x.type === "zarr-field" && x.variable === v);
    return l ? this.#resolve(l.source) : undefined;
  };

  async #add(layer: LayerDef, st: LayerState) {
    const gen = this.#generation;
    try {
      const h = await ADAPTERS[layer.type](layer, {
        map: this.map, dataBase: this.dataBase, resolve: this.#resolve, threshold: this.reg.threshold, utIndex: this.#utIndex,
        beforeId: this.#beforeId(layer.id), cfg: st.cfg, sourceOfVariable: this.#sourceOfVariable,
        onDataError: (e) => this.onError(layer, e),
        alive: () => gen === this.#generation,
      }, st.opacity);
      // style replaced meanwhile: the handle only owns objects of the old style (or none), so
      // remove() just detaches its listeners; the new style's reattach adds a fresh one
      if (gen !== this.#generation) { h.remove(); return; }
      this.#handles.set(layer.id, h);
      this.#applied.set(layer.id, st.cfg);
      h.setThreshold?.(this.#utIndex);
      // async adds finish in any order: restore the user's drawing order every time
      this.setOrder(this.#order);
    } catch (e) {
      if (e instanceof StaleLayerError || gen !== this.#generation) return;
      this.#failed.add(layer.id);
      this.onError(layer, e);
    }
  }

  #drop(id: string) {
    this.#handles.get(id)?.remove();
    this.#handles.delete(id);
    this.#applied.delete(id);
  }

  /** Apply desired layer state (call on every state change). */
  sync(layers: Record<string, LayerState>) {
    this.#desired = layers;
    for (const layer of this.reg.layers) {
      const st = layers[layer.id];
      let h = this.#handles.get(layer.id);
      if (st?.visible) {
        if (h && this.#applied.get(layer.id) !== st.cfg) {
          if (h.applyConfig?.(st.cfg)) this.#applied.set(layer.id, st.cfg);
          else { this.#drop(layer.id); h = undefined; }
        }
        if (h) h.setOpacity(st.opacity);
        else if (!this.#pending.has(layer.id) && !this.#failed.has(layer.id)) {
          const gen = this.#generation;
          const p: Promise<void> = this.#add(layer, st).finally(() => {
            if (this.#pending.get(layer.id) === p) this.#pending.delete(layer.id);
            if (gen === this.#generation) this.sync(this.#desired); // apply anything that changed while loading
          });
          this.#pending.set(layer.id, p);
        }
      } else if (h) this.#drop(layer.id);
    }
  }

  /** After setStyle() (all custom/style layers are gone) or a dataset change: dispose every
   *  handle (listeners; map objects only if still its own) and re-add all visible layers. Each
   *  completed add re-applies the drawing order, so the final stack follows `order`. */
  reattach(layers: Record<string, LayerState>) {
    this.#generation++;
    for (const h of this.#handles.values()) h.remove();
    this.#handles.clear();
    this.#applied.clear();
    this.#pending.clear();
    this.#failed.clear();
    this.sync(layers);
  }

  setThreshold(index: number) {
    this.#utIndex = index;
    for (const h of this.#handles.values()) h.setThreshold?.(index);
  }

  get visibleIds(): string[] {
    return [...this.#handles.keys()];
  }

  /** resolves when no layer add is in flight (tests, screenshots) */
  async settled(): Promise<void> {
    while (this.#pending.size) await Promise.allSettled([...this.#pending.values()]);
  }

  /** map layer ids of the handle of a layer (bottom to top) */
  layerIdsOf(id: string): string[] {
    return this.#handles.get(id)?.layerIds ?? [];
  }
}

/** Selected-cell highlight (fill + outline), above every overlay and below basemap labels. */
export type Selection = GeoJSON.Feature | GeoJSON.FeatureCollection | null;
/** Selected-cell highlight: fill + outline layers on one source. Features with `part: "fill"` /
 *  `part: "outline"` are drawn by one layer only (a cell split at the antimeridian: no outline
 *  along the seam); other features by both. */
export function ensureSelectedCellLayers(map: MlMap, feature: Selection) {
  if (!map.getSource("selected-cell")) {
    map.addSource("selected-cell", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const before = firstSymbolLayer(map);
    map.addLayer({ id: SELECTED_CELL_BOTTOM, type: "fill", source: "selected-cell", filter: ["!=", ["get", "part"], "outline"], paint: { "fill-color": "#ffffff", "fill-opacity": 0.12 } }, before);
    map.addLayer({ id: SELECTED_CELL_LINE, type: "line", source: "selected-cell", filter: ["!=", ["get", "part"], "fill"], paint: { "line-color": "#ff4d6d", "line-width": 2 } }, before);
  }
  (map.getSource("selected-cell") as unknown as { setData(d: unknown): void }).setData(feature ?? { type: "FeatureCollection", features: [] });
}
export const SELECTED_CELL_LINE = "selected-cell-line";

/** style.load handler: after a basemap switch, rebuild the app's own layers on the new style -
 *  the selected-cell highlight, then every active overlay in the drawing order with its current
 *  opacity and config. Ignores the empty bootstrap style. */
export function restoreOverlays(map: MlMap, overlays: OverlayManager, layers: Record<string, LayerState>, selection: Selection): boolean {
  const meta = map.getStyle().metadata as Record<string, unknown> | undefined;
  if (!meta?.["atlas:basemap"]) return false;
  ensureSelectedCellLayers(map, selection);
  overlays.reattach(layers);
  return true;
}
