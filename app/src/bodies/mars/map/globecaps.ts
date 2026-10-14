// Mars app hook for the globe polar caps (map/polarcap.ts; docs/guide/mars.md 5b).
// The caps are installed while the map is in globe projection and removed in the flat (Mercator) map, so the
// Mercator style (and the PNG export of it) carries no custom layers. installPolarCaps keeps the caps ordered
// and mirrored on styledata / style.load / idle (basemap switches rebuild the basemap cap).
import type { Map as MlMap } from "maplibre-gl";
import type { BasemapDef, LayerDef } from "../../../core/registry/types";
import { installPolarCaps, type FillCapSpec, type PolarCapOptions } from "./polarcap";

const join = (base: string, key: string) => `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;

/** Fill layers mirrored on the globe: for every vector layer with an invert view (the dunes, adapters.ts
 *  ids `ov-<id>-fill` / `ov-<id>-invert`), the `polar-caps.json` beside its tiles (parts "<id>" / "invert"). */
export function marsCapFills(layers: LayerDef[], dataBase: string): FillCapSpec[] {
  const out: FillCapSpec[] = [];
  for (const l of layers) {
    if (!l.invertSource || !l.source || /^[a-z][a-z0-9+.-]*:\/\//i.test(l.source)) continue;
    const dir = l.source.replace(/\/[^/]*$/, "");
    const url = join(dataBase, `${dir}/polar-caps.json`);
    out.push({ layerId: `ov-${l.id}-fill`, url, part: l.id }, { layerId: `ov-${l.id}-invert`, url, part: "invert" });
  }
  return out;
}

export function marsPolarCapOptions(dataBase: string, basemaps: BasemapDef[], layers: LayerDef[]): PolarCapOptions {
  return { dataBase, basemaps, fills: marsCapFills(layers, dataBase) };
}

type Handler = (...a: unknown[]) => void;
/** The map as seen by one installation: its event handlers stop running once `live()` is false. MapLibre fires
 *  a snapshot of the listener list, so without this an installation's own sync, later in the same event as
 *  the disposal, would add the caps back. */
function guardedMap(map: MlMap, live: () => boolean): MlMap {
  const wrapped = new Map<Handler, Handler>();
  const proxy: MlMap = new Proxy(map, {
    get(t, p) {
      if (p === "on") return (e: string, f: Handler) => { const g: Handler = (...a) => { if (live()) f(...a); }; wrapped.set(f, g); (t.on as (e: string, f: Handler) => unknown)(e, g); return proxy; };
      if (p === "off") return (e: string, f: Handler) => { (t.off as (e: string, f: Handler) => unknown)(e, wrapped.get(f) ?? f); wrapped.delete(f); return proxy; };
      const v = Reflect.get(t, p, t) as unknown;
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  });
  return proxy;
}

/** Install the caps in globe projection, remove them in Mercator; re-checked on every style / projection
 *  event and by `sync()` (called by main.ts after setProjection). */
export function globePolarCaps(map: MlMap, opts: PolarCapOptions, install: typeof installPolarCaps = installPolarCaps) {
  let dispose: (() => void) | null = null;
  const sync = () => {
    const globe = map.getProjection?.()?.type === "globe";
    if (globe && !dispose) {
      let live = true;
      const d = install(guardedMap(map, () => live), opts);
      dispose = () => { live = false; d(); };
    } else if (!globe && dispose) { dispose(); dispose = null; }
  };
  const events = ["styledata", "style.load", "projectiontransition", "idle"] as const;
  for (const e of events) map.on(e as never, sync);
  sync();
  return {
    sync,
    get installed() { return dispose !== null; },
    dispose() { for (const e of events) map.off(e as never, sync); dispose?.(); dispose = null; },
  };
}
