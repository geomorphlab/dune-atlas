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
import { ADAPTERS, type LayerHandle } from "./adapters";

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
      }, st.opacity);
      if (gen !== this.#generation) { h.remove(); return; } // style changed meanwhile
      this.#handles.set(layer.id, h);
      this.#applied.set(layer.id, st.cfg);
      h.setThreshold?.(this.#utIndex);
    } catch (e) {
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
          const p = this.#add(layer, st).finally(() => {
            this.#pending.delete(layer.id);
            this.sync(this.#desired); // apply anything that changed while loading
          });
          this.#pending.set(layer.id, p);
        }
      } else if (h) this.#drop(layer.id);
    }
  }

  /** After setStyle(): all custom/style layers are gone - forget handles and re-add. */
  reattach(layers: Record<string, LayerState>) {
    this.#generation++;
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
}
