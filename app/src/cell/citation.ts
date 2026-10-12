// Citation text shown in the panel and in downloads.
import { richHtml } from "../util/richtext";

/** AI-assistance notice (verbatim; shown in About and written into every download). */
export const AI_NOTICE = "This page was created with assistance from Claude AI. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at a.gunn@monash.edu.";
export const PAPER_DOI = "10.1038/s41467-026-75466-y";
/** Supplementary Data record (CC BY 4.0): wind histograms and qsat parameter fields */
export const DATA_DOI = "10.5281/zenodo.20046812";
export const ERA5LAND_DOI = "10.24381/cds.e2161bac";
export const ERA5LAND_PAPER_DOI = "10.5194/essd-13-4349-2021";

/** One citable work. */
export interface CitationEntry { label: string; text: string; doi: string; license?: string }
/** Citations grouped by SOURCE (each with Paper / Data entries), optionally a usage notice. */
export interface CitationSource { id: string; title: string; entries: CitationEntry[]; notice?: string }

/** Supplementary Code record (v1.0.0, MIT), which contains the dune map (dune-mask-rev1.tif) */
export const DUNE_MAP_DOI = "10.5281/zenodo.20054674";

export const C3S_NOTICE = "Contains modified Copernicus Climate Change Service information (ERA5-Land, 1950–2024). Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data it contains.";

/** All known sources. Only those in DEFAULT_SOURCE_IDS (plus ids requested by active layers via
 *  citationSources(extra)) are cited; 'aridity' is the hook for the aridity-index layer (add its
 *  id to the layer's citation list / DEFAULT_SOURCE_IDS when that layer lands). */
export const CITATION_SOURCES: Record<string, CitationSource> = {
  "dune-atlas": {
    id: "dune-atlas", title: "Dune Atlas / dune map",
    entries: [
      { label: "Paper", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications.", doi: PAPER_DOI },
      // Supplementary Data record: the wind histograms and qsat parameter fields
      { label: "Data (wind histograms and sand-flux fields)", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes - Supplementary Data. Zenodo.", doi: DATA_DOI, license: "CC BY 4.0" },
      // Supplementary Code record: contains the dune map (dune-mask-rev1.tif)
      { label: "Data (dune map)", text: "Gunn, A. (2026). geomorphlab/dune-world: The distribution of Earth's wind-blown sand dunes - Supplementary Code (v1.0.0). Zenodo.", doi: DUNE_MAP_DOI, license: "MIT" },
    ],
  },
  "era5-land": {
    id: "era5-land", title: "ERA5-Land",
    entries: [
      { label: "Paper", text: "Muñoz-Sabater, J. et al. (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications. Earth System Science Data 13, 4349–4383.", doi: ERA5LAND_PAPER_DOI },
      { label: "Data", text: "Muñoz Sabater, J. (2019). ERA5-Land hourly data from 1950 to present. Copernicus Climate Change Service (C3S) Climate Data Store (CDS).", doi: ERA5LAND_DOI },
    ],
    notice: C3S_NOTICE,
  },
  aridity: {
    id: "aridity", title: "Global Aridity Index (Global-AI_PET v3.1)",
    entries: [
      { label: "Paper", text: "Zomer, R. J., Xu, J. & Trabucco, A. (2022). Version 3 of the Global Aridity Index and Potential Evapotranspiration Database. Scientific Data 9, 409.", doi: "10.1038/s41597-022-01493-1" },
      { label: "Data", text: "Zomer, R. J. & Trabucco, A. Global Aridity Index and Potential Evapotranspiration (ET0) Database: Version 3.1 (Global-AI_PET v3.1). Figshare.", doi: "10.6084/m9.figshare.7504448.v7", license: "CC BY 4.0" },
    ],
  },
  vegetation: {
    id: "vegetation", title: "Vegetation cover (CSIRO MODIS Fractional Cover v3.1)",
    entries: [
      { label: "Paper", text: "Guerschman, J. P. et al. (2015). Assessing the effects of site heterogeneity and soil properties when unmixing photosynthetic vegetation, non-photosynthetic vegetation and bare soil fractions from Landsat and MODIS data. Remote Sensing of Environment 161, 12–26.", doi: "10.1016/j.rse.2015.01.021" },
      { label: "Paper", text: "Guerschman, J. P. & Hill, M. J. (2018). Calibration and validation of the Australian fractional cover product for MODIS collection 6. Remote Sensing Letters 9, 696–705.", doi: "10.1080/2150704X.2018.1465611" },
      { label: "Data", text: "Guerschman, J. (2014). Fractional cover - MODIS, CSIRO algorithm (v3.1). CSIRO; hosted by NCI.", doi: "10.4225/08/5848a3f19a7b3", license: "CC BY 4.0, © 2008–2019 CSIRO" },
    ],
    notice: "Full monthly time series: GEOGLAM RAPP Map, https://map.geo-rapp.org/",
  },
};
export const DEFAULT_SOURCE_IDS = ["dune-atlas", "era5-land"];
/** sources of a cell download (the cells-aux sidecars carry the aridity and vegetation cell means) */
export const CELL_SOURCE_IDS = ["aridity", "vegetation"];

/** The sources to cite: the defaults plus any extra ids (e.g. from visible layers), in order. */
export function citationSources(extra: string[] = []): CitationSource[] {
  const ids = [...DEFAULT_SOURCE_IDS, ...extra.filter((x) => !DEFAULT_SOURCE_IDS.includes(x))];
  return ids.map((id) => CITATION_SOURCES[id]).filter((x): x is CitationSource => !!x);
}

/** Flat list (Paper/Data per source), for compact UI lists. */
export const CITATIONS: (CitationEntry & { source: string })[] = citationSources().flatMap((s) => s.entries.map((e) => ({ ...e, source: s.title })));

/** Plain-text citation block grouped by source (TXT download, clipboard, README). */
export function citationText(extra = "", sources: CitationSource[] = citationSources()): string {
  const lines: string[] = [...(extra ? [extra, ""] : []), "Please cite:", ""];
  for (const s of sources) {
    lines.push(s.title);
    for (const e of s.entries) lines.push(`  ${e.label}: ${e.text} https://doi.org/${e.doi}${e.license ? ` (${e.license})` : ""}`);
    if (s.notice) lines.push(`  ${s.notice}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** One-line references string grouped by source (NetCDF `references`). */
export function referencesLine(sources: CitationSource[] = citationSources()): string {
  return sources.map((s) => `${s.title}: ${s.entries.map((e) => `${e.label}: ${e.text} https://doi.org/${e.doi}`).join(" ")}${s.notice ? ` ${s.notice}` : ""}`).join(" | ");
}

/** JSON form (metadata.json `citation`). */
export function citationJson(sources: CitationSource[] = citationSources()) {
  return sources.map((s) => { const keys = entryKeys(s); return { source: s.title, id: s.id, ...Object.fromEntries(s.entries.map((e, i) => [keys[i], { text: e.text, doi: e.doi, url: `https://doi.org/${e.doi}`, ...(e.license ? { license: e.license } : {}) }])), ...(s.notice ? { notice: s.notice } : {}) }; });
}

/** JSON keys of a source's entries: label in snake case, numbered when repeated (paper, paper_2). */
function entryKeys(s: CitationSource): string[] {
  const seen = new Map<string, number>();
  return s.entries.map((e) => {
    const k = e.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n === 1 ? k : `${k}_${n}`;
  });
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Grouped HTML list (panels): one item per source with its Paper / Data entries and notice. */
export function citationHtml(sources: CitationSource[] = citationSources()): string {
  return `<ul class="cite-list">${sources.map((s) => `<li><strong>${esc(s.title)}</strong><ul>${s.entries.map((e) => `<li>${esc(e.label)}: ${esc(e.text)} <a href="https://doi.org/${e.doi}" target="_blank" rel="noopener">doi:${e.doi}</a></li>`).join("")}</ul>${s.notice ? `<p class="help">${richHtml(s.notice)}</p>` : ""}</li>`).join("")}</ul>`;
}
