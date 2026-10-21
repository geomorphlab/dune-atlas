// Mars registry (registry/mars/layers.yaml + registry/mars/generated/*.yaml) and the body-switch
// build mechanics (module substitution, body profile). Mirrors tests/registry.test.ts.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "../../src/core/registry/load";
import { validateMarsRegistry } from "../../src/bodies/mars/registry/validate";
import { PROFILE } from "../../src/bodies/mars/profile";
import { M } from "../../src/bodies/mars/marsphysics";
import { CONFIG } from "../../src/core/config";

const APP = path.resolve(__dirname, "../..");
const schema = JSON.parse(fs.readFileSync(path.resolve(APP, "../registry/layers.schema.json"), "utf8"));
const { registry: reg, errors } = loadRegistry();

describe("Mars registry", () => {
  it("is the Mars registry (@body/registry: registry/mars) and validates", () => {
    expect(errors).toEqual([]);
    expect(validateMarsRegistry(reg, schema)).toEqual([]);
    expect(reg.datasets?.map((d) => d.id)).toEqual(["fv3-beta1", "emars-v1-my30", "macda-v2-my30", "mcd-v61-clim"]);
    expect(reg.datasets?.[0].prefix).toBe("dune-atlas/mars/v2/datasets/fv3-beta1");
    expect(reg.defaultDataset).toBe("fv3-beta1");
  });
  it("threshold block = the grain-size slider of the spec (dim d, µm, 64 values 50-1000, default 29 = 200 µm)", () => {
    const t = reg.threshold;
    expect([t.dim, t.units, t.label, t.defaultIndex]).toEqual(["d", "µm", "Median grain diameter d", 29]);
    expect(t.values).toEqual(M.D_VALUES_UM);
    expect(t.values.length).toBe(64);
    expect(t.values[t.defaultIndex]).toBe(200);
    // log-spaced, rounded to integer µm; node 29 is exactly 200 µm (geometric 198.5)
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
    expect(reg.basemaps.map((b) => b.id)).toEqual(["hrsc-mola-hillshade", "opm-mars", "esri-ctx1", "esri-hirise", "esri-mdim", "esri-mcolordem"]); // no plain dark background on Mars
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
  it("the planet radius of the body profile is R_MARS of the pipeline constants", () => {
    expect(PROFILE.radiusM).toBe(M.R_MARS);
    expect(PROFILE.mercatorCircumferenceM).toBe(2 * Math.PI * M.R_MARS);
    expect(PROFILE.scaleBarCircumferenceM).toBe(2 * Math.PI * M.R_MARS);
  });
  it("shared modules carry no Earth radius literal (the radii are in the body profiles)", () => {
    const src = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === "bodies" ? [] : src(path.join(d, e.name))) : e.name.endsWith(".ts") ? [path.join(d, e.name)] : []);
    for (const f of src(path.join(APP, "src"))) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/6371008\.8|6378137|40075016/);
  });
  it("body contract: both bodies provide the same @body modules with the same exports", () => {
    const dir = (b: string) => path.join(APP, "src/bodies", b);
    const mods = (b: string) => fs.readdirSync(dir(b)).filter((f) => f.endsWith(".ts")).sort();
    const shared = mods("earth").filter((f) => mods("mars").includes(f));
    // every module that shared code imports through @body must exist for both bodies
    const used = new Set<string>();
    const walk = (d: string): void => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== "bodies") walk(p); } else if (/\.ts$/.test(e.name)) for (const m of fs.readFileSync(p, "utf8").matchAll(/from "@body\/([A-Za-z]+)"/g)) used.add(`${m[1]}.ts`); } };
    walk(path.join(APP, "src"));
    for (const m of used) expect(shared, m).toContain(m);
    const names = (f: string) => new Set([...fs.readFileSync(f, "utf8").matchAll(/^export (?:const|function|class|let|interface|type|async function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]));
    for (const m of used) {
      const e = names(path.join(dir("earth"), m)), ma = names(path.join(dir("mars"), m));
      // the names shared code imports from @body/<m> exist in both
      const imported = new Set<string>();
      const walk2 = (d: string): void => { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory()) { if (x.name !== "bodies") walk2(p); } else if (/\.ts$/.test(x.name)) for (const mm of fs.readFileSync(p, "utf8").matchAll(new RegExp(`import (?:type )?\\{([^}]*)\\} from "@body/${m.replace(".ts", "")}"`, "g"))) for (const n of mm[1].split(",")) { const k = n.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]; if (k) imported.add(k); } } };
      walk2(path.join(APP, "src"));
      for (const n of imported) { expect(e.has(n), `earth/${m} exports ${n}`).toBe(true); expect(ma.has(n), `mars/${m} exports ${n}`).toBe(true); }
    }
  });
});
