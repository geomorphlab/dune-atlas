// @vitest-environment happy-dom
// "Get the whole grid" guide (Download & cite and About; URLs, variables, threshold axis and licence from the
// registry for the selected dataset) and the Earth cell panel's line with the other wind dataset(s) at the same
// location (lazy, every dataset, threshold-following, livenum slots, no-data and error handling).
import { describe, expect, it, vi } from "vitest";
import { bulkGuide, bulkGuideHtml, DATA_LICENSE_URL } from "../src/core/ui/bulkguide";
import { loadRegistry } from "../src/core/registry/load";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { Store, type AppState } from "../src/core/store";
import { CellPanel, OTHER_TEXT } from "../src/core/ui/cellPanel";
import type { CellData, CellStore } from "../src/core/cell/cellstore";
import { makeCell, FIELD_VARS } from "./helpers";
import { C } from "../src/core/util/constants";
import { mathToBearingDeg } from "../src/core/util/angles";

const reg = loadRegistry().registry;
const text = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return (d.textContent ?? "").replace(/\s+/g, " ").trim(); };

describe("Get the whole grid", () => {
  it("URLs of every dataset-dependent map field and the cell store come from the registry", () => {
    for (const ds of reg.datasets!) {
      const g = bulkGuide(ds.id);
      expect(g.fields.length).toBe(24);
      const dp = g.fields.find((f) => f.variable === "dpm")!;
      expect(dp.url).toBe(`https://data.geomorphlab.org/${ds.prefix}/fields/dpm.zarr/0`);
      expect(g.cellStore).toBe(`https://data.geomorphlab.org/${ds.prefix}/cells.zarr`);
      expect(g.code).toContain(`url = "${dp.url}"`);
      expect(g.code).toContain('("dpm", "ut", "y", "x")');
      expect(g.code).toContain("- 0.15).argmin()");
      expect(g.fields.some((f) => f.variable === "aridity")).toBe(false);   // not dataset-dependent
    }
    expect(bulkGuide("era5-land").licence).toBe("CC BY 4.0 (Zenodo Supplementary Data)");
    expect(bulkGuide("era5").code).toMatch(/^# ERA5 0\.25°: Drift potential \(DP\), the whole grid at ut = 0\.15 m\/s/);
  });
  it("the example selects a box around the body's example cell (Namib)", () => {
    expect(bulkGuide("era5-land").code).toContain("sel(y=slice(-22.5, -26.5), x=slice(13.2, 17.2))");
  });
  it("HTML: a disclosure with the public server, code, copy button, variables and licence pointers", () => {
    const html = bulkGuideHtml("era5", "t");
    const t = text(html);
    expect(t).toMatch(/^Get the whole grid The atlas reads public Zarr \(v3\) stores on data\.geomorphlab\.org/);
    expect(t).toContain("threshold friction velocity (ut, 64 values)");
    expect(t).toContain("Licence of these map fields: Copernicus licence");
    expect(html).toContain(`href="${DATA_LICENSE_URL}"`);
    expect(html).toContain('data-copy="t-code"');
    expect(html).toContain('<pre class="bulk-code" id="t-code">');
  });
  it("About carries the guide for the selected dataset and follows a dataset switch; copy button copies the code", async () => {
    document.body.innerHTML = '<aside id="layer-panel"></aside>';
    const st: AppState = { basemap: reg.basemaps[0].id, projection: "globe", utIndex: 14, layers: {}, order: reg.layers.map((l) => l.id), dataset: "era5-land", cell: null, embed: false };
    const store = new Store(st);
    const root = document.getElementById("layer-panel")!;
    renderLayerPanel(root, reg, store);
    const code = () => root.querySelector(".about .bulk-guide pre")!.textContent!;
    expect(code()).toContain("dune-atlas/v1/fields/dpm.zarr/0");
    store.set({ dataset: "era5" });
    expect(code()).toContain("dune-atlas/v2/datasets/era5/fields/dpm.zarr/0");
    const write = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText: write } });
    (root.querySelector(".about .copy-code") as HTMLButtonElement).click();
    expect(write).toHaveBeenCalledWith(code());
  });
});

/** a cell with constant fields: DP, RDP/DP and RDD set per threshold index k */
function cellWith(o: { lat: number; lon: number; dp: (k: number) => number; ratio: number; rddRad: number; hasData?: boolean }): CellData {
  const n = 64, fields = new Float32Array(FIELD_VARS.length * n).fill(0.5);
  const set = (v: string, f: (k: number) => number) => { const i = FIELD_VARS.indexOf(v); for (let k = 0; k < n; k++) fields[i * n + k] = f(k); };
  set("dpm", (k) => o.dp(k) / C.S2Y);
  set("rdpm", (k) => (o.dp(k) * o.ratio) / C.S2Y);
  set("qha_rdp_dp", () => o.ratio);
  set("rdpa", () => o.rddRad);
  const hist = new Uint32Array(128 * 128); hist[40 * 128 + 70] = 100;
  return makeCell({ iy: 1, ix: 1, lat: o.lat, lon: o.lon, hist, fields, hasData: o.hasData ?? true });
}
const storeOf = (c: CellData | Error, grid = { lat0: 90, dlat: -0.25, lon0: -180, dlon: 0.25, ny: 721, nx: 1440 }) =>
  ({ grid, attrs: { field_vars: FIELD_VARS }, fieldVars: FIELD_VARS, query: async () => { if (c instanceof Error) throw c; return c; } }) as unknown as CellStore;
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("other-dataset line (Earth cell panel)", () => {
  async function panel(others: { id: string; open: () => Promise<CellStore> }[]) {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, otherDatasets: () => others });
    const main = cellWith({ lat: -24.55, lon: 15.25, dp: () => 30, ratio: 0.3, rddRad: Math.PI / 2 });
    await p.show(storeOf(main, { lat0: 90, dlat: -0.1, lon0: -180, dlon: 0.1, ny: 1801, nx: 3600 }), 1145, 1952);
    return { root, p };
  }
  const lines = (root: HTMLElement) => [...root.querySelectorAll(".other-ds .other-line")].map((e) => (e.textContent ?? "").replace(/\s+/g, " "));
  it("loads lazily after the panel: loading line first, then DP, RDD and RDP/DP at the current threshold", async () => {
    let release!: (s: CellStore) => void;
    const other = cellWith({ lat: -24.5, lon: 15.25, dp: (k) => 10 + k, ratio: 0.21, rddRad: 0 });
    const { root, p } = await panel([{ id: "era5", open: () => new Promise((r) => { release = r; }) }]);
    expect(lines(root)).toEqual([`ERA5 0.25°: ${OTHER_TEXT.loading}`]);
    release(storeOf(other));
    await tick(); await tick();
    const rdd = mathToBearingDeg(0).toFixed(0);
    expect(lines(root)[0]).toBe(`ERA5 0.25° here: DP 24.0 m²/yr, RDD ${rdd}° (E), RDP/DP 0.210`);
    p.setThreshold(20);
    expect(lines(root)[0]).toContain("DP 30.0 m²/yr");
    // slots are reserved from that cell's 64 values (constant line length while the slider moves)
    const w = [...root.querySelectorAll(".other-line .live-num")].map((e) => (e as HTMLElement).style.minWidth);
    p.setThreshold(40);
    expect([...root.querySelectorAll(".other-line .live-num")].map((e) => (e as HTMLElement).style.minWidth)).toEqual(w);
  });
  it("no data at that location, or a store that cannot be opened: said so; every other dataset gets a line", async () => {
    const { root } = await panel([
      { id: "era5", open: async () => storeOf(cellWith({ lat: -24.5, lon: 15.25, dp: () => NaN, ratio: NaN, rddRad: NaN, hasData: false })) },
      { id: "era5-land", open: async () => storeOf(new Error("offline")) },
    ]);
    await tick(); await tick();
    expect(lines(root)).toEqual([`ERA5 0.25°: ${OTHER_TEXT.noLand}`, `ERA5-Land 0.1°: ${OTHER_TEXT.error}`]);
  });
  it("without other datasets the line is empty (single-dataset bodies)", async () => {
    const { root } = await panel([]);
    expect(lines(root)).toEqual([]);
  });
});
