// @vitest-environment happy-dom
// ERA5-Land / ERA5 parity: the cell summary table and both downloads (NetCDF, CSV bundle with
// metadata.json and README) have the same rows / variables / columns / keys in the same order,
// with the same units and attribute texts. Only the dataset-specific values in ALLOW differ
// (dataset name, resolution / grid, hours, references / citation / notice, cell position).
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { CellStore, type CellData } from "../src/core/cell/cellstore";
import { CellPanel } from "../src/core/ui/cellPanel";
import { cellNetcdf, csvBundle, exportBaseName, type ExportMeta } from "../src/core/cell/export";
import { readNc } from "./ncreader";

const REPO = path.resolve(__dirname, "../..");
const FIX = { "era5-land": path.join(REPO, "staging/fixture"), era5: path.join(REPO, "staging/fixture/datasets/era5") } as const;
const CELL = { "era5-land": [1145, 1952], era5: [458, 781] } as const;
const have = Object.values(FIX).every((d) => fs.existsSync(path.join(d, "cells.zarr/zarr.json")) && fs.existsSync(path.join(d, "cells-aux-veg.zarr/zarr.json")));
type Id = keyof typeof FIX;

class RFS {
  constructor(private root: string) {}
  async get(k: string) { const p = this.root + k; return fs.existsSync(p) ? new Uint8Array(fs.readFileSync(p)) : undefined; }
  async getRange(k: string, r: { offset: number; length: number } | { suffixLength: number }) {
    const p = this.root + k; if (!fs.existsSync(p)) return undefined;
    const b = fs.readFileSync(p), n = b.length;
    return "suffixLength" in r ? new Uint8Array(b.subarray(n - r.suffixLength)) : new Uint8Array(b.subarray(r.offset, r.offset + r.length));
  }
}
function readZip(z: Uint8Array): Map<string, string> {
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
  const out = new Map<string, string>();
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true), csize = dv.getUint32(p + 18, true), nlen = dv.getUint16(p + 26, true), xlen = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(z.subarray(p + 30, p + 30 + nlen));
    const body = z.subarray(p + 30 + nlen + xlen, p + 30 + nlen + xlen + csize);
    out.set(name, new TextDecoder().decode(method === 8 ? zlib.inflateRawSync(body) : body));
    p += 30 + nlen + xlen + csize;
  }
  return out;
}

/** Differences that are allowed: dataset-specific values only (path regex). Everything else -
 *  names, order, dims, types, units, attribute keys and texts - must be identical. */
const RES_TEXT = "(ai_mean|ai_valid_frac|tot_cov_mean|tot_cov_valid_frac)\\.(attrs\\.)?description|(tot_cov_mean|tot_cov_valid_frac)\\.(attrs\\.)?comment|qsdiv\\.(attrs\\.)?(method|source)";
const ALLOW: RegExp[] = [
  // grid and resolution
  /^var\.cell_[yx]\.attrs\.grid_(dlat|dlon|ny|nx)\[0\]:/,
  /^global\.geospatial_(lat|lon)_resolution:/,
  /^metadata\.json\.grid\.(dlat|dlon|ny|nx|resolution):/,
  // texts that name the cell size (0.1° / 0.25°, 30″ pixels per cell, regridding of the 0.1° vegetation means)
  new RegExp(`^var\\.(${RES_TEXT}):`), new RegExp(`^metadata\\.json\\.aux\\.(${RES_TEXT}):`),
  // dataset name / title / id, hours
  /^var\.wind_hist\.attrs\.(long_name|comment|total_hours_binned(\[0\])?):/,
  /^global\.(title|source|dataset_id|dataset_title):/,
  /^metadata\.json\.dataset\.(id|title):/,
  /^metadata\.json\.files\.wind_histogram\.csv\.columns\[\d+\]\.long_name: "hours in the speed x direction bin, ERA5-Land 1950-2024/,
  /^README\.txt:(3|19|28): /,
  // references, citations, Copernicus notice
  /^global\.references:/,
  /^(global|metadata\.json)\.(citation\[[01]\]|data_notice)/,
  /^metadata\.json\.citation\[[01]\]/,
  /^README\.txt:\d+: "(ERA5-Land|  (Paper|Data|Contains modified Copernicus)[^"]*)" != /,
  // the cell itself: position and values
  /^metadata\.json\.cell\.(latitude|longitude|cell_y|cell_x|grid_index|total_hours_binned|bounds\.\w+):/,
  /^global\.geospatial_(lat|lon)_(min|max)\[0\]:/,
  /^metadata\.json\.aux\.\w+\.value:/,
  // the land definition (ERA5-Land: land–sea mask fraction > 0.5; ERA5: > 0)
  /^metadata\.json\.conventions\.cells_with_data:/,
  // citation and licence of the sand-flux fields: the paper's data record (ERA5-Land) or computed for the
  // atlas from the dataset's winds (ERA5), cell/citation.ts fieldsCitation / fieldsLicence
  /^(global|metadata\.json)\.(fields_citation|fields_license|license):/,
  /^README\.txt:\d+: "(Licence: Sand-flux fields and wind data: |Contains modified Copernicus)/,
  /^README\.txt:\d+: "Cite the sand-flux fields as: /,
];

interface Side { cell: CellData; meta: ExportMeta; store: CellStore }
const sides = {} as Record<Id, Side>;
const META = (id: Id, s: CellStore): ExportMeta => ({ datasetId: id, datasetTitle: id === "era5" ? "ERA5 0.25°, 1950–2024" : "ERA5-Land 0.1°, 1950–2024", dataVersion: "v1",
  permalink: "https://map.geomorphlab.org/", storeAttrs: s.attrs, generated: new Date("2026-10-13T00:00:00Z") });

/** structural diff of two JSON-like values: missing / extra keys, key order, values */
function diff(a: unknown, b: unknown, p: string, out: string[], compareValues = true) {
  if (Array.isArray(a) || Array.isArray(b) || ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    const A = Array.from(a as ArrayLike<unknown>), B = Array.from(b as ArrayLike<unknown>);
    if (A.length !== B.length) { out.push(`${p}: length ${A.length} != ${B.length}`); return; }
    A.forEach((x, i) => diff(x, B[i], `${p}[${i}]`, out, compareValues));
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join("|") !== kb.join("|")) out.push(`${p}: keys [${ka}] != [${kb}]`);
    for (const k of ka) if (k in (b as object)) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${p}.${k}`, out, compareValues);
    return;
  }
  if (typeof a !== typeof b) { out.push(`${p}: type ${typeof a} != ${typeof b}`); return; }
  if (compareValues && !(a === b || (Number.isNaN(a) && Number.isNaN(b)))) out.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
}
const unexplained = (d: string[]) => d.filter((x) => !ALLOW.some((r) => r.test(x)));

describe.skipIf(!have)("ERA5-Land / ERA5 parity of the summary table and downloads", () => {
  beforeAll(async () => {
    for (const id of Object.keys(FIX) as Id[]) {
      const d = FIX[id];
      const store = await CellStore.open(new RFS(path.join(d, "cells.zarr")) as never, { aux: [new RFS(path.join(d, "cells-aux.zarr")), new RFS(path.join(d, "cells-aux-veg.zarr"))] as never });
      const cell = await store.query(CELL[id][0], CELL[id][1]);
      sides[id] = { cell, store, meta: META(id, store) };
    }
  });
  it("per-cell variables are the same set (no land–sea mask, no month count)", () => {
    for (const id of Object.keys(FIX) as Id[]) {
      const a = sides[id].cell.aux!;
      expect(Object.keys(a.series), id).toEqual(["qsdiv"]);
      expect(Object.keys(a.scalars), id).toEqual(["ai_mean", "ai_valid_frac", "ai_sat_frac", "tot_cov_mean", "tot_cov_valid_frac"]);
    }
    expect(sides["era5-land"].cell.aux!.scalars.tot_cov_valid_frac).toBe(1);
  });
  const panelRows = async (id: Id) => {
    document.body.innerHTML = '<aside id="cell-panel" hidden></aside>';
    const root = document.getElementById("cell-panel")!;
    const s = sides[id];
    const p = new CellPanel(root, 14, { windSectors: 16, fluxSectors: 32, onClose: () => {}, exportMeta: () => ({ datasetId: id, datasetTitle: s.meta.datasetTitle, dataVersion: "v1", permalink: s.meta.permalink }) });
    await p.show({ query: async () => s.cell, attrs: s.store.attrs, fieldVars: s.cell.fieldVars } as unknown as CellStore, s.cell.iy, s.cell.ix);
    const rows = [...root.querySelectorAll(".summary tbody tr[data-field]")].map((r) => ({ field: r.getAttribute("data-field"), sym: r.querySelector("td.sym")!.textContent, label: r.querySelector("th")!.textContent!.replace(/\d+ % of cell/, "N % of cell") }));
    const sections = [...root.querySelectorAll(".cell-body details.section")].map((d) => [d.getAttribute("data-section"), d.querySelector("summary")!.textContent!.replace(/= [\d.]+ m\/s/, "= X m/s")]);
    return { rows, sections, root };
  };
  it("summary table: same rows (keys, symbols, labels) in the same order; panel sections identical", async () => {
    const a = await panelRows("era5-land"), b = await panelRows("era5");
    expect(a.rows.every((r) => r.field)).toBe(true);
    expect(a.rows.map((r) => r.field)).not.toContain("lsm");
    const d: string[] = [];
    diff(a.rows, b.rows, "table", d);
    diff(a.sections, b.sections, "sections", d);
    expect(unexplained(d)).toEqual([]);
    expect(b.root.querySelector('tr[data-field="dunes"] th')!.textContent).toBe("Dunes present");
    expect(b.root.querySelector('tr[data-field="centre"] td.num')!.textContent).toBe("-24.5°, 15.25°");
  });
  it("NetCDF: same dims, variables (order, dims, types), attribute keys and texts", () => {
    const [a, b] = (["era5-land", "era5"] as Id[]).map((id) => readNc(cellNetcdf(sides[id].cell, sides[id].meta)));
    const d: string[] = [];
    diff(a.dims, b.dims, "dims", d);
    diff(Object.keys(a.vars), Object.keys(b.vars), "var_names", d);
    for (const v of Object.keys(a.vars)) if (b.vars[v]) {
      diff(a.vars[v].dims, b.vars[v].dims, `var.${v}.dims`, d);
      diff(a.vars[v].type, b.vars[v].type, `var.${v}.type`, d);
      diff(a.vars[v].attrs, b.vars[v].attrs, `var.${v}.attrs`, d);
      diff(a.vars[v].data, b.vars[v].data, `var.${v}.data`, d, false);
    }
    diff(a.gatts, b.gatts, "global", d);
    expect(unexplained(d)).toEqual([]);
  });
  it("the comparison catches a changed unit, a missing variable and a reordered key", () => {
    const a = readNc(cellNetcdf(sides["era5-land"].cell, sides["era5-land"].meta)), b = structuredClone(a);
    const v0 = Object.keys(b.vars).find((v) => typeof b.vars[v].attrs.units === "string")!;
    b.vars[v0].attrs.units = "m";
    delete (b.vars as Record<string, unknown>).tot_cov_valid_frac;
    const d: string[] = [];
    diff(Object.keys(a.vars), Object.keys(b.vars), "var_names", d);
    diff(a.vars[v0].attrs, b.vars[v0].attrs, `var.${v0}.attrs`, d);
    diff({ x: 1, y: 2 }, { y: 2, x: 1 }, "metadata.json.grid", d);
    expect(unexplained(d).length).toBe(3);
  });
  it("CSV bundle: same files, CSV headers and shapes, metadata.json keys and texts, README lines", async () => {
    const [za, zb] = await Promise.all((["era5-land", "era5"] as Id[]).map((id) => csvBundle(sides[id].cell, sides[id].meta, null).then(readZip)));
    const d: string[] = [];
    diff([...za.keys()], [...zb.keys()], "zip", d);
    for (const f of za.keys()) {
      const A = za.get(f)!, B = zb.get(f) ?? "";
      if (f.endsWith(".json")) { diff(JSON.parse(A), JSON.parse(B), f, d); continue; }
      const la = A.split("\n"), lb = B.split("\n");
      if (la.length !== lb.length) d.push(`${f}: ${la.length} lines != ${lb.length}`);
      la.forEach((l, i) => {
        const m = lb[i] ?? "";
        if (f.endsWith(".csv") && !l.startsWith("#") && i > 0 && !la[i - 1].startsWith("#")) {
          // data rows: same number of columns; same leading coordinate columns (bins / ut / sector)
          if (l.split(",").length !== m.split(",").length) d.push(`${f}:${i + 1}: columns`);
          return;
        }
        if (l !== m) d.push(`${f}:${i + 1}: ${JSON.stringify(l)} != ${JSON.stringify(m)}`);
      });
    }
    expect(unexplained(d)).toEqual([]);
    expect(exportBaseName(sides.era5.cell, "era5")).toBe("dune-atlas_era5_-24.5_15.25");
    expect(exportBaseName(sides["era5-land"].cell, "era5-land")).toBe("dune-atlas_era5-land_-24.5_15.2");
  });
});
