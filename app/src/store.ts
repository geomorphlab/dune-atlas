// Minimal observable app state. Components subscribe to the keys they care about.
import type { LayerConfig } from "./layerconfig";

export interface LayerState { visible: boolean; opacity: number; cfg?: LayerConfig }

export interface AppState {
  basemap: string;
  projection: "globe" | "mercator";
  utIndex: number;
  layers: Record<string, LayerState>;
  /** layer ids in drawing order, TOP first (top of the list = drawn on top) */
  order: string[];
  /** selected wind dataset id (registry.datasets) */
  dataset: string;
  cell: [number, number] | null;
  embed: boolean;
}

type Key = keyof AppState;
type Listener = (s: AppState, changed: Set<Key>) => void;

export class Store {
  #s: AppState;
  #ls: Listener[] = [];
  #intercepts: ((patch: Partial<AppState>, cur: Readonly<AppState>) => Partial<AppState>)[] = [];
  constructor(init: AppState) { this.#s = init; }
  get state(): Readonly<AppState> { return this.#s; }
  /** Rewrite a patch before it is applied (e.g. a dataset switch also resets per-dataset layer
   *  config), so dependent keys change in ONE notification. */
  intercept(f: (patch: Partial<AppState>, cur: Readonly<AppState>) => Partial<AppState>): void { this.#intercepts.push(f); }
  set(patch: Partial<AppState>): void {
    for (const f of this.#intercepts) patch = f(patch, this.#s);
    const changed = new Set<Key>();
    for (const k of Object.keys(patch) as Key[]) {
      if (this.#s[k] !== patch[k]) changed.add(k);
    }
    if (!changed.size) return;
    this.#s = { ...this.#s, ...patch };
    for (const l of this.#ls) l(this.#s, changed);
  }
  setLayer(id: string, patch: Partial<LayerState>): void {
    const cur = this.#s.layers[id] ?? { visible: false, opacity: 1 };
    this.set({ layers: { ...this.#s.layers, [id]: { ...cur, ...patch } } });
  }
  /** merge into a layer's config; `undefined` values delete keys (reset to registry default) */
  setLayerConfig(id: string, patch: Partial<LayerConfig>): void {
    const cur = this.#s.layers[id] ?? { visible: false, opacity: 1 };
    const cfg: LayerConfig = { ...(cur.cfg ?? {}), ...patch };
    for (const k of Object.keys(cfg) as (keyof LayerConfig)[]) if (cfg[k] === undefined) delete cfg[k];
    this.setLayer(id, { cfg: Object.keys(cfg).length ? cfg : undefined });
  }
  /** move layer `id` to position `to` (0 = top) in the drawing order */
  moveLayer(id: string, to: number): void {
    const order = moveInOrder(this.#s.order, id, to);
    if (order !== this.#s.order) this.set({ order });
  }
  subscribe(l: Listener): () => void {
    this.#ls.push(l);
    return () => { this.#ls = this.#ls.filter((x) => x !== l); };
  }
}

/** Pure: `order` with `id` moved to index `to` (clamped); returns the same array if unchanged. */
export function moveInOrder(order: string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from < 0) return order;
  const t = Math.max(0, Math.min(order.length - 1, to));
  if (t === from) return order;
  const out = order.filter((x) => x !== id);
  out.splice(t, 0, id);
  return out;
}

/** Restore a saved order against the current registry: known ids in saved order first, then any
 *  ids missing from the saved list in registry order (new layers), unknown ids dropped. */
export function normaliseOrder(saved: string[] | undefined, registryOrder: string[]): string[] {
  if (!saved?.length) return [...registryOrder];
  const known = new Set(registryOrder);
  const out = saved.filter((id, i) => known.has(id) && saved.indexOf(id) === i);
  for (const id of registryOrder) if (!out.includes(id)) out.splice(Math.min(registryOrder.indexOf(id), out.length), 0, id);
  return out;
}
