// Mars per-cell auxiliary variables (cells-aux.zarr: qsdiv (lat, lon, d), rho_mean, elev_mean) as
// shown in the panel and written to the downloads. The divergence uses the Mars radius.
import type { CellAux } from "../../core/cell/cellstore";
import { datasetInfo, gridResolutionText } from "../../core/cell/datasetinfo";
import type { AuxMeta } from "../../core/cell/auxinfo";
import { R_MARS } from "./body";
import { DEM_CITATION, DEM_LICENCE, DERIVED_DEM_LICENCE } from "./citation";
import { fieldsLicence } from "../../core/cell/citation";

export const AUX_META: Record<string, AuxMeta> = {
  qsdiv: {
    longName: "Saturated flux divergence", symbolTex: "\\nabla\\cdot\\vec{q}_s", units: "m yr-1", kind: "series", displayUnits: "m/kyr", displayScale: 1000,
    description: "Divergence of the time-averaged flat-bed saturated sand-flux vector (magnitude RDP, direction RDD) on the Mars sphere, following Gunn (2026), Methods M6; negative = flux convergence (deposition), positive = flux divergence (erosion).",
  },
  rho_mean: {
    longName: "Near-surface air density, mean over the year", symbolTex: "\\overline{\\rho_f}", units: "kg m-3", kind: "scalar",
    description: "Mean of the lowest-layer air density ρ_f = p/(R T) of the {res} cell over the samples of the Mars year.",
  },
  elev_mean: {
    longName: "Elevation, mean over the cell", symbolTex: "\\overline{z}", units: "m", kind: "scalar",
    description: "Mean of the MOLA–HRSC blended DEM (200 m) over the {res} cell, relative to the Mars 2000 areoid.",
  },
};
/** per-cell variables shown and downloaded, in this order */
export const AUX_ORDER = ["qsdiv", "rho_mean", "elev_mean"];

export function harmonizeAux(aux: CellAux): CellAux {
  const out: CellAux = { series: {}, scalars: {}, attrs: {} };
  for (const v of AUX_ORDER) {
    if (v in aux.series) out.series[v] = aux.series[v];
    else if (v in aux.scalars) out.scalars[v] = aux.scalars[v];
    else continue;
    if (aux.attrs[v]) out.attrs[v] = aux.attrs[v];
  }
  return out;
}

/** cell size as text: "2°", "6° × 5.14°" (longitude × latitude spacing degLon × deg) */
const cellText = (deg: number, degLon = deg) => gridResolutionText({ dlat: deg, dlon: degLon });

/** description with {res} = the cell size (latitude spacing `deg`, longitude spacing `degLon`) */
export function auxDescription(v: string, deg = 2, degLon = deg): string {
  const d = AUX_META[v]?.description ?? "";
  return d.replace(/\{res\}/g, cellText(deg, degLon)).replace(/\{half\}/g, cellText(deg / 2, degLon / 2));
}

export function auxVars(aux: CellAux | undefined): string[] {
  if (!aux) return [];
  return AUX_ORDER.filter((v) => (AUX_META[v].kind === "series" ? v in aux.series : v in aux.scalars));
}

export const QSDIV_SOURCE = "Derived by the Mars Dune Atlas from rdpm and rdpa (winds of the wind dataset, Pähtz & Durán 2023 transport law)";
export const QSDIV_METHOD = (deg: number, degLon = deg) => `Gunn (2026) Methods M6: central differences on the ${cellText(deg, degLon)} grid, periodic in longitude, R = ${(R_MARS / 1000).toFixed(1)} km`;

/** source statement of a per-cell variable; `datasetId`: the wind dataset of the cell (default: the default dataset) */
export function auxSourceAttrs(aux: CellAux, v: string, deg = 2, degLon = deg, datasetId?: string): Record<string, string> {
  const a = aux.attrs[v] ?? {};
  const out: Record<string, string> = {};
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
  if (AUX_META[v]) out.description = auxDescription(v, deg, degLon);
  if (v === "qsdiv") { out.source = QSDIV_SOURCE; out.method = QSDIV_METHOD(deg, degLon); }
  else if (v === "elev_mean") { out.source = (str("source") ?? "Mars MGS MOLA – MEX HRSC Blended DEM Global 200m v2 (USGS Astrogeology Science Center)").replace("MOLA - MEX", "MOLA – MEX") /* one spelling in every dataset */; out.license = `${DEM_LICENCE}. ${DERIVED_DEM_LICENCE}`; out.references = DEM_CITATION; }
  else if (v === "rho_mean") {
    const ds = datasetInfo(datasetId);
    out.source = str("source") ?? (ds.id === "fv3-beta1" ? "MCMC FV3 Mars GCM beta release 1: lowest-layer p/(R T)" : `${ds.name}: lowest-layer p/(R T)`);
  }
  else if (str("source")) out.source = str("source")!;
  const cite = [str("citation"), str("doi") ? `data doi:${str("doi")}` : undefined].filter(Boolean).join("; ");
  if (cite) out.references = cite;
  // wind-derived values: the licence of the dataset's fields (the FV3 v1 store attrs say CC BY 4.0 for rho_mean; superseded)
  if (v === "rho_mean" || v === "qsdiv") out.license = fieldsLicence(datasetId);
  else if (str("licence") && v !== "elev_mean") out.license = str("licence")!;
  if (str("url")) out.url = str("url")!;
  return out;
}

