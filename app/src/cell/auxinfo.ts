// Metadata of the per-cell auxiliary variables (cells-aux.zarr) as shown in the panel and written
// to the downloads. Names, descriptions, units (UDUNITS) and source statements are defined here;
// the store attrs give citation, DOI, licence and link.
import type { CellAux } from "./cellstore";

export interface AuxMeta {
  longName: string;
  /** LaTeX symbol (without $) */
  symbolTex: string;
  units: string;
  /** threshold series (ut) or cell scalar */
  kind: "series" | "scalar";
  /** panel display: multiply by displayScale, show in displayUnits */
  displayUnits?: string;
  displayScale?: number;
  description: string;
}

export const AUX_META: Record<string, AuxMeta> = {
  qsdiv: {
    longName: "Saturated flux divergence", symbolTex: "\\nabla\\cdot\\vec{q}_s", units: "m yr-1", kind: "series", displayUnits: "m/kyr", displayScale: 1000,
    description: "Divergence of the time-averaged flat-bed saturated sand-flux vector (magnitude RDP, direction RDD) on the sphere, following Gunn (2026), Methods M6; negative = flux convergence (deposition), positive = flux divergence (erosion); undefined at coasts.",
  },
  ai_mean: {
    longName: "Aridity index, mean over the cell", symbolTex: "\\overline{\\mathrm{AI}}", units: "1", kind: "scalar",
    description: "Mean of the valid 30-arc-second Global-AI v3.1 pixels inside the 0.1° cell; a lower bound where ai_sat_frac > 0.",
  },
  ai_valid_frac: {
    longName: "Fraction of the cell footprint with valid aridity data", symbolTex: "f_\\mathrm{valid}", units: "1", kind: "scalar",
    description: "Valid 30″ pixels / 144 (nominal pixels per 0.1° cell).",
  },
  ai_sat_frac: {
    longName: "Fraction of valid aridity pixels at saturation (AI ≥ 6.5535)", symbolTex: "f_\\mathrm{sat}", units: "1", kind: "scalar",
    description: "Fraction of the valid pixels at the top of the source range (AI ≥ 6.5535); undefined where no pixel is valid.",
  },
  tot_cov_mean: {
    longName: "Total vegetation cover, mean 2001–2025", symbolTex: "\\overline{V}", units: "%", kind: "scalar",
    description: "Mean of the valid monthly total vegetation cover values (photosynthetic + non-photosynthetic vegetation, CSIRO MODIS Fractional Cover v3.1) in the 0.1° cell, 2001–2025; months without a valid value are skipped; undefined where no month is valid. Values up to 103 % are valid (the cover fractions sum to 100 % ± 3 %).",
  },
  tot_cov_n_months: {
    longName: "Number of months with valid vegetation cover, 2001–2025", symbolTex: "n_\\mathrm{months}", units: "1", kind: "scalar",
    description: "Number of the 300 months 2001–2025 with a valid 0.1° monthly value (0 outside the source coverage; fewer at high latitudes because of snow, cloud and polar night).",
  },
};
export const AUX_ORDER = ["qsdiv", "ai_mean", "ai_valid_frac", "ai_sat_frac", "tot_cov_mean", "tot_cov_n_months"];

/** Variables of `aux` with metadata, in AUX_ORDER (unknown variables are skipped). */
export function auxVars(aux: CellAux | undefined): string[] {
  if (!aux) return [];
  return AUX_ORDER.filter((v) => (AUX_META[v].kind === "series" ? v in aux.series : v in aux.scalars));
}

/** Source statement of the flux divergence (derived by the atlas from the Gunn (2026) data). */
export const QSDIV_SOURCE = "Derived by dune-atlas from rdpm and rdpa of Gunn (2026) Nat Commun doi:10.1038/s41467-026-75466-y; data doi:10.5281/zenodo.20046812";
/** Processing of the aridity data (as in the registry attribution of the aridity layer). */
export const ARIDITY_CHANGES = "Processed for the atlas: source integers (AI x 10^4) converted to decimal AI; ocean (no ET0 data) and ET0 = 0 pixels set to no data; the source maximum 65535 kept as 6.5535 (AI >= 6.5535); 0.1° cell means of the valid 30-arc-second pixels.";

/** Vegetation cover (cells-aux-veg.zarr) source statement. */
export const VEGETATION_SOURCE = "Fractional cover - MODIS, CSIRO Land and Water algorithm, version 3.1 (CSIRO; MODIS MCD43A4, monthly, 500 m): total vegetation cover (photosynthetic + non-photosynthetic vegetation), 2001–2025; the vegetation product of GEOGLAM Rangeland and Pasture Productivity (RAPP), hosted by NCI";
export const VEGETATION_LICENCE = "CC BY 4.0, © 2008–2019 CSIRO";
export const VEGETATION_URL = "https://map.geo-rapp.org/";
export const VEGETATION_CHANGES = "Processed for the atlas: monthly 500 m values averaged to the 0.1° cell and over the months 2001–2025 with a valid value (≤ 103 %).";

/** Attributes of an aux variable for the NetCDF / metadata.json: description, source and processing
 *  defined here; citation, DOI, licence and link from the store attrs. */
export function auxSourceAttrs(aux: CellAux, v: string): Record<string, string> {
  const a = aux.attrs[v] ?? {};
  const out: Record<string, string> = {};
  const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
  if (AUX_META[v]) out.description = AUX_META[v].description;
  if (v === "qsdiv") {
    out.source = QSDIV_SOURCE;
    out.method = "Gunn (2026) Methods M6: central differences on the 0.1° grid, periodic in longitude, R = 6371 km";
  } else if (str("source")) out.source = str("source")!;
  const cite = [str("citation"), str("doi") ? `data doi:${str("doi")}` : undefined].filter(Boolean).join("; ");
  if (cite) out.references = cite;
  if (str("licence")) out.license = str("licence")!;
  if (str("url")) out.url = str("url")!;
  if (v.startsWith("ai_") && str("changes")) out.comment = ARIDITY_CHANGES;
  if (v.startsWith("tot_cov_")) {
    out.source = VEGETATION_SOURCE;
    out.license = VEGETATION_LICENCE;
    out.url = VEGETATION_URL;
    out.comment = VEGETATION_CHANGES;
  }
  return out;
}

/** UNEP aridity class of an AI value. */
export function aridityClass(ai: number): string {
  if (!Number.isFinite(ai)) return "";
  return ai < 0.03 ? "hyper-arid" : ai < 0.2 ? "arid" : ai < 0.5 ? "semi-arid" : ai < 0.65 ? "dry sub-humid" : "humid";
}
