// @vitest-environment happy-dom
// "Get the whole grid" guide (Download & cite and About; URLs, variables, threshold axis and licence from the
// registry for the selected dataset).
import { describe, expect, it, vi } from "vitest";
import { bulkGuide, bulkGuideHtml, DATA_LICENSE_URL } from "../src/core/ui/bulkguide";
import { loadRegistry } from "../src/core/registry/load";
import { renderLayerPanel } from "../src/core/ui/layerPanel";
import { Store, type AppState } from "../src/core/store";

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
    expect(t).toContain("Licence of these map fields: CC BY 4.0.");
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
