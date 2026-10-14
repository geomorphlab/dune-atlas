// @vitest-environment happy-dom
// Mars cell panel, downloads and public text (mirrors tests/ui.test.ts, tests/export.test.ts and
// tests/publictext.test.ts for the Mars build).
import { fieldsCitation } from "../../src/cell/citation";
import { describe, expect, it, vi } from "vitest";
import { CellPanel } from "../../src/mars/ui/cellPanel";
import { renderLayerPanel } from "../../src/ui/layerPanel";
import { legendHtml } from "../../src/ui/legend";
import { loadRegistry } from "../../src/registry/load";
import { Store, type AppState } from "../../src/store";
import * as HELP from "../../src/ui/helpText";
import { DEFAULT_VIEW } from "../../src/defaultview";
import { mapStripItems } from "../../src/export/mapExport";
import { plotFilename, plotStripItems } from "../../src/export/plotExport";
import { datasetInfo } from "../../src/cell/datasetinfo";
import { citationSources, citationText } from "../../src/cell/citation";
import { CSV_NAMES, CSV_NAME_RE, csvName } from "../../src/cell/csvnames";
import { cellNetcdf, csvBundle, csvColumns, fieldsByGrainSizeCsv, fluxRoseCsv, metadataJson, readmeText, windSeriesCsv, marsFluxRoseTable } from "../../src/mars/cell/export";
import { analyseMarsCell } from "../../src/mars/cell/analysis";
import type { MarsCellStore } from "../../src/mars/cell/cellstore";
import { readNc } from "../ncreader";
import { FIELD_VARS, makeMarsCell } from "./helpers";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear() });
const reg = loadRegistry().registry;
const meta = { datasetId: "fv3-beta1", datasetTitle: reg.datasets![0].title, dataVersion: "v1", permalink: "https://example.org/mars/?cell=40,123", generated: new Date("2026-10-14T00:00:00Z") };
const initState = (): AppState => ({ basemap: reg.basemaps[0].id, projection: "globe", utIndex: 29, layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: !!l.visible, opacity: l.opacity ?? 1 }])), order: reg.layers.map((l) => l.id), dataset: "fv3-beta1", cell: null, embed: false });
const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ");
/** Earth-only wording that must not appear anywhere in the Mars site or downloads */
const EARTH = /ERA5|Copernicus|C3S|ECMWF|1950|10 m wind|at 10 m|land[- ]sea|land cell|aridity|vegetation|Namib|Earth's wind-blown sand dunes(?! - Supp)|EPSG:3857|6371 km/i;
// allowed: the paper title; Fryberger's DP definition in the DP ⓘ ("computed from 10 m wind speeds in knots")
const EARTH_OK = (s: string) => s.replace(/The distribution of Earth's wind-blown sand dunes/g, "").replace(/computed from 10 m wind speeds in knots/g, "");

async function openPanel() {
  document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
  const root = document.getElementById("cell-panel")!;
  const store = new Store(initState());
  const cell = makeMarsCell(0);
  const panel = new CellPanel(root, 29, { windSectors: 16, fluxSectors: 32, onClose: () => {}, threshold: { def: reg.threshold, store }, exportMeta: () => meta, shareLink: () => "https://example.org/#v=x" });
  await panel.show({ query: async () => cell, attrs: { grid: cell.grid, field_vars: FIELD_VARS }, grid: cell.grid } as unknown as MarsCellStore, cell.iy, cell.ix);
  return { root, panel, cell, store };
}

describe("Mars cell panel", () => {
  it("same sections as Earth; grain-size control, 2 m winds, d axes, Mars table rows", async () => {
    const { root } = await openPanel();
    expect([...root.querySelectorAll("details.section")].map((d) => d.getAttribute("data-section"))).toEqual(["windRose", "fluxRose", "modes", "qsdiv", "summary", "downloads"]);
    const t = text(root);
    expect(t).toMatch(/Grain diameter d:\s*200 µm/);
    expect(t).toMatch(/median over the hours/);
    expect(t).toMatch(/m\/s, lowest model level/);
    expect(t).toMatch(/lowest-level wind \(height in this cell \d\.\d\d–\d\.\d\d m\)/);   // the cell's range, About gives all cells
    expect(t).not.toMatch(/Height of the lowest-level wind|Grid cell|Hours counted/);   // removed rows
    for (const th of root.querySelectorAll(".summary tbody th")) expect(th.textContent).not.toMatch(/[()]/);
    expect(t).not.toMatch(/z₀|z0|log law/);
    expect(t).toMatch(/Modes vs grain diameter/);
    expect(t).toMatch(/Cell summary at d = 200 µm/);
    expect(t).toMatch(/Mean air density/);
    expect(root.querySelector('.summary tr[data-field="elev_mean"] th')!.textContent).toBe("Elevation");
    expect(t).not.toMatch(/16,032 hourly samples \(one Mars year/);   // 'Hours counted' row removed (downloads keep it)
    expect(root.querySelector(".cell-threshold output")!.textContent!.replace(/\u2007/g, "")).toBe("200 µm");
    expect(root.querySelector(".modes-plot")!.getAttribute("aria-label")).toMatch(/50 µm at the centre to 1000 µm at the rim/);
    expect(root.querySelector(".line-plot")).not.toBeNull();
    expect(EARTH.test(EARTH_OK(t))).toBe(false);
  });
  it("moving the grain-size slider updates the panel (flux, header) like the Earth threshold", async () => {
    const { root, panel, cell } = await openPanel();
    const before = root.querySelector('[data-section="fluxRose"] .kv')!.textContent;
    panel.setThreshold(5);
    expect(root.querySelector(".cell-meta")!.textContent!.replace(/\u00a0/g, " ")).toMatch(/Grain diameter d:\s*63 µm/);
    const v = analyseMarsCell(cell, 5, { fluxSectors: 32 });
    expect(text(root)).toContain(`${v.stats.utMedian.toFixed(2)} m/s`);
    expect(root.querySelector('[data-section="fluxRose"] .kv')!.textContent).toBe(before); // DP etc. are the fields (constant here)
  });
  it("plot exports: d in titles and file names, Mars sources, no Copernicus notice", async () => {
    const { panel } = await openPanel();
    const x = panel.plotExport("flux-rose")!;
    expect(x.name("png")).toBe("mars-dune-atlas_flux-rose_fv3-beta1_9_67_d200um.png");
    expect(x.svg).toMatch(/Pähtz/);
    expect(x.svg).not.toMatch(/Copernicus|ERA5/);
    expect(plotFilename("modes", "fv3-beta1", { lat: 9, lon: 67 }, null, "svg")).toBe("mars-dune-atlas_modes_fv3-beta1_9_67.svg");
    const items = plotStripItems(panel.plotSpec("modes")!, { cell: { lat: 9, lon: 67, iy: 40, ix: 123 }, dataset: datasetInfo("fv3-beta1"), ut: 200, shareLink: "L", date: new Date("2026-10-14") });
    const all = items.map((i) => ("text" in i ? i.text : "")).join(" ");
    expect(all).toMatch(/median grain diameter \$d\$ = 200/);
    expect(all).toMatch(/MCMC FV3/);
  });
});

describe("Mars downloads", () => {
  it("NetCDF: hourly series, fields vs d, flux roses vs d; reads back", () => {
    const cell = makeMarsCell(1);
    const nc = readNc(cellNetcdf(cell, meta));
    const dim = Object.fromEntries(nc.dims.map((d) => [d.name, d.size]));
    expect(dim).toMatchObject({ hour: 2000, d: 64, ua_bin: 128, rose_mode: 3 });
    expect(nc.vars.z.dims).toEqual(["hour"]);
    expect((nc.vars.z.attrs as Record<string, unknown>).units).toBe("m");
    expect(nc.vars.u.dims).toEqual(["hour"]);
    expect(nc.vars.dpm.dims).toEqual(["d"]);
    expect(nc.vars.flux_rose.dims).toEqual(["rose_mode", "d", "ua_bin"]);
    expect(Array.from(nc.vars.d.data as number[])).toEqual(reg.threshold.values);
    expect((nc.vars.u.data as number[])[10]).toBeCloseTo(cell.series.u[10], 5);
    expect(nc.gatts.planet).toBe("Mars");
    expect(String(nc.gatts.fields_citation)).toBe(fieldsCitation("fv3-beta1"));
    expect(String(nc.gatts.fields_license)).toBe("NASA Ames MCMC output; no licence stated (NASA open data)");
    expect(String(nc.gatts.references)).toMatch(/Pähtz|FV3/);
    expect(String(nc.gatts.title)).not.toMatch(/ERA5|10 m/);
    // the flux-rose table at d index 29 is the panel's flat rose
    const tab = marsFluxRoseTable(cell);
    const v = analyseMarsCell(cell, 29, { fluxSectors: 128 });
    expect(tab[0][29].reduce((a, b) => a + b, 0)).toBeCloseTo(v.fluxTotal, 9);
  });
  it("CSV bundle: wind_series.csv (one row per hour), fields_by_grain_size.csv, flux_rose.csv, metadata, README", async () => {
    const cell = makeMarsCell(2);
    const ws = windSeriesCsv(cell).trimEnd().split("\n");
    expect(ws.length).toBe(1 + 2000);
    expect(ws[0]).toBe("\ufeffhour,sol,solar_longitude,wind_u,wind_v,air_temperature,air_density,wind_height");
    expect(fluxRoseCsv(cell).trimEnd().split("\n").length).toBe(1 + 3 * 64 * 128);
    // headers: ASCII snake_case, unique, all from the shared map (same names as Earth for the same quantity)
    for (const [f, cols] of Object.entries(csvColumns(cell))) {
      const names = cols.map((x) => csvName(x.name));
      for (const x of cols) expect(CSV_NAMES[x.name], `${f}: ${x.name}`).toBeDefined();
      for (const n of names) expect(n).toMatch(CSV_NAME_RE);
      expect(new Set(names).size, f).toBe(names.length);
    }
    const fg = fieldsByGrainSizeCsv(cell).split("\n");
    expect(fg[0]).toMatch(/^\ufeffgrain_diameter,alpha_h,alpha_e,alpha_t,alpha_o,rdd,dp,rdp,/);
    expect(fg[0]).toContain(",sigma_e_over_sigma_h,");
    expect(fg[0]).toContain(",ustar_mean_above_threshold_over_ustar_th,");
    expect(fluxRoseCsv(cell).split("\n")[0]).toBe("\ufeffrose_mode,grain_diameter,direction_bin_centre,direction_bin_lower,direction_bin_upper,bearing_toward,bearing_from,flux");
    expect(Object.keys(csvColumns(cell))).toEqual(["wind_series.csv", "fields_by_grain_size.csv", "flux_rose.csv", "rose_16_sectors.csv"]);   // + 16-sector table
    const md = JSON.parse(metadataJson(cell, meta));
    expect(md.planet).toBe("Mars");
    expect(md.fields_citation).toBe(fieldsCitation("fv3-beta1"));
    expect(md.constants.rho_p).toBe(3000);
    expect(md.constants.z0).toBeUndefined();
    expect(md.constants.mixing_length_damping).toBe(7);
    expect(md.conventions.friction_velocity).toMatch(/eq\. 2\.2/);
    expect(md.d_um.length).toBe(64);
    const rd = readmeText(cell, meta);
    expect(rd).toMatch(/Pähtz & Durán \(2023\)/);
    expect(rd).toMatch(/smooth-wall/);
    expect(rd).not.toMatch(/ln\(z|z0|log law/);
    expect(rd).toMatch(/ln\(p_surface \/ p_mid\)/); // the height z of the series
    const zip = await csvBundle(cell, meta, null);
    expect(zip.length).toBeGreaterThan(1000);
    for (const s of [rd, JSON.stringify(md), citationText("", citationSources())]) expect(EARTH.test(EARTH_OK(s))).toBe(false);
  });
});

describe("Mars public text", () => {
  it("layer panel, legends, help, tour and the map-export strip carry no Earth-only text", () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const root = document.getElementById("layer-panel")!;
    renderLayerPanel(root, reg, new Store(initState()));
    for (const b of root.querySelectorAll("details")) (b as HTMLDetailsElement).open = true;
    for (const p of root.querySelectorAll(".info-popover")) (p as HTMLElement).hidden = false;
    // About, "Earth and Mars: what can be compared" names Earth on purpose: present, then left out
    const cmp = root.querySelector(".about .earth-mars")!;
    expect(text(cmp)).toMatch(/^Earth and Mars: what can be compared Both atlases compute the same quantities/);
    cmp.remove();
    const t = text(root);
    expect(t).toMatch(/Mars Dune Atlas/);
    expect(t).toMatch(/Median grain diameter/);
    expect(t).toMatch(/Related data/);
    expect(t).not.toMatch(/Land surface|Atmosphere & topography|Dark background/);
    expect(t).not.toMatch(/log law|z₀ = 1 mm/);
    expect(t).toMatch(/eq\. 2\.2/);
    expect(t).toMatch(/MOLA \(CC0\) and HRSC \(CC BY-SA 3\.0 IGO\)/);
    expect(t).toMatch(/shaded-relief basemap tiles are released under CC BY-SA 3\.0 IGO/);
    const strings = [EARTH_OK(t), ...reg.layers.map((l) => legendHtml(l)), ...HELP.HELP_SECTIONS.map((s) => s.body + s.title), ...HELP.TOUR_STEPS.map((s) => s.body + s.title)];
    const strip = mapStripItems({ reg, state: { ...initState(), layers: Object.fromEntries(reg.layers.map((l) => [l.id, { visible: true, opacity: 1 }])) }, view: { lon: 67, lat: 9, zoom: 4, bearing: 0, pitch: 0, proj: "mercator" }, width: 1600, includeBasemap: true, shareLink: "L", date: new Date("2026-10-14") });
    strings.push(...strip.map((i) => EARTH_OK("text" in i ? i.text : "title" in i ? `${i.title} ${i.detail ?? ""}` : "")));
    const bad = strings.filter((s) => EARTH.test(s));
    expect(bad).toEqual([]);
    expect(strip.map((i) => ("text" in i ? i.text : "")).join(" ")).toMatch(/Web Mercator \(Mars sphere/);
  });
  it("default view: globe over a dune-rich region, FV3, d = 200 µm, dark relief basemap", () => {
    expect(DEFAULT_VIEW).toMatchObject({ proj: "globe", dataset: "fv3-beta1", ut: 29, basemap: "hrsc-mola-hillshade" });
    expect(DEFAULT_VIEW.lat).toBeGreaterThan(55);
    expect(DEFAULT_VIEW.layers.map((l) => l.id)).toEqual(["rdpa", "dunes", "dpm"]);
    expect(HELP.TOUR_STEPS.find((s) => s.id === "cell")!.body).toMatch(/Nili Patera \(9° N, 67° E\)/);
  });
});

describe("Mars field metadata", () => {
  it("panel/export field texts come from registry/mars/qsat_field_metadata.json (per-hour Mars threshold)", async () => {
    const { fieldInfo } = await import("../../src/cell/fieldinfo");
    expect(fieldInfo("uft").description).toMatch(/Pähtz & Durán \(2023\)/);
    expect(fieldInfo("dpm").displayUnits).toBe("m$^2$/yr");
  });
});
