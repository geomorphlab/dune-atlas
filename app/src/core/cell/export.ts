// Per-cell downloads: NetCDF-3 (CF-1.8 style) and a CSV bundle (.zip). Pure builders (tested
// in node; scripts/check-netcdf.py reads the NetCDF back with xarray); the panel only triggers
// the download.
import { csvName, UTF8_BOM } from "./csvnames";
import { C, isPublishedField } from "../util/constants";
import { mathToBearingDeg } from "../util/angles";
import { texToPlain } from "../util/plaintext";
import { fieldValue, nUt, type CellData, type CellStoreAttrs } from "./cellstore";
import { crestFluxRose, fluxRose, DEFAULT_BINS } from "./flux";
import { analyseCell, modeDefined } from "./analysis";
import { compassPoint } from "../util/angles";
import { latLonText } from "./downloads";
import { fieldInfo } from "./fieldinfo";
import { citationJson, fileAiNotice, citationSources, citationText, datasetNotice, fieldsCitation, fieldsLicence, referencesLine } from "./citation";
import { CELL_SOURCE_IDS, DUNE_FLAG_LICENCE, DUNE_FLAG_LONG_NAME } from "@body/citation";
import { AUX_META, auxDescription, auxSourceAttrs, auxVars } from "./auxinfo";
import { DATASET_INFO, datasetInfo, resolutionText, type DatasetInfo } from "./datasetinfo";
import { cellEdges, colLon, GRID_INDEX_COMMENT, GRID_REGISTRATION, latBounds, licenceStatement, noticeAttrs, rowLat, timeCoverage } from "./exportmeta";
import { PROFILE } from "@body/profile";
import { BODY } from "../body";
/** the atlas in titles and README headings: "Dune Atlas" (Earth) / "Mars Dune Atlas" */
export const ATLAS_NAME = BODY === "mars" ? "Mars Dune Atlas" : "Dune Atlas";
/** public address of this atlas, as named in downloads */
export const ATLAS_SITE = BODY === "mars" ? "map.geomorphlab.org/mars" : "map.geomorphlab.org";
/** AI-assistance notice written into every download of this atlas (the website that produced the file) */
export const FILE_AI_NOTICE = fileAiNotice(ATLAS_NAME, ATLAS_SITE);

/** The wind dataset of a cell: from the export metadata id, else from the cell grid spacing. */
export function cellDataset(cell: Pick<CellData, "grid">, datasetId?: string): DatasetInfo {
  if (datasetId && DATASET_INFO[datasetId]) return DATASET_INFO[datasetId];
  const d = Math.abs(cell.grid?.dlat ?? 0.1);
  return Object.values(DATASET_INFO).find((x) => Math.abs(x.resDeg - d) < 1e-9) ?? datasetInfo();
}
const cellDeg = (cell: Pick<CellData, "grid">, ds: DatasetInfo) => Math.abs(cell.grid?.dlat ?? ds.resDeg);
/** global \`source\` of a download: how the data were produced (the dataset title is in dataset_title) */
export const sourceText = (ds: Pick<DatasetInfo, "name" | "resolution" | "period">) =>
  `${ATLAS_NAME} cell store of the ${ds.name} ${ds.resolution} wind dataset (${ds.period}); sand-flux fields as cited in fields_citation`;
import { writeNetcdf3, type NcAttrs, type NcVariable } from "./netcdf3";
import { writeZip, type DeflateRaw } from "./zip";

export interface ExportMeta {
  /** dataset id (e.g. era5-land) and title (e.g. ERA5-Land 1950–2024 (0.1°)) */
  datasetId: string;
  datasetTitle: string;
  /** data version, e.g. v1 (from the dataset prefix dune-atlas/v1) */
  dataVersion: string;
  /** permalink of the cell in the app */
  permalink: string;
  generated?: Date;
  /** cell store root attrs (long names, units) */
  storeAttrs?: Partial<CellStoreAttrs> & { field_descriptions?: Record<string, string> };
  /** slider position of the panel (rose_16_sectors.csv is at this threshold / grain size; default: the default) */
  utIndex?: number;
}

/** rose_16_sectors.csv: the wind and sand-flux roses of the panel in 16 compass sectors, degrees,
 *  at the panel's threshold (Earth) or grain size (Mars); both builds. */
export const ROSE16_FILE = "rose_16_sectors.csv";
export const ROSE16_NOT_IN_NETCDF = "not in the NetCDF (from the wind histogram or series and flux_rose at the panel setting)";
export const rose16Columns = (axis: CsvColumn, samples = "hours"): CsvColumn[] => [
  axis,
  { name: "sector", units: "1", longName: "compass sector (16 sectors of 22.5 degrees, centred on N, NNE, NE, ...)" },
  { name: "sector_centre_bearing", units: "degree", longName: "bearing of the sector centre, clockwise from north" },
  { name: "sector_start_bearing", units: "degree", longName: "bearing of the sector's first edge (centre - 11.25)" },
  { name: "sector_end_bearing", units: "degree", longName: "bearing of the sector's second edge (centre + 11.25)" },
  { name: "wind_from_percent", units: "percent", longName: `wind rose: % of the counted ${samples} with the wind blowing FROM this sector` },
  { name: "sand_flux_toward", units: "m2 yr-1", longName: "sand flux rose: time-averaged flat-bed saturated sand flux moving TOWARD this sector" },
  { name: "sand_flux_toward_percent", units: "percent", longName: "sand flux rose: % of the total flat-bed sand flux (sums to 100)" },
].map((c, i) => (i === 0 ? c : { ...c, netcdf: ROSE16_NOT_IN_NETCDF }));
/** rows of rose_16_sectors.csv from per-sector wind (% of samples, FROM) and flux (m2/yr, TOWARD) values */
export function rose16Csv(axis: CsvColumn, axisValue: string, windFromPct: number[], flux: number[], fluxPct: number[], samples = "hours"): string {
  const b3 = (v: number) => String(Math.round(((v % 360) + 360) % 360 * 100) / 100);
  const rows = windFromPct.map((w, k) => {
    const c = k * 22.5;
    return [axisValue, compassPoint(c), b3(c), b3(c - 11.25), b3(c + 11.25), Number(w.toFixed(4)).toString(), fmtF32(flux[k]), Number(fluxPct[k].toFixed(4)).toString()];
  });
  return csvTable(rose16Columns(axis, samples), rows);
}
/** rose_16_sectors.csv of an Earth cell at slider position `k` */
export function rose16CsvEarth(cell: CellData, k: number): string {
  const v = analyseCell(cell, k, { windSectors: 16, fluxSectors: 16, fluxMode: "flat" });
  return rose16Csv(UT_COLUMN, ut2(v.ut).toFixed(2), v.windRose.freq.map((r) => r.reduce((a, x) => a + x, 0)), v.fluxSectors, v.fluxSectorsPct);
}

export const INSTITUTION = "Geomorphology Lab, Monash University";
export const ROSE_MODES = ["flat_bed", "elongation", "transverse"] as const;

/** "v1" from a dataset prefix such as dune-atlas/v1 (else ""). */
export function versionFromPrefix(prefix: string | undefined): string {
  return /(?:^|\/)(v\d+[a-z0-9.-]*)(?:\/|$)/i.exec(prefix ?? "")?.[1] ?? "";
}

const r6 = (v: number) => Number(v.toFixed(6)).toString();
/** u*,th grid values are linspace(0.01, 0.64, 64): exactly 2 decimals */
export const ut2 = (v: number) => Math.round(v * 100) / 100;
/** shortest decimal text that round-trips the float32 value; "" for NaN */
export function fmtF32(v: number): string {
  if (!Number.isFinite(v)) return "";
  const f = Math.fround(v);
  for (let p = 1; p <= 9; p++) { const t = Number(f.toPrecision(p)); if (Math.fround(t) === f) return String(t); }
  return String(f);
}
/** shortest decimal text that round-trips the float64 value; "" for NaN */
export const fmtF64 = (v: number) => (Number.isFinite(v) ? String(v) : "");
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const bearingToward = (a: number) => mathToBearingDeg(a);
const bearingFrom = (a: number) => (mathToBearingDeg(a) + 180) % 360;

/** A CSV column: NetCDF variable name, UDUNITS units, long name (UTF-8, with the symbol). The CSV
 *  header is `csvName(name)` (plain ASCII snake_case, csvnames.ts); units and long names are documented
 *  in README.txt and metadata.json. */
export interface CsvColumn { name: string; units: string; longName: string; /** where the column is in the NetCDF when not a variable of the same name */ netcdf?: string }
/** CSV: UTF-8 with BOM, ONE header row of ASCII snake_case names (csvnames.ts), then data rows. */
export function csvTable(cols: CsvColumn[], rows: string[][]): string {
  const head = cols.map((c) => csvCell(csvName(c.name))).join(",");
  return UTF8_BOM + [head, ...rows.map((r) => r.join(","))].join("\n") + "\n";
}
/** metadata.json column entry: CSV header, NetCDF name, units, long name. */
export const csvColumnJson = (x: CsvColumn) => ({ name: csvName(x.name), netcdf_name: x.netcdf ?? x.name, units: x.units, long_name: x.longName });
/** README column line: CSV header [units] long name (NetCDF: name). */
export const csvColumnDoc = (c: CsvColumn) => `    ${csvName(c.name).padEnd(44)} [${c.units}] ${c.longName} (NetCDF: ${c.netcdf ?? c.name})`;
/** README paragraph on the CSV layout (both builds). */
export const CSV_LAYOUT_TEXT = `CSV layout (all files)
----------------------
UTF-8 with a byte-order mark (Excel opens the files correctly). One header row of plain ASCII
snake_case column names (listed below with units, long name and the NetCDF variable name; also in
metadata.json "files"), then one data row per record. Empty value = undefined. Numbers are written
with the shortest text that reproduces the NetCDF value exactly.
Read with
  Python/pandas:  pd.read_csv(f)   (add float_precision="round_trip" for bit-exact values)
  R (base):       read.csv(f, fileEncoding = "UTF-8-BOM")
  R (readr):      readr::read_csv(f)`;

/** Direction-bin columns shared by wind_histogram.csv and flux_rose.csv (same names, values,
 *  precision and order as the NetCDF ua_bin coordinates). */
export const DIR_COLUMNS: CsvColumn[] = [
  { name: "ua_bin", units: "radian", longName: "direction bin centre: direction the wind blows (and sand moves) TOWARD, counter-clockwise from east" },
  { name: "ua_bin_lo", units: "radian", longName: "direction bin lower edge (toward, counter-clockwise from east)", netcdf: "ua_bin_bnds[:, 0]" },
  { name: "ua_bin_hi", units: "radian", longName: "direction bin upper edge (toward, counter-clockwise from east)", netcdf: "ua_bin_bnds[:, 1]" },
  { name: "ua_bin_bearing_toward", units: "degree", longName: "compass bearing TOWARD at the direction bin centre (clockwise from north)" },
  { name: "ua_bin_bearing_from", units: "degree", longName: "compass bearing the wind blows FROM at the direction bin centre (meteorological)" },
];
function dirCells(ae: ArrayLike<number>, ac: ArrayLike<number>): string[][] {
  return Array.from(ac, (a, j) => [fmtF64(a), fmtF64(ae[j]), fmtF64(ae[j + 1]), fmtF64(bearingToward(a)), fmtF64(bearingFrom(a))]);
}
const UT_COLUMN: CsvColumn = { name: "ut", units: "m s-1", longName: "threshold friction velocity u*,th" };

export function exportBaseName(cell: { lat: number; lon: number }, datasetId: string): string {
  return `${PROFILE.filePrefix}_${datasetId || "dataset"}_${r6(cell.lat)}_${r6(cell.lon)}`;
}

/** CF-style unit string from the source TeX-ish unit. */
export function cfUnits(u: string | undefined): string {
  const s = (u ?? "").trim();
  if (s === "m$^2$/s" || s === "m^2/s" || s === "m2/s") return "m2 s-1";
  if (s === "m/s") return "m s-1";
  if (s === "rad") return "radian";
  if (s === "-" || s === "") return "1";
  return texToPlain(s);
}

function bins(cell: CellData) {
  const b = cell.bins ?? DEFAULT_BINS;
  return { ue: b.umEdges ?? C.UM_EDGES, ae: b.uaEdges ?? C.UA_EDGES, uc: b.umCentres, ac: b.uaCentres };
}

/** Export descriptions: where a definition speaks of the displayed values (compass bearings, m²/yr), add how the
 *  file stores them (radians counter-clockwise from east; m2 s-1), unless the description already says so. */
export function storedNote(info: { kind: string }, desc: string): string {
  if (!desc) return desc;
  if ((info.kind === "direction" || info.kind === "axis") && !/radian/i.test(desc))
    return `${desc} Values in this file: radians counter-clockwise from east${info.kind === "axis" ? " (an axis: value and value + pi are the same line)" : " (the direction pointed toward); compass bearing = (90 - degrees(value)) mod 360"}.`;
  if (info.kind === "flux" && !/m\$\^2\$\/s|m2 s-1|m\^2\/s/.test(desc)) return `${desc} Values in this file: m2 s-1 (x 31557600 = m2 yr-1).`;
  return desc;
}

/** Field metadata for exports: plain + LaTeX long name, units, description (the app's field
 *  descriptions; store attrs only as a fallback for fields the app does not know). */
export function fieldMeta(v: string, attrs?: ExportMeta["storeAttrs"]) {
  const info = fieldInfo(v);
  const ln = info.longName || attrs?.field_long_names?.[v] || v;
  const units = attrs?.field_units?.[v] ?? info.sourceUnits;
  // the definitions describe the displayed quantity (compass bearings, m²/yr); the files hold the stored values
  const desc = storedNote(info, info.description || attrs?.field_descriptions?.[v] || "");
  return { id: v, longName: texToPlain(ln), longNameLatex: ln, units: cfUnits(units), description: texToPlain(desc), descriptionLatex: desc };
}

/** Time-averaged flux per direction bin (m^2/yr) for the 3 rose modes x all thresholds, the
 *  same functions the panel uses: flat bed fluxRose; crest modes crestFluxRose about
 *  the stored ae (elongation) / ab (transverse) at that threshold. A crest-mode row is NaN where
 *  its defining flux is not > 0 (mask rule: qace / qacb) or alpha is undefined. */
export function fluxRoseTable(cell: CellData): Float64Array[][] {
  const n = nUt(cell), b = cell.bins ?? DEFAULT_BINS, nUa = b.uaCentres.length;
  const ut = cell.utValues ?? C.UT_VALUES;
  const out: Float64Array[][] = ROSE_MODES.map(() => []);
  for (let i = 0; i < n; i++) {
    const flat = cell.hasData ? fluxRose(cell.hist, ut[i], b) : new Float64Array(nUa).fill(NaN);
    out[0].push(flat.map((x) => x * C.S2Y));
    for (const [m, key] of [[1, "ae"], [2, "ab"]] as const) {
      const alpha = fieldValue(cell, key, i);
      const ok = cell.hasData && Number.isFinite(alpha) && modeDefined(cell, key, i);
      out[m].push(ok ? crestFluxRose(cell.hist, ut[i], alpha, b).map((x) => x * C.S2Y) : new Float64Array(nUa).fill(NaN));
    }
  }
  return out;
}

/** NetCDF-3 (64-bit offset) file of one cell. */
export function cellNetcdf(cell: CellData, meta: ExportMeta): Uint8Array {
  const ds = cellDataset(cell, meta.datasetId), deg = cellDeg(cell, ds);
  const { ue, ae, uc, ac } = bins(cell);
  const nUm = uc.length, nUa = ac.length, n = nUt(cell);
  const ut = cell.utValues ?? C.UT_VALUES;
  const g = cell.grid;
  const when = (meta.generated ?? new Date()).toISOString();
  const lat = rowLat(g, cell.iy), lon = colLon(g, cell.ix), edges = cellEdges(lat, lon, g);
  const pubVars = cell.fieldVars.map((v, i) => ({ v, i })).filter(({ v }) => isPublishedField(v));
  const rose = fluxRoseTable(cell);
  const NAME_LEN = 16;
  const F = (v: number) => ({ type: "float" as const, values: v });
  const vars: NcVariable[] = [
    { name: "um_bin", type: "double", dims: ["um_bin"], data: Array.from(uc), attrs: { long_name: "10 m wind speed bin centre", units: "m s-1", bounds: "um_bin_bnds" } },
    { name: "um_bin_bnds", type: "double", dims: ["um_bin", "nv"], data: Array.from({ length: nUm * 2 }, (_, k) => ue[(k >> 1) + (k & 1)]), attrs: {} },
    { name: "ua_bin", type: "double", dims: ["ua_bin"], data: Array.from(ac), attrs: {
      long_name: "wind direction bin centre: direction the wind blows TOWARD, counter-clockwise from east", units: "radian", bounds: "ua_bin_bnds",
      comment: "arctan2(v10, u10) (source convention). Compass bearing toward = (90 - degrees(ua_bin)) mod 360 (ua_bin_bearing_toward); from = toward + 180 (ua_bin_bearing_from)." } },
    { name: "ua_bin_bnds", type: "double", dims: ["ua_bin", "nv"], data: Array.from({ length: nUa * 2 }, (_, k) => ae[(k >> 1) + (k & 1)]), attrs: {} },
    { name: "ua_bin_bearing_from", type: "double", dims: ["ua_bin"], data: Array.from(ac, bearingFrom), attrs: { long_name: "compass bearing the wind blows FROM at the direction-bin centre (meteorological convention)", units: "degree" } },
    { name: "ua_bin_bearing_toward", type: "double", dims: ["ua_bin"], data: Array.from(ac, bearingToward), attrs: { long_name: "compass bearing TOWARD at the direction-bin centre (clockwise from north)", units: "degree" } },
    { name: "ut", type: "double", dims: ["ut"], data: ut.slice(0, n).map(ut2), attrs: { long_name: "threshold friction velocity u*,th", long_name_latex: "$u_{\\ast,th}$", units: "m s-1", comment: "64 values from 0.01 to 0.64 m s-1 in steps of 0.01 m s-1" } },
    { name: "latitude", type: "double", dims: [], data: [lat], attrs: { standard_name: "latitude", long_name: "latitude of the cell centre", units: "degrees_north", bounds: "lat_bnds" } },
    { name: "lat_bnds", type: "double", dims: ["nv"], data: latBounds(lat, g.dlat), attrs: {} },
    { name: "longitude", type: "double", dims: [], data: [lon], attrs: { standard_name: "longitude", long_name: "longitude of the cell centre", units: "degrees_east", bounds: "lon_bnds" } },
    { name: "lon_bnds", type: "double", dims: ["nv"], data: [edges.west, edges.east], attrs: {} },
    ...(["cell_y", "cell_x"] as const).map((nm): NcVariable => ({ name: nm, type: "int", dims: [], data: [nm === "cell_y" ? cell.iy : cell.ix], attrs: {
      long_name: nm === "cell_y" ? "grid row index (0 = northernmost row)" : "grid column index (0 = westernmost column)",
      units: "1", grid_lat0: g.lat0, grid_dlat: g.dlat, grid_lon0: g.lon0, grid_dlon: g.dlon, grid_ny: { type: "int", values: g.ny }, grid_nx: { type: "int", values: g.nx },
      grid_registration: GRID_REGISTRATION, comment: GRID_INDEX_COMMENT } })),
    { name: "wind_hist", type: "int", dims: ["um_bin", "ua_bin"], data: cell.hist, attrs: {
      long_name: `hours per 10 m wind speed and direction bin, ${ds.name} ${ds.period.replace("–", "-")}`, units: "h",
      total_hours_binned: { type: "int", values: cell.totalHours },
      comment: `Hourly ${ds.name} 10 m wind (${ds.resolution} grid); hours with U10 > 20 m/s are not binned. Direction = direction the wind blows TOWARD (ua_bin).`,
      coordinates: "latitude longitude" } },
    ...pubVars.map(({ v, i }): NcVariable => {
      const m = fieldMeta(v, meta.storeAttrs);
      const attrs: NcAttrs = { long_name: m.longName, long_name_latex: m.longNameLatex, units: m.units, description: m.description, description_latex: m.descriptionLatex, _FillValue: F(NaN), coordinates: "latitude longitude" };
      return { name: v, type: "float", dims: ["ut"], data: cell.fields.subarray(i * n, i * n + n), attrs };
    }),
    { name: "dune_present", type: "int", dims: [], data: [cell.dune ? 1 : 0], attrs: { long_name: DUNE_FLAG_LONG_NAME, comment: `1 = ${ds.dunesRule}`, flag_values: { type: "int", values: [0, 1] }, flag_meanings: "no_dunes dunes", units: "1", license: DUNE_FLAG_LICENCE } },
    ...auxVars(cell.aux).map((v): NcVariable => {
      const m = AUX_META[v], aux = cell.aux!;
      const src = auxSourceAttrs(aux, v, deg, Math.abs(g.dlon), ds.id);
      const attrs: NcAttrs = { long_name: m.longName, long_name_latex: `${m.longName} $${m.symbolTex}$`, units: m.units,
        description: texToPlain(auxDescription(v, deg)), _FillValue: F(NaN), coordinates: "latitude longitude" };
      for (const k of ["source", "references", "license", "url", "comment", "method"]) if (src[k]) attrs[k] = texToPlain(src[k]);
      return m.kind === "series"
        ? { name: v, type: "float", dims: ["ut"], data: Float32Array.from(aux.series[v]), attrs }
        : { name: v, type: "float", dims: [], data: Float32Array.of(aux.scalars[v]), attrs };
    }),
    { name: "rose_mode", type: "int", dims: ["rose_mode"], data: [0, 1, 2], attrs: { long_name: "flux rose mode", units: "1", flag_values: { type: "int", values: [0, 1, 2] }, flag_meanings: ROSE_MODES.join(" ") } },
    { name: "rose_mode_name", type: "char", dims: ["rose_mode", "name_strlen"], data: [...ROSE_MODES], attrs: { long_name: "flux rose mode name" } },
    { name: "flux_rose", type: "float", dims: ["rose_mode", "ut", "ua_bin"], data: Float32Array.from(rose.flatMap((m) => m.flatMap((r) => Array.from(r)))), attrs: {
      long_name: "time-averaged sand flux per direction bin (toward)", units: "m2 yr-1", _FillValue: F(NaN),
      comment: "sum over speed bins of n q / total hours, per direction bin (ua_bin = direction sand moves toward). flat_bed: saturated flat-bed flux from u*f; elongation / transverse: crest flux with speed-up uc = u*f (1 + beta h/w |sin(ua - alpha)|) about the mode direction ae / ab at each ut. Crest-mode rows have no value (_FillValue) where the defining crest flux (qace / qacb) is 0.",
      coordinates: "latitude longitude" } },
  ];
  return writeNetcdf3({
    dims: [{ name: "um_bin", size: nUm }, { name: "ua_bin", size: nUa }, { name: "ut", size: n }, { name: "nv", size: 2 }, { name: "rose_mode", size: 3 }, { name: "name_strlen", size: NAME_LEN }],
    attrs: {
      title: `Dune Atlas cell export: ${ds.name} 10 m wind histogram and sand-flux parameters at ${latLonText(lat, lon)} (${ds.resolution} cell)`,
      institution: INSTITUTION,
      source: sourceText(ds),
      dataset_id: meta.datasetId,
      dataset_title: meta.datasetTitle,
      data_version: meta.dataVersion,
      references: referencesLine(citationSources(CELL_SOURCE_IDS, ds.id)),
      fields_citation: fieldsCitation(ds.id),
      fields_license: fieldsLicence(ds.id),
      geospatial_lat_resolution: `${resolutionText(deg)}`.replace("°", " degree"),
      geospatial_lon_resolution: `${resolutionText(Math.abs(cell.grid?.dlon ?? deg))}`.replace("°", " degree"),
      geospatial_lat_min: edges.south, geospatial_lat_max: edges.north, geospatial_lon_min: edges.west, geospatial_lon_max: edges.east,
      ...timeCoverage(ds),
      license: licenceStatement(ds.id),
      ...noticeAttrs(ds.id),
      Conventions: "CF-1.8",
      date_created: when,
      history: `${when}: downloaded from ${meta.permalink}`,
      comment: FILE_AI_NOTICE,
    },
    vars,
  });
}

/** Column definitions of the CSV files (also in metadata.json and README.txt). */
export function csvColumns(cell: CellData, attrs?: ExportMeta["storeAttrs"], datasetId?: string): Record<string, CsvColumn[]> {
  const pub = cell.fieldVars.filter(isPublishedField), ds = cellDataset(cell, datasetId);
  return {
    "wind_histogram.csv": [
      { name: "um_bin", units: "m s-1", longName: "10 m wind speed bin centre" },
      { name: "um_bin_lo", units: "m s-1", longName: "10 m wind speed bin lower edge", netcdf: "um_bin_bnds[:, 0]" },
      { name: "um_bin_hi", units: "m s-1", longName: "10 m wind speed bin upper edge", netcdf: "um_bin_bnds[:, 1]" },
      ...DIR_COLUMNS,
      { name: "wind_hist", units: "h", longName: `hours in the speed x direction bin, ${ds.name} ${ds.period.replace(/–/g, "-")} (hours with U10 > 20 m/s not binned)` },
    ],
    "fields_by_threshold.csv": [UT_COLUMN, ...pub.map((v) => { const m = fieldMeta(v, attrs); return { name: v, units: m.units, longName: m.longName }; }),
      ...auxVars(cell.aux).filter((v) => AUX_META[v].kind === "series").map((v) => ({ name: v, units: AUX_META[v].units, longName: AUX_META[v].longName }))],
    "flux_rose.csv": [
      { name: "rose_mode", units: "1", longName: "flux rose mode: flat_bed, elongation (crest flux about alpha_E) or transverse (about alpha_H)" },
      UT_COLUMN,
      ...DIR_COLUMNS,
      { name: "flux_rose", units: "m2 yr-1", longName: "time-averaged sand flux per direction bin (toward)" },
    ],
    [ROSE16_FILE]: rose16Columns(UT_COLUMN),
  };
}

/** wind_histogram.csv: tidy long format, one row per (um_bin, ua_bin), C order as the NetCDF. */
export function windHistogramCsv(cell: CellData, datasetId?: string): string {
  const { ue, ae, uc, ac } = bins(cell);
  const nUa = ac.length;
  const dir = dirCells(ae, ac);
  const rows: string[][] = [];
  for (let i = 0; i < uc.length; i++) {
    const sp = [fmtF64(uc[i]), fmtF64(ue[i]), fmtF64(ue[i + 1])];
    for (let j = 0; j < nUa; j++) rows.push([...sp, ...dir[j], String(cell.hist[i * nUa + j])]);
  }
  return csvTable(csvColumns(cell, undefined, datasetId)["wind_histogram.csv"], rows);
}

/** fields_by_threshold.csv: one row per u*,th; columns ut + the fields (NetCDF names,
 *  source units, float32 values as stored). */
export function fieldsByThresholdCsv(cell: CellData, attrs?: ExportMeta["storeAttrs"]): string {
  const n = nUt(cell), ut = cell.utValues ?? C.UT_VALUES;
  const pub = cell.fieldVars.map((v, i) => ({ v, i })).filter(({ v }) => isPublishedField(v));
  const rows: string[][] = [];
  const series = auxVars(cell.aux).filter((v) => AUX_META[v].kind === "series").map((v) => cell.aux!.series[v]);
  for (let k = 0; k < n; k++) rows.push([ut2(ut[k]).toFixed(2), ...pub.map(({ i }) => fmtF32(cell.fields[i * n + k])), ...series.map((a) => fmtF32(a[k]))]);
  return csvTable(csvColumns(cell, attrs)["fields_by_threshold.csv"], rows);
}

/** flux_rose.csv: tidy long format, one row per (rose_mode, ut, ua_bin), C order as the NetCDF
 *  flux_rose(rose_mode, ut, ua_bin); values as the NetCDF float32 (m2 yr-1), empty = undefined. */
export function fluxRoseCsv(cell: CellData): string {
  const { ae, ac } = bins(cell);
  const ut = cell.utValues ?? C.UT_VALUES;
  const dir = dirCells(ae, ac);
  const rose = fluxRoseTable(cell);
  const rows: string[][] = [];
  ROSE_MODES.forEach((m, mi) => rose[mi].forEach((r, k) => {
    const u = ut2(ut[k]).toFixed(2);
    for (let j = 0; j < r.length; j++) rows.push([m, u, ...dir[j], fmtF32(r[j])]);
  }));
  return csvTable(csvColumns(cell)["flux_rose.csv"], rows);
}

export function metadataJson(cell: CellData, meta: ExportMeta): string {
  const ds = cellDataset(cell, meta.datasetId), deg = cellDeg(cell, ds);
  const pub = cell.fieldVars.filter(isPublishedField);
  const cols = csvColumns(cell, meta.storeAttrs, meta.datasetId);
  const lat = rowLat(cell.grid, cell.iy), lon = colLon(cell.grid, cell.ix);
  return JSON.stringify({
    cell: { latitude: lat, longitude: lon, bounds: cellEdges(lat, lon, cell.grid), cell_y: cell.iy, cell_x: cell.ix, grid_index: cell.id, dune_present: cell.dune, total_hours_binned: cell.totalHours },
    grid: { ...cell.grid, resolution: resolutionText(deg), registration: GRID_REGISTRATION },
    dataset: { id: meta.datasetId, title: meta.datasetTitle, version: meta.dataVersion },
    conventions: {
      wind_direction: "direction_bin_centre (NetCDF ua_bin) = arctan2(v10, u10) = direction the wind blows TOWARD, radians counter-clockwise from east; bearing_toward = (90 - degrees(direction_bin_centre)) mod 360; bearing_from = toward + 180",
      field_angles: "radians counter-clockwise from east, direction of transport (toward); compass bearing = (90 - degrees(value)) mod 360; alpha_h (NetCDF ab) is an axis",
      fluxes: "fields: m2 s-1 (multiply by 31557600 for m2 yr-1); flux_rose: m2 yr-1",
      missing: "empty CSV cell (NetCDF: _FillValue) = undefined (e.g. no crest flux)",
      csv_headers: "UTF-8 with BOM; one header row of ASCII snake_case names; per column: name (CSV header), netcdf_name, units (UDUNITS), long_name in files.<csv>.columns",
      dune_present: `1 = ${ds.dunesRule}`,
      cells_with_data: ds.landRule,
      coordinates: "WGS 84 latitude (degrees north) and longitude (degrees east, -180..180)",
    },
    ut: (cell.utValues ?? C.UT_VALUES).slice(0, nUt(cell)).map(ut2),
    files: Object.fromEntries(Object.entries(cols).map(([f, c]) => [f, { columns: c.map(csvColumnJson) }])),
    fields: Object.fromEntries(pub.map((v) => { const m = fieldMeta(v, meta.storeAttrs); return [v, { long_name: m.longName, long_name_latex: m.longNameLatex, units: m.units, description: m.description, description_latex: m.descriptionLatex }]; })),
    aux: Object.fromEntries(auxVars(cell.aux).map((v) => {
      const m = AUX_META[v], src = auxSourceAttrs(cell.aux!, v, deg, Math.abs(cell.grid.dlon), ds.id);
      const value = m.kind === "series" ? undefined : (Number.isFinite(cell.aux!.scalars[v]) ? cell.aux!.scalars[v] : null);
      return [v, { long_name: m.longName, long_name_latex: `${m.longName} $${m.symbolTex}$`, units: m.units, ...(m.kind === "scalar" ? { value } : { in_file: "fields_by_threshold.csv" }),
        description: texToPlain(auxDescription(v, deg)), ...Object.fromEntries(["source", "references", "license", "url", "comment", "method"].filter((k) => src[k]).map((k) => [k, texToPlain(src[k])])) }];
    })),
    citation: citationJson(citationSources(CELL_SOURCE_IDS, ds.id)),
    fields_citation: fieldsCitation(ds.id), fields_license: fieldsLicence(ds.id),
    license: licenceStatement(ds.id), dune_present_license: DUNE_FLAG_LICENCE, ...noticeAttrs(ds.id), institution: INSTITUTION,
    generated: (meta.generated ?? new Date()).toISOString(), permalink: meta.permalink, ai_notice: FILE_AI_NOTICE,
  }, null, 1) + "\n";
}

export function readmeText(cell: CellData, meta: ExportMeta): string {
  const ds = cellDataset(cell, meta.datasetId);
  const cols = csvColumns(cell, meta.storeAttrs, meta.datasetId);
  const colDoc = (f: string) => cols[f].map(csvColumnDoc).join("\n");
  return `Dune Atlas cell export
======================
Cell: centre ${latLonText(cell.lat, cell.lon)} (grid row ${cell.iy}, column ${cell.ix}); dataset ${meta.datasetTitle} (${meta.datasetId}, ${meta.dataVersion}).
Generated ${(meta.generated ?? new Date()).toISOString()} from ${meta.permalink}

${CSV_LAYOUT_TEXT}
wind_histogram.csv and flux_rose.csv are in tidy long format and use the same direction-bin
columns (direction_bin_centre ... bearing_from), values and order (source bin index order).

wind_histogram.csv  Hourly ${ds.name} 10 m wind ${ds.period.replace(/–/g, "-")} (${ds.resolution} cell); one row per speed x direction bin.
${colDoc("wind_histogram.csv")}

fields_by_threshold.csv  Sand-flux parameters vs threshold; one row per u*,th (64 values,
  0.01-0.64 m/s). Source units: fluxes m2 s-1 (x 31557600 = m2/yr); angles radians
  counter-clockwise from east, direction of transport (bearing = (90 - degrees) mod 360;
  alpha_h = alpha_H is an axis); fractions / ratios dimensionless.
${colDoc("fields_by_threshold.csv")}

flux_rose.csv  Flux rose vs threshold: one row per (rose_mode, ustar_threshold, direction bin) = 3 x 64 x 128 rows.
  flux = time-averaged sand flux per direction bin (sum over speed bins of n q / total hours),
  m2 yr-1, transport TOWARD direction_bin_centre. flat_bed: saturated flat-bed flux; elongation / transverse:
  crest flux with speed-up about the mode direction alpha_E / alpha_H at that threshold. Crest-mode rows
  are empty where the defining crest flux is zero.
${colDoc("flux_rose.csv")}

${ROSE16_FILE}  The panel's wind rose and flat-bed sand flux rose in 16 compass sectors (degrees), at
  ${utText(cell, meta)}: one row per sector. Wind: % of the counted hours blowing FROM the sector; sand flux:
  m2 yr-1 moving TOWARD the sector. flux_rose.csv has every threshold and all 128 direction bins.
${colDoc(ROSE16_FILE)}

metadata.json  Cell coordinates, grid, conventions, column definitions, field long names
  (plain and LaTeX), descriptions, citation; "aux" holds the per-cell auxiliary values
  (also in the NetCDF download):
${auxVars(cell.aux).filter((v) => AUX_META[v].kind === "scalar").map((v) => `    ${v.padEnd(20)} ${AUX_META[v].longName}`).join("\n") || "    (none)"}
  Aridity: Global-AI_PET v3.1. Vegetation cover (tot_cov_*): CSIRO MODIS Fractional Cover v3.1,
  mean 2001-2025; full monthly time series at https://map.geo-rapp.org/.

flux_divergence (qsdiv; fields_by_threshold.csv, m yr-1) is the saturated flux divergence: the divergence of the
time-averaged flat-bed flux vector (magnitude rdp, direction rdd) on the sphere, following
Gunn (2026), Methods M6. Negative values (flux convergence) imply deposition.

Drift potentials (dp, rdp, rdd, rdp_over_dp) and crest fluxes are averages over the hourly
record (sums over all speed and direction bins weighted by the hours in each bin).

${citationText("", citationSources(CELL_SOURCE_IDS, ds.id)).trim()}

Cite the sand-flux fields as: ${fieldsCitation(ds.id)}. Licence of the fields: ${fieldsLicence(ds.id)}.

Licence: ${licenceStatement(ds.id)}${datasetNotice(ds.id) ? `\n${datasetNotice(ds.id)}` : ""}
Dune flag (dune_present): ${DUNE_FLAG_LICENCE}.

${FILE_AI_NOTICE}
`;
}

/** CSV bundle (.zip, DEFLATE where supported): README.txt, wind_histogram.csv,
 *  fields_by_threshold.csv, flux_rose.csv, rose_16_sectors.csv, metadata.json. */
export function csvBundle(cell: CellData, meta: ExportMeta, deflate?: DeflateRaw | null): Promise<Uint8Array> {
  return writeZip([
    { name: "README.txt", data: readmeText(cell, meta) },
    { name: "wind_histogram.csv", data: windHistogramCsv(cell, meta.datasetId) },
    { name: "fields_by_threshold.csv", data: fieldsByThresholdCsv(cell, meta.storeAttrs) },
    { name: "flux_rose.csv", data: fluxRoseCsv(cell) },
    { name: ROSE16_FILE, data: rose16CsvEarth(cell, rose16Index(cell, meta)) },
    { name: "metadata.json", data: metadataJson(cell, meta) },
  ], meta.generated, deflate);
}
/** slider position of rose_16_sectors.csv */
const rose16Index = (cell: CellData, meta: ExportMeta) => Math.max(0, Math.min(nUt(cell) - 1, meta.utIndex ?? C.UT_DEFAULT_INDEX));
const utText = (cell: CellData, meta: ExportMeta) => `u*,th = ${ut2((cell.utValues ?? C.UT_VALUES)[rose16Index(cell, meta)]).toFixed(2)} m/s`;
