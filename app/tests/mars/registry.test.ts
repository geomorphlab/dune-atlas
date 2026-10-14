// Mars registry (registry/mars/layers.yaml + registry/mars/generated/*.yaml) and the body-switch
// build mechanics (module substitution, source patches). Mirrors tests/registry.test.ts.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "../../src/registry/load";
import { validateMarsRegistry } from "../../src/mars/registry/validate";
import { MARS_PATCHES, MARS_SUBSTITUTES } from "../../src/mars/build";
import { applyPatch } from "../../scripts/body-plugin";
import { M } from "../../src/cell/marsphysics";
import { CONFIG } from "../../src/config";

const APP = path.resolve(__dirname, "../..");
const schema = JSON.parse(fs.readFileSync(path.resolve(APP, "../registry/layers.schema.json"), "utf8"));
const { registry: reg, errors } = loadRegistry();

describe("Mars registry", () => {
  it("is the Mars registry (checked patches of registry/load.ts) and validates", () => {
    expect(errors).toEqual([]);
    expect(validateMarsRegistry(reg, schema)).toEqual([]);
    expect(reg.datasets?.map((d) => d.id)).toEqual(["fv3-beta1"]);
    expect(reg.datasets?.[0].prefix).toBe("dune-atlas/mars/v2/datasets/fv3-beta1");
    expect(reg.defaultDataset).toBe("fv3-beta1");
  });
  it("threshold block = the grain-size slider of the spec (dim d, µm, 64 values 50-1000, default 29 = 200 µm)", () => {
    const t = reg.threshold;
    expect([t.dim, t.units, t.label, t.defaultIndex]).toEqual(["d", "µm", "Median grain diameter d", 29]);
    expect(t.values).toEqual(M.D_VALUES_UM);
    expect(t.values.length).toBe(64);
    expect(t.values[t.defaultIndex]).toBe(200);
    // log-spaced, rounded to integer µm; node 29 is exactly 200 µm (geometric 198.5, per PI)
    t.values.forEach((v, k) => expect(v, `d index ${k}`).toBe(k === 29 ? 200 : Math.round(50 * 20 ** (k / 63))));
  });
  it("layers: dunes, d-aware fields + qsdiv, 2-D air density and elevation; no Earth-only layers", () => {
    const ids = reg.layers.map((l) => l.id);
    for (const id of ["dunes", "dpm", "rdpm", "rdpa", "qsdiv", "rho_mean", "elevation"]) expect(ids).toContain(id);
    for (const id of ["aridity", "vegetation", "land"]) expect(ids).not.toContain(id);
    for (const l of reg.layers.filter((x) => x.type === "zarr-field")) {
      const twoD = l.id === "rho_mean" || l.id === "elevation";
      expect(!!l.thresholdAware, l.id).toBe(!twoD);
      expect(l.source, l.id).toMatch(/^(\{dataset\}\/fields\/|dune-atlas\/mars\/v1\/)/);
    }
    expect(reg.layers.find((l) => l.id === "dunes")!.source).toBe("dune-atlas/mars/v1/dunes/dunes-r2.pmtiles");
    expect(reg.layers.find((l) => l.id === "elevation")!.source).toBe("dune-atlas/mars/v1/fields/elevation.zarr");
  });
  it("groups: Earth's groups; 'Related data' (id environment: density and elevation)", () => {
    expect(reg.groups.map((g) => g.id)).toEqual(["dunes", "orientation", "crest-fluxes", "morphology", "wind", "drift", "environment"]);
    expect(reg.groups.find((g) => g.id === "environment")!.title).toBe("Related data");
    expect(reg.groups.some((g) => /land surface|atmosphere & topography/i.test(g.title))).toBe(false);
    for (const id of ["rho_mean", "elevation"]) expect(reg.layers.find((l) => l.id === id)!.group).toBe("environment");
  });
  it("basemaps: MOLA–HRSC hillshade (default, terrarium 512 px via pmtiles), OpenPlanetaryMap v0.2, Esri CTX / HiRISE / MDIM / colour relief, no plain dark background", () => {
    expect(reg.basemaps.map((b) => b.id)).toEqual(["hrsc-mola-hillshade", "opm-mars", "esri-ctx1", "esri-hirise", "esri-mdim", "esri-mcolordem"]); // no plain dark background on Mars (PI 2026-10-14)
    const h = reg.basemaps[0];
    expect([h.kind, h.encoding, h.tileSize, h.maxzoom, h.default]).toEqual(["hillshade", "terrarium", 512, 8, true]);
    expect(h.tiles![0]).toBe("pmtiles://dune-atlas/mars/v1/basemaps/hrsc-mola-terrarium.pmtiles/{z}/{x}/{y}");
    expect(reg.basemaps[1].tiles![0]).toBe("https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png");
    expect(reg.basemaps[1].attribution).toMatch(/OpenPlanetaryMap/);
    expect(reg.basemaps.every((b) => b.tiles?.length)).toBe(true);
  });
  it("Mars config: one cells-aux sidecar; no Esri build flag any more (the Esri basemaps are in the registry)", () => {
    expect(CONFIG.cellAuxPaths).toEqual(["{dataset}/cells-aux.zarr"]);
    expect("esriBasemaps" in CONFIG).toBe(false);
  });
});

describe("body-switch build", () => {
  it("every source patch applies to the current Earth sources (each find matches exactly its count)", () => {
    for (const p of MARS_PATCHES) {
      const src = fs.readFileSync(path.join(APP, p.file), "utf8");
      expect(() => applyPatch(src, p), p.file).not.toThrow();
      expect(applyPatch(src, p)).not.toBe(src);
    }
  });
  it("the planet radius in the patches is R_MARS of the pipeline constants", () => {
    const all = MARS_PATCHES.flatMap((p) => p.edits.map((e) => e.replace)).join("\n");
    for (const m of all.matchAll(/\b(3389500)\b/g)) expect(Number(m[1])).toBe(M.R_MARS);
    expect(all).not.toMatch(/6371008|6378137|40075016/);
  });
  it("every substitute exports at least the Earth module's names", async () => {
    for (const [earth, mars] of Object.entries(MARS_SUBSTITUTES)) {
      if (earth === "src/main.ts") continue; // entry, no exports
      expect(fs.existsSync(path.join(APP, mars)), mars).toBe(true);
      const src = fs.readFileSync(path.join(APP, earth), "utf8");
      const names = [...src.matchAll(/^export (?:const|function|class|let|interface|type|async function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
      const reexp = [...src.matchAll(/^export \{([^}]+)\}/gm)].flatMap((m) => m[1].split(",").map((x) => x.trim().split(/\s+as\s+/).pop()!.replace(/^type\s+/, "")));
      const msrc = fs.readFileSync(path.join(APP, mars), "utf8");
      for (const n of [...names, ...reexp].filter(Boolean)) {
        const ok = new RegExp(`^export (?:const|function|class|let|interface|type|async function) ${n}\\b`, "m").test(msrc) || new RegExp(`^export (?:type )?\\{[^}]*\\b${n}\\b[^}]*\\}`, "m").test(msrc);
        expect(ok, `${mars} must export ${n}`).toBe(true);
      }
    }
  });
});
