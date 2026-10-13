// @vitest-environment happy-dom
// Vegetation cover layer (Land surface group), generic per-cell sidecars, safe links in registry
// text, panel row, downloads and citations.
import { harmonizeAux } from "../src/cell/auxinfo";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as zarr from "zarrita";
import { loadRegistry } from "../src/registry/load";
import { infoHtml } from "../src/ui/layerPanel";
import { legendHtml, legendTicks } from "../src/ui/legend";
import { COLORMAPS } from "../src/util/colormaps";
import { COLORMAP_GROUPS, effectiveDisplay } from "../src/layerconfig";
import { richHtml, richPlain, safeHttpUrl } from "../src/util/richtext";
import { CellStore, type CellData } from "../src/cell/cellstore";
import { cellNetcdf, metadataJson, readmeText } from "../src/cell/export";
import { citationHtml, citationJson, citationSources, citationText, CELL_SOURCE_IDS } from "../src/cell/citation";
import { CellPanel } from "../src/ui/cellPanel";
import { CONFIG } from "../src/config";
import { makeCell, FIELD_VARS } from "./helpers";
import { readNc } from "./ncreader";

const reg = loadRegistry().registry;
const veg = reg.layers.find((l) => l.id === "vegetation")!;
const RAPP = "https://map.geo-rapp.org/";

describe("vegetation layer (registry)", () => {
  it("Land surface group after aridity; 2-D, threshold-independent, linear 0-100 %, ylgn", () => {
    expect(veg).toBeTruthy();
    const g = reg.groups.find((x) => x.id === "climate")!;
    expect(g.title).toBe("Land surface");
    const ids = reg.layers.filter((l) => l.group === "climate").map((l) => l.id);
    expect(ids.indexOf("vegetation")).toBe(ids.indexOf("aridity") + 1);
    expect(veg.thresholdAware).toBe(false);
    expect(veg.units).toBe("%");
    const e = effectiveDisplay(veg);
    expect(e.colormap).toBe("ylgn");
    expect(e.clim).toEqual([0, 100]);
    expect(e.scale).toBe("linear");
    expect(legendTicks(veg)).toEqual([0, 20, 40, 60, 80, 100]);
    // ylgn: generated, sequential yellow -> green, listed with the sequential maps
    const cm = COLORMAPS.ylgn;
    expect(cm.length).toBeGreaterThan(100);
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [r0, g0, b0] = rgb(cm[0]), [r1, g1, b1] = rgb(cm[cm.length - 1]);
    expect(r0 > 230 && g0 > 230 && b0 > 180).toBe(true); // pale yellow
    expect(g1 > r1 && g1 > b1).toBe(true);                // dark green
    expect(COLORMAP_GROUPS.find((x) => x.label === "Sequential")!.names).toContain("ylgn");
  });
  it("legend note: mean of monthly MODIS fractional cover and a safe link to GEOGLAM RAPP", () => {
    const html = legendHtml(veg);
    expect(html).toMatch(/Mean of monthly MODIS fractional cover 2001–2025 \(photosynthetic \+ non-photosynthetic vegetation\)/);
    const d = document.createElement("div"); d.innerHTML = html;
    const a = d.querySelector(".legend-note a") as HTMLAnchorElement;
    expect(a.getAttribute("href")).toBe(RAPP);
    expect(a.textContent).toBe("Explore the full time series at GEOGLAM RAPP");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toContain("noopener");
  });
  it("info popover: attribution block with DOI, papers, licence, NCI hosting and the RAPP link", () => {
    const d = document.createElement("div"); d.innerHTML = infoHtml(veg);
    const t = d.textContent!;
    expect(t).toContain("doi:10.4225/08/5848a3f19a7b3");
    expect(t).toContain("Guerschman, J.P. et al. (2015)");
    expect(t).toContain("doi:10.1016/j.rse.2015.01.021");
    expect(t).toContain("Guerschman, J.P. & Hill, M.J. (2018)");
    expect(t).toContain("doi:10.1080/2150704X.2018.1465611");
    expect(t).toContain("CC BY 4.0, © 2008–2019 CSIRO");
    expect(t).toContain("hosted by NCI");
    expect(t).toContain("Threshold-independent");
    const hrefs = [...d.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://doi.org/10.4225/08/5848a3f19a7b3");
    expect(hrefs.filter((h) => h === RAPP).length).toBeGreaterThanOrEqual(2); // description link + Link row
    expect(t).not.toMatch(/\[Explore|\]\(/); // markdown rendered, not shown
  });
});

describe("safe links in registry text", () => {
  it("only http(s) links; everything else escaped", () => {
    expect(safeHttpUrl("https://a.org/x")).toBe("https://a.org/x");
    for (const u of ["javascript:alert(1)", "data:text/html,x", "//evil.org", "/rel", "ftp://x.org"]) expect(safeHttpUrl(u)).toBeNull();
    const h = richHtml('a [x](javascript:alert(1)) <b>"q"</b> [ok](https://ok.org/p?a=1&b=2) and https://bare.org/path.');
    expect(h).not.toContain("<b>");
    expect(h).not.toMatch(/href="javascript/);
    expect(h).toContain('<a href="https://ok.org/p?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">ok</a>');
    expect(h).toContain('<a href="https://bare.org/path" target="_blank" rel="noopener noreferrer">bare.org/path</a>.');
    expect(richHtml('[a"><img src=x onerror=1>](https://x.org/)')).not.toContain("<img");
    expect(richHtml('x https://x.org/"><script>')).not.toContain("<script");
    expect(richPlain("see [RAPP](https://map.geo-rapp.org/).")).toBe("see RAPP (https://map.geo-rapp.org/).");
  });
});

describe("generic per-cell sidecars", () => {
  it("config / registry list the sidecars; the reader merges every store", async () => {
    expect(CONFIG.cellAuxPaths).toEqual(["{dataset}/cells-aux.zarr", "{dataset}/cells-aux-veg.zarr"]);
    expect(reg.datasets![0].cellAuxStores).toEqual(["{dataset}/cells-aux.zarr", "{dataset}/cells-aux-veg.zarr"]);
    const mk = async (vars: Record<string, number>) => {
      const s = new Map<string, Uint8Array>();
      const root = zarr.root(s as never);
      await zarr.create(root, { attributes: { variables: Object.keys(vars) } } as never);
      for (const [v, val] of Object.entries(vars)) {
        const a = await zarr.create(root.resolve(v), { shape: [4, 4], chunk_shape: [4, 4], data_type: "float32", fill_value: NaN, attributes: { units: v } } as never);
        await zarr.set(a as never, null, val);
      }
      return s;
    };
    const a = await mk({ ai_mean: 0.1 }), b = await mk({ tot_cov_mean: 42, tot_cov_n_months: 280, ai_mean: 9 });
    const { CellAuxStore } = await import("../src/cell/cellstore");
    const [sa, sb] = await Promise.all([CellAuxStore.open(a as never), CellAuxStore.open(b as never)]);
    expect(sa.variables).toEqual(["ai_mean"]);
    expect(sb.variables.sort()).toEqual(["ai_mean", "tot_cov_mean", "tot_cov_n_months"]);
  });
  const fixture = path.resolve(__dirname, "../../staging/fixture");
  const have = fs.existsSync(path.join(fixture, "cells-aux-veg.zarr"));
  it.skipIf(!have)("fixture: cells-aux + cells-aux-veg merged into cell.aux; a missing sidecar only drops its values", async () => {
    class RFS {
      constructor(private root: string) {}
      async get(k: string) { const p = this.root + k; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
      async getRange(k: string, r: { offset: number; length: number } | { suffixLength: number }) {
        const p = this.root + k; if (!fs.existsSync(p)) return undefined;
        const b = fs.readFileSync(p); const n = b.length;
        return "suffixLength" in r ? new Uint8Array(b.subarray(n - r.suffixLength)) : new Uint8Array(b.subarray(r.offset, r.offset + r.length));
      }
    }
    const cells = new RFS(path.join(fixture, "cells.zarr"));
    const cs = await CellStore.open(cells as never, { aux: [new RFS(path.join(fixture, "cells-aux.zarr")), new RFS(path.join(fixture, "cells-aux-veg.zarr"))] as never });
    const c = await cs.query(1145, 1952);
    const direct = zarr.root(new RFS(path.join(fixture, "cells-aux-veg.zarr")) as never);
    const m = await zarr.get(await zarr.open(direct.resolve("tot_cov_mean"), { kind: "array" }), [1145, 1952]);
    expect(c.aux!.scalars.tot_cov_mean).toBe(Number(m));
    // published per cell: the same variables as ERA5 (0.1°: valid fraction 1 where the mean is valid; no month count)
    expect(c.aux!.scalars.tot_cov_valid_frac).toBe(1);
    expect("tot_cov_n_months" in c.aux!.scalars).toBe(false);
    expect(c.aux!.attrs.tot_cov_valid_frac.doi).toBe("10.4225/08/5848a3f19a7b3");
    expect(c.aux!.scalars.ai_mean).toBeGreaterThan(0);
    expect(c.aux!.series.qsdiv.length).toBe(64);
    expect(c.aux!.attrs.tot_cov_mean.doi).toBe("10.4225/08/5848a3f19a7b3");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cs2 = await CellStore.open(cells as never, { aux: [new RFS(path.join(fixture, "nope.zarr")), new RFS(path.join(fixture, "cells-aux-veg.zarr"))] as never });
    const c2 = await cs2.query(1145, 1952);
    expect(c2.aux!.scalars.tot_cov_mean).toBe(Number(m));
    expect("ai_mean" in c2.aux!.scalars).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

function vegCell(): CellData {
  const hist = new Uint32Array(128 * 128); hist[40 * 128 + 70] = 100;
  const c = makeCell({ iy: 1145, ix: 1952, lat: -24.5, lon: 15.2, hist, fields: new Float32Array(FIELD_VARS.length * 64).fill(0.3) });
  c.aux = harmonizeAux({ series: {}, scalars: { tot_cov_mean: 20.275455474853516, tot_cov_n_months: 299 },
    attrs: { tot_cov_mean: { citation: "Guerschman, J.P. et al. (2015) …", doi: "10.4225/08/5848a3f19a7b3", licence: "CC BY 4.0, Copyright 2008-2019 CSIRO", url: RAPP, source: "store text", changes: "store text" }, tot_cov_n_months: { doi: "10.4225/08/5848a3f19a7b3" } } });
  return c;
}
const META = { datasetId: "era5-land", datasetTitle: "ERA5-Land", dataVersion: "v1", permalink: "https://map.geomorphlab.org/?cell=1145,1952", generated: new Date("2026-10-13T00:00:00Z") };

describe("vegetation in the panel and the downloads", () => {
  it("harmonizeAux: 0.1° valid fraction from the mean (1 / 0); month count and unknown variables dropped", () => {
    const x = harmonizeAux({ series: { qsdiv: new Float32Array(2) }, scalars: { tot_cov_mean: NaN, tot_cov_n_months: 0, lsm: 1, ai_mean: 0.2 }, attrs: { tot_cov_mean: { doi: "d" }, lsm: {} } });
    expect(x.scalars).toEqual({ ai_mean: 0.2, tot_cov_mean: NaN, tot_cov_valid_frac: 0 });
    expect(Object.keys(x.attrs)).toEqual(["tot_cov_mean", "tot_cov_valid_frac"]);
    const y = harmonizeAux({ series: {}, scalars: { tot_cov_mean: 3, tot_cov_valid_frac: 0.4 }, attrs: {} });
    expect(y.scalars.tot_cov_valid_frac).toBe(0.4); // 0.25°: the store's area fraction
  });
  it("summary row 'Vegetation cover' in %, fraction of the cell with data as subtext and tooltip", async () => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const c = vegCell();
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {} });
    await p.show({ query: async () => c, attrs: {}, fieldVars: FIELD_VARS } as unknown as CellStore, 1145, 1952);
    const row = root.querySelector('.summary tr[data-field="tot_cov_mean"]')!;
    expect(row.querySelector("th")!.textContent).toBe("Vegetation cover (mean 2001–2025; 100 % of cell with data)");
    expect(row.querySelector("td.num")!.textContent).toBe("20.3 %");
    expect(row.querySelector("td.num")!.getAttribute("title")).toBe("Mean of the 0.1° vegetation cover means (2001–2025) over the part of the cell with data (100 %)");
    // citation list in the panel includes the vegetation source with the RAPP link
    expect(root.textContent).toContain("Vegetation cover (CSIRO MODIS Fractional Cover v3.1)");
  });
  it("NetCDF scalars + metadata.json aux + README + citations", () => {
    const c = vegCell();
    const r = readNc(cellNetcdf(c, META));
    for (const [v, u, x] of [["tot_cov_mean", "%", 20.275455474853516], ["tot_cov_valid_frac", "1", 1]] as const) {
      expect(r.vars[v].dims).toEqual([]);
      expect(r.vars[v].attrs.units).toBe(u);
      expect((r.vars[v].data as Float32Array)[0]).toBe(Math.fround(x));
    }
    const a = r.vars.tot_cov_mean.attrs;
    expect(a.license).toBe("CC BY 4.0, © 2008–2019 CSIRO");
    expect(a.url).toBe(RAPP);
    expect(String(a.references)).toContain("data doi:10.4225/08/5848a3f19a7b3");
    expect(String(a.source)).toMatch(/^Fractional cover - MODIS, CSIRO Land and Water algorithm, version 3\.1/);
    expect(String(a.source)).not.toContain("store text");
    expect(String(r.gatts.references)).toContain("https://doi.org/10.1016/j.rse.2015.01.021");
    const md = JSON.parse(metadataJson(c, META));
    expect(md.aux.tot_cov_mean.value).toBe(Math.fround(20.275455474853516));
    expect(md.aux.tot_cov_valid_frac.value).toBe(1);
    expect(md.aux.tot_cov_n_months).toBeUndefined();
    expect(r.vars.tot_cov_n_months).toBeUndefined();
    const vc = md.citation.find((x: { id: string }) => x.id === "vegetation");
    expect([vc.paper.doi, vc.paper_2.doi, vc.data.doi]).toEqual(["10.1016/j.rse.2015.01.021", "10.1080/2150704X.2018.1465611", "10.4225/08/5848a3f19a7b3"]);
    expect(vc.notice).toContain(RAPP);
    const rd = readmeText(c, META);
    expect(rd).toContain("tot_cov_mean");
    expect(rd).toContain("Vegetation cover (CSIRO MODIS Fractional Cover v3.1)");
    expect(rd).toContain(RAPP);
    expect(CELL_SOURCE_IDS).toContain("vegetation");
    // dataset-level citations keep earlier keys unchanged (single entries)
    const dj = citationJson(citationSources(["aridity"]));
    expect(Object.keys(dj[0])).toContain("data_wind_histograms_and_sand_flux_fields_");
    expect(citationText("", citationSources(["vegetation"]))).toContain("Paper: Guerschman, J. P. & Hill, M. J. (2018)");
    const d = document.createElement("div"); d.innerHTML = citationHtml(citationSources(["vegetation"]));
    expect([...d.querySelectorAll("a")].map((x) => x.getAttribute("href"))).toContain(RAPP);
  });
  it("About lists the vegetation source with the RAPP link", async () => {
    const { DATA_SOURCES_HTML } = await import("../src/ui/layerPanel");
    const d = document.createElement("div"); d.innerHTML = DATA_SOURCES_HTML;
    expect(d.textContent).toContain("CSIRO MODIS Fractional Cover v3.1");
    expect([...d.querySelectorAll("a")].map((x) => x.getAttribute("href"))).toContain(RAPP);
  });
});
