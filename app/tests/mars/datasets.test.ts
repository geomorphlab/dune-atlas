// @vitest-environment happy-dom
// The three Mars wind datasets (MCMC FV3 2° hourly; EMARS 6° × 5.14° hourly, rows to ±84.86° only; MACDA 5°, every
// two Mars hours, first column centred on -180°): registry entries, the Wind dataset selector, cell snapping at the
// antimeridian and at the EMARS latitude limit, the panel's sampling words, the downloads and the credit lines.
// Synthetic cells (helpers.makeDatasetCell); the fixture stores are tested in datasetstores.test.ts.
import { describe, expect, it, vi } from "vitest";
import { loadRegistry } from "../../src/core/registry/load";
import { resolveSource } from "../../src/core/registry/merge";
import { Store, type AppState } from "../../src/core/store";
import { renderLayerPanel, DATA_SOURCES_HTML, fieldsCitationHtml } from "../../src/core/ui/layerPanel";
import { cellBounds, cellFeature, cellFromIndex, coversLat, gridLatRange, snapToCell } from "../../src/core/cell/snap";
import { datasetGrid, datasetInfo, datasetTooltip, gridResolutionText, outsideGridText } from "../../src/core/cell/datasetinfo";
import { citationSources, fieldsCitation, fieldsLicence, windSourceText } from "../../src/core/cell/citation";
import { boxCells } from "../../src/core/export/region";
import { CellPanel } from "../../src/bodies/mars/cellPanel";
import { CELL_SOURCE_IDS, MAP_LAYER_CREDITS } from "../../src/bodies/mars/citation";
import { DATASET_INFO_TEXT, HELP_SECTIONS } from "../../src/bodies/mars/helpText";
import { APP_HOOKS } from "../../src/bodies/mars/app";
import { MARS_GRID } from "../../src/bodies/mars/body";
import { marsSampling, marsTiming } from "../../src/bodies/mars/datasets";
import { cellNetcdf, csvColumns, metadataJson, readmeText, windSeriesCsv } from "../../src/bodies/mars/cell/export";
import type { MarsCellData, MarsCellStore } from "../../src/bodies/mars/cell/cellstore";
import { readNc } from "../ncreader";
import { FIELD_VARS, makeDatasetCell, makeMarsCell } from "./helpers";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
const reg = loadRegistry().registry;
const IDS = ["fv3-beta1", "emars-v1-my30", "macda-v2-my30"];
const EMARS = datasetGrid("emars-v1-my30")!, MACDA = datasetGrid("macda-v2-my30")!;
const metaOf = (id: string) => ({ datasetId: id, datasetTitle: reg.datasets!.find((d) => d.id === id)!.title, dataVersion: "v2", permalink: `https://example.org/mars/?dataset=${id}`, generated: new Date("2026-10-14T00:00:00Z") });
const initState = (dataset = "fv3-beta1"): AppState => ({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 29, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset, cell: null, embed: false });
const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ");

async function openPanel(cell: MarsCellData) {
  document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
  const root = document.getElementById("cell-panel")!;
  const store = new Store(initState(cell.datasetId));
  const panel = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store }, exportMeta: () => metaOf(cell.datasetId ?? "fv3-beta1"), shareLink: () => "https://example.org/#v=x" });
  await panel.show({ query: async () => cell, attrs: { grid: cell.grid, field_vars: FIELD_VARS }, grid: cell.grid } as unknown as MarsCellStore, cell.iy, cell.ix);
  return { root, panel };
}

describe("Mars wind datasets: registry", () => {
  it("three datasets, FV3 the default; grid and sampling of each (info.grid, info.series)", () => {
    expect(reg.datasets!.map((d) => [d.id, d.title, d.prefix])).toEqual([
      ["fv3-beta1", "MCMC FV3", "dune-atlas/mars/v2/datasets/fv3-beta1"],
      ["emars-v1-my30", "EMARS v1.0 (MY30)", "dune-atlas/mars/v2/datasets/emars-v1-my30"],
      ["macda-v2-my30", "MACDA v2.0 (MY30)", "dune-atlas/mars/v2/datasets/macda-v2-my30"],
    ]);
    expect(reg.defaultDataset).toBe("fv3-beta1");
    expect(datasetGrid("fv3-beta1")).toEqual(MARS_GRID);
    expect(EMARS).toEqual({ lat0: 84.85714285714286, dlat: -5.142857142857143, lon0: -177, dlon: 6, ny: 34, nx: 60 });
    expect(MACDA).toEqual({ lat0: 87.5, dlat: -5, lon0: -180, dlon: 5, ny: 36, nx: 72 });
    expect(IDS.map((id) => marsTiming(id).sampling.samplesPerSol)).toEqual([24, 24, 12]);
    expect(IDS.map((id) => gridResolutionText(datasetGrid(id)!))).toEqual(["2°", "6° × 5.14°", "5°"]);
    expect(IDS.map((id) => datasetInfo(id).resolution)).toEqual(["2°", "6° × 5.14°", "5°"]);
    // FV3 keeps its numbers and texts
    expect(marsTiming("fv3-beta1")).toMatchObject({ nSamples: 16032, nSols: 668 });
    expect(datasetTooltip("fv3-beta1")).toBe("MCMC FV3 2°, one Mars year (6th simulated year, 668 sols)");
  });
  it("the store's sample count and sampling override the registry's nominal values", () => {
    expect(marsTiming("emars-v1-my30", { nHours: 16044 })).toMatchObject({ nSamples: 16044, nSols: 668.5 });
    expect(marsTiming("macda-v2-my30", { nHours: 8028, samplesPerSol: 12 })).toMatchObject({ nSamples: 8028, nSols: 669 });
    expect(marsTiming("macda-v2-my30").nSamples).toBe(datasetInfo("macda-v2-my30").nHours);
    expect(marsTiming(undefined, { datasetId: "macda-v2-my30" }).sampling.adjective).toBe("two-hourly");
  });
  it("sampling words: hourly (FV3, EMARS) and two-hourly (MACDA)", () => {
    expect(marsSampling(24)).toEqual({ samplesPerSol: 24, adjective: "hourly", unit: "hour", units: "hours", every: "one sample per Mars hour" });
    expect(marsSampling(12)).toEqual({ samplesPerSol: 12, adjective: "two-hourly", unit: "sample", units: "samples", every: "one sample every two Mars hours" });
    expect(marsSampling(8).adjective).toBe("three-hourly");
  });
  it("credits: each dataset cites its own wind data, licence and atlas notice", () => {
    const ids = (id: string) => citationSources(CELL_SOURCE_IDS, id).map((s) => s.id);
    expect(ids("fv3-beta1")).toEqual(["dune-atlas-mars", "fv3", "pahtz-duran", "dunes", "dem"]);
    expect(ids("emars-v1-my30")).toEqual(["dune-atlas-mars-emars", "emars", "pahtz-duran", "dunes", "dem"]);
    expect(ids("macda-v2-my30")).toEqual(["dune-atlas-mars-macda", "macda", "pahtz-duran", "dunes", "dem"]);
    const dois = (id: string) => citationSources([], id).flatMap((s) => s.entries.map((e) => e.doi)).filter(Boolean);
    for (const d of ["10.18113/D3W375", "10.1002/gdj3.77", "10.57967/hf/8859"]) expect(dois("emars-v1-my30")).toContain(d);
    for (const d of ["10.5285/cd037a9ea387438fabf4d674dbe53088", "10.57967/hf/8771"]) expect(dois("macda-v2-my30")).toContain(d);
    expect(fieldsCitation("emars-v1-my30")).toMatch(/^Gunn, A\. \(2026\)\. .*; transport law: Pähtz.*; winds: EMARS v1\.0 reanalysis, Mars Year 30 hourly lowest-level winds/);
    expect(fieldsCitation("macda-v2-my30")).toMatch(/winds: MACDA v2\.0 reanalysis, Mars Year 30 lowest-level winds every two Mars hours/);
    expect(fieldsLicence("macda-v2-my30")).toMatch(/Open Government Licence v3\.0/);
    expect(windSourceText("emars-v1-my30")).toMatch(/^Wind: EMARS v1\.0 reanalysis .*6° × 5\.14°$/);
    expect(windSourceText("macda-v2-my30")).toMatch(/every two Mars hours, 5°$/);
    for (const id of ["emars-v1-my30", "macda-v2-my30"]) expect(citationSources([], id)[0].notice).not.toMatch(/FV3/);
  });
});

describe("Mars wind datasets: selector, About, attribution", () => {
  it("the Wind dataset selector switches the dataset; its tooltip and the '{dataset}' sources follow", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    const store = new Store(initState());
    renderLayerPanel(root, reg, store);
    const sel = root.querySelector("#dataset-select") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(IDS);
    sel.value = "macda-v2-my30";
    sel.dispatchEvent(new Event("change"));
    expect(store.state.dataset).toBe("macda-v2-my30");
    expect(sel.title).toBe("MACDA 5°, one Mars year (Mars Year 30)");
    store.set({ dataset: "emars-v1-my30" });
    expect(sel.value).toBe("emars-v1-my30");
    expect(sel.title).toBe("EMARS 6° × 5.14°, one Mars year (Mars Year 30)");
    const dpm = reg.layers.find((l) => l.id === "dpm")!;
    expect(resolveSource(dpm.source, "https://data.example", reg.datasets![1].prefix)).toBe("https://data.example/dune-atlas/mars/v2/datasets/emars-v1-my30/fields/dpm.zarr");
    // the dataset ⓘ (more than one dataset): every dataset and the EMARS latitude limit
    expect(root.querySelector(".dataset-line > .info-button")).not.toBeNull();
    expect(DATASET_INFO_TEXT).toMatch(/MCMC FV3, 2°; EMARS, 6° × 5\.14°; MACDA, 5°/);
    expect(DATASET_INFO_TEXT).toContain("No EMARS data poleward of 87.43° N: the northernmost cells of its grid are centred at 84.86° N.");
    expect(HELP_SECTIONS.find((s) => s.id === "datasets")!.body).toBe(DATASET_INFO_TEXT);
  });
  it("share links carry the selected dataset and the cell (ids not in SHARE_IDS are written inline)", async () => {
    const { encodeShare, decodeShare } = await import("../../src/core/share/shortlink");
    const { DEFAULT_VIEW } = await import("../../src/core/defaultview");
    for (const id of ["emars-v1-my30", "macda-v2-my30"]) {
      const sh = decodeShare(encodeShare({ ...DEFAULT_VIEW, dataset: id, cell: [16, 0] }));
      expect([sh?.dataset, sh?.cell]).toEqual([id, [16, 0]]);
    }
  });
  it("About: a Data sources item and a field citation per dataset", () => {
    for (const t of ["Winds (MCMC FV3 Mars GCM, beta release 1)", "Winds (EMARS v1.0 reanalysis, Mars Year 30)", "Winds (MACDA v2.0 reanalysis, Mars Year 30)"]) expect(DATA_SOURCES_HTML).toContain(`<strong>${t}</strong>`);
    const fc = fieldsCitationHtml().replace(/<[^>]+>/g, "");
    for (const n of ["MCMC FV3 2°", "EMARS 6° × 5.14°", "MACDA 5°"]) expect(fc).toContain(n);
  });
  it("map attribution and the air-density credit name the selected dataset (FV3 unchanged)", () => {
    expect(APP_HOOKS.attribution("fv3-beta1")[0]).toBe(`Winds: <a href="https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/" target="_blank" rel="noopener">MCMC FV3 Mars GCM beta 1</a> (NASA Ames)`);
    expect(APP_HOOKS.attribution("emars-v1-my30")[0]).toBe(`Winds: <a href="https://doi.org/10.18113/D3W375" target="_blank" rel="noopener">EMARS v1.0 (MY30)</a>`);
    expect(APP_HOOKS.attribution("macda-v2-my30")[0]).toMatch(/doi\.org\/10\.5285\/cd037a9ea387438fabf4d674dbe53088.*MACDA v2\.0 \(MY30\)/);
    const rho = MAP_LAYER_CREDITS.rho_mean as (id: string) => string;
    expect(rho("fv3-beta1")).toBe("Air density: MCMC FV3 Mars GCM beta release 1, lowest layer p/(R T), mean over the Mars year.");
    expect(rho("macda-v2-my30")).toBe("Air density: MACDA, lowest layer p/(R T), mean over the Mars year.");
  });
});

describe("Mars wind datasets: cell snapping", () => {
  it("MACDA: column 0 is centred on -180° and wraps across the antimeridian", () => {
    expect(snapToCell(-180, 0, MACDA)).toMatchObject({ ix: 0, lon: -180 });
    expect(snapToCell(179.9, 0, MACDA)).toMatchObject({ ix: 0, lon: -180 });   // east of 177.5° is column 0
    expect(snapToCell(-177.6, 0, MACDA)!.ix).toBe(0);
    expect(snapToCell(-177.4, 0, MACDA)!.ix).toBe(1);
    expect(snapToCell(177.4, 0, MACDA)).toMatchObject({ ix: 71, lon: 175 });
    expect(snapToCell(182, 0, MACDA)!.ix).toBe(0);                               // world copy east
    expect(snapToCell(67, 9, MACDA)).toMatchObject({ lat: 7.5, lon: 65 });        // Nili Patera
    const c0 = cellFromIndex(16, 0, MACDA);
    expect(cellBounds(c0, MACDA)[0]).toEqual([-182.5, 5]);
    const f = cellFeature(c0, MACDA);
    expect(f.bbox).toEqual([177.5, 5, -177.5, 10]);                              // RFC 7946: west > east across 180°
    expect(f.features[0].geometry.type).toBe("MultiPolygon");                    // split at the seam
    expect(snapToCell(0, 90, MACDA)!.iy).toBe(0);                                // rows reach the poles: clamp
    expect(snapToCell(0, -90, MACDA)!.iy).toBe(35);
  });
  it("EMARS: non-square cells; no cells poleward of ±87.43° (the panel says why)", () => {
    expect(gridLatRange(EMARS).map((v) => Number(v.toFixed(4)))).toEqual([-87.4286, 87.4286]);
    expect(snapToCell(0, 87.42, EMARS)).toMatchObject({ iy: 0, lat: 84.857143 });
    expect(snapToCell(0, -87.42, EMARS)).toMatchObject({ iy: 33, lat: -84.857143 });
    for (const lat of [87.5, 89, 90, -87.5, -90]) { expect(snapToCell(0, lat, EMARS), String(lat)).toBeNull(); expect(coversLat(EMARS, lat)).toBe(false); }
    expect(snapToCell(-180, 0, EMARS)).toMatchObject({ ix: 0, lon: -177 });
    expect(snapToCell(179.99, 0, EMARS)).toMatchObject({ ix: 59, lon: 177 });
    const b = cellBounds(cellFromIndex(0, 0, EMARS), EMARS);
    expect([b[0][0], b[2][0]]).toEqual([-180, -174]);                            // 6° wide
    expect(b[2][1] - b[0][1]).toBeCloseTo(36 / 7, 9);                            // 5.14° tall
    expect(outsideGridText(88, EMARS, "EMARS")).toBe("No EMARS data poleward of 87.43° N: the northernmost cells of its grid are centred at 84.86° N.");
    expect(outsideGridText(-89, EMARS, "EMARS")).toBe("No EMARS data poleward of 87.43° S: the southernmost cells of its grid are centred at 84.86° S.");
    // the grids that reach the poles are unchanged
    expect(snapToCell(0, 90, MARS_GRID)!.iy).toBe(0);
    expect(snapToCell(0, -90, MARS_GRID)!.iy).toBe(89);
    expect(coversLat(MARS_GRID, 90) && coversLat(MACDA, -90)).toBe(true);
  });
  it("region boxes: MACDA columns across 180° in increasing longitude; EMARS rows only to 84.86°", () => {
    const m = boxCells({ west: 172, east: -172, south: 0, north: 10 }, MACDA);
    expect(m.ixs).toEqual([71, 0, 1]);
    expect(m.lons).toEqual([175, 180, 185]);
    const e = boxCells({ west: -10, east: 10, south: 80, north: 90 }, EMARS);
    expect(e.lats.map((v) => Number(v.toFixed(3)))).toEqual([84.857]);
  });
  it("the panel's no-cell message (EMARS poleward of its rows) and closing it", async () => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const panel = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => metaOf("emars-v1-my30") });
    panel.showOutside(88.5, 10, outsideGridText(88.5, EMARS, "EMARS"));
    expect(root.hidden).toBe(false);
    expect(panel.outsideShown).toBe(true);
    expect(text(root)).toContain("No EMARS cell at this point");
    expect(text(root)).toContain("No EMARS data poleward of 87.43° N");
    expect(root.querySelector("#cell-title")!.textContent).toMatch(/88\.5/);
    panel.close();
    expect(panel.outsideShown).toBe(false);
    expect(root.hidden).toBe(true);
  });
});

describe("Mars wind datasets: panel and downloads", () => {
  it("MACDA panel: two-hourly samples in captions, threshold lines and the download title", async () => {
    const cell = makeDatasetCell("macda-v2-my30", 67, 9);
    const { root, panel } = await openPanel(cell);
    const t = text(root).replace(/\u00a0/g, " ");
    expect(t).toMatch(/median over the samples/);
    expect(t).toMatch(/Samples above threshold/);
    expect(t).toMatch(/% of the [\d,]+ two-hourly samples/);
    expect(t).toMatch(/MACDA lowest-level wind \(height in this cell/);
    expect(t).toMatch(/one Mars year \(Mars Year 30\)/);
    expect(t).not.toMatch(/hourly samples(?<!two-hourly samples)|Hours above/);
    expect(root.querySelector('.downloads button[title^="Two-hourly wind and air series"]')).not.toBeNull();
    expect(root.querySelector(".cite-wrap")!.textContent).toMatch(/MACDA v2\.0 reanalysis/);
    const x = panel.plotExport("wind-rose")!;
    expect(x.name("png")).toBe("mars-dune-atlas_wind-rose_macda-v2-my30_7.5_65.png");
    expect(x.svg).toMatch(/MACDA v2\.0 reanalysis/);
    expect(x.svg).not.toMatch(/FV3/);
  });
  it("FV3 panel keeps its hourly wording", async () => {
    const { root } = await openPanel(makeMarsCell(0));
    const t = text(root).replace(/\u00a0/g, " ");
    expect(t).toMatch(/Hours above threshold/);
    expect(t).toMatch(/hourly samples \(sums to 100 %\)\. MCMC FV3 lowest-level wind/);
  });
  it("NetCDF: the sample index and sol columns of each dataset; samples per sol; grid resolutions", () => {
    const fv3 = readNc(cellNetcdf(makeMarsCell(0), metaOf("fv3-beta1")));
    expect((fv3.vars.hour.attrs as Record<string, unknown>).long_name).toBe("hour index of the record (0 = first hour of the 6th simulated year)");
    expect((fv3.vars.sol.attrs as Record<string, unknown>).long_name).toBe("sol of the simulation (FV3 time / 1 sol)");
    expect(fv3.gatts.samples_per_sol).toEqual([24]);
    const mc = makeDatasetCell("macda-v2-my30", -179, 9);
    const nc = readNc(cellNetcdf(mc, metaOf("macda-v2-my30")));
    expect(mc.lon).toBe(-180);
    expect((nc.vars.hour.attrs as Record<string, unknown>).long_name).toBe("sample index of the record (one sample every two Mars hours; 0 = first sample of Mars Year 30)");
    expect((nc.vars.sol.attrs as Record<string, unknown>).long_name).toBe("sols since the start of Mars Year 30 (one sample every two Mars hours)");
    const sol = nc.vars.sol.data as number[];
    expect(sol[1] - sol[0]).toBeCloseTo(1 / 12, 6);
    expect(nc.gatts.samples_per_sol).toEqual([12]);
    expect(String(nc.gatts.title)).toMatch(/^Mars Dune Atlas cell export: MACDA two-hourly lowest-level wind, .* at 7\.5° N, -180° E \(5° cell\)$/);
    expect(String(nc.gatts.fields_citation)).toBe(fieldsCitation("macda-v2-my30"));
    expect(String(nc.gatts.references)).toMatch(/Open Government Licence v3\.0/);
    expect(String(nc.gatts.references)).not.toMatch(/FV3/);
    expect([(nc.vars.cell_x.attrs as Record<string, unknown>).grid_lon0, (nc.vars.cell_x.attrs as Record<string, unknown>).grid_dlon]).toEqual([[-180], [5]]);
    const em = readNc(cellNetcdf(makeDatasetCell("emars-v1-my30", 67, 9), metaOf("emars-v1-my30")));
    expect([em.gatts.geospatial_lat_resolution, em.gatts.geospatial_lon_resolution]).toEqual(["5.14286 degree", "6 degree"]);
    expect(String((em.vars.rho_mean.attrs as Record<string, unknown>).description)).toMatch(/of the 6° × 5\.14° cell/);
    expect(String((em.vars.rho_mean.attrs as Record<string, unknown>).license)).toBe(fieldsLicence("emars-v1-my30"));
    expect(String((em.vars.qsdiv.attrs as Record<string, unknown>).method)).toMatch(/on the 6° × 5\.14° grid/);
  });
  it("CSV bundle: wind_series.csv column texts, README and metadata.json follow the dataset", () => {
    const mc = makeDatasetCell("macda-v2-my30", 67, 9);
    const meta = metaOf("macda-v2-my30");
    expect(windSeriesCsv(mc, "macda-v2-my30").split("\n")[0]).toBe("\ufeffhour,sol,solar_longitude,wind_u,wind_v,air_temperature,air_density,wind_height");
    expect(csvColumns(mc, undefined, "macda-v2-my30")["wind_series.csv"][0].longName).toMatch(/^sample index of the record \(one sample every two Mars hours/);
    const rd = readmeText(mc, meta);
    expect(rd).toMatch(/wind_series\.csv {2}MACDA two-hourly lowest-level wind, temperature, air density and height, 2,000 samples\n {2}\(one Mars year; 5° cell\); one row per sample\./);
    expect(rd).toMatch(/Per sample the threshold u\*,th depends on d/);
    expect(rd).not.toMatch(/FV3/);
    const md = JSON.parse(metadataJson(mc, meta));
    expect(md.grid).toMatchObject({ lat0: 87.5, dlat: -5, lon0: -180, dlon: 5, ny: 36, nx: 72, resolution: "5°" });
    expect(md.dataset).toEqual({ id: "macda-v2-my30", title: "MACDA v2.0 (MY30)", version: "v2", samples_per_sol: 12 });
    expect(md.conventions.threshold).toMatch(/^per sample: /);
    expect(md.citation.map((c: { id: string }) => c.id)).toEqual(["dune-atlas-mars-macda", "macda", "pahtz-duran", "dunes", "dem"]);
    const emd = JSON.parse(metadataJson(makeDatasetCell("emars-v1-my30", 67, 9), metaOf("emars-v1-my30")));
    expect(emd.grid.resolution).toBe("6° × 5.14°");
    expect(emd.aux.elev_mean.description).toMatch(/over the 6° × 5\.14° cell/);
    // FV3 metadata keeps the hourly conventions
    const fmd = JSON.parse(metadataJson(makeMarsCell(0), metaOf("fv3-beta1")));
    expect(fmd.conventions.threshold).toMatch(/^per hour: /);
    expect(fmd.grid.resolution).toBe("2°");
  });
  it("the cell's own dataset wins over the app's selection (dataset switch in progress)", () => {
    const mc = makeDatasetCell("macda-v2-my30", 67, 9);
    const nc = readNc(cellNetcdf(mc, metaOf("fv3-beta1")));
    expect(String(nc.gatts.title)).toMatch(/MACDA two-hourly/);
  });
});
