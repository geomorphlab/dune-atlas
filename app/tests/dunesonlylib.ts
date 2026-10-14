// Shared by tests/dunesonly.test.ts and tests/mars/dunesonly.test.ts: classification of the layers, the
// toggle in the layer panel, its round trip through short (#v=) and long (?query) links, and the mask
// handed to the adapters by the overlay manager.
import { expect } from "vitest";
import type { Registry } from "../src/core/registry/types";
import { Store, type AppState } from "../src/core/store";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { decodeShare, encodeShare, shareFromHash, shareToUrlState } from "../src/core/share/shortlink";
import { parseUrlState, serializeUrlState } from "../src/core/urlstate";
import { appShareState, initialAppState, resolveInitialState } from "../src/core/defaultview";
import { isWindDerived } from "../src/core/map/dunemask";
import { OverlayManager } from "../src/core/map/overlays";
import { DUNES_ONLY_STRIP, mapStripItems, mapStripSvg } from "../src/core/export/mapExport";

export const state = (reg: Registry, dataset: string): AppState => ({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: reg.threshold.defaultIndex,
  layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset, cell: null, embed: false });

export function checkClassification(reg: Registry, notWind: string[]) {
  const wind = reg.layers.filter(isWindDerived).map((l) => l.id);
  for (const id of notWind) expect(wind, id).not.toContain(id);
  for (const l of reg.layers) if (l.type === "zarr-field" && l.thresholdAware) expect(wind).toContain(l.id);
  expect(wind).toContain("dpm"); expect(wind).toContain("rdpa"); expect(wind).toContain("qsdiv"); expect(wind).toContain("qacb");
  expect(reg.layers.filter((l) => !isWindDerived(l)).map((l) => l.id).sort()).toEqual([...notWind].sort());
}

export function checkToggleAndLinks(reg: Registry, dataset: string) {
  document.body.innerHTML = '<aside id="layer-panel"></aside>';
  const root = document.getElementById("layer-panel")!;
  const store = new Store(state(reg, dataset));
  renderLayerPanel(root, reg, store);
  const cb = root.querySelector("#dunes-only") as HTMLInputElement;
  expect(cb).not.toBeNull();
  // next to the Wind dataset selector, default off
  expect(cb.closest("label")!.previousElementSibling?.querySelector(":scope > .dataset-row")).not.toBeNull();
  expect(cb.checked).toBe(false);
  cb.checked = true; cb.dispatchEvent(new Event("change"));
  expect(store.state.dunesOnly).toBe(true);
  store.set({ dunesOnly: false }); expect(cb.checked).toBe(false);
  store.set({ dunesOnly: true });
  // short link: flag bit; decodes back; old links (no bit) are off
  const sh = appShareState(store.state, { lon: 10, lat: 20, zoom: 3 }, true);
  expect(sh.dunesOnly).toBe(true);
  const code = encodeShare(sh);
  expect(decodeShare(code)!.dunesOnly).toBe(true);
  expect(decodeShare(encodeShare({ ...sh, dunesOnly: false }))!.dunesOnly).toBeUndefined();
  const init = resolveInitialState(shareFromHash(`#v=${code}`), {}, dataset, undefined);
  expect(initialAppState(reg, init.url, dataset).dunesOnly).toBe(true);
  expect(shareToUrlState(decodeShare(code)!).dunesOnly).toBe(true);
  // long link: dunesonly=1; absent = off
  const q = serializeUrlState({ ...shareToUrlState(sh) });
  expect(q).toMatch(/[?&]dunesonly=1(&|$)/);
  expect(parseUrlState(q).dunesOnly).toBe(true);
  expect(parseUrlState(q.replace(/&?dunesonly=1/, "")).dunesOnly).toBeUndefined();
  const fromQuery = resolveInitialState(null, parseUrlState(q), dataset, undefined);
  expect(initialAppState(reg, fromQuery.url, dataset).dunesOnly).toBe(true);
  expect(initialAppState(reg, resolveInitialState(null, {}, dataset, undefined).url, dataset).dunesOnly).toBe(false);   // default view: off
}

/** the overlay manager hands a mask only to wind-derived layers, only while the toggle is on, from the
 *  current dataset's cell store */
export function checkOverlayManager(reg: Registry, prefix: string, cellStore: RegExp) {
  const map = { getLayer: () => undefined, getStyle: () => ({ layers: [] }) } as never;
  const om = new OverlayManager(map, reg, "https://data.test", reg.threshold.defaultIndex, { datasetPrefix: prefix });
  const byId = (id: string) => reg.layers.find((l) => l.id === id)!;
  expect(om.duneMaskFor(byId("dpm"))).toBeUndefined();
  om.setDunesOnly(true);
  expect(om.dunesOnly).toBe(true);
  expect(typeof om.duneMaskFor(byId("dpm"))).toBe("function");
  expect(om.duneMaskFor(byId("dunes"))).toBeUndefined();
  expect(om.cellStoreUrl()).toMatch(cellStore);
}

/** PNG map export: the strip says "Dunes only" while it is on and a wind-derived
 *  layer is shown; not when off, nor when only layers it does not affect are shown. */
export function checkExportStrip(reg: Registry, dataset: string) {
  const wind = reg.layers.find((l) => isWindDerived(l) && l.type === "zarr-field")!;
  const other = reg.layers.find((l) => !isWindDerived(l) && l.type === "zarr-field");
  const dunes = reg.layers.find((l) => l.id === "dunes")!;
  const ctx = (ids: string[], dunesOnly: boolean) => ({ reg, width: 1000, includeBasemap: false, shareLink: "https://x/#v=AQ", date: new Date(0),
    view: { lon: 10, lat: 10, zoom: 3, bearing: 0, pitch: 0, proj: "mercator" as const },
    state: { basemap: reg.basemaps[0].id, dataset, utIndex: reg.threshold.defaultIndex, order: ids, dunesOnly,
      layers: Object.fromEntries(ids.map((id) => [id, { visible: true, opacity: 1 }])) } });
  const lines = (ids: string[], on: boolean) => mapStripItems(ctx(ids, on)).filter((i) => "text" in i).map((i) => (i as { text: string }).text);
  expect(DUNES_ONLY_STRIP).toBe("Dunes only: wind-derived layers shown in cells with dunes.");
  const on = lines([wind.id, dunes.id], true);
  expect(on.filter((t) => t === DUNES_ONLY_STRIP)).toHaveLength(1);
  expect(on.indexOf(DUNES_ONLY_STRIP)).toBe(2); // after the heading and the view line, before the sources
  expect(lines([wind.id, dunes.id], false)).not.toContain(DUNES_ONLY_STRIP);
  expect(lines([dunes.id, ...(other ? [other.id] : [])], true)).not.toContain(DUNES_ONLY_STRIP);
  // and in the rendered strip SVG (wrapped text lines joined)
  const { svg } = mapStripSvg(ctx([wind.id], true));
  const txt = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
  expect(txt).toContain("Dunes only: wind-derived layers shown");
}
