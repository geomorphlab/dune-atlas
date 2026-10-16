// Regional box export: the cells of the selected wind dataset whose centres lie in a latitude-longitude box, in one
// CF-1.8 NetCDF-3 file with a README (zip). Pure builders (tested in node); the popover (ui/regionExport.ts) and
// the box drawing (map/boxdraw.ts) call them.
//   * a box is { west, south, east, north } in degrees; west > east (after wrapping) crosses the antimeridian
//     (both atlases use -180..180 east-positive); a box can reach a pole;
//   * the parameters are chosen from what the cells hold: every sand-flux field, the wind histogram (Earth) or
//     the hourly wind and air series (Mars), the per-cell auxiliary variables and the dune flag, for every
//     threshold (grain diameter) or the current one only;
//   * the size is estimated before anything is fetched and capped for browser memory (REGION_LIMITS).
import type { CellData } from "../cell/cellstore";
import type { Grid } from "../cell/snap";
import { writeNetcdf3, type NcAttrs, type NcVariable } from "../cell/netcdf3";
import { ATLAS_NAME, fieldMeta, INSTITUTION, sourceText, type ExportMeta } from "../cell/export";
import { cellEdges, colLon, exactCoord, latBounds, licenceStatement, noticeAttrs, rowLat, timeCoverage } from "../cell/exportmeta";
import { AUX_META, auxDescription, auxSourceAttrs } from "../cell/auxinfo";
import { AI_NOTICE, citationSources, citationText, datasetNotice, fieldsCitation, fieldsLicence, referencesLine } from "../cell/citation";
import { CELL_SOURCE_IDS, DUNE_FLAG_LICENCE, DUNE_FLAG_LONG_NAME, TRANSPORT_LAW_ATTR } from "@body/citation";
import { datasetInfo, resolutionText } from "../cell/datasetinfo";
import { texToPlain } from "../util/plaintext";
import { isPublishedField } from "../util/constants";
import { PROFILE } from "@body/profile";

export interface Box { west: number; south: number; east: number; north: number }

/** cap of a region export: the cells and the bytes the browser holds twice (data, then the file) */
export const REGION_LIMITS = { cells: 2500, bytes: 150 * 2 ** 20 };

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

/** Normalise a box: latitudes ordered and clamped to ±90; `east` unwrapped so that west <= east < west + 360
 *  (a box crossing the antimeridian has east > 180); a box at least 360° wide covers every longitude. */
export function normaliseBox(b: Box): Box & { width: number } {
  const south = Math.max(-90, Math.min(b.south, b.north)), north = Math.min(90, Math.max(b.south, b.north));
  const r9 = (x: number) => Math.round(x * 1e9) / 1e9;
  const west = r9(wrap180(b.west));
  let width = r9(b.east - b.west);
  if (width < 0) width += 360 * Math.ceil(-width / 360);
  width = Math.min(width, 360);
  return { west, south, east: west + width, north, width };
}

/** Rows (north to south) and columns (west to east, wrapping) of the grid cells whose centres lie in the box:
 *  south <= lat < north (north = 90 includes the pole row) and west <= lon < east (a full-width box: every
 *  column once). */
export function boxCells(b0: Box, g: Grid): { iys: number[]; ixs: number[]; lats: number[]; lons: number[] } {
  const b = normaliseBox(b0);
  const eps = 1e-9;
  const inLat = (lat: number) => lat >= b.south - eps && (lat < b.north - eps || (b.north >= 90 && lat <= 90 + eps));
  const iys: number[] = [];
  for (let iy = 0; iy < g.ny; iy++) if (inLat(rowLat(g, iy))) iys.push(iy);
  const full = b.width >= 360 - eps;
  const ixs: number[] = [], lons: number[] = [];
  const global = Math.abs(Math.abs(g.dlon) * g.nx - 360) < 1e-6;
  // offset of each column east of the west bound (0..360), in increasing longitude
  const cols = Array.from({ length: g.nx }, (_, ix) => {
    const lon = g.lon0 + g.dlon * ix;
    return { ix, d: global || full ? (((lon - b.west) % 360) + 360 + eps) % 360 - eps : lon - b.west };
  }).filter((c) => c.d >= -eps && (full ? c.d < 360 - eps : c.d < b.width - eps)).sort((p, q) => p.d - q.d);
  for (const c of cols) {
    const lon = colLon(g, c.ix);   // exact grid value, shifted by whole turns to increase eastward
    ixs.push(c.ix); lons.push(exactCoord(lon + 360 * Math.round((b.west + Math.max(0, c.d) - lon) / 360)));
  }
  return { iys, ixs, lats: iys.map((iy) => rowLat(g, iy)), lons };
}

/** what a region export contains */
export interface RegionSelection {
  /** sand-flux field variables (store names) */
  fields: string[];
  /** the wind histogram (Earth) or the hourly wind and air series (Mars) */
  wind: boolean;
  /** per-cell auxiliary variables (AUX_META names) */
  aux: string[];
  dune: boolean;
  /** every threshold (grain diameter), or only the index `current` */
  allThresholds: boolean;
  current: number;
}

/** what one cell of the store holds (sizes for the estimate) */
export interface RegionShape { nThr: number; wind: { kind: "hist"; nUm: number; nUa: number } | { kind: "series"; nHours: number } }

/** bytes of the file per cell (float32 / int32 values; coordinates and attributes are negligible) */
export function bytesPerCell(sel: RegionSelection, s: RegionShape): number {
  const thr = sel.allThresholds ? s.nThr : 1;
  const aux = sel.aux.reduce((n, v) => n + (AUX_META[v]?.kind === "series" ? thr : 1), 0);
  const wind = !sel.wind ? 0 : s.wind.kind === "hist" ? s.wind.nUm * s.wind.nUa : 5 * s.wind.nHours;
  return 4 * (sel.fields.length * thr + aux + wind + (sel.dune ? 2 : 0) + 1);
}

export interface RegionEstimate { cells: number; rows: number; cols: number; bytes: number; ok: boolean; reason?: "empty" | "cells" | "bytes" }
export function estimateRegion(box: Box, g: Grid, sel: RegionSelection, s: RegionShape): RegionEstimate {
  const { iys, ixs } = boxCells(box, g);
  const cells = iys.length * ixs.length, bytes = cells * bytesPerCell(sel, s) + 64 * 1024;
  const reason = cells === 0 ? "empty" : cells > REGION_LIMITS.cells ? "cells" : bytes > REGION_LIMITS.bytes ? "bytes" : undefined;
  return { cells, rows: iys.length, cols: ixs.length, bytes, ok: !reason, ...(reason ? { reason } : {}) };
}

/** "2.4 MB" */
export function sizeText(b: number): string {
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} kB`;
  return `${(b / 2 ** 20).toFixed(b < 10 * 2 ** 20 ? 1 : 0)} MB`;
}

/** Fetch the box's cells with a few requests in flight; `onProgress(done, total)`; cancelled by `signal`. */
export async function fetchRegion<T extends CellData>(store: { query(iy: number, ix: number, opts?: { wind?: boolean }): Promise<T> }, cells: { iys: number[]; ixs: number[] },
  o: { concurrency?: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal; wind?: boolean } = {}): Promise<(T | null)[]> {
  const jobs: [number, number][] = [];
  for (const iy of cells.iys) for (const ix of cells.ixs) jobs.push([iy, ix]);
  const out: (T | null)[] = new Array(jobs.length).fill(null);
  let next = 0, done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      if (o.signal?.aborted) throw new DOMException("cancelled", "AbortError");
      const k = next++;
      const c = await store.query(jobs[k][0], jobs[k][1], { wind: o.wind ?? true });
      out[k] = c.hasData ? c : null;
      o.onProgress?.(++done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(o.concurrency ?? 12, jobs.length) }, worker));
  return out;
}

export interface RegionMeta extends Omit<ExportMeta, "storeAttrs" | "generated"> {
  box: Box;
  /** body texts: thresholds axis name, units and long name; e.g. Earth ut / m s-1, Mars d / um */
  axis: { name: string; units: string; longName: string; values: number[]; symbolTex?: string; comment?: string };
  storeAttrs?: ExportMeta["storeAttrs"];
  generated?: Date;
  body: "earth" | "mars";
}

/** variables a cell offers for the tick list (published fields, aux in AUX_META) */
export function regionParameters(sample: CellData): { fields: string[]; aux: string[]; wind: "hist" | "series" | null } {
  const s = sample as CellData & { series?: unknown };
  return {
    fields: sample.fieldVars.filter((v) => isPublishedField(v)),
    aux: Object.keys(AUX_META),
    wind: s.series ? "series" : sample.hist?.length ? "hist" : null,
  };
}

const F = (v: number) => ({ type: "float" as const, values: v });
const I = (v: number | number[]) => ({ type: "int" as const, values: v });
const NO_INT = -2147483647;

/** The region's NetCDF-3 (CF-1.8) file. `cells` row-major over (lats, lons) as boxCells returns them; null = no
 *  data. */
export function regionNetcdf(cells: (CellData | null)[], grid: { iys: number[]; ixs: number[]; lats: number[]; lons: number[] }, g: Grid, sel: RegionSelection, meta: RegionMeta): Uint8Array {
  const ny = grid.lats.length, nx = grid.lons.length, n = ny * nx;
  if (cells.length !== n) throw new Error(`region: ${cells.length} cells for ${ny} x ${nx}`);
  const ds = datasetInfo(meta.datasetId);
  const sample = cells.find((c): c is CellData => !!c) ?? null;
  const nThr = meta.axis.values.length, thr = sel.allThresholds ? nThr : 1;
  const ks = sel.allThresholds ? Array.from({ length: nThr }, (_, k) => k) : [sel.current];
  const ax = meta.axis.name;
  const dlat = Math.abs(g.dlat), dlon = Math.abs(g.dlon);
  const mars = meta.body === "mars";
  const coords = mars ? "planetocentric latitude, east longitude (unwrapped across 180°), Mars 2000 sphere" : "WGS 84 latitude and longitude (unwrapped across 180°)";
  const vars: NcVariable[] = [
    { name: "lat", type: "double", dims: ["lat"], data: grid.lats, attrs: { standard_name: "latitude", long_name: mars ? "planetocentric latitude of the cell centre" : "latitude of the cell centre", units: "degrees_north", bounds: "lat_bnds" } },
    { name: "lat_bnds", type: "double", dims: ["lat", "nv"], data: grid.lats.flatMap((y) => latBounds(y, dlat)), attrs: { comment: "north and south edge of each row, clipped at ±90° (a row centred on a pole is a half cell)" } },
    { name: "lon", type: "double", dims: ["lon"], data: grid.lons, attrs: { standard_name: "longitude", long_name: mars ? "east longitude of the cell centre" : "longitude of the cell centre", units: "degrees_east", bounds: "lon_bnds", comment: "increasing eastward; values above 180 continue across the antimeridian (subtract 360 for -180..180)" } },
    { name: "lon_bnds", type: "double", dims: ["lon", "nv"], data: grid.lons.flatMap((x) => [exactCoord(x - dlon / 2), exactCoord(x + dlon / 2)]), attrs: {} },
    { name: "cell_y", type: "int", dims: ["lat"], data: grid.iys, attrs: { long_name: "grid row index of the wind dataset (0 = northernmost row)", units: "1", grid_lat0: g.lat0, grid_dlat: g.dlat, grid_ny: I(g.ny) } },
    { name: "cell_x", type: "int", dims: ["lon"], data: grid.ixs, attrs: { long_name: "grid column index of the wind dataset (0 = westernmost column)", units: "1", grid_lon0: g.lon0, grid_dlon: g.dlon, grid_nx: I(g.nx) } },
    { name: ax, type: "double", dims: sel.allThresholds ? [ax] : [], data: ks.map((k) => meta.axis.values[k]), attrs: { long_name: meta.axis.longName, units: meta.axis.units, ...(meta.axis.symbolTex ? { long_name_latex: meta.axis.symbolTex } : {}), ...(meta.axis.comment ? { comment: meta.axis.comment } : {}) } },
    { name: "has_data", type: "int", dims: ["lat", "lon"], data: Int32Array.from(cells, (c) => (c ? 1 : 0)), attrs: { long_name: "cell has wind and sand-flux data", flag_values: I([0, 1]), flag_meanings: "no_data data", units: "1", comment: ds.nonLandReason ? `0 = outside the land mask of ${ds.name} (${ds.landRule})` : "0 = no data" } },
  ];
  const thrDims = (base: string[]) => (sel.allThresholds ? [ax, ...base] : base);
  const coordAttr = sel.allThresholds ? "lat lon" : `lat lon ${ax}`;
  for (const v of sel.fields) {
    const m = fieldMeta(v, meta.storeAttrs);
    const data = new Float32Array(thr * n).fill(NaN);
    cells.forEach((c, p) => {
      if (!c) return;
      const i = c.fieldVars.indexOf(v), nu = c.fields.length / c.fieldVars.length;
      if (i < 0) return;
      ks.forEach((k, j) => { data[j * n + p] = c.fields[i * nu + k]; });
    });
    vars.push({ name: v, type: "float", dims: thrDims(["lat", "lon"]), data, attrs: { long_name: m.longName, long_name_latex: m.longNameLatex, units: m.units, description: m.description, description_latex: m.descriptionLatex, _FillValue: F(NaN), coordinates: coordAttr } });
  }
  for (const v of sel.aux) {
    const am = AUX_META[v];
    if (!am) continue;
    const series = am.kind === "series";
    const data = new Float32Array((series ? thr : 1) * n).fill(NaN);
    let src: Record<string, string> = {};
    cells.forEach((c, p) => {
      const aux = c?.aux;
      if (!aux) return;
      if (series && aux.series[v]) ks.forEach((k, j) => { data[j * n + p] = aux.series[v][k]; });
      else if (!series && v in aux.scalars) data[p] = aux.scalars[v];
      if (!Object.keys(src).length && (aux.series[v] || v in aux.scalars)) src = auxSourceAttrs(aux, v, dlat, dlon, ds.id);
    });
    const attrs: NcAttrs = { long_name: am.longName, long_name_latex: `${am.longName} $${am.symbolTex}$`, units: am.units, description: texToPlain(auxDescription(v, dlat, dlon)), _FillValue: F(NaN), coordinates: series ? coordAttr : "lat lon" };
    for (const k of ["source", "references", "license", "url", "comment", "method"]) if (src[k]) attrs[k] = texToPlain(src[k]);
    vars.push({ name: v, type: "float", dims: series ? thrDims(["lat", "lon"]) : ["lat", "lon"], data, attrs });
  }
  if (sel.dune) {
    vars.push({ name: "dune_present", type: "int", dims: ["lat", "lon"], data: Int32Array.from(cells, (c) => (c ? (c.dune ? 1 : 0) : NO_INT)), attrs: { long_name: DUNE_FLAG_LONG_NAME, comment: `1 = ${ds.dunesRule}`, flag_values: I([0, 1]), flag_meanings: "no_dunes dunes", units: "1", _FillValue: I(NO_INT), license: DUNE_FLAG_LICENCE } });
    if (mars) vars.push({ name: "dune_fraction", type: "float", dims: ["lat", "lon"], data: Float32Array.from(cells, (c) => (c ? Number((c as CellData & { duneFrac?: number }).duneFrac ?? NaN) : NaN)), attrs: { long_name: "fraction of the cell area covered by mapped dune polygons (spherical areas)", units: "1", _FillValue: F(NaN), license: DUNE_FLAG_LICENCE } });
  }
  const dims = [{ name: "lat", size: ny }, { name: "lon", size: nx }, { name: "nv", size: 2 }, ...(sel.allThresholds ? [{ name: ax, size: nThr }] : [])];
  if (sel.wind && sample) {
    const s = sample as CellData & { series?: Record<string, Float32Array>; ls?: Float32Array; sol?: Float32Array };
    if (s.series) {
      const nh = s.series.u.length;
      const rounding = typeof (meta.storeAttrs as { series_note?: unknown } | undefined)?.series_note === "string" ? (meta.storeAttrs as { series_note: string }).series_note : "";
      dims.push({ name: "hour", size: nh });
      vars.push({ name: "hour", type: "int", dims: ["hour"], data: Int32Array.from({ length: nh }, (_, k) => k), attrs: { long_name: ds.series?.indexText ?? "sample index of the record", units: "1" } });
      if (s.sol) vars.push({ name: "sol", type: "float", dims: ["hour"], data: s.sol, attrs: { long_name: ds.series?.solText ?? "sol of the record", units: "1" } });
      if (s.ls) vars.push({ name: "ls", type: "float", dims: ["hour"], data: s.ls, attrs: { long_name: "areocentric solar longitude Ls (0-360)", units: "degree" } });
      const SER: [string, string, string][] = [["u", "m s-1", "lowest-level eastward wind (toward east)"], ["v", "m s-1", "lowest-level northward wind (toward north)"], ["T", "K", "lowest-level air temperature"], ["rho", "kg m-3", "lowest-layer air density"], ["z", "m", "height of the lowest-level wind above the surface"]];
      for (const [nm, units, ln] of SER) {
        const data = new Float32Array(n * nh).fill(NaN);
        cells.forEach((c, p) => { const ser = (c as typeof s | null)?.series?.[nm]; if (ser) data.set(ser, p * nh); });
        vars.push({ name: nm, type: "float", dims: ["lat", "lon", "hour"], data, attrs: { long_name: ln, units, _FillValue: F(NaN), coordinates: "lat lon", ...(rounding ? { comment: rounding } : {}) } });
      }
    } else if (sample.hist.length) {
      const b = sample.bins, nUm = b.umCentres.length, nUa = b.uaCentres.length;
      dims.push({ name: "um_bin", size: nUm }, { name: "ua_bin", size: nUa });
      const ue = b.umEdges as ArrayLike<number>, ae = b.uaEdges as ArrayLike<number>;
      vars.push({ name: "um_bin", type: "double", dims: ["um_bin"], data: Array.from(b.umCentres), attrs: { long_name: "10 m wind speed bin centre", units: "m s-1", bounds: "um_bin_bnds" } });
      vars.push({ name: "um_bin_bnds", type: "double", dims: ["um_bin", "nv"], data: Array.from({ length: nUm * 2 }, (_, k) => ue[(k >> 1) + (k & 1)]), attrs: {} });
      vars.push({ name: "ua_bin", type: "double", dims: ["ua_bin"], data: Array.from(b.uaCentres), attrs: { long_name: "wind direction bin centre: direction the wind blows TOWARD, counter-clockwise from east", units: "radian", bounds: "ua_bin_bnds", comment: "arctan2(v10, u10) (source convention); compass bearing toward = (90 - degrees(ua_bin)) mod 360; from = toward + 180" } });
      vars.push({ name: "ua_bin_bnds", type: "double", dims: ["ua_bin", "nv"], data: Array.from({ length: nUa * 2 }, (_, k) => ae[(k >> 1) + (k & 1)]), attrs: {} });
      const data = new Int32Array(n * nUm * nUa).fill(NO_INT);
      cells.forEach((c, p) => { if (c) data.set(c.hist, p * nUm * nUa); });
      vars.push({ name: "wind_hist", type: "int", dims: ["lat", "lon", "um_bin", "ua_bin"], data, attrs: { long_name: `hours per 10 m wind speed and direction bin, ${ds.name} ${ds.period.replace("–", "-")}`, units: "h", _FillValue: I(NO_INT), coordinates: "lat lon", comment: `Hourly ${ds.name} 10 m wind (${ds.resolution} grid); hours with U10 > 20 m/s are not binned. Direction = direction the wind blows TOWARD (ua_bin).` } });
    }
  }
  const b = normaliseBox(meta.box);
  const when = (meta.generated ?? new Date()).toISOString();
  // extent of the cells in the file (the box selects cell centres, so the cells can reach beyond it)
  const ext = ny && nx ? { south: cellEdges(grid.lats[ny - 1], 0, g).south, north: cellEdges(grid.lats[0], 0, g).north, west: exactCoord(grid.lons[0] - dlon / 2), east: exactCoord(grid.lons[nx - 1] + dlon / 2) } : { south: b.south, north: b.north, west: b.west, east: b.east };
  return writeNetcdf3({
    dims,
    attrs: {
      title: `${ATLAS_NAME} region export: ${ds.name} ${ds.resolution} cells in ${boxText(meta.box)}`,
      institution: INSTITUTION,
      source: sourceText(ds),
      dataset_id: meta.datasetId,
      dataset_title: meta.datasetTitle,
      ...(mars ? { planet: "Mars" } : {}),
      ...(TRANSPORT_LAW_ATTR ? { transport_law: TRANSPORT_LAW_ATTR } : {}),
      data_version: meta.dataVersion,
      ...(ds.series ? { samples_per_sol: I(ds.series.samplesPerSol) } : {}),
      references: referencesLine(citationSources(CELL_SOURCE_IDS, ds.id)),
      fields_citation: fieldsCitation(ds.id),
      fields_license: fieldsLicence(ds.id),
      license: licenceStatement(ds.id),
      ...noticeAttrs(ds.id),
      geospatial_lat_min: ext.south, geospatial_lat_max: ext.north, geospatial_lon_min: ext.west, geospatial_lon_max: ext.east,
      selection_box: `${b.west} ${b.south} ${b.east} ${b.north} (west south east north, degrees; cells whose centres lie in it)`,
      ...timeCoverage(ds),
      geospatial_lat_resolution: resolutionText(dlat).replace("°", " degree"),
      geospatial_lon_resolution: resolutionText(dlon).replace("°", " degree"),
      coordinates_note: coords,
      selection: selectionText(sel, meta),
      Conventions: "CF-1.8",
      date_created: when,
      history: `${when}: downloaded from ${meta.permalink}`,
      comment: AI_NOTICE,
    },
    vars,
  });
}

/** "24.50° S to 20.00° S, 13.00° E to 17.50° W" (range 360: east longitudes 0-360) */
export function boxText(b0: Box, lonRange: 180 | 360 = PROFILE.search.lonRange): string {
  const b = normaliseBox(b0);
  const la = (v: number) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? "S" : "N"}`;
  const lo = (v: number) => {
    if (lonRange === 360) return `${(((v % 360) + 360) % 360).toFixed(2)}° E`;
    const w = wrap180(v); return `${Math.abs(w).toFixed(2)}° ${w < 0 ? "W" : "E"}`;
  };
  return `${la(b.south)} to ${la(b.north)}, ${lo(b.west)} to ${lo(b.east)}`;
}

function selectionText(sel: RegionSelection, meta: RegionMeta): string {
  const thr = sel.allThresholds ? `all ${meta.axis.values.length} values of ${meta.axis.longName}` : `${meta.axis.longName} = ${meta.axis.values[sel.current]} ${meta.axis.units}`;
  return `${[...sel.fields, ...(sel.wind ? ["wind"] : []), ...sel.aux, ...(sel.dune ? ["dune_present"] : [])].join(", ")}; ${thr}`;
}

/** README of the zip */
export function regionReadme(sel: RegionSelection, meta: RegionMeta, est: { rows: number; cols: number; withData: number }, fileName: string, licenceUrl: string): string {
  const ds = datasetInfo(meta.datasetId);
  const head = `${ATLAS_NAME} region export`;
  return `${head}
${"=".repeat(head.length)}

${fileName}: the cells of the wind dataset ${ds.name} ${ds.resolution}, ${ds.period}, whose centres lie in
${boxText(meta.box)}: ${est.rows} rows x ${est.cols} columns, ${est.withData} cells with data.
NetCDF-3 (64-bit offset), CF-1.8 conventions; open e.g. with xarray: xarray.open_dataset("${fileName}").

Contents: ${selectionText(sel, meta)}.
Each variable carries its long name, units and description; has_data marks the cells with data.
Longitudes increase eastward and continue above 180° across the antimeridian.

Downloaded ${(meta.generated ?? new Date()).toISOString()} from ${meta.permalink}

Licences
--------
Sand-flux fields and wind data of ${ds.name}: ${fieldsLicence(ds.id)}.${datasetNotice(ds.id) ? ` ${datasetNotice(ds.id)}` : ""}
Dune flag: ${DUNE_FLAG_LICENCE}. Other variables: see their license attribute.
Licences of every source: ${licenceUrl}

${citationText("", citationSources(CELL_SOURCE_IDS, ds.id)).trim()}

${AI_NOTICE}
`;
}
