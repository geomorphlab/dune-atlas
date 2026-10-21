// The opening view: with no view state in the URL the atlas opens in the state of
//   https://map.geomorphlab.org/#v=AUXirhW4wRLgAgIDDgMJVSACATcAB1UA
// (set as defaults at the source, not by redirecting); #v= links and ?query permalinks override
// it; a returning user's explicit dataset choice persists; embed mode uses the same default; the
// default re-encodes to the same link.
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/core/registry/load";
import { applyDatasetLayers, selectDataset } from "../src/core/registry/merge";
import { decodeShare, encodeShare, shareFromHash } from "../src/core/share/shortlink";
import { parseUrlState, serializeUrlState } from "../src/core/urlstate";
import { appShareState, DEFAULT_SHARE_CODE, DEFAULT_VIEW, hasViewState, initialAppState, resolveInitialState } from "../src/core/defaultview";
import { TOUR_STEPS } from "../src/core/ui/helpText";
import { DEMO_LAYER } from "../src/core/ui/tourHooks";

const { registry: reg } = loadRegistry();
const open = (hash: string, search: string, stored?: string) => {
  const start = resolveInitialState(shareFromHash(hash), parseUrlState(search), reg.defaultDataset, stored);
  const ds = selectDataset(reg, start.dataset)!.id;
  applyDatasetLayers(reg, ds);
  return { start, app: initialAppState(reg, start.url, ds) };
};
const visible = (a: ReturnType<typeof open>["app"]) => a.order.filter((id) => a.layers[id].visible).map((id) => [id, a.layers[id].opacity, a.layers[id].cfg ?? null]);

describe("the default view", () => {
  it("is the decoded author link, and encodes back to exactly the same link", () => {
    const d = decodeShare(DEFAULT_SHARE_CODE)!;
    expect(d).toEqual({ lon: 17.5025, lat: 15.1644, zoom: 3.52, proj: "globe", dataset: "era5", basemap: "hillshade", ut: 14,
      layers: [{ id: "rdpa", opacity: 0.85, cfg: { mode: "streamlines" } }, { id: "dunes", opacity: 0.55 }, { id: "dpm", opacity: 0.85 }], cell: null, panel: true, names: true });
    expect(DEFAULT_VIEW).toEqual(d);
    expect(encodeShare(DEFAULT_VIEW)).toBe(DEFAULT_SHARE_CODE);
    expect(reg.threshold.values[DEFAULT_VIEW.ut]).toBeCloseTo(0.15, 9);
    for (const l of DEFAULT_VIEW.layers) expect(reg.layers.some((x) => x.id === l.id), l.id).toBe(true);
    expect(reg.basemaps.some((b) => b.id === DEFAULT_VIEW.basemap)).toBe(true);
    expect(reg.datasets!.some((x) => x.id === DEFAULT_VIEW.dataset)).toBe(true);
  });
  for (const search of ["", "?embed=1", "?tour=1", "?embed=1&tour=1"]) {
    it(`bare URL${search ? ` (${search})` : ""}: app state = the decoded default; the share state re-encodes to the same link`, () => {
      expect(hasViewState(parseUrlState(search))).toBe(false);
      const { start, app } = open("", search);
      expect(start.source).toBe("default");
      expect(app.dataset).toBe("era5");
      expect(app.basemap).toBe("hillshade");
      expect(app.names).toBe(true);                // dune-field names shown
      expect(app.projection).toBe("globe");
      expect(app.utIndex).toBe(14);
      expect(app.cell).toBeNull();
      expect(app.embed).toBe(search.includes("embed"));
      expect(visible(app)).toEqual([["rdpa", 0.85, { mode: "streamlines" }], ["dunes", 0.55, null], ["dpm", 0.85, null]]);
      expect(app.order.filter((id) => app.layers[id].visible)).toEqual(["rdpa", "dunes", "dpm"]); // drawing order, top first
      expect([start.url.lon, start.url.lat, start.url.zoom]).toEqual([17.5025, 15.1644, 3.52]);
      expect(start.bearing).toBe(0);
      // what the Share button would produce right after opening (layer list open, as on desktop)
      expect(encodeShare(appShareState(app, { lon: start.url.lon!, lat: start.url.lat!, zoom: start.url.zoom! }, true))).toBe(DEFAULT_SHARE_CODE);
    });
  }
  it("a returning user's explicit dataset choice persists; everything else is the default", () => {
    const { start, app } = open("", "", "era5-land");
    expect(start.source).toBe("default");
    expect(app.dataset).toBe("era5-land");
    expect(visible(app)).toEqual([["rdpa", 0.85, { mode: "streamlines" }], ["dunes", 0.55, null], ["dpm", 0.85, null]]);
    expect(open("", "", "era5").app.dataset).toBe("era5");
    expect(open("", "", "no-such-dataset").app.dataset).toBe(reg.defaultDataset); // unknown stored id: registry fallback
  });
});

describe("links override the default", () => {
  it("#v= share link: its own state (dataset too, whatever is stored)", () => {
    const other = encodeShare({ lon: -115.73, lat: 32.98, zoom: 8.4, proj: "mercator", dataset: "era5-land", basemap: "esri-imagery", ut: 20, layers: [{ id: "at", opacity: 0.6 }], cell: [1145, 1952], panel: false });
    const { start, app } = open(`#v=${other}`, "?tour=1", "era5");
    expect(start.source).toBe("share");
    expect(start.url.tour).toBe(true);
    expect(start.panel).toBe(false);
    expect(app.dataset).toBe("era5-land");
    expect(app.basemap).toBe("esri-imagery");
    expect(app.projection).toBe("mercator");
    expect(app.utIndex).toBe(20);
    expect(app.cell).toEqual([1145, 1952]);
    expect(visible(app)).toEqual([["at", 0.6, null]]);
    expect([start.url.lon, start.url.lat, start.url.zoom]).toEqual([-115.73, 32.98, 8.4]);
  });
  it("?query permalink: its fields win; missing fields come from the default; no dataset = ERA5-Land (as written)", () => {
    const q = open("", "?lon=15.2&lat=-24.5&zoom=6.2&layers=dunes:0.7,at&ut=10&cell=1145,1952", "era5");
    expect(q.start.source).toBe("query");
    expect(q.app.dataset).toBe("era5-land"); // legacy: written without dataset when it was ERA5-Land
    expect(visible(q.app).map((v) => v[0])).toEqual(["dunes", "at"].sort((a, b) => reg.layers.findIndex((l) => l.id === a) - reg.layers.findIndex((l) => l.id === b)));
    expect(q.app.utIndex).toBe(10);
    expect(q.app.cell).toEqual([1145, 1952]);
    expect(q.app.basemap).toBe("hillshade");
    expect([q.start.url.lon, q.start.url.lat, q.start.url.zoom]).toEqual([15.2, -24.5, 6.2]);
    const e = open("", "?dataset=era5&zoom=5");
    expect(e.app.dataset).toBe("era5");
    expect([e.start.url.lon, e.start.url.lat, e.start.url.zoom]).toEqual([17.5025, 15.1644, 5]); // camera centre from the default
    expect(visible(e.app).map((v) => v[0])).toEqual(["rdpa", "dunes", "dpm"]); // layers from the default
    const none = open("", "?layers=&lon=0&lat=0");
    expect(visible(none.app)).toEqual([]);
  });
  it("the query permalink written by the app always names the dataset", () => {
    const s = serializeUrlState({ lon: 1, lat: 2, zoom: 3, dataset: "era5-land" });
    expect(s).toContain("dataset=era5-land");
  });
});

describe("the tour works from the default", () => {
  it("step anchors exist in the default state: the RDD layer item (visible, with Display), the active-layer list", () => {
    const { app } = open("", "");
    expect(app.layers[DEMO_LAYER].visible).toBe(true);
    expect(TOUR_STEPS.find((s) => s.id === "layers")!.targets[0]).toContain(DEMO_LAYER);
    expect(TOUR_STEPS.find((s) => s.id === "active")!.targets[0]).toContain(".order");
    expect(app.cell).toBeNull(); // step 6 opens the example cell and closes the panel again on leaving
  });
});
