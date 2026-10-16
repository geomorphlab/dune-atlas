// Metadata written into the downloads of both atlases (cell NetCDF and CSV bundle, region NetCDF and README): the
// licence statement, the data notice, cell edges, exact cell centres, creation date and time coverage. Everything
// comes from the registry entry of the wind dataset (credits, info), so a new dataset brings its own licence, notice
// and period without code.
import { datasetNotice, fieldsLicence } from "./citation";
import type { DatasetInfo } from "./datasetinfo";
import type { Grid } from "./snap";

/** the licences of every product and source (DATA_LICENSE.md in the repository) */
export const DATA_LICENSE_URL = "https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md";

/** Global `license` of a download: there is no blanket licence. The sand-flux fields and wind data carry the licence
 *  of the wind dataset's products (registry credits.fieldsLicence); every other variable states its own. */
export const licenceStatement = (datasetId: string): string =>
  `Sand-flux fields and wind data: ${fieldsLicence(datasetId)}. Other variables: see their license attribute. Licences of every source: ${DATA_LICENSE_URL}`;

/** the dataset's data notice (e.g. the Copernicus or Open Government Licence notice) as a global attribute; none if the
 *  dataset has none */
export const noticeAttrs = (datasetId: string): Record<string, string> => {
  const n = datasetNotice(datasetId);
  return n ? { data_notice: n } : {};
};

/** how cell indices map to coordinates (both atlases, every download) */
export const GRID_REGISTRATION = "centre: lat0/lon0 are the centre of cell (0, 0); cell (y, x) spans centre ± |dlat|/2 in latitude and ± |dlon|/2 in longitude, clipped at ±90° (a row centred on a pole is a half cell)";
export const GRID_INDEX_COMMENT = "latitude = grid_lat0 + grid_dlat * cell_y; longitude = grid_lon0 + grid_dlon * cell_x";
/** GRID_INDEX_COMMENT of a grid with exact (Gaussian) row latitudes (Grid.latValues) */
export const GAUSSIAN_INDEX_COMMENT = "latitude = the Gaussian latitude of row cell_y (the file's latitude); the cell footprint "
  + "(lat_bnds) is centred on grid_lat0 + grid_dlat * cell_y, the regular grid fitted through the end rows, which also places "
  + "the cell on the map; longitude = grid_lon0 + grid_dlon * cell_x";
export const gridIndexComment = (g: Pick<Grid, "latValues">) => (g.latValues ? GAUSSIAN_INDEX_COMMENT : GRID_INDEX_COMMENT);

/** a grid coordinate without the floating-point tail of lat0 + dlat * i (23.299999999999997 -> 23.3; 12 significant digits) */
export const exactCoord = (v: number): number => Number(v.toPrecision(12));
/** exact centre of row iy (the Gaussian latitude where the grid has them) / column ix */
export const rowLat = (g: Pick<Grid, "lat0" | "dlat" | "latValues">, iy: number) => exactCoord(g.latValues?.[iy] ?? g.lat0 + g.dlat * iy);
/** centre of the footprint of row iy (lat0 + dlat * iy; equals rowLat except on Gaussian grids): cell edges and selection */
export const footprintLat = (g: Pick<Grid, "lat0" | "dlat">, iy: number) => exactCoord(g.lat0 + g.dlat * iy);
export const colLon = (g: Pick<Grid, "lon0" | "dlon">, ix: number) => exactCoord(g.lon0 + g.dlon * ix);

/** edges of the cell centred on (lat, lon), latitude clipped at ±90° */
export function cellEdges(lat: number, lon: number, g: Pick<Grid, "dlat" | "dlon">): { south: number; north: number; west: number; east: number } {
  const hy = Math.abs(g.dlat) / 2, hx = Math.abs(g.dlon) / 2;
  return { south: exactCoord(Math.max(-90, lat - hy)), north: exactCoord(Math.min(90, lat + hy)), west: exactCoord(lon - hx), east: exactCoord(lon + hx) };
}
/** [north, south] edges of a row (lat_bnds order of the downloads: from the north edge) */
export const latBounds = (lat: number, dlat: number): [number, number] => {
  const e = cellEdges(lat, 0, { dlat, dlon: 0 });
  return [e.north, e.south];
};

/** ACDD time coverage of an Earth wind record from its period ("1950–2024": hourly samples from 1 January of the first
 *  year to 31 December of the last); none for a record without calendar years (Mars). */
export function timeCoverage(ds: Pick<DatasetInfo, "period" | "series">): Record<string, string> {
  const m = /^(\d{4})\s*[–-]\s*(\d{4})$/.exec(ds.period.trim());
  if (!m || ds.series) return {};
  return { time_coverage_start: `${m[1]}-01-01T00:00:00Z`, time_coverage_end: `${m[2]}-12-31T23:00:00Z`, time_coverage_resolution: "PT1H" };
}
