// @vitest-environment happy-dom
// ERA5 (0.25°) wind dataset: registry variants, dataset switching (layer definitions, sources,
// colour-limit overrides, overlays, basemap switch afterwards), 0.25° grid snapping incl. the
// antimeridian, and the click panel + downloads on an ERA5 fixture region copied from the live store.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { loadRegistry } from "../src/core/registry/load";
import { validateRegistry } from "../src/core/registry/validate";
import schema from "../../registry/layers.schema.json";
import { applyDatasetLayers, initialDataset, layersForDatasetSwitch, resolveSource, selectDataset } from "../src/core/registry/merge";
import { effectiveDisplay } from "../src/core/layerconfig";
import { Store, type AppState, type LayerState } from "../src/core/store";
import { snapToCell, cellFromIndex, cellBounds, type Grid } from "../src/core/cell/snap";
import { CellStore, type CellData } from "../src/core/cell/cellstore";
import { CellPanel } from "../src/core/ui/cellPanel";
import { cellNetcdf, exportBaseName, metadataJson, readmeText, versionFromPrefix } from "../src/core/cell/export";
import { citationFile } from "../src/core/cell/downloads";
import { auxDescription } from "../src/core/cell/auxinfo";
import { formatUt } from "../src/core/ui/threshold";
import { readNc } from "./ncreader";
import { FakeMap } from "./fakemap";
import { OverlayManager, restoreOverlays } from "../src/core/map/overlays";
import { setBasemap } from "../src/core/map/basemaps";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import type { Map as MlMap } from "maplibre-gl";

vi.mock("../src/core/map/fieldreader", () => ({ FieldReader: { open: () => Promise.reject(new Error("no field data in this test")) } }));

const REPO = path.resolve(__dirname, "../..");
const FIX = path.join(REPO, "staging/fixture/datasets/era5");
const haveFix = fs.existsSync(path.join(FIX, "cells.zarr/zarr.json"));
const ERA5_GRID: Grid = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 };

describe("registry: ERA5 dataset", () => {
  const reg = loadRegistry().registry;
  it("ERA5-Land and ERA5 entries (ERA5 from registry/earth/datasets/era5); merged registry validates", () => {
    // the two ERA5 datasets by id; other datasets may follow
    expect(reg.datasets!.slice(0, 2).map((d) => [d.id, d.title, d.prefix])).toEqual([
      ["era5-land", "ERA5-Land 0.1°, 1950–2024", "dune-atlas/v1"],
      ["era5", "ERA5 0.25°, 1950–2024", "dune-atlas/v2/datasets/era5"], // rebuilt: land = lsm > 0
    ]);
    expect(reg.datasets!.find((d) => d.id === "era5")!.cellAuxStores).toEqual(["{dataset}/cells-aux.zarr", "{dataset}/cells-aux-veg.zarr"]);
    expect(loadRegistry().errors).toEqual([]);
    expect(validateRegistry(reg, schema)).toEqual([]);
  });
  it("ERA-Land field sources resolve to the existing keys; ERA5 to its own; shared layers unchanged", () => {
    const head = (f: string) => (yaml.load(fs.readFileSync(path.join(REPO, "registry/earth/generated", f), "utf8")) as { layers: { id: string; source: string }[] }).layers;
    const fieldIds = [...head("qsat_fields.yaml"), ...head("x_extra_fields.yaml").filter((l) => l.id === "qsdiv")].map((l) => l.id);
    expect(fieldIds.length).toBe(24);
    for (const id of fieldIds) {
      const l = reg.layers.find((x) => x.id === id)!;
      expect(l.source).toBe(`{dataset}/fields/${id}.zarr`);
      expect(resolveSource(l.source, "https://d.org", "dune-atlas/v1")).toBe(`https://d.org/dune-atlas/v1/fields/${id}.zarr`);
      expect(resolveSource(l.source, "https://d.org", "dune-atlas/v2/datasets/era5")).toBe(`https://d.org/dune-atlas/v2/datasets/era5/fields/${id}.zarr`);
    }
    const v = reg.datasetLayers!.era5;
    expect(Object.keys(v).sort()).toEqual([...fieldIds].sort()); // dunes, aridity, vegetation: shared
    for (const id of ["dunes", "aridity", "vegetation"]) expect(reg.layers.find((x) => x.id === id)!.source).not.toContain("{dataset}");
    expect(v.qacb.display!.clim).not.toEqual(reg.layers.find((x) => x.id === "qacb")!.display!.clim);
    // DP and RDP: one fixed colour range for both datasets, so the maps compare by eye
    for (const id of ["dpm", "rdpm"]) expect(v[id].display!.clim, id).toEqual(reg.layers.find((x) => x.id === id)!.display!.clim);
    expect(v.dpm.display!.clim).toEqual([0.01, 300]);
    expect(v.dpm.citation).toContain("10.1002/qj.3803");
  });
  it("applyDatasetLayers swaps definitions in place and restores the default", () => {
    const r = loadRegistry().registry;
    const dpm = r.layers.find((x) => x.id === "dpm")!;
    const climLand = [...dpm.display!.clim!];
    const changed = applyDatasetLayers(r, "era5");
    expect(changed.length).toBe(24);
    expect(r.layers.find((x) => x.id === "dpm")).toBe(dpm); // same object
    expect(dpm.display!.clim).toEqual(r.datasetLayers!.era5.dpm.display!.clim);
    expect(dpm.citation).toContain("ERA5");
    expect(applyDatasetLayers(r, "era5")).toEqual([]);
    expect(applyDatasetLayers(r, "era5-land").length).toBe(24);
    expect(dpm.display!.clim).toEqual(climLand);
  });
  it("dataset switch keeps config except colour limits of swapped layers", () => {
    const layers: Record<string, LayerState> = {
      dpm: { visible: true, opacity: 0.6, cfg: { clim: [1, 2], colormap: "viridis", reverse: true, log: true } },
      rdpa: { visible: true, opacity: 0.9, cfg: { mode: "streamlines", vecColor: "#112233", spacingKm: 200 } },
      aridity: { visible: true, opacity: 0.5, cfg: { clim: [0.01, 2] } },
    };
    const out = layersForDatasetSwitch(layers, ["dpm", "rdpa"]);
    expect(out.dpm).toEqual({ visible: true, opacity: 0.6, cfg: { colormap: "viridis", reverse: true, log: true } });
    expect(out.rdpa).toBe(layers.rdpa);
    expect(out.aridity).toBe(layers.aridity); // shared layer: its limits stay
  });
  it("initial dataset: URL, else stored choice unless the URL selects a cell, else default", () => {
    expect(initialDataset(reg, "era5", false, undefined)).toBe("era5");
    expect(initialDataset(reg, undefined, false, "era5")).toBe("era5");
    expect(initialDataset(reg, undefined, true, "era5")).toBe("era5-land");
    expect(initialDataset(reg, undefined, false, "nope")).toBe("era5-land");
    expect(initialDataset(reg, "nope", false, "era5")).toBe("era5-land");
    expect(versionFromPrefix(selectDataset(reg, "era5")!.prefix)).toBe("v2");
  });
});

describe("0.25° grid: snapping and cell edges incl. the antimeridian and the poles", () => {
  it("cell centres, containing cells and edges", () => {
    expect(snapToCell(15.2, -24.5, ERA5_GRID)).toMatchObject({ iy: 458, ix: 781, lat: -24.5, lon: 15.25 });
    expect(snapToCell(15.1249, -24.5, ERA5_GRID)!.ix).toBe(780);
    expect(snapToCell(15.1251, -24.5, ERA5_GRID)!.ix).toBe(781);
    // antimeridian: the -180 cell spans 179.875..180..-179.875
    expect(snapToCell(179.9, 0, ERA5_GRID)!.ix).toBe(0);
    expect(snapToCell(-179.9, 0, ERA5_GRID)!.ix).toBe(0);
    expect(snapToCell(179.86, 0, ERA5_GRID)!.ix).toBe(1439);
    expect(snapToCell(540.1, 0, ERA5_GRID)!.ix).toBe(0);
    expect(snapToCell(0, 90, ERA5_GRID)!.iy).toBe(0);
    expect(snapToCell(0, -90, ERA5_GRID)!.iy).toBe(720);
    const b = cellBounds(cellFromIndex(458, 1439, ERA5_GRID), ERA5_GRID).flat();
    expect(Math.min(...b.filter((_, k) => k % 2 === 0))).toBeCloseTo(179.625, 9);
    expect(Math.max(...b.filter((_, k) => k % 2 === 0))).toBeCloseTo(179.875, 9);
    // an ERA5-Land cell snaps to the containing 0.25° cell (dataset switch keeps the location)
    const land = cellFromIndex(1145, 1952); // (-24.5, 15.2)
    expect(snapToCell(land.lon, land.lat, ERA5_GRID)).toMatchObject({ iy: 458, ix: 781 });
  });
});

class RFS {
  constructor(private root: string) {}
  async get(k: string) { const p = this.root + k; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(k: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + k; if (!fs.existsSync(p)) return undefined;
    const b = fs.readFileSync(p), n = b.length;
    return "suffixLength" in r ? new Uint8Array(b.subarray(n - r.suffixLength)) : new Uint8Array(b.subarray(r.offset, r.offset + r.length));
  }
}
const META = (id: string) => ({ datasetId: id, datasetTitle: id === "era5" ? "ERA5 0.25°, 1950–2024" : "ERA5-Land 0.1°, 1950–2024", dataVersion: "v1", permalink: "https://map.geomorphlab.org/", generated: new Date("2026-10-13T00:00:00Z") });

describe.skipIf(!haveFix)("ERA5 fixture: panel and downloads", () => {
  let cs: CellStore;
  beforeAll(async () => {
    cs = await CellStore.open(new RFS(path.join(FIX, "cells.zarr")) as never, { aux: [new RFS(path.join(FIX, "cells-aux.zarr")), new RFS(path.join(FIX, "cells-aux-veg.zarr"))] as never });
  });
  it("cell store grid and hours are the ERA5 ones; aux has the vegetation valid fraction, no land–sea mask", async () => {
    expect(cs.grid).toMatchObject(ERA5_GRID);
    const c = await cs.query(458, 781);
    expect(c.lat).toBe(-24.5);
    expect(c.lon).toBe(15.25);
    expect(c.totalHours).toBe(657456);
    expect(c.dune).toBe(true);
    expect("lsm" in c.aux!.scalars).toBe(false); // not published per cell (same variables as ERA5-Land)
    expect(c.aux!.scalars.tot_cov_valid_frac).toBe(1);
    expect(c.aux!.series.qsdiv.length).toBe(64);
  });
  const panel = async (c: CellData, id: string) => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => META(id) });
    await p.show({ query: async () => c, attrs: cs.attrs, fieldVars: c.fieldVars } as unknown as CellStore, c.iy, c.ix);
    return root;
  };
  it("panel: dune rule, lsm, vegetation, cell label, citations of ERA5", async () => {
    const root = await panel(await cs.query(458, 781), "era5");
    const row = (f: string) => root.querySelector(`.summary tr[data-field="${f}"]`)!;
    expect(row("dunes").textContent).toBe("—Dunes presentyes");
    expect(root.querySelector('.summary tr[data-field="lsm"]')).toBeNull();
    expect(row("tot_cov_mean").querySelector("th")!.textContent).toBe("Vegetation cover");
    expect(row("centre").querySelector("td.num")!.textContent).toBe("-24.5°, 15.25°");   // ERA5 cell (458, 781)
    expect(row("centre").querySelector("td.num")!.textContent).toBe("-24.5°, 15.25°");
    const cite = root.querySelector(".cite-wrap")!.textContent!;
    expect(cite).toContain("Hersbach, H. et al. (2020)");
    expect(cite).not.toContain("Muñoz");
    expect(cite).not.toContain("Supplementary Data");
  });
  it("threshold slider: every threshold-dependent element re-renders with the new u*,th; the wind rose is identical (scroll kept)", async () => {
    const reg = loadRegistry().registry;
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const layers: Record<string, LayerState> = {};
    const st = new Store({ basemap: "x", projection: "globe", utIndex: 5, layers, order: [], dataset: "era5", cell: [458, 781], embed: false } as AppState);
    const p = new CellPanel(root, 5, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => META("era5"), threshold: { def: reg.threshold, store: st } });
    st.subscribe((s2, ch) => { if (ch.has("utIndex")) p.setThreshold(s2.utIndex); });
    await p.show(cs, 458, 781);
    const c = await cs.query(458, 781);
    const q = (sel: string) => root.querySelector(sel) as HTMLElement;
    const el = q(".cell-scroll");
    el.scrollTop = 700;
    const snapOf = () => ({
      flux: q('[data-section="fluxRose"] .fig-svg').innerHTML, fluxKv: q('[data-section="fluxRose"] dl.kv').textContent!,
      modesUt: q("svg.modes-plot circle.current-ut").getAttribute("r"), modesDots: [...root.querySelectorAll("svg.modes-plot circle.current-mode")].map((x) => x.getAttribute("cx")).join(),
      qsdiv: q('[data-section="qsdiv"] svg.line-plot').innerHTML, qsdivCap: q('[data-section="qsdiv"] .caption').textContent!,
      head: q('[data-section="summary"] > summary > h3').textContent!, table: q('[data-section="summary"] table').innerHTML,
      meta: q(".cell-meta").textContent!,
    });
    const windOf = () => ({ svg: q('[data-section="windRose"] .fig-svg').innerHTML, cap: q('[data-section="windRose"] .caption').textContent!, legend: q('[data-section="windRose"] .fig-legend').innerHTML });
    const a0 = snapOf(), w0 = windOf();
    const svgs = [...root.querySelectorAll(".fig-svg")];
    expect(w0.cap).toMatch(/ ERA5 10 m wind 1950–2024\.$/); // caption names the selected dataset
    expect(w0.svg).not.toContain("rose-dim");
    // move the slider (store -> panel), as in the app
    const slider = q("#cell-ut-slider") as HTMLInputElement;
    slider.value = "30"; slider.dispatchEvent(new Event("input"));
    expect(st.state.utIndex).toBe(30);
    const a1 = snapOf();
    for (const k of Object.keys(a0) as (keyof typeof a0)[]) expect(a1[k], k).not.toEqual(a0[k]);
    expect(a1.head).toContain(formatUt(c.utValues[30]));
    // the wind rose does not depend on u*,th: SVG, legend and caption unchanged
    expect(windOf()).toEqual(w0);
    // rendered into the same containers, scroll position unchanged
    expect([...root.querySelectorAll(".fig-svg")]).toEqual(svgs);
    expect(q(".cell-scroll")).toBe(el);
    expect(el.scrollTop).toBe(700);
    // back to the first threshold: identical to the first rendering
    slider.value = "5"; slider.dispatchEvent(new Event("input"));
    expect(snapOf()).toEqual(a0);
  });
  it("dataset switch at the same location keeps the panel scroll position and collapsed sections", async () => {
    const LAND = path.join(REPO, "staging/fixture");
    const land = await CellStore.open(new RFS(path.join(LAND, "cells.zarr")) as never, { aux: [new RFS(path.join(LAND, "cells-aux.zarr")), new RFS(path.join(LAND, "cells-aux-veg.zarr"))] as never });
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    let ds = "era5-land";
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => META(ds) });
    await p.show(land, 1145, 1952);
    const el = root.querySelector(".cell-scroll") as HTMLElement;
    el.scrollTop = 900;
    const md = root.querySelector('details[data-section="modes"]') as HTMLDetailsElement;
    md.open = false; md.dispatchEvent(new Event("toggle"));
    // ERA5-Land -> ERA5: the selected location re-snaps to (458, 781), which contains (-24.5, 15.2)
    ds = "era5";
    await p.show(Promise.resolve(cs), 458, 781);
    expect(root.querySelector(".cell-scroll")).toBe(el);
    expect(el.scrollTop).toBe(900);
    expect(root.querySelector('tr[data-field="centre"] td.num')!.textContent).toBe("-24.5°, 15.25°");   // ERA5 cell (458, 781)
    expect((root.querySelector('details[data-section="modes"]') as HTMLDetailsElement).open).toBe(false);
    // and back: (-24.5, 15.25) snaps to an ERA5-Land cell next to the first one, still the same location
    ds = "era5-land";
    const back = snapToCell(15.25, -24.5, land.grid)!;
    await p.show(land, back.iy, back.ix);
    expect(el.scrollTop).toBe(900);
    // a click elsewhere goes to the top
    await p.show(land, 1150, 1960);
    expect(el.scrollTop).toBe(0);
  });
  it("cell outside the land mask: 'Outside the <dataset> land mask' with each dataset's land definition (ERA5: > 0, ERA5-Land: > 0.5)", async () => {
    const root = await panel(await cs.query(458, 770), "era5");
    const es = root.querySelector(".empty-state")!;
    expect(es.querySelector("strong")!.textContent).toBe("Outside the ERA5 land mask");
    expect(es.querySelectorAll("p")[1].textContent).toBe("Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above 0, i.e. any land in the cell). This cell has no land (land–sea mask fraction 0). Choose a nearby land cell.");
    expect(es.querySelector(".help")!.textContent).toBe("0.25° cell: row 458, column 770; centre 24.5°S, 12.5°E.");
    // ERA5-Land: its own land definition, otherwise the same text with the names swapped
    const land = { ...(await cs.query(458, 770)), grid: { lat0: 90, dlat: -0.1, lon0: -180, dlon: 0.1, ny: 1801, nx: 3600 } };
    const r2 = await panel(land as CellData, "era5-land");
    const p2 = r2.querySelectorAll(".empty-state p")[1].textContent!;
    expect(p2).toBe("Wind roses and sand-flux statistics are computed for land cells (land–sea mask fraction above 0.5). This cell is mainly water. Choose a nearby land cell.");
    expect(r2.querySelector(".empty-state strong")!.textContent).toBe("Outside the ERA5-Land land mask");
    for (const t of [es.textContent!, r2.querySelector(".empty-state")!.textContent!]) expect(t).not.toMatch(/\bstored\b|lsm/);
  });
  it("land = lsm > 0: a coastal cell with 0 < lsm <= 0.5 now has data and opens the panel; its lsm = 0 neighbour shows the non-land message", async () => {
    // (458, 778): 24.5° S, 14.5° E, lsm 0.32 (outside the first build's lsm > 0.5 mask); (458, 777): lsm 0
    const coast = await cs.query(458, 778);
    expect(coast.hasData).toBe(true);
    expect(coast.totalHours).toBeGreaterThan(600000);
    const root = await panel(coast, "era5");
    expect(root.querySelector(".empty-state")).toBeNull();
    expect(root.querySelector('tr[data-field="centre"] td.num')!.textContent).toBe("-24.5°, 14.5°");     // ERA5 cell (458, 778)
    expect(root.querySelector(".fig-svg svg")).not.toBeNull();
    const sea = await cs.query(458, 777);
    expect(sea.hasData).toBe(false);
    const r2 = await panel(sea, "era5");
    expect(r2.querySelector(".empty-state")!.textContent).toContain("This cell has no land (land–sea mask fraction 0)");
    // lsm is not shown or exported (parity with ERA5-Land)
    expect(root.textContent).not.toMatch(/\blsm\b|land–sea mask fraction 0\.32/);
    expect(Object.keys(readNc(cellNetcdf(coast, META("era5"))).vars)).not.toContain("lsm");
    // the first build (lsm > 0.5) had no data for it, if its fixture copy is around
    const V1 = path.join(REPO, "staging/fixture/datasets/era5-v1");
    if (fs.existsSync(V1)) {
      const old = await CellStore.open(new RFS(path.join(V1, "cells.zarr")) as never);
      expect((await old.query(458, 778)).hasData).toBe(false);
    }
  });
  it("downloads: file name, grid attrs and resolution, references, aux texts for 0.25°", async () => {
    const c = await cs.query(458, 781);
    expect(exportBaseName(c, "era5")).toBe("dune-atlas_era5_-24.5_15.25");
    const r = readNc(cellNetcdf(c, META("era5")));
    expect(r.gatts.title).toBe("Dune Atlas cell export: ERA5 10 m wind histogram and sand-flux parameters at 24.50° S, 15.25° E (0.25° cell)");
    expect(r.gatts.geospatial_lat_resolution).toBe("0.25 degree");
    expect(r.gatts.dataset_id).toBe("era5");
    expect(Number(([] as unknown[]).concat(r.vars.cell_y.attrs.grid_dlat)[0])).toBe(-0.25);
    expect(Number(([] as unknown[]).concat(r.vars.cell_x.attrs.grid_nx)[0])).toBe(1440);
    expect(String(r.vars.wind_hist.attrs.long_name)).toBe("hours per 10 m wind speed and direction bin, ERA5 1950-2024");
    const refs = String(r.gatts.references);
    expect(refs).toContain("ERA5: Paper: Hersbach, H. et al. (2020)");
    expect(refs).toContain("https://doi.org/10.24381/cds.adbb2d47");
    expect(refs).not.toContain("10.24381/cds.e2161bac");
    expect(String(r.vars.dune_present.attrs.comment)).toBe("1 = the cell overlaps at least one 0.1° dune cell of the dune map (Gunn 2026)");
    expect(String(r.vars.ai_valid_frac.attrs.description)).toBe("Valid 30″ pixels / 900 (nominal pixels per 0.25° cell).");
    expect(r.vars.lsm).toBeUndefined();
    const md = JSON.parse(metadataJson(c, META("era5")));
    expect(md.grid.resolution).toBe("0.25°");
    expect(md.data_notice).toContain("(ERA5, 1950–2024)");
    expect(md.citation.map((x: { id: string }) => x.id)).toEqual(["dune-atlas-era5", "era5", "aridity", "vegetation"]);
    expect(readmeText(c, META("era5"))).toContain("wind_histogram.csv  Hourly ERA5 10 m wind 1950-2024 (0.25° cell)");
    expect(citationFile(c, "era5")).toMatch(/^Dune Atlas \(map\.geomorphlab\.org\), ERA5 0\.25° cell 458,781, centre 24\.50° S, 15\.25° E\nWind dataset: ERA5 0\.25°, 1950–2024/);
    expect(auxDescription("ai_valid_frac", 0.1)).toBe("Valid 30″ pixels / 144 (nominal pixels per 0.1° cell).");
  });
});

describe("overlays: dataset switch, then basemap switch", () => {
  const ARIDROOT = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/aridity-zarr-root.json"), "utf8"));
  const L01 = { attributes: { multiscales: { layout: [{ asset: "0", "spatial:transform": [0.1, 0, -180.05, 0, -0.1, 90.05], "spatial:shape": [1801, 3600] }] } } };
  const L25 = { attributes: { multiscales: { layout: [{ asset: "0", "spatial:transform": [0.25, 0, -180.125, 0, -0.25, 90.125], "spatial:shape": [721, 1440] }] } } };
  const urls: string[] = [];
  beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", async (u: string) => {
      urls.push(u);
      const body = /aridity\.zarr\/zarr\.json$/.test(u) ? ARIDROOT : /datasets\/era5\/fields\/[a-z_]+\.zarr\/zarr\.json$/.test(u) ? L25 : /fields\/[a-z_]+\.zarr\/zarr\.json$/.test(u) ? L01 : null;
      return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response("", { status: 404 });
    });
  });
  afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("reloads dataset-dependent layers with the ERA5 sources and limits; order, opacity, config kept; survives a basemap switch", async () => {
    const reg = loadRegistry().registry;
    const STYLES = JSON.parse(fs.readFileSync(path.resolve(__dirname, "fixtures/basemap-styles.json"), "utf8"));
    const URLS: Record<string, Record<string, unknown>> = {};
    for (const b of reg.basemaps) if (b.kind === "style") URLS[b.style!] = b.style!.endsWith("/dark") ? STYLES.dark : STYLES.positron;
    const map = new FakeMap(URLS, () => 1);
    const order = ["dunes", "rdpa", "dpm", "aridity", ...reg.layers.map((l) => l.id).filter((x) => !["dunes", "rdpa", "dpm", "aridity"].includes(x))];
    const ov = new OverlayManager(map as unknown as MlMap, reg, "https://data.example", 14, { order, datasetPrefix: "dune-atlas/v1" });
    let layers: Record<string, LayerState> = {};
    for (const l of reg.layers) layers[l.id] = { visible: false, opacity: 1 };
    layers.dunes = { visible: true, opacity: 0.7 };
    layers.aridity = { visible: true, opacity: 0.6 };
    layers.dpm = { visible: true, opacity: 0.5, cfg: { colormap: "viridis", clim: [0.1, 10] } };
    layers.rdpa = { visible: true, opacity: 0.9, cfg: { mode: "streamlines", vecColor: "#112233" } };
    map.on("style.load", () => { restoreOverlays(map as unknown as MlMap, ov, layers, null); });
    const bm = (i: number) => setBasemap(map as unknown as MlMap, reg.basemaps[i], "globe");
    const settle = async () => {
      for (let k = 0; k < 200; k++) {
        await new Promise((r) => setTimeout(r, 3));
        if (map.isStyleLoaded() && map.style.onLoad.length === 0) { await ov.settled(); await new Promise((r) => setTimeout(r, 3)); if (map.isStyleLoaded()) { await ov.settled(); return; } }
      }
      throw new Error("did not settle");
    };
    bm(1); await settle();
    const src = (id: string) => (map.getLayer(id)!.implementation as { url: string }).url;
    expect(src("ov-dpm")).toBe("https://data.example/dune-atlas/v1/fields/dpm.zarr");
    expect(src("ov-aridity")).toBe("https://data.example/dune-atlas/v1/fields/aridity.zarr");
    // switch to ERA5 (as main.ts: definitions, config, prefix, reattach)
    const changed = applyDatasetLayers(reg, "era5");
    layers = layersForDatasetSwitch(layers, changed);
    ov.setDatasetPrefix("dune-atlas/v2/datasets/era5");
    ov.reattach(layers);
    await settle();
    const check = () => {
      expect(src("ov-dpm")).toBe("https://data.example/dune-atlas/v2/datasets/era5/fields/dpm.zarr");
      expect(src("ov-aridity")).toBe("https://data.example/dune-atlas/v1/fields/aridity.zarr"); // shared
      const z = map.getLayer("ov-dpm")!.implementation as { opacity: number; clim: number[] };
      expect(z.opacity).toBe(0.5);
      expect(z.clim).toEqual(reg.datasetLayers!.era5.dpm.display!.clim); // ERA5 limits, override dropped
      expect(effectiveDisplay(reg.layers.find((l) => l.id === "dpm")!, layers.dpm.cfg).colormap).toBe("viridis");
      const o = map.layerOrder();
      expect(o.indexOf("ov-aridity")).toBeLessThan(o.indexOf("ov-dpm"));
      expect(o.indexOf("ov-dpm")).toBeLessThan(o.indexOf("ov-rdpa-vec"));
      expect(o.indexOf("ov-rdpa-vec")).toBeLessThan(o.indexOf("ov-dunes-fill"));
      expect(map.getLayer("ov-rdpa-vec")!.paint["line-color"]).toBe("#112233");
      expect(o.filter((x) => x.startsWith("ov-")).length).toBe(5); // + the globe line layer of rdpa
      expect(o.indexOf("ov-rdpa-vec-globe")).toBe(o.indexOf("ov-rdpa-vec") + 1);
      expect(map.listenerCount("moveend")).toBe(1);
      expect(map.errors).toEqual([]);
    };
    check();
    expect(urls.some((u) => u.endsWith("/dune-atlas/v2/datasets/era5/fields/dpm.zarr/zarr.json"))).toBe(true);
    bm(0); await settle(); check();
    bm(3); bm(2); await settle(); check();
  });
});

describe("layer panel follows the dataset", () => {
  it("legend, colour limits and info popover update on a dataset switch; selector labelled 'Wind dataset'", () => {
    const reg = loadRegistry().registry;
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    const layers: Record<string, LayerState> = {};
    for (const l of reg.layers) layers[l.id] = { visible: l.id === "qacb", opacity: 1 };
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers, order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
    const store = new Store(st);
    store.intercept((patch, cur) => {
      if (patch.dataset === undefined || patch.dataset === cur.dataset) return patch;
      const changed = applyDatasetLayers(reg, patch.dataset);
      return { ...patch, layers: layersForDatasetSwitch(patch.layers ?? cur.layers, changed) };
    });
    renderLayerPanel(root, reg, store);
    expect(root.querySelector(".dataset-row")!.textContent).toMatch(/^Wind dataset/);
    const item = root.querySelector('.layer-item[data-layer="qacb"]')!;   // limits differ between the datasets
    const legend0 = item.querySelector(".legend-wrap")!.innerHTML;
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    sel.value = "era5"; sel.dispatchEvent(new Event("change"));
    expect(store.state.dataset).toBe("era5");
    const legend1 = item.querySelector(".legend-wrap")!.innerHTML;
    expect(legend1).not.toBe(legend0);
    expect(item.querySelector(".info-popover")!.textContent).toContain("ERA5 0.25°, 1950–2024");
    expect(root.querySelector("details.about")!.textContent).toContain("Hersbach, H. et al. (2020)");   // the shared citation (About)
    sel.value = "era5-land"; sel.dispatchEvent(new Event("change"));
    expect(item.querySelector(".legend-wrap")!.innerHTML).toBe(legend0);
    const about = root.textContent!;
    expect(about).toContain("Wind histograms and sand-flux fields (ERA5 0.25°)");
  });
});
