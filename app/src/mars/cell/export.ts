// Mars per-cell downloads: NetCDF-3 (CF-1.8 style) and a CSV bundle (.zip), the counterpart of
// cell/export.ts with the hourly series in place of the wind histogram and the grain diameter d in
// place of u*,th. Pure builders (tested in node); the panel only triggers the download.
import { M } from "../../cell/marsphysics";
import { isPublishedField } from "../../util/constants";
import { texToPlain } from "../../util/plaintext";
import { mathToBearingDeg } from "../../util/angles";
import { nUt } from "../../cell/cellstore";
import { DEFAULT_BINS } from "../../cell/flux";
import { csvColumnDoc, csvColumnJson, csvTable, fieldMeta, fmtF32, fmtF64, exportBaseName, versionFromPrefix, rose16Columns, rose16Csv, CSV_LAYOUT_TEXT, DIR_COLUMNS, INSTITUTION, LICENSE, ROSE16_FILE, ROSE_MODES, type CsvColumn, type ExportMeta } from "../../cell/export";
import { latLonText } from "../../cell/downloads";
import { AI_NOTICE, CELL_SOURCE_IDS, citationJson, citationSources, citationText, fieldsCitation, fieldsLicence, referencesLine } from "../../cell/citation";
import { AUX_META, auxDescription, auxSourceAttrs, auxVars } from "../../cell/auxinfo";
import { datasetInfo, resolutionText, type DatasetInfo } from "../../cell/datasetinfo";
import { writeNetcdf3, type NcAttrs, type NcVariable } from "../../cell/netcdf3";
import { writeZip, type DeflateRaw } from "../../cell/zip";
import type { MarsCellData } from "./cellstore";
import { analyseMarsCell, marsModeRoses } from "./analysis";
import { PD23_TEXT, PAHTZ_DURAN_DOI } from "./citation";

export { exportBaseName, versionFromPrefix, type ExportMeta };

export function cellDataset(_cell: unknown, datasetId?: string): DatasetInfo { void _cell; return datasetInfo(datasetId); }

const D_COLUMN: CsvColumn = { name: "d", units: "um", longName: "median grain diameter d" };
const SERIES_COLUMNS: CsvColumn[] = [
  { name: "hour", units: "1", longName: "hour index of the record (0 = first hour of the 6th simulated year)" },
  { name: "sol", units: "1", longName: "sol of the simulation (FV3 time / 1 sol)" },
  { name: "ls", units: "degree", longName: "areocentric solar longitude Ls (0-360)" },
  { name: "u", units: "m s-1", longName: "lowest-level eastward wind (toward east) at height z" },
  { name: "v", units: "m s-1", longName: "lowest-level northward wind (toward north) at height z" },
  { name: "T", units: "K", longName: "lowest-level air temperature" },
  { name: "rho", units: "kg m-3", longName: "lowest-layer air density p/(R T)" },
  { name: "z", units: "m", longName: "height of the lowest-level wind above the surface, (R T / g) ln(p_surface / p_mid) (hydrostatic)" },
];
const CONVENTIONS = {
  wind_direction: "u, v toward east/north; direction toward = arctan2(v, u), radians counter-clockwise from east; compass bearing toward = (90 - degrees) mod 360; from = toward + 180",
  friction_velocity: `u* from the smooth-wall mixing-length profile of Pähtz & Durán (2023) eq. 2.2, dl/dz = kappa [1 - exp(-sqrt(u l / (7 nu)))], under constant stress (no roughness length), evaluated at each hour's lowest-level height z with nu = mu(T)/rho; kappa = ${M.KAPPA}, damping constant ${M.MIX_DAMP}; tabulated universal profile u+ (X = z u*/nu), u* by bisection`,
  threshold: `per hour: u*,th(d, rho, T), Pähtz & Durán (2023) eq. 5.1 with the rarefaction correction of eq. 3.20 (rho_p = ${M.RHO_P} kg m-3, g = ${M.G} m s-2, R = ${M.R_AIR} J kg-1 K-1, Sutherland viscosity of CO2)`,
  transport: "q = Q/rho_p from Pähtz & Durán (2023) eq. 3.2 for u* > u*,th, else 0 (m2 s-1; x 31557600 = m2 yr-1)",
  crest_flux: `u_c = u* (1 + beta A |sin(ua - alpha)|), beta = ${M.BETA}, A = 0.8/6; q_c = q(u_c) with the same hour's u*,th`,
  field_angles: "radians counter-clockwise from east, direction of transport (toward); compass bearing = (90 - degrees(value)) mod 360; alpha_h (NetCDF ab) is an axis",
  fluxes: "fields: m2 s-1 (multiply by 31557600 for m2 yr-1); flux_rose: m2 yr-1",
  missing: "empty CSV cell (NetCDF: _FillValue) = undefined (e.g. no crest flux)",
  csv_headers: "UTF-8 with BOM; one header row of ASCII snake_case names; per column: name (CSV header), netcdf_name, units (UDUNITS), long_name in files.<csv>.columns",
  coordinates: "planetocentric latitude (degrees north) and east longitude (-180..180), Mars 2000 sphere",
};

const ua = DEFAULT_BINS.uaCentres, ae = DEFAULT_BINS.uaEdges as ArrayLike<number>;
const dirCells = () => Array.from(ua, (a, j) => [fmtF64(a), fmtF64(ae[j]), fmtF64(ae[j + 1]), fmtF64(mathToBearingDeg(a)), fmtF64((mathToBearingDeg(a) + 180) % 360)]);

/** Flux rose per direction bin (m^2/yr) for the 3 modes x all 64 grain diameters, the same
 *  computation as the panel (marsModeRoses); a crest-mode row is NaN where alpha is undefined. */
export function marsFluxRoseTable(cell: MarsCellData): Float64Array[][] {
  const n = nUt(cell), nUa = ua.length;
  return ROSE_MODES.map((m) => Array.from({ length: n }, (_, i) => {
    const r = cell.hasData ? marsModeRoses(cell, i, m === "flat_bed" ? "flat" : m) : null;
    return r ? r.rose.map((x) => x * M.S2Y) : new Float64Array(nUa).fill(NaN);
  }));
}

export function cellNetcdf(cell: MarsCellData, meta: ExportMeta): Uint8Array {
  const ds = datasetInfo(meta.datasetId), deg = Math.abs(cell.grid.dlat);
  const n = nUt(cell), nh = cell.series.u.length, nUa = ua.length;
  const g = cell.grid;
  const when = (meta.generated ?? new Date()).toISOString();
  const pubVars = cell.fieldVars.map((v, i) => ({ v, i })).filter(({ v }) => isPublishedField(v));
  const rose = marsFluxRoseTable(cell);
  const F = (v: number) => ({ type: "float" as const, values: v });
  const ser = (name: keyof MarsCellData["series"], c: CsvColumn): NcVariable => ({ name, type: "float", dims: ["hour"], data: cell.series[name], attrs: { long_name: c.longName, units: c.units, _FillValue: F(NaN), coordinates: "latitude longitude" } });
  const col = (k: string) => SERIES_COLUMNS.find((c) => c.name === k)!;
  const vars: NcVariable[] = [
    { name: "hour", type: "int", dims: ["hour"], data: Int32Array.from({ length: nh }, (_, k) => k), attrs: { long_name: col("hour").longName, units: "1" } },
    { name: "sol", type: "float", dims: ["hour"], data: cell.sol, attrs: { long_name: col("sol").longName, units: "1" } },
    { name: "ls", type: "float", dims: ["hour"], data: cell.ls, attrs: { long_name: col("ls").longName, units: "degree" } },
    { name: "d", type: "double", dims: ["d"], data: cell.dValuesUm.slice(0, n), attrs: { long_name: "median grain diameter d", long_name_latex: "$d$", units: "um", comment: "round(50 * 20^(k/63)) um, k = 0..63 (log-spaced 50-1000 um)" } },
    { name: "ua_bin", type: "double", dims: ["ua_bin"], data: Array.from(ua), attrs: { long_name: "direction bin centre: direction the wind blows (and sand moves) TOWARD, counter-clockwise from east", units: "radian", bounds: "ua_bin_bnds" } },
    { name: "ua_bin_bnds", type: "double", dims: ["ua_bin", "nv"], data: Array.from({ length: nUa * 2 }, (_, k) => ae[(k >> 1) + (k & 1)]), attrs: { long_name: "direction bin edges (toward, counter-clockwise from east)", units: "radian" } },
    { name: "ua_bin_bearing_toward", type: "double", dims: ["ua_bin"], data: Array.from(ua, mathToBearingDeg), attrs: { long_name: "compass bearing TOWARD at the direction-bin centre (clockwise from north)", units: "degree" } },
    { name: "latitude", type: "double", dims: [], data: [cell.lat], attrs: { standard_name: "latitude", long_name: "planetocentric latitude of the cell centre", units: "degrees_north" } },
    { name: "longitude", type: "double", dims: [], data: [cell.lon], attrs: { standard_name: "longitude", long_name: "east longitude of the cell centre (-180..180)", units: "degrees_east" } },
    ...(["cell_y", "cell_x"] as const).map((nm): NcVariable => ({ name: nm, type: "int", dims: [], data: [nm === "cell_y" ? cell.iy : cell.ix], attrs: {
      long_name: nm === "cell_y" ? "grid row index (0 = northernmost row)" : "grid column index (0 = westernmost column)",
      units: "1", grid_lat0: g.lat0, grid_dlat: g.dlat, grid_lon0: g.lon0, grid_dlon: g.dlon, grid_ny: { type: "int", values: g.ny }, grid_nx: { type: "int", values: g.nx },
      grid_registration: "centre: lat0/lon0 are the centre of cell (0, 0); cell (y, x) spans centre ± d/2",
      comment: "latitude = grid_lat0 + grid_dlat * cell_y; longitude = grid_lon0 + grid_dlon * cell_x" } })),
    ser("u", col("u")), ser("v", col("v")), ser("T", col("T")), ser("rho", col("rho")), ser("z", col("z")),
    ...pubVars.map(({ v, i }): NcVariable => {
      const m = fieldMeta(v, meta.storeAttrs);
      const attrs: NcAttrs = { long_name: m.longName, long_name_latex: m.longNameLatex, units: m.units, description: m.description, description_latex: m.descriptionLatex, _FillValue: F(NaN), coordinates: "latitude longitude" };
      return { name: v, type: "float", dims: ["d"], data: cell.fields.subarray(i * n, i * n + n), attrs };
    }),
    { name: "dune_present", type: "int", dims: [], data: [cell.dune ? 1 : 0], attrs: { long_name: "cell overlaps mapped dunes", comment: `1 = ${ds.dunesRule}`, flag_values: { type: "int", values: [0, 1] }, flag_meanings: "no_dunes dunes", units: "1" } },
    { name: "dune_fraction", type: "float", dims: [], data: Float32Array.of(cell.duneFrac), attrs: { long_name: "fraction of the cell area covered by mapped dune polygons (spherical areas)", units: "1" } },
    ...auxVars(cell.aux).map((v): NcVariable => {
      const m = AUX_META[v], aux = cell.aux!;
      const src = auxSourceAttrs(aux, v, deg);
      const attrs: NcAttrs = { long_name: m.longName, long_name_latex: `${m.longName} $${m.symbolTex}$`, units: m.units, description: texToPlain(auxDescription(v, deg)), _FillValue: F(NaN), coordinates: "latitude longitude" };
      for (const k of ["source", "references", "license", "url", "comment", "method"]) if (src[k]) attrs[k] = texToPlain(src[k]);
      return m.kind === "series" ? { name: v, type: "float", dims: ["d"], data: Float32Array.from(aux.series[v]), attrs } : { name: v, type: "float", dims: [], data: Float32Array.of(aux.scalars[v]), attrs };
    }),
    { name: "rose_mode", type: "int", dims: ["rose_mode"], data: [0, 1, 2], attrs: { long_name: "flux rose mode", flag_values: { type: "int", values: [0, 1, 2] }, flag_meanings: ROSE_MODES.join(" ") } },
    { name: "rose_mode_name", type: "char", dims: ["rose_mode", "name_strlen"], data: [...ROSE_MODES], attrs: { long_name: "flux rose mode name" } },
    { name: "flux_rose", type: "float", dims: ["rose_mode", "d", "ua_bin"], data: Float32Array.from(rose.flatMap((m) => m.flatMap((r) => Array.from(r)))), attrs: {
      long_name: "time-averaged sand flux per direction bin (toward)", units: "m2 yr-1", _FillValue: F(NaN),
      comment: "sum over the hours whose wind direction is in the bin of q / number of hours; per-hour threshold u*,th(d, rho, T). flat_bed: q(u*); elongation / transverse: crest flux q(u_c) about the mode direction ae / ab at each d. Crest-mode rows are _FillValue where the mode direction is undefined.",
      coordinates: "latitude longitude" } },
  ];
  return writeNetcdf3({
    dims: [{ name: "hour", size: nh }, { name: "d", size: n }, { name: "ua_bin", size: nUa }, { name: "nv", size: 2 }, { name: "rose_mode", size: 3 }, { name: "name_strlen", size: 16 }],
    attrs: {
      title: `Mars Dune Atlas cell export: ${ds.name} hourly lowest-level wind, air state and sand-flux parameters at ${cell.lat}° N, ${cell.lon}° E (${ds.resolution} cell)`,
      institution: INSTITUTION,
      source: meta.datasetTitle,
      dataset_id: meta.datasetId,
      data_version: meta.dataVersion,
      planet: "Mars",
      references: referencesLine(citationSources(CELL_SOURCE_IDS, ds.id)),
      fields_citation: fieldsCitation(ds.id),
      fields_license: fieldsLicence(ds.id),
      transport_law: `${PD23_TEXT} doi:${PAHTZ_DURAN_DOI} (threshold eq. 5.1 with eq. 3.20; transport eq. 3.2)`,
      geospatial_lat_resolution: resolutionText(deg).replace("°", " degree"),
      geospatial_lon_resolution: resolutionText(Math.abs(g.dlon)).replace("°", " degree"),
      license: LICENSE,
      Conventions: "CF-1.8",
      history: `${when}: downloaded from ${meta.permalink}`,
      comment: AI_NOTICE,
    },
    vars,
  });
}

export function csvColumns(cell: MarsCellData, attrs?: ExportMeta["storeAttrs"]): Record<string, CsvColumn[]> {
  const pub = cell.fieldVars.filter(isPublishedField);
  return {
    "wind_series.csv": SERIES_COLUMNS,
    "fields_by_grain_size.csv": [D_COLUMN, ...pub.map((v) => { const m = fieldMeta(v, attrs); return { name: v, units: m.units, longName: m.longName }; }),
      ...auxVars(cell.aux).filter((v) => AUX_META[v].kind === "series").map((v) => ({ name: v, units: AUX_META[v].units, longName: AUX_META[v].longName }))],
    "flux_rose.csv": [
      { name: "rose_mode", units: "1", longName: "flux rose mode: flat_bed, elongation (crest flux about alpha_E) or transverse (about alpha_H)" },
      D_COLUMN,
      ...DIR_COLUMNS,
      { name: "flux_rose", units: "m2 yr-1", longName: "time-averaged sand flux per direction bin (toward)" },
    ],
    [ROSE16_FILE]: rose16Columns(D_COLUMN),
  };
}

export function windSeriesCsv(cell: MarsCellData): string {
  const s = cell.series, rows: string[][] = [];
  for (let k = 0; k < s.u.length; k++) rows.push([String(k), fmtF32(cell.sol[k]), fmtF32(cell.ls[k]), fmtF32(s.u[k]), fmtF32(s.v[k]), fmtF32(s.T[k]), fmtF32(s.rho[k]), fmtF32(s.z[k])]);
  return csvTable(SERIES_COLUMNS, rows);
}

export function fieldsByGrainSizeCsv(cell: MarsCellData, attrs?: ExportMeta["storeAttrs"]): string {
  const n = nUt(cell);
  const pub = cell.fieldVars.map((v, i) => ({ v, i })).filter(({ v }) => isPublishedField(v));
  const series = auxVars(cell.aux).filter((v) => AUX_META[v].kind === "series").map((v) => cell.aux!.series[v]);
  const rows: string[][] = [];
  for (let k = 0; k < n; k++) rows.push([String(cell.dValuesUm[k]), ...pub.map(({ i }) => fmtF32(cell.fields[i * n + k])), ...series.map((a) => fmtF32(a[k]))]);
  return csvTable(csvColumns(cell, attrs)["fields_by_grain_size.csv"], rows);
}

export function fluxRoseCsv(cell: MarsCellData): string {
  const dir = dirCells(), rose = marsFluxRoseTable(cell), rows: string[][] = [];
  ROSE_MODES.forEach((m, mi) => rose[mi].forEach((r, k) => {
    for (let j = 0; j < r.length; j++) rows.push([m, String(cell.dValuesUm[k]), ...dir[j], fmtF32(r[j])]);
  }));
  return csvTable(csvColumns(cell)["flux_rose.csv"], rows);
}

export function metadataJson(cell: MarsCellData, meta: ExportMeta): string {
  const ds = datasetInfo(meta.datasetId), deg = Math.abs(cell.grid.dlat);
  const pub = cell.fieldVars.filter(isPublishedField);
  const cols = csvColumns(cell, meta.storeAttrs);
  return JSON.stringify({
    planet: "Mars",
    cell: { latitude: cell.lat, longitude: cell.lon, cell_y: cell.iy, cell_x: cell.ix, grid_index: cell.id, dune_present: cell.dune, dune_fraction: cell.duneFrac, hours: cell.totalHours },
    grid: { ...cell.grid, resolution: resolutionText(deg), registration: "centre: lat0/lon0 are the centre of cell (0, 0); cell (y, x) spans centre ± d/2" },
    dataset: { id: meta.datasetId, title: meta.datasetTitle, version: meta.dataVersion },
    conventions: { ...CONVENTIONS, dune_present: `1 = ${ds.dunesRule}`, cells: ds.landRule },
    constants: { rho_p: M.RHO_P, g: M.G, R_air: M.R_AIR, mu0: M.MU0, T0: M.T0_MU, S: M.S_MU, k: M.K_ADIABATIC, kappa: M.KAPPA, mixing_length_damping: M.MIX_DAMP, Dstar_min: M.DSTAR_MIN, uplus_min: M.UPLUS_MIN, C1: M.C1, C2: M.C2, beta: M.BETA, A: M.DASPECT, R_Mars: M.R_MARS, year_s: M.S2Y },
    d_um: cell.dValuesUm.slice(0, nUt(cell)),
    files: Object.fromEntries(Object.entries(cols).map(([f, c]) => [f, { columns: c.map(csvColumnJson) }])),
    fields: Object.fromEntries(pub.map((v) => { const m = fieldMeta(v, meta.storeAttrs); return [v, { long_name: m.longName, long_name_latex: m.longNameLatex, units: m.units, description: m.description, description_latex: m.descriptionLatex }]; })),
    aux: Object.fromEntries(auxVars(cell.aux).map((v) => {
      const m = AUX_META[v], src = auxSourceAttrs(cell.aux!, v, deg);
      const value = m.kind === "series" ? undefined : (Number.isFinite(cell.aux!.scalars[v]) ? cell.aux!.scalars[v] : null);
      return [v, { long_name: m.longName, long_name_latex: `${m.longName} $${m.symbolTex}$`, units: m.units, ...(m.kind === "scalar" ? { value } : { in_file: "fields_by_grain_size.csv" }),
        description: texToPlain(auxDescription(v, deg)), ...Object.fromEntries(["source", "references", "license", "url", "comment", "method"].filter((k) => src[k]).map((k) => [k, texToPlain(src[k])])) }];
    })),
    citation: citationJson(citationSources(CELL_SOURCE_IDS, ds.id)),
    fields_citation: fieldsCitation(ds.id), fields_license: fieldsLicence(ds.id),
    license: LICENSE, institution: INSTITUTION,
    generated: (meta.generated ?? new Date()).toISOString(), permalink: meta.permalink, ai_notice: AI_NOTICE,
  }, null, 1) + "\n";
}

export function readmeText(cell: MarsCellData, meta: ExportMeta): string {
  const ds = datasetInfo(meta.datasetId);
  const cols = csvColumns(cell, meta.storeAttrs);
  const colDoc = (f: string) => cols[f].map(csvColumnDoc).join("\n");
  return `Mars Dune Atlas cell export
===========================
Cell: centre ${latLonText(cell.lat, cell.lon)} (grid row ${cell.iy}, column ${cell.ix}); dataset ${meta.datasetTitle} (${meta.datasetId}, ${meta.dataVersion}).
Generated ${(meta.generated ?? new Date()).toISOString()} from ${meta.permalink}

${CSV_LAYOUT_TEXT}

wind_series.csv  ${ds.name} hourly lowest-level wind, temperature, air density and height, ${cell.series.u.length.toLocaleString("en")} hours
  (one Mars year; ${ds.resolution} cell); one row per hour.
${colDoc("wind_series.csv")}

fields_by_grain_size.csv  Sand-flux parameters vs median grain diameter d; one row per d (64 values,
  50-1000 um, log-spaced). Source units: fluxes m2 s-1 (x 31557600 = m2/yr); angles radians
  counter-clockwise from east, direction of transport (bearing = (90 - degrees) mod 360;
  alpha_h = alpha_H is an axis); fractions / ratios dimensionless.
${colDoc("fields_by_grain_size.csv")}

flux_rose.csv  Flux rose vs d: one row per (rose_mode, grain_diameter, direction bin) = 3 x 64 x 128 rows.
  flux = time-averaged sand flux per direction bin (sum over the hours in the bin of q / number
  of hours), m2 yr-1, transport TOWARD direction_bin_centre. Per hour the threshold u*,th depends on d and on that
  hour's air density and temperature. flat_bed: q(u*); elongation / transverse: crest flux with
  speed-up about the mode direction alpha_E / alpha_H at that d.
${colDoc("flux_rose.csv")}

${ROSE16_FILE}  The panel's wind rose and flat-bed sand flux rose in 16 compass sectors (degrees), at
  d = ${cell.dValuesUm[rose16Index(cell, meta)]} um: one row per sector. Wind: % of the hours blowing FROM the sector (lowest-level
  wind); sand flux: m2 yr-1 moving TOWARD the sector. For other grain sizes or sectors use flux_rose.csv.
${colDoc(ROSE16_FILE)}

Physics, all from Pähtz & Durán (2023) J. Fluid Mech. 963:A20: u* from the smooth-wall
mixing-length profile of eq. 2.2 (kappa = ${M.KAPPA}, damping constant ${M.MIX_DAMP}) under constant stress, no roughness
length, at each hour's lowest-level height z (column wind_height) with nu = mu(T)/rho; threshold eq. 5.1 with the
rarefaction correction of eq. 3.20; transport eq. 3.2; grain density ${M.RHO_P} kg m-3, g = ${M.G} m s-2.
Fluxes per Earth year (365.25 d).

flux_divergence (qsdiv; fields_by_grain_size.csv, m yr-1) is the saturated flux divergence of the time-averaged
flat-bed flux vector (magnitude rdp, direction rdd) on the Mars sphere (R = 3389.5 km).

${citationText("", citationSources(CELL_SOURCE_IDS, ds.id)).trim()}

Cite the sand-flux fields as: ${fieldsCitation(ds.id)}. Licence of the fields: ${fieldsLicence(ds.id)}.

Licence: ${LICENSE}.

${AI_NOTICE}
`;
}

export function csvBundle(cell: MarsCellData, meta: ExportMeta, deflate?: DeflateRaw | null): Promise<Uint8Array> {
  return writeZip([
    { name: "README.txt", data: readmeText(cell, meta) },
    { name: "wind_series.csv", data: windSeriesCsv(cell) },
    { name: "fields_by_grain_size.csv", data: fieldsByGrainSizeCsv(cell, meta.storeAttrs) },
    { name: "flux_rose.csv", data: fluxRoseCsv(cell) },
    { name: ROSE16_FILE, data: rose16CsvMars(cell, rose16Index(cell, meta)) },
    { name: "metadata.json", data: metadataJson(cell, meta) },
  ], meta.generated, deflate);
}
/** grain-size index of rose_16_sectors.csv (the panel's; default 200 um) */
const rose16Index = (cell: MarsCellData, meta: ExportMeta) => Math.max(0, Math.min(cell.dValuesUm.length - 1, meta.utIndex ?? 29));
/** rose_16_sectors.csv of a Mars cell at grain-size index `k` (review U7) */
export function rose16CsvMars(cell: MarsCellData, k: number): string {
  const v = analyseMarsCell(cell, k, { windSectors: 16, fluxSectors: 16, fluxMode: "flat" });
  return rose16Csv(D_COLUMN, String(cell.dValuesUm[k]), v.windRose.freq.map((r) => r.reduce((a, x) => a + x, 0)), v.fluxSectors, v.fluxSectorsPct);
}
