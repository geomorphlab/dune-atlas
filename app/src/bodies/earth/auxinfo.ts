// Earth per-cell auxiliary variables (cells-aux.zarr, cells-aux-veg.zarr: flux divergence, aridity,
// vegetation cover) as shown in the panel and written to the downloads. Names, descriptions, units
// (UDUNITS) and source statements are defined here; the store attrs give citation, DOI, licence and link.
import type { CellAux } from "../../core/cell/cellstore";
import type { AuxMeta } from "../../core/cell/auxinfo";
import { cellSizeText, datasetInfo, halfCellText, pixelsPerCell } from "../../core/cell/datasetinfo";

export const AUX_META: Record<string, AuxMeta> = {
  qsdiv: {
    longName: "Saturated flux divergence", symbolTex: "\\nabla\\cdot\\vec{q}_s", units: "m yr-1", kind: "series", displayUnits: "m/kyr", displayScale: 1000,
    description: "Divergence of the time-averaged flat-bed saturated sand-flux vector (magnitude RDP, direction RDD) on the sphere, following Gunn (2026), Methods M6; negative = flux convergence (deposition), positive = flux divergence (erosion); undefined at coasts.",
  },
  ai_mean: {
    longName: "Aridity index, mean over the cell", symbolTex: "\\overline{\\mathrm{AI}}", units: "1", kind: "scalar",
    description: "Mean of the valid 30-arc-second Global-AI v3.1 pixels inside the {res} cell (centre ± {half}); a lower bound where ai_sat_frac > 0.",
  },
  ai_valid_frac: {
    longName: "Fraction of the cell footprint with valid aridity data", symbolTex: "f_\\mathrm{valid}", units: "1", kind: "scalar",
    description: "Valid 30″ pixels / {npx} (nominal pixels per {res} cell).",
  },
  ai_sat_frac: {
    longName: "Fraction of valid aridity pixels at saturation (AI ≥ 6.5535)", symbolTex: "f_\\mathrm{sat}", units: "1", kind: "scalar",
    description: "Fraction of the valid pixels at the top of the source range (AI ≥ 6.5535); undefined where no pixel is valid.",
  },
  tot_cov_mean: {
    longName: "Total vegetation cover, mean 2001–2025", symbolTex: "\\overline{V}", units: "%", kind: "scalar",
    description: "Mean of the valid monthly total vegetation cover values (photosynthetic + non-photosynthetic vegetation, CSIRO MODIS Fractional Cover v3.1) in the {res} cell, 2001–2025{regrid}; months without a valid value are skipped; undefined where no month is valid. Values up to 103 % are valid (the cover fractions sum to 100 % ± 3 %).",
  },
  tot_cov_valid_frac: {
    longName: "Fraction of the cell footprint with vegetation cover data", symbolTex: "f_\\mathrm{valid}", units: "1", kind: "scalar",
    description: "Area fraction of the {res} cell footprint covered by 0.1° cells with a valid mean vegetation cover (0 outside the source coverage).",
  },
};
/** The per-cell variables shown and downloaded - the same set, names and order for every wind
 *  dataset (store-specific extras such as the ERA5 land–sea mask or the 0.1° month count are not
 *  published per cell; see harmonizeAux). */
export const AUX_ORDER = ["qsdiv", "ai_mean", "ai_valid_frac", "ai_sat_frac", "tot_cov_mean", "tot_cov_valid_frac"];

/** Map the sidecar variables of any dataset onto AUX_ORDER. On the native 0.1° vegetation grid a
 *  cell is a single vegetation cell, so its valid fraction is 1 where the 2001–2025 mean is valid
 *  and 0 otherwise (the 0.25° ERA5 store has the area fraction). Unlisted variables are dropped. */
export function harmonizeAux(aux: CellAux): CellAux {
  const scalars: Record<string, number> = { ...aux.scalars };
  const attrs: CellAux["attrs"] = { ...aux.attrs };
  if (!("tot_cov_valid_frac" in scalars) && "tot_cov_mean" in scalars) {
    scalars.tot_cov_valid_frac = Number.isFinite(scalars.tot_cov_mean) ? 1 : 0;
    attrs.tot_cov_valid_frac = aux.attrs.tot_cov_mean ?? {};
  }
  const out: CellAux = { series: {}, scalars: {}, attrs: {} };
  for (const v of AUX_ORDER) {
    if (v in aux.series) out.series[v] = aux.series[v];
    else if (v in scalars) out.scalars[v] = scalars[v];
    else continue;
    if (attrs[v]) out.attrs[v] = attrs[v];
  }
  return out;
}

/** Description of an aux variable for a grid of `deg` degree cells (`degLon`: the longitude spacing of
 *  non-square cells, MERRA-2 0.5° × 0.625°; cell sizes in the dataset's own wording, datasetinfo.cellSizeText). */
export function auxDescription(v: string, deg = 0.1, degLon = deg): string {
  const d = AUX_META[v]?.description ?? "";
  return d.replace(/\{res\}/g, cellSizeText(deg, degLon)).replace(/\{half\}/g, halfCellText(deg, degLon)).replace(/\{npx\}/g, String(pixelsPerCell(deg, degLon)))
    .replace(/\{regrid\}/g, deg > 0.1 + 1e-9 ? " (area-weighted mean of the 0.1° cell means over the cell footprint)" : "");
}

/** Variables of `aux` with metadata, in AUX_ORDER (unknown variables are skipped). */
export function auxVars(aux: CellAux | undefined): string[] {
  if (!aux) return [];
  return AUX_ORDER.filter((v) => (AUX_META[v].kind === "series" ? v in aux.series : v in aux.scalars));
}

/** Source statement of the flux divergence (derived by the atlas from the Gunn (2026) data). */
export const QSDIV_SOURCE = "Computed for the Dune Atlas from rdpm and rdpa of Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812";
/** source of the flux divergence of a dataset: from the paper's fields (its data record) or from the fields the atlas
 *  computed for the dataset with the methods of the paper */
export function qsdivSource(datasetId?: string): string {
  const d = datasetInfo(datasetId);
  return d.fieldsFrom === "paper" ? QSDIV_SOURCE : `Computed for the Dune Atlas from rdpm and rdpa of the ${d.name} ${d.resolution} sand-flux fields, which the atlas computed with the methods of Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y`;
}
/** Processing of the aridity data (as in the registry attribution of the aridity layer). */
export const ARIDITY_CHANGES = "Processed for the atlas: source integers (AI x 10^4) converted to decimal AI; ocean (no ET0 data) and ET0 = 0 pixels set to no data; the source maximum 65535 kept as 6.5535 (AI >= 6.5535); 0.1° cell means of the valid 30-arc-second pixels.";

/** Vegetation cover (cells-aux-veg.zarr) source statement. */
export const VEGETATION_SOURCE = "Fractional cover - MODIS, CSIRO Land and Water algorithm, version 3.1 (CSIRO; MODIS MCD43A4, monthly, 500 m): total vegetation cover (photosynthetic + non-photosynthetic vegetation), 2001–2025; the vegetation product of GEOGLAM Rangeland and Pasture Productivity (RAPP), hosted by NCI";
export const VEGETATION_LICENCE = "CC BY 4.0, © 2008–2019 CSIRO";
export const VEGETATION_URL = "https://map.geo-rapp.org/";
export const VEGETATION_CHANGES = "Processed for the atlas: monthly 500 m values averaged to the 0.1° cell and over the months 2001–2025 with a valid value (≤ 103 %).";

/** Licence of a store attribute as stated today: stores built before 2 July 2025's change of the Climate Data
 *  Store licence carry "Licence to use Copernicus products" (ERA5 `lsm`, which downloads do not include); ERA5 is
 *  now distributed under CC BY 4.0, and any such attribute is restated. The stores themselves are not rewritten (DATA_LICENSE.md, note 1). */
export function restateLicence(licence: string): string {
  return /Licence to use Copernicus products/i.test(licence) ? "CC BY 4.0" : licence;
}

/** Attributes of an aux variable for the NetCDF / metadata.json: description, source and processing
 *  defined here; citation, DOI, licence and link from the store attrs. */
/** source statement of a per-cell variable (`degLon`: longitude spacing of non-square cells; `datasetId`: the
 *  wind dataset of the cell) */
export function auxSourceAttrs(aux: CellAux, v: string, deg = 0.1, degLon = deg, datasetId?: string): Record<string, string> {
  const a = aux.attrs[v] ?? {};
  const out: Record<string, string> = {};
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
  if (AUX_META[v]) out.description = auxDescription(v, deg, degLon);
  if (v === "qsdiv") {
    out.source = qsdivSource(datasetId);
    out.method = `Gunn (2026) Methods M6: central differences on the ${cellSizeText(deg, degLon)} grid, periodic in longitude, R = 6371 km`;
  } else if (str("source")) out.source = str("source")!;
  const cite = [str("citation"), str("doi") ? `data doi:${str("doi")}` : undefined].filter(Boolean).join("; ");
  if (cite) out.references = cite;
  if (str("licence")) out.license = restateLicence(str("licence")!);
  if (str("url")) out.url = str("url")!;
  if (v.startsWith("ai_") && str("changes")) out.comment = ARIDITY_CHANGES;
  if (v.startsWith("tot_cov_")) {
    out.source = VEGETATION_SOURCE;
    out.license = VEGETATION_LICENCE;
    out.url = VEGETATION_URL;
    out.comment = deg > 0.1 + 1e-9 ? VEGETATION_CHANGES.replace("averaged to the 0.1° cell", `averaged to 0.1° cells, then area-weighted to the ${cellSizeText(deg, degLon)} cell,`) : VEGETATION_CHANGES;
  }
  return out;
}

/** UNEP aridity class of an AI value. */
export function aridityClass(ai: number): string {
  if (!Number.isFinite(ai)) return "";
  return ai < 0.03 ? "hyper-arid" : ai < 0.2 ? "arid" : ai < 0.5 ? "semi-arid" : ai < 0.65 ? "dry sub-humid" : "humid";
}
