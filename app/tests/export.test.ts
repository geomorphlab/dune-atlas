// Per-cell downloads: NetCDF-3 writer (parsed back by a minimal reader here; scripts/check-netcdf.py
// reads real files with xarray), store-only zip writer, CSV / metadata builders.
import { analyseCell } from "../src/core/cell/analysis";
import { describe, expect, it } from "vitest";
import { writeNetcdf3 } from "../src/core/cell/netcdf3";
import { crc32, deflateRawAvailable, writeZip } from "../src/core/cell/zip";
import zlib from "node:zlib";
import katex from "katex";
import { CSV_NAMES, CSV_NAME_RE, csvName } from "../src/core/cell/csvnames";
import { cellNetcdf, csvBundle, csvColumns, exportBaseName, fieldMeta, fieldsByThresholdCsv, fluxRoseCsv, fluxRoseTable, fmtF32, metadataJson, readmeText, versionFromPrefix, windHistogramCsv, cfUnits } from "../src/core/cell/export";
import { citationSources, citationText, referencesLine } from "../src/core/cell/citation";
import { CITATION_SOURCES } from "../src/core/cell/citation";
import { citationFile } from "../src/core/cell/downloads";
import { fluxRose, crestFluxRose } from "../src/core/cell/flux";
import { fieldValue } from "../src/core/cell/cellstore";
import { C } from "../src/core/util/constants";
import { AI_NOTICE } from "../src/core/cell/citation";
import { makeCell, FIELD_VARS } from "./helpers";
import fixture from "./fixtures/flux-parity.json";

import { readNc } from "./ncreader";

describe("NetCDF-3 writer", () => {
  it("writes a CDF-2 file with dims, typed variables and attributes that a reader parses back", () => {
    const b = writeNetcdf3({
      dims: [{ name: "x", size: 3 }, { name: "s", size: 5 }],
      attrs: { title: "tést", n: 2.5, ints: { type: "int", values: [1, -2] } },
      vars: [
        { name: "a", type: "int", dims: ["x"], data: [1, -7, 2147483647] },
        { name: "f", type: "float", dims: ["x"], data: Float32Array.of(0.1, NaN, -3), attrs: { _FillValue: { type: "float", values: NaN }, units: "m2 s-1" } },
        { name: "d", type: "double", dims: ["x"], data: [Math.PI, 1e-300, -0] },
        { name: "sc", type: "double", dims: [], data: [42] },
        { name: "c", type: "char", dims: ["x", "s"], data: ["ab", "", "cdefg"] },
      ],
    });
    const r = readNc(b);
    expect(r.magic).toBe("CDF");
    expect(r.version).toBe(2);
    expect(r.numrecs).toBe(0);
    expect(r.dims).toEqual([{ name: "x", size: 3 }, { name: "s", size: 5 }]);
    expect(r.gatts.title).toBe("tést");
    expect(r.gatts.n).toEqual([2.5]);
    expect(r.gatts.ints).toEqual([1, -2]);
    expect(r.vars.a.data).toEqual([1, -7, 2147483647]);
    const f = r.vars.f.data as number[];
    expect(f[0]).toBe(Math.fround(0.1)); expect(f[1]).toBeNaN(); expect(f[2]).toBe(-3);
    expect(r.vars.d.data).toEqual([Math.PI, 1e-300, -0]);
    expect(r.vars.sc.data).toEqual([42]);
    expect(r.vars.c.data).toBe("ab\0\0\0\0\0\0\0\0cdefg");
    expect(r.vars.f.attrs.units).toBe("m2 s-1");
    expect(r.vars.a.begin).toBe(r.hdrEnd); // data follows the header
    expect(b.length % 4).toBe(0);
    expect(readNc(writeNetcdf3({ dims: [{ name: "x", size: 1 }], vars: [{ name: "a", type: "int", dims: ["x"], data: [5] }] }, 1)).version).toBe(1);
  });
  it("rejects bad shapes and unknown dimensions", () => {
    expect(() => writeNetcdf3({ dims: [{ name: "x", size: 2 }], vars: [{ name: "a", type: "int", dims: ["x"], data: [1] }] })).toThrow(/1 values/);
    expect(() => writeNetcdf3({ dims: [{ name: "x", size: 2 }], vars: [{ name: "a", type: "int", dims: ["y"], data: [1, 2] }] })).toThrow(/unknown dimension/);
  });
});

/** minimal zip reader (local headers): name -> bytes, inflating method 8 with node zlib */
function readZip(z: Uint8Array): Map<string, { method: number; data: Uint8Array; crc: number }> {
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength);
  const out = new Map<string, { method: number; data: Uint8Array; crc: number }>();
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true), crc = dv.getUint32(p + 14, true), csize = dv.getUint32(p + 18, true), usize = dv.getUint32(p + 22, true);
    const nlen = dv.getUint16(p + 26, true), xlen = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(z.subarray(p + 30, p + 30 + nlen));
    const body = z.subarray(p + 30 + nlen + xlen, p + 30 + nlen + xlen + csize);
    const data = method === 8 ? new Uint8Array(zlib.inflateRawSync(body)) : body;
    expect(data.length).toBe(usize);
    out.set(name, { method, data, crc });
    p += 30 + nlen + xlen + csize;
  }
  expect(dv.getUint32(p, true)).toBe(0x02014b50); // central directory follows
  return out;
}

describe("zip writer", () => {
  const text = "hello ".repeat(500);
  it("CRC-32; stored archive (no deflate) with local headers + central directory", async () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const z = await writeZip([{ name: "a.txt", data: "hello" }, { name: "dir/b.csv", data: new Uint8Array([1, 2, 3]) }], new Date(2026, 0, 2, 3, 4, 6), null);
    const dv = new DataView(z.buffer);
    const eocd = z.length - 22;
    expect(dv.getUint32(eocd, true)).toBe(0x06054b50);
    expect(dv.getUint16(eocd + 10, true)).toBe(2);
    const r = readZip(z);
    expect(r.get("a.txt")!.method).toBe(0);
    expect(new TextDecoder().decode(r.get("a.txt")!.data)).toBe("hello");
    expect(r.get("a.txt")!.crc).toBe(crc32(new TextEncoder().encode("hello")));
  });
  it("DEFLATE (CompressionStream deflate-raw) round-trips through zlib.inflateRawSync; falls back to stored", async () => {
    const d = deflateRawAvailable();
    expect(d).toBeDefined(); // Node >= 21 and all current browsers
    const z = await writeZip([{ name: "big.txt", data: text }, { name: "tiny", data: "x" }]);
    const r = readZip(z);
    expect(r.get("big.txt")!.method).toBe(8);
    expect(new TextDecoder().decode(r.get("big.txt")!.data)).toBe(text);
    expect(r.get("big.txt")!.crc).toBe(crc32(new TextEncoder().encode(text)));
    expect(r.get("tiny")!.method).toBe(0); // not smaller -> stored
    expect(z.length).toBeLessThan(text.length / 5);
    // a failing compressor falls back to stored
    const z2 = await writeZip([{ name: "big.txt", data: text }], new Date(), async () => { throw new Error("no"); });
    expect(readZip(z2).get("big.txt")!.method).toBe(0);
    // node zlib as the compressor gives the same content
    const z3 = await writeZip([{ name: "big.txt", data: text }], new Date(), async (b) => new Uint8Array(zlib.deflateRawSync(b)));
    expect(new TextDecoder().decode(readZip(z3).get("big.txt")!.data)).toBe(text);
  });
});

const fx = (fixture as unknown as { cells: { name: string; iy: number; ix: number; lat: number; lon: number; hist_idx: number[]; hist_cnt: number[] }[] }).cells.find((c) => c.name === "dune_max_dp")!;
function cell() {
  const hist = new Uint32Array(128 * 128);
  fx.hist_idx.forEach((k, i) => (hist[k] = fx.hist_cnt[i]));
  // synthetic but plausible fields: angles 0.4 rad, fluxes / fractions 0.3
  const fields = new Float32Array(FIELD_VARS.length * 64).fill(0.3);
  for (const v of ["ab", "ae", "at", "ao", "rdpa"]) fields.fill(0.4, FIELD_VARS.indexOf(v) * 64, FIELD_VARS.indexOf(v) * 64 + 64);
  return makeCell({ iy: fx.iy, ix: fx.ix, lat: fx.lat, lon: fx.lon, hist, fields });
}
const META = { datasetId: "era5-land", datasetTitle: "ERA5-Land 1950–2024 (0.1°)", dataVersion: "v1", permalink: "https://map.geomorphlab.org/?cell=1145,1952", generated: new Date("2026-01-01T00:00:00Z") };

describe("cell exports", () => {
  it("file name, version from the dataset prefix, CF units", () => {
    expect(exportBaseName({ lat: -24.5, lon: 15.2 }, "era5-land")).toBe("dune-atlas_era5-land_-24.5_15.2");
    expect(versionFromPrefix("dune-atlas/v1")).toBe("v1");
    expect(versionFromPrefix("dune-atlas/era5/v2/")).toBe("v2");
    expect(versionFromPrefix(undefined)).toBe("");
    expect([cfUnits("m$^2$/s"), cfUnits("rad"), cfUnits("-"), cfUnits("m/s")]).toEqual(["m2 s-1", "radian", "1", "m s-1"]);
  });
  it("NetCDF content: coords, wind_hist, 23 fields with attrs, flux_rose, global attrs", () => {
    const c = cell();
    const r = readNc(cellNetcdf(c, META));
    expect(Object.fromEntries(r.dims.map((d) => [d.name, d.size]))).toEqual({ um_bin: 128, ua_bin: 128, ut: 64, nv: 2, rose_mode: 3, name_strlen: 16 });
    expect(r.vars.wind_hist.dims).toEqual(["um_bin", "ua_bin"]);
    expect(r.vars.wind_hist.type).toBe(4);
    expect((r.vars.wind_hist.data as number[]).reduce((a, b) => a + b, 0)).toBe(c.totalHours);
    expect(r.vars.wind_hist.attrs.units).toBe("h");
    for (const v of FIELD_VARS) {
      expect(r.vars[v].dims).toEqual(["ut"]);
      expect(r.vars[v].type).toBe(5);
      expect(typeof r.vars[v].attrs.long_name).toBe("string");
      expect(typeof r.vars[v].attrs.long_name_latex).toBe("string");
    }
    // field attributes and global attributes are exactly these (no other annotations)
    for (const v of FIELD_VARS) expect(Object.keys(r.vars[v].attrs).sort()).toEqual(["_FillValue", "coordinates", "description", "description_latex", "long_name", "long_name_latex", "units"]);
    expect(Object.keys(r.gatts).sort()).toEqual(["Conventions", "comment", "data_notice", "data_version", "dataset_id", "dataset_title", "date_created", "fields_citation", "fields_license", "geospatial_lat_max", "geospatial_lat_min", "geospatial_lat_resolution", "geospatial_lon_max", "geospatial_lon_min", "geospatial_lon_resolution", "history", "institution", "license", "references", "source", "time_coverage_end", "time_coverage_resolution", "time_coverage_start", "title"]);
    expect(r.gatts.time_coverage_start).toBe("1950-01-01T00:00:00Z");
    expect(String(r.gatts.license)).toMatch(/^Sand-flux fields and wind data: CC BY 4\.0.*DATA_LICENSE\.md$/);
    expect(r.vars.dune_present.attrs.license).toMatch(/^MIT/);
    expect(r.vars.lat_bnds.dims).toEqual(["nv"]);
    expect(r.gatts.fields_citation).toMatch(/^Gunn, A\. \(2026\)\. The distribution of Earth's wind-blown sand dunes\. Nature Communications\. doi:10\.1038\/s41467-026-75466-y; .*winds: /);
    expect(String(r.vars.qha_rdp_dp.attrs.description)).toMatch(/^Directional variability of sand flux: ratio of resultant to total drift potential/);
    expect(r.vars.dpm.attrs.units).toBe("m2 s-1");
    expect(r.vars.flux_rose.dims).toEqual(["rose_mode", "ut", "ua_bin"]);
    expect(r.vars.flux_rose.attrs.units).toBe("m2 yr-1");
    expect(r.vars.rose_mode.attrs.flag_meanings).toBe("flat_bed elongation transverse");
    expect(r.gatts.Conventions).toBe("CF-1.8");
    expect(String(r.gatts.license)).toMatch(/^Sand-flux fields and wind data: CC BY 4\.0 /);
    expect(r.gatts.institution).toBe("Geomorphology Lab, Monash University");
    expect(r.gatts.comment).toBe(AI_NOTICE);
    expect(r.gatts.references).toMatch(/10\.1038\/s41467-026-75466-y.*10\.5281\/zenodo\.20046812.*10\.24381\/cds\.e2161bac.*Copernicus/);
    expect(r.gatts.history).toBe("2026-01-01T00:00:00.000Z: downloaded from https://map.geomorphlab.org/?cell=1145,1952");
    expect(r.gatts.data_version).toBe("v1");
    expect(r.vars.ua_bin_bearing_from.attrs.units).toBe("degree");
    expect(r.vars.cell_y.attrs.grid_registration).toMatch(/^centre: /);
  });
  it("flux_rose table = the panel's functions; crest rows NaN where the defining flux is 0", () => {
    const c = cell();
    const set = (v: string, k: number, val: number) => { c.fields[FIELD_VARS.indexOf(v) * 64 + k] = val; };
    set("qace", 20, 0); set("qacb", 30, 0);
    const t = fluxRoseTable(c);
    expect(t.length).toBe(3);
    for (const k of [0, 14, 40]) {
      const ref = fluxRose(c.hist, C.UT_VALUES[k]);
      t[0][k].forEach((x, j) => expect(x).toBeCloseTo(ref[j] * C.S2Y, 12));
      const ae = fieldValue(c, "ae", k);
      const cr = crestFluxRose(c.hist, C.UT_VALUES[k], ae);
      t[1][k].forEach((x, j) => expect(x).toBeCloseTo(cr[j] * C.S2Y, 12));
    }
    expect(Array.from(t[1][20]).every(Number.isNaN)).toBe(true);
    expect(Array.from(t[2][30]).every(Number.isNaN)).toBe(true);
    expect(Array.from(t[0][20]).some(Number.isNaN)).toBe(false);
    const csv = fluxRoseCsv(c).trimEnd().split("\n");
    expect(csv.length).toBe(1 + 3 * 64 * 128);
    expect(csv[0]).toBe("\ufeffrose_mode,ustar_threshold,direction_bin_centre,direction_bin_lower,direction_bin_upper,bearing_toward,bearing_from,flux");
    const row = (mode: number, k: number, j: number) => csv[1 + (mode * 64 + k) * 128 + j].split(",");
    expect(row(0, 0, 0).slice(0, 2)).toEqual(["flat_bed", "0.01"]);
    expect(row(0, 14, 0)[1]).toBe("0.15");
    expect(row(1, 20, 5)[7]).toBe(""); // masked elongation row
    expect(Math.fround(Number(row(0, 14, 7)[7]))).toBe(Math.fround(t[0][14][7]));
  });
  it("CSV bundle: UTF-8 BOM + one ASCII snake_case header row, tidy long tables with identical direction columns, ut to 2 d.p., deflated zip", async () => {
    const c = cell();
    const wh = windHistogramCsv(c).trimEnd().split("\n");
    expect(wh[0]).toBe("\ufeffwind_speed_bin_centre,wind_speed_bin_lower,wind_speed_bin_upper,direction_bin_centre,direction_bin_lower,direction_bin_upper,bearing_toward,bearing_from,hours");
    expect(wh.length).toBe(1 + 128 * 128);
    const rows = wh.slice(1).map((l) => l.split(","));
    expect(rows.reduce((a, r) => a + Number(r[8]), 0)).toBe(c.totalHours);
    expect(rows[0].slice(0, 3)).toEqual(["0.078125", "0", "0.15625"]);
    expect(rows[0].slice(6, 8)).toEqual(["268.59375", "88.59375"]);
    // the direction columns are textually identical in both long tables (same order)
    const fr = fluxRoseCsv(c).trimEnd().split("\n").slice(1).map((l) => l.split(","));
    for (let j = 0; j < 128; j++) expect(fr[j].slice(2, 7)).toEqual(rows[j].slice(3, 8));
    const fb = fieldsByThresholdCsv(c).trimEnd().split("\n");
    expect(fb[0]).toBe("\ufeff" + ["ustar_threshold", ...FIELD_VARS.map(csvName)].join(","));
    expect(fb.length).toBe(1 + 64);
    expect(fb.slice(1).map((l) => l.split(",")[0])).toEqual(C.UT_VALUES.map((u) => u.toFixed(2)));
    expect(fb[1].split(",")[1]).toBe(fmtF32(0.4));
    // every header: plain ASCII snake_case, unique, from the explicit map (no fallback); BOM first
    for (const [f, cols] of Object.entries(csvColumns(c))) {
      const names = cols.map((x) => csvName(x.name));
      for (const x of cols) expect(CSV_NAMES[x.name], `${f}: ${x.name}`).toBeDefined();
      for (const n of names) expect(n).toMatch(CSV_NAME_RE);
      expect(new Set(names).size, f).toBe(names.length);
    }
    for (const l of [wh[0], fb[0]]) { expect(l.startsWith("\ufeff")).toBe(true); expect(l.slice(1)).toMatch(/^[a-z0-9_,]+$/); }
    expect(csvName("sige_sigh")).toBe("sigma_e_over_sigma_h");
    expect(csvName("ufm")).toBe("ustar_mean_above_threshold_over_ustar_th");
    const md = JSON.parse(metadataJson(c, META));
    expect(Object.keys(md.fields.dpm).sort()).toEqual(["description", "description_latex", "long_name", "long_name_latex", "units"]);
    expect(Object.keys(md).sort()).toEqual(["ai_notice", "aux", "cell", "citation", "conventions", "data_notice", "dataset", "dune_present_license", "fields", "fields_citation", "fields_license", "files", "generated", "grid", "institution", "license", "permalink", "ut"]);
    expect(md.ut[14]).toBe(0.15);
    expect(md.files["flux_rose.csv"].columns.map((x: { name: string }) => x.name)).toEqual(csvColumns(c)["flux_rose.csv"].map((x) => csvName(x.name)));
    expect(md.files["fields_by_threshold.csv"].columns.find((x: { netcdf_name: string }) => x.netcdf_name === "sige_sigh")).toEqual({ name: "sigma_e_over_sigma_h", netcdf_name: "sige_sigh", units: "1", long_name: "Stability of elongating dunes on starved beds σ_E/σ_H" });
    expect(md.citation.map((x: { source: string }) => x.source)).toEqual(["Dune Atlas / dune map", "ERA5-Land", "Global Aridity Index (Global-AI_PET v3.1)", "Vegetation cover (CSIRO MODIS Fractional Cover v3.1)"]);
    const rd = readmeText(c, META);
    expect(rd).toContain(AI_NOTICE);
    expect(rd).toContain("pd.read_csv(f)");
    expect(rd).toContain('read.csv(f, fileEncoding = "UTF-8-BOM")');
    expect(rd).toMatch(/sigma_e_over_sigma_h\s+\[1\] Stability of elongating dunes on starved beds σ_E\/σ_H \(NetCDF: sige_sigh\)/);
    const z = readZip(await csvBundle(c, META));
    expect([...z.keys()]).toEqual(["README.txt", "wind_histogram.csv", "fields_by_threshold.csv", "flux_rose.csv", "rose_16_sectors.csv", "metadata.json"]);
    // rose_16_sectors.csv: 16 compass sectors in degrees at the panel's threshold; matches the panel roses
    const r16 = new TextDecoder().decode(z.get("rose_16_sectors.csv")!.data).replace(/^\uFEFF/, "").trim().split("\n").map((l) => l.split(","));
    expect(r16[0]).toEqual(["ustar_threshold", "sector", "sector_centre_bearing", "sector_start_bearing", "sector_end_bearing", "wind_from_percent", "sand_flux_toward", "sand_flux_toward_percent"]);
    expect(r16.length).toBe(17);
    expect(r16.slice(1).map((r) => r[1])).toEqual(["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]);
    expect(r16[1].slice(2, 5)).toEqual(["0", "348.75", "11.25"]);
    const kk = (META as { utIndex?: number }).utIndex ?? 14, vv = analyseCell(c, kk, { windSectors: 16, fluxSectors: 16, fluxMode: "flat" });
    expect(r16.every((r, i) => i === 0 || r[0] === vv.ut.toFixed(2))).toBe(true);
    expect(r16.slice(1).reduce((a, r) => a + Number(r[7]), 0)).toBeCloseTo(vv.fluxSectors.some((x) => x > 0) ? 100 : 0, 2);
    r16.slice(1).forEach((r, i) => expect(Number(r[6])).toBeCloseTo(vv.fluxSectors[i], 3));
    expect(new TextDecoder().decode(z.get("README.txt")!.data)).toMatch(/rose_16_sectors\.csv  The panel's wind rose and flat-bed sand flux rose in 16 compass sectors/);
    expect(z.get("flux_rose.csv")!.method).toBe(8);
    const whBytes = z.get("wind_histogram.csv")!.data;
    expect(Array.from(whBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);             // UTF-8 BOM in the file
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(whBytes)).toBe(windHistogramCsv(c));
  });
  it("citations grouped by source (Paper / Data); aridity only in cell downloads", () => {
    const c0 = cell();
    const t = citationText();
    expect(t.indexOf("Dune Atlas / dune map")).toBeLessThan(t.indexOf("ERA5-Land"));
    expect(t).toMatch(/Dune Atlas \/ dune map\n  Paper: .*10\.1038\/s41467-026-75466-y\n  Data \(wind histograms and sand-flux fields\): Gunn, A\. \(2026\)\. The distribution of Earth's wind-blown sand dunes - Supplementary Data\. Zenodo\. https:\/\/doi\.org\/10\.5281\/zenodo\.20046812 \(CC BY 4\.0\)\n  Data \(dune map: dune-mask-rev1\.tif, contained in the Supplementary Code record\): Gunn, A\. \(2026\)\. geomorphlab\/dune-world: The distribution of Earth's wind-blown sand dunes - Supplementary Code \(v1\.0\.0\)\. Zenodo\. https:\/\/doi\.org\/10\.5281\/zenodo\.20054674 \(MIT\)\n/);
    expect(t).not.toMatch(/Dune map and code|Data for '/);
    expect(t).toMatch(/ERA5-Land\n  Paper: Muñoz-Sabater.*essd-13-4349-2021\n  Data: .*10\.24381\/cds\.e2161bac \(CC BY 4\.0\)\n  Contains modified Copernicus/);
    expect(t).not.toContain("figshare");
    expect(citationSources(["aridity"]).map((s) => s.id)).toEqual(["dune-atlas", "era5-land", "aridity"]);
    expect(CITATION_SOURCES.aridity.entries.map((e) => e.doi)).toEqual(["10.1038/s41597-022-01493-1", "10.6084/m9.figshare.7504448.v7"]);
    expect(CITATION_SOURCES.aridity.entries[0].text).toMatch(/Zomer, R\. J\., Xu, J\. & Trabucco, A\. \(2022\)\..*Scientific Data 9, 409/);
    expect(CITATION_SOURCES.aridity.entries[1].license).toBe("CC BY 4.0");
    // cell downloads cite the aridity source
    expect(citationFile(c0)).toMatch(/Global Aridity Index \(Global-AI_PET v3\.1\)\n  Paper: Zomer/);
    expect(readNc(cellNetcdf(c0, META)).gatts.references).toMatch(/\| Global Aridity Index \(Global-AI_PET v3\.1\): Paper: Zomer.*figshare\.7504448\.v7/);
    const r = referencesLine();
    expect(r).toMatch(/^Dune Atlas \/ dune map: Paper: .* \| ERA5-Land: Paper: /);
  });
});

describe("attribute audit (NetCDF / metadata.json / README strings)", () => {
  const c = cell();
  const r = readNc(cellNetcdf(c, META));
  const UDUNITS_OK = new Set(["1", "percent", "m s-1", "m2 s-1", "m2 yr-1", "radian", "degree", "degrees_north", "degrees_east", "h"]);
  const balanced = (t: string) => { let d = 0; for (const ch of t.replace(/\\[{}]/g, "")) { if (ch === "{") d++; else if (ch === "}" && --d < 0) return false; } return d === 0; };
  const latexOk = (t: string) => {
    expect(t, t).not.toMatch(/\\\\/); // no doubled backslashes (escaping artefacts)
    expect(balanced(t), t).toBe(true);
    const parts = t.split("$");
    expect(parts.length % 2, `unbalanced $ in ${t}`).toBe(1);
    parts.forEach((seg, k) => {
      if (k % 2 === 1) expect(() => katex.renderToString(seg, { throwOnError: true }), seg).not.toThrow();
      else expect(seg, t).not.toMatch(/\\[a-zA-Z]/); // no TeX commands outside math
    });
  };
  const plainOk = (t: string) => { expect(t, t).not.toMatch(/[\\$]/); expect(t, t).not.toMatch(/[{}]/); };
  it("every *_latex attribute renders with KaTeX (throwOnError) and is well formed", () => {
    let n = 0;
    for (const [name, v] of Object.entries(r.vars)) for (const [k, a] of Object.entries(v.attrs)) if (k.endsWith("_latex")) { latexOk(a as string); n++; void name; }
    expect(n).toBeGreaterThanOrEqual(2 * 23 + 1);
  });
  it("plain attributes (long_name, description, comment, units, ...) have no LaTeX", () => {
    for (const v of Object.values(r.vars)) for (const [k, a] of Object.entries(v.attrs)) if (typeof a === "string" && !k.endsWith("_latex")) plainOk(a);
    for (const [k, a] of Object.entries(r.gatts)) if (typeof a === "string") expect(a, k).not.toMatch(/\$|\\[a-zA-Z]/);
  });
  it("units are valid UDUNITS strings", () => {
    for (const [name, v] of Object.entries(r.vars)) if ("units" in v.attrs) expect(UDUNITS_OK.has(v.attrs.units as string), `${name}: ${v.attrs.units}`).toBe(true);
    for (const cols of Object.values(csvColumns(c))) for (const col of cols) expect(UDUNITS_OK.has(col.units), col.name).toBe(true);
  });
  it("metadata.json and README use the same plain / LaTeX strings", () => {
    const md = JSON.parse(metadataJson(c, META));
    for (const v of FIELD_VARS) {
      const m = fieldMeta(v);
      expect(md.fields[v].long_name).toBe(m.longName);
      expect(md.fields[v].long_name).toBe(r.vars[v].attrs.long_name);
      expect(md.fields[v].long_name_latex).toBe(r.vars[v].attrs.long_name_latex);
      plainOk(md.fields[v].long_name); plainOk(md.fields[v].description);
      latexOk(md.fields[v].long_name_latex); latexOk(md.fields[v].description_latex);
    }
    for (const cols of Object.values(md.files) as { columns: { long_name: string }[] }[]) for (const col of cols.columns) plainOk(col.long_name);
    expect(readmeText(c, META)).not.toMatch(/\$|\\[a-zA-Z]/);
    expect(fieldMeta("ao").description).not.toMatch(/signed signed/);
    expect(fieldMeta("qhef").longName).toBe("Fraction of elongation-mode flux while flat bed above threshold"); // the layer name
  });
});

