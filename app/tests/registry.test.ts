// Registry schema validation (ajv, draft 2020-12) of layers.yaml and the merged registry,
// plus merge semantics and negative cases so broken entries fail CI.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { mergeRegistry, resolveSource, selectDataset } from "../src/registry/merge";
import { validateRegistry } from "../src/registry/validate";
import { loadRegistry } from "../src/registry/load";
import type { LayerDef, Registry, RegistryFragment } from "../src/registry/types";
import C from "../src/generated/constants.json";

const regDir = path.resolve(__dirname, "../../registry");
const schema = JSON.parse(fs.readFileSync(path.join(regDir, "layers.schema.json"), "utf8"));
const base = yaml.load(fs.readFileSync(path.join(regDir, "earth", "layers.yaml"), "utf8")) as Registry;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("registry/earth/layers.yaml", () => {
  it("validates against layers.schema.json + semantic checks", () => {
    expect(validateRegistry(base, schema)).toEqual([]);
  });
  it("has the placeholder layers for the fixture fields and dunes, and no withheld field", () => {
    const ids = base.layers.map((l) => l.id);
    for (const id of ["at", "ae", "qacb", "sige_sigh", "uft", "dunes"]) expect(ids).toContain(id);
    for (const w of C.WITHHELD_VARS) expect(base.layers.some((l) => l.id === w || l.variable === w)).toBe(false);
  });
  it("threshold: 64 values, default index 14 = 0.15 m/s", () => {
    expect(base.threshold.values.length).toBe(64);
    expect(base.threshold.values[base.threshold.defaultIndex]).toBeCloseTo(0.15, 12);
  });
  it("basemaps: dark OpenFreeMap default, Esri imagery with the required attribution, 2D hillshade, OpenTopoMap, OpenFreeMap light", () => {
    expect(base.basemaps.find((b) => b.default)!.id).toBe("openfreemap-dark");
    const esri = base.basemaps.find((b) => b.id === "esri-imagery")!;
    expect(esri.attribution).toBe("Esri, Maxar, Earthstar Geographics, and the GIS User Community");
    expect(base.basemaps.some((b) => b.kind === "hillshade")).toBe(true);
    expect(base.basemaps.some((b) => "terrain" in b)).toBe(false);
    expect(base.basemaps.some((b) => b.id === "opentopomap")).toBe(true);
    expect(base.basemaps.filter((b) => b.style?.includes("openfreemap")).length).toBe(2);
  });
});

describe("merged registry (layers.yaml + registry/earth/generated/*.yaml via import.meta.glob)", () => {
  it("validates and contains no withheld field", () => {
    const m = loadRegistry();
    for (const w of C.WITHHELD_VARS) expect(m.registry.layers.some((l) => l.id === w || l.variable === w)).toBe(false);
    expect(m.errors).toEqual([]);
    expect(validateRegistry(m.registry, schema)).toEqual([]);
  });
});

describe("datasets", () => {
  it("layers.yaml declares ERA5-Land as the default dataset with prefix dune-atlas/v1", () => {
    expect(base.datasets?.map((d) => d.id)).toEqual(["era5-land"]);
    expect(base.defaultDataset).toBe("era5-land");
    expect(base.datasets![0].prefix).toBe("dune-atlas/v1");
  });
  it("'{dataset}' expands to the dataset prefix; other sources are dataset-independent", () => {
    expect(resolveSource("{dataset}/fields/at.zarr", "https://d.org/", "dune-atlas/era5/v1")).toBe("https://d.org/dune-atlas/era5/v1/fields/at.zarr");
    expect(resolveSource("dune-atlas/v1/dunes/dunes.pmtiles", "https://d.org", "x")).toBe("https://d.org/dune-atlas/v1/dunes/dunes.pmtiles");
    expect(() => resolveSource("{dataset}/x", "https://d.org")).toThrow();
    expect(selectDataset(base, "nope")!.id).toBe("era5-land");
  });
  it("validation: unknown defaultDataset, duplicate ids, {dataset} without datasets, unknown placeholders", () => {
    const a = clone(base); a.defaultDataset = "nope";
    expect(validateRegistry(a, schema).join("\n")).toMatch(/defaultDataset 'nope'/);
    const b = clone(base); b.datasets!.push(clone(b.datasets![0]));
    expect(validateRegistry(b, schema).join("\n")).toMatch(/duplicate id 'era5-land'/);
    const c = clone(base); delete c.datasets; delete c.defaultDataset;
    expect(validateRegistry(c, schema).join("\n")).toMatch(/uses \{dataset\}/);
    const d = clone(base); d.layers[1].source = "{version}/x.zarr";
    expect(validateRegistry(d, schema).join("\n")).toMatch(/unknown placeholder/);
  });
  it("a second dataset validates", () => {
    const e = clone(base); e.datasets!.push({ id: "era5", title: "ERA5 (0.25°)", prefix: "dune-atlas/era5/v1" });
    expect(validateRegistry(e, schema)).toEqual([]);
  });
});

describe("schema: invert tileset and magnitude pairing", () => {
  it("accepts invertSource/invertSourceLayer and display.magnitudeVar", () => {
    const r = clone(base);
    r.layers[0].invertSource = "dunes/nondune-land.pmtiles";
    r.layers[0].invertSourceLayer = "nondune_land";
    r.layers[1].display!.magnitudeVar = "qacb";
    expect(validateRegistry(r, schema)).toEqual([]);
  });
  it("the merged dunes layer has an invert tileset", () => {
    const d = loadRegistry().registry.layers.find((l) => l.id === "dunes")!;
    expect(d.invertSource).toMatch(/nondune-land\.pmtiles$/);
    expect(d.invertSourceLayer).toBe("nondune_land");
  });
});

describe("mergeRegistry", () => {
  it("fragment layers replace same-id layers in place and append new ones; groups merge", () => {
    const frag: RegistryFragment = {
      groups: [{ id: "wind", title: "Wind (generated)" }, { id: "extra", title: "Extra" }],
      layers: [
        { ...(base.layers.find((l) => l.id === "qacb") as LayerDef), title: "qacb generated", group: "wind" },
        { id: "qnle", title: "qnle", group: "extra", type: "zarr-field", source: "fields/qnle.zarr", variable: "qnle", display: { colormap: "viridis", clim: [0, 1] } },
      ],
    };
    const m = mergeRegistry(base, [["qsat_fields.yaml", frag]]);
    expect(m.errors).toEqual([]);
    expect(m.replaced).toEqual([{ id: "qacb", by: "qsat_fields.yaml" }]);
    const ids = m.registry.layers.map((l) => l.id);
    expect(ids.indexOf("qacb")).toBe(base.layers.findIndex((l) => l.id === "qacb"));
    expect(ids[ids.length - 1]).toBe("qnle");
    expect(m.registry.layers.find((l) => l.id === "qacb")!.title).toBe("qacb generated");
    expect(m.registry.groups.find((g) => g.id === "wind")!.title).toBe("Wind (generated)");
    expect(validateRegistry(m.registry, schema)).toEqual([]);
  });
  it("fragments apply in filename order and reject unknown top-level keys", () => {
    const a: RegistryFragment = { layers: [{ ...base.layers[0], title: "A" }] };
    const b: RegistryFragment = { layers: [{ ...base.layers[0], title: "B" }] };
    const m = mergeRegistry(base, [["b.yaml", b], ["a.yaml", a]]);
    expect(m.registry.layers[0].title).toBe("B");
    const bad = mergeRegistry(base, [["x.yaml", { basemaps: [] } as unknown as RegistryFragment]]);
    expect(bad.errors[0]).toMatch(/unexpected top-level key 'basemaps'/);
  });
  it("resolveSource joins relative paths and passes absolute URLs through", () => {
    expect(resolveSource("fields/dpm.zarr", "https://data.geomorphlab.org/")).toBe("https://data.geomorphlab.org/fields/dpm.zarr");
    expect(resolveSource("https://x.org/a.pmtiles", "https://data.geomorphlab.org")).toBe("https://x.org/a.pmtiles");
  });
});

describe("broken entries fail validation", () => {
  const cases: [string, (r: Registry) => void, RegExp][] = [
    ["unknown layer type", (r) => ((r.layers[1] as unknown as { type: string }).type = "wms"), /schema/],
    ["missing source", (r) => delete (r.layers[1] as Partial<LayerDef>).source, /schema/],
    ["extra property", (r) => ((r.layers[1] as unknown as Record<string, unknown>).colour = "red"), /additional/],
    ["unknown group", (r) => (r.layers[1].group = "nope"), /unknown group/],
    ["unknown colormap", (r) => (r.layers[1].display!.colormap = "jet2"), /unknown colormap/],
    ["zarr-field without clim", (r) => delete r.layers[1].display!.clim, /needs display.clim/],
    ["log with clim<=0", (r) => { r.layers[1].display!.log = true; r.layers[1].display!.clim = [0, 1]; }, /log display/],
    ["duplicate id", (r) => r.layers.push(clone(r.layers[1])), /duplicate id/],
    ["thresholdAware vector", (r) => (r.layers[0].thresholdAware = true), /thresholdAware/],
    ["basemap terrain flag (3D terrain removed)", (r) => ((r.basemaps[2] as unknown as Record<string, unknown>).terrain = true), /additional/],
    ["unknown display property", (r) => ((r.layers[1].display as unknown as Record<string, unknown>).arrows = true), /additional/],
    ["bad threshold values", (r) => (r.threshold.values[3] = 0.5), /differs from pipeline/],
    ["two default basemaps", (r) => (r.basemaps[1].default = true), /more than one default/],
    ["pmtiles-vector without sourceLayer", (r) => { r.layers[0].type = "pmtiles-vector"; delete r.layers[0].sourceLayer; }, /sourceLayer/],
  ];
  it("a withheld field (if WITHHELD_VARS is non-empty) is rejected by id or by variable", () => {
    const r = clone(base);
    r.layers.push({ ...clone(r.layers[1]), id: "dpm", variable: "dpm", source: "fields/dpm.zarr" });
    expect(validateRegistry(r, schema, ["dpm"]).join("\n")).toMatch(/withheld/);
    const r2 = clone(base);
    r2.layers[1].variable = "rdpa";
    expect(validateRegistry(r2, schema, ["rdpa"]).join("\n")).toMatch(/withheld/);
    expect(validateRegistry(r, schema, [])).toEqual([]);
  });
  it.each(cases)("%s", (_name, mutate, re) => {
    const r = clone(base);
    mutate(r);
    const errs = validateRegistry(r, schema);
    expect(errs.join("\n")).toMatch(re);
  });
});
