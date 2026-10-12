// Minimal MapLibre 5 stand-in for overlay / basemap-switch tests. Emulates the parts the app relies
// on: setStyle(style | url, {diff: false, transformStyle}) loads asynchronously, replaces every
// layer and source, defers while the previous style is still loading (as Map._updateStyle does)
// and only the style that ends up current emits 'style.load' on the map; addLayer/addSource
// throw while the style is loading; duplicate ids / unknown `before` fire 'error' (not added);
// getLayer returns per-style layer instances (custom layers expose .implementation).
type Spec = Record<string, unknown> & { id: string; type: string };
interface StyleLayerLike { id: string; type: string; source?: string; paint: Record<string, unknown>; layout: Record<string, unknown>; implementation?: unknown; spec: Spec }
interface FakeStyle { loaded: boolean; layers: StyleLayerLike[]; sources: Map<string, { spec: Record<string, unknown>; data?: unknown; setData(d: unknown): void }>; metadata?: unknown; onLoad: (() => void)[]; json?: Record<string, unknown> }

export class FakeMap {
  style: FakeStyle = { loaded: true, layers: [], sources: new Map(), onLoad: [] };
  listeners = new Map<string, Set<(e?: unknown) => void>>();
  errors: string[] = [];
  styleLoads = 0;
  constructor(private styleUrls: Record<string, Record<string, unknown>> = {}, private delayMs: () => number = () => 0) {}

  on(t: string, f: (e?: unknown) => void) { (this.listeners.get(t) ?? this.listeners.set(t, new Set()).get(t)!).add(f); return this; }
  off(t: string, f: (e?: unknown) => void) { this.listeners.get(t)?.delete(f); return this; }
  fire(t: string, e?: unknown) { for (const f of [...(this.listeners.get(t) ?? [])]) f(e); }
  listenerCount(t: string) { return this.listeners.get(t)?.size ?? 0; }
  #err(msg: string) { this.errors.push(msg); this.fire("error", { error: new Error(msg) }); }

  setStyle(style: string | Record<string, unknown>, opts: { transformStyle?: (prev: unknown, next: Record<string, unknown>) => Record<string, unknown> } = {}) {
    if (opts.transformStyle && !this.style.loaded) { this.style.onLoad.push(() => this.setStyle(style, opts)); return this; }
    const prev = this.getStyle();
    const st: FakeStyle = { loaded: false, layers: [], sources: new Map(), onLoad: [] };
    this.style = st;
    void (async () => {
      await new Promise((r) => setTimeout(r, this.delayMs()));
      let json = typeof style === "string" ? this.styleUrls[style] : style;
      if (!json) throw new Error(`unknown style ${String(style)}`);
      json = JSON.parse(JSON.stringify(json));
      if (opts.transformStyle) json = opts.transformStyle(prev, json);
      st.metadata = json.metadata;
      st.loaded = true;
      for (const [id, spec] of Object.entries((json.sources ?? {}) as Record<string, Record<string, unknown>>)) this.#addSourceTo(st, id, spec);
      for (const l of (json.layers ?? []) as Spec[]) st.layers.push(this.#mk(l));
      // Style listeners (deferred swaps) run first; the event reaches the map only if this
      // style is still current (the old style's evented parent is cleared on replacement)
      for (const f of st.onLoad.splice(0)) f();
      if (this.style === st) { this.styleLoads++; this.fire("style.load"); }
    })();
    return this;
  }
  #mk(l: Spec): StyleLayerLike {
    if ((l as { type: string }).type === "custom") return { id: l.id, type: "custom", paint: {}, layout: {}, implementation: l, spec: l };
    return { id: l.id, type: l.type, source: l.source as string | undefined, paint: { ...((l.paint ?? {}) as object) }, layout: { ...((l.layout ?? {}) as object) }, spec: l };
  }
  #addSourceTo(st: FakeStyle, id: string, spec: Record<string, unknown>) {
    const s = { spec, data: spec.data, setData(d: unknown) { s.data = d; } };
    st.sources.set(id, s);
  }
  #checkLoaded() { if (!this.style.loaded) throw new Error("Style is not done loading."); }
  getStyle() { return { version: 8, metadata: this.style.metadata, layers: this.style.layers.map((l) => ({ id: l.id, type: l.type, source: l.source })), sources: Object.fromEntries(this.style.sources) }; }
  isStyleLoaded() { return this.style.loaded; }
  addSource(id: string, spec: Record<string, unknown>) {
    this.#checkLoaded();
    if (this.style.sources.has(id)) throw new Error(`Source "${id}" already exists.`);
    this.#addSourceTo(this.style, id, spec);
  }
  getSource(id: string) { return this.style.sources.get(id); }
  removeSource(id: string) {
    this.#checkLoaded();
    if (this.style.layers.some((l) => l.source === id)) return this.#err(`Source "${id}" cannot be removed while layer is using it.`);
    this.style.sources.delete(id);
  }
  addLayer(spec: Spec, before?: string) {
    this.#checkLoaded();
    if (this.getLayer(spec.id)) return this.#err(`Layer "${spec.id}" already exists on this map.`);
    if (spec.type !== "custom" && spec.source && !this.style.sources.has(spec.source as string)) return this.#err(`Source "${spec.source}" not found`);
    const l = this.#mk(spec);
    if (before !== undefined) {
      const i = this.style.layers.findIndex((x) => x.id === before);
      if (i < 0) return this.#err(`Cannot add layer "${spec.id}" before non-existing layer "${before}".`);
      this.style.layers.splice(i, 0, l);
    } else this.style.layers.push(l);
  }
  getLayer(id: string) { return this.style.layers.find((l) => l.id === id); }
  removeLayer(id: string) {
    this.#checkLoaded();
    const i = this.style.layers.findIndex((l) => l.id === id);
    if (i < 0) return this.#err(`Cannot remove non-existing layer "${id}".`);
    this.style.layers.splice(i, 1);
  }
  moveLayer(id: string, before?: string) {
    const i = this.style.layers.findIndex((l) => l.id === id);
    if (i < 0) return this.#err(`The layer '${id}' does not exist in the map's style and cannot be moved.`);
    const [l] = this.style.layers.splice(i, 1);
    const j = before === undefined ? -1 : this.style.layers.findIndex((x) => x.id === before);
    if (j < 0) this.style.layers.push(l); else this.style.layers.splice(j, 0, l);
  }
  setPaintProperty(id: string, k: string, v: unknown) { const l = this.getLayer(id); if (!l) return this.#err(`paint: no layer ${id}`); l.paint[k] = v; }
  getPaintProperty(id: string, k: string) { return this.getLayer(id)?.paint[k]; }
  setLayoutProperty(id: string, k: string, v: unknown) { const l = this.getLayer(id); if (!l) return this.#err(`layout: no layer ${id}`); l.layout[k] = v; }
  getLayoutProperty(id: string, k: string) { return this.getLayer(id)?.layout[k]; }
  layerOrder() { return this.style.layers.map((l) => l.id); }
  // view
  getCanvas() { return { clientWidth: 800, clientHeight: 500, style: {} }; }
  getBounds() { return { getWest: () => 0, getEast: () => 40, getSouth: () => -40, getNorth: () => 0 }; }
  getCenter() { return { lng: 15, lat: -24 }; }
  getZoom() { return 4; }
  project(ll: { lng: number; lat: number } | [number, number]) { const [x, y] = Array.isArray(ll) ? ll : [ll.lng, ll.lat]; return { x: x * 20, y: -y * 20 }; }
  unproject(p: [number, number]) { return { lng: p[0] / 20, lat: -p[1] / 20 }; }
  triggerRepaint() {}
  setProjection() {}
}
