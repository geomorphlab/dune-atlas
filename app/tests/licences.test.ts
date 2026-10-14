// Licences stated by the Earth atlas (DATA_LICENSE.md notes 1 and 2): ERA5 and ERA5-Land under CC BY 4.0
// (the Climate Data Store licence since 2 July 2025) with the Copernicus notice and the dataset DOIs; the
// dune map under MIT, the licence of its source record.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/core/registry/load";
import { citationSources, datasetNotice, fieldsLicence } from "../src/core/cell/citation";
import { mapAttributionHtml, MAP_DUNE_CREDIT } from "../src/bodies/earth/citation";
import { auxSourceAttrs, restateLicence } from "../src/bodies/earth/auxinfo";

const OLD = /Licence to use Copernicus|Copernicus licence/i;
const ROOT = path.resolve(__dirname, "../..");
const files = (dir: string, ext: RegExp): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(path.join(dir, e.name), ext) : ext.test(e.name) ? [path.join(dir, e.name)] : []);

describe("ERA5 and ERA5-Land: CC BY 4.0", () => {
  const reg = loadRegistry().registry;
  it("no app source or registry file names the earlier Copernicus licence (except the restating rule)", () => {
    const hits = [...files(path.join(ROOT, "app/src"), /\.ts$/), ...files(path.join(ROOT, "registry"), /\.(ya?ml|json)$/)]
      .filter((f) => !f.endsWith(path.join("earth", "auxinfo.ts")) && OLD.test(fs.readFileSync(f, "utf8")));
    expect(hits.map((f) => path.relative(ROOT, f))).toEqual([]);
  });
  it.each(["era5-land", "era5"])("%s: field licence, Data entry licence and DOI, Copernicus notice", (id) => {
    expect(fieldsLicence(id)).toMatch(/^CC BY 4\.0/);
    const ds = reg.datasets!.find((d) => d.id === id)!;
    const data = ds.citationSources!.find((s) => s.id === id)!.entries.find((e) => e.label === "Data")!;
    expect(data.license).toBe("CC BY 4.0");
    expect(data.doi).toMatch(/^10\.24381\/cds\./);
    expect(data.text).toContain("Copernicus Climate Change Service (C3S)");
    expect(datasetNotice(id)).toMatch(/^Contains modified Copernicus Climate Change Service information/);
    expect(ds.credits!.windSourceText).toContain(`data doi:${data.doi}, CC BY 4.0)`);
    expect(ds.info!.sourceHtml).toContain("Copernicus Climate Change Service, CC BY 4.0");
  });
  it("every layer of the ERA5 dataset states CC BY 4.0", () => {
    const era5 = fs.readFileSync(path.join(ROOT, "registry/earth/datasets/era5/qsat_fields.yaml"), "utf8");
    const lic = [...era5.matchAll(/^\s+licence: (.+)$/gm)].map((m) => m[1]);
    expect(lic.length).toBeGreaterThan(20);
    expect(new Set(lic)).toEqual(new Set(["CC BY 4.0"]));
  });
  it("store attributes written before the change are restated in downloads", () => {
    expect(restateLicence("Copernicus licence (Licence to use Copernicus products)")).toBe("CC BY 4.0");
    expect(restateLicence("CC BY 4.0, © 2008–2019 CSIRO")).toBe("CC BY 4.0, © 2008–2019 CSIRO");
    const out = auxSourceAttrs({ series: {}, scalars: {}, attrs: { ai_mean: { licence: "Copernicus licence (Licence to use Copernicus products)" } } } as never, "ai_mean");
    expect(out.license).toBe("CC BY 4.0");
  });
  it("per-cell references give each ERA5 Data entry with its licence", () => {
    for (const id of ["era5-land", "era5"]) {
      const src = citationSources([], id).find((s) => s.id === id)!;
      expect(src.entries.find((e) => e.label === "Data")!.license).toBe("CC BY 4.0");
    }
  });
});

describe("dune map: MIT (Supplementary Code record, doi:10.5281/zenodo.20054674)", () => {
  it.each(["era5-land", "era5"])("map attribution with %s", (id) => {
    expect(mapAttributionHtml(id)).toMatch(/^Dune map: <a href="https:\/\/doi\.org\/[^"]+"[^>]*>Gunn \(2026\)<\/a>, MIT; /);
  });
  it("map-export credit line", () => {
    expect(MAP_DUNE_CREDIT).toContain("data doi:10.5281/zenodo.20054674, MIT");
  });
  it("no dune-map statement gives another licence", () => {
    const src = files(path.join(ROOT, "app/src"), /\.ts$/).map((f) => fs.readFileSync(f, "utf8")).join("\n");
    expect(src).not.toMatch(/Dune (map|and wind-regime data): \$\{paper\}, CC BY/);
  });
});
