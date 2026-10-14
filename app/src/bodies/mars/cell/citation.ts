// Mars citations (replaces cell/citation.ts in the Mars build; every export of the Earth module
// is still provided so shared modules keep compiling). Entries may have a DOI or only a URL.
// No Copernicus notice applies to Mars data: the C3S notice constants are empty strings.
import { richHtml } from "../../../util/richtext";
export { AI_NOTICE, PAPER_DOI, DATA_DOI, DUNE_MAP_DOI, DUNE_MAP_LABEL, ERA5LAND_DOI, ERA5LAND_PAPER_DOI, ERA5_DOI, ERA5_PAPER_DOI } from "../../../cell/citation";
import { PAPER_DOI } from "../../../cell/citation";

/** One citable work: DOI (preferred) or URL. */
export interface CitationEntry { label: string; text: string; doi: string; url?: string; license?: string }
export interface CitationSource { id: string; title: string; entries: CitationEntry[]; notice?: string }

/** Mars data are not Copernicus information: no notice (kept for the shared imports). */
export const C3S_NOTICE = "";
export const C3S_NOTICE_ERA5 = "";

export const PAHTZ_DURAN_DOI = "10.1017/jfm.2023.343";
export const HABERLE_DOI = "10.1016/j.icarus.2019.03.026";
export const FV3_URL = "https://data.nas.nasa.gov/legacygcm/fv3betaout1/fv3betaout1/";
export const DEM_URL = "https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m";
/** exact wording used by pipeline mars/terrain.py DEM_ATTRIBUTION and registry/mars/generated/x_elevation.yaml */
export const DEM_CITATION = "Fergason, R. L, Hare, T. M., & Laura, J. (2018). HRSC and MOLA Blended Digital Elevation Model at 200m v2. Astrogeology PDS Annex, U.S. Geological Survey.";
export const DEM_LICENCE = "MOLA (CC0) and HRSC (CC BY-SA 3.0 IGO)";
/** licence of the self-built MOLA–HRSC hillshade (terrarium) tiles */
export const HILLSHADE_LICENCE = "the MOLA–HRSC hillshade tiles are released under CC BY-SA 3.0 IGO (derived from HRSC CC BY-SA 3.0 IGO and MOLA CC0)";
export const MGD3_2007_DOI = "10.1029/2007JE002943";

/** Citation of the atlas-derived map fields (FV3 beta 1), the Earth format (cell/citation.ts fieldsCitation;
 *  pipeline mars/sidecars.py CITATION; tests compare them). */
export function fieldsCitation(_datasetId?: string): string {
  return `Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications. doi:${PAPER_DOI}; transport law: Pähtz, T. & Durán, O. (2023). Scaling laws for planetary sediment transport from DEM-RANS numerical simulations. Journal of Fluid Mechanics 963, A20. doi:${PAHTZ_DURAN_DOI}; winds: MCMC FV3-based Mars GCM Beta Output Release 1, one Mars year of hourly lowest-level winds (NASA Ames Mars Climate Modeling Center (2023), ${FV3_URL}; model physics: Haberle, R. M. et al. (2019). Icarus 333, 130–164. doi:${HABERLE_DOI})`;
}
/** Licence of everything derived from the FV3 output. */
export const fieldsLicence = (_datasetId?: string) => "NASA Ames MCMC output; no licence stated (NASA open data)";
export const MGD3_2014_DOI = "10.1016/j.icarus.2013.04.011";
/** Fenton (2020): updated equatorial inventory and many small dune fields (< 1 km², not in MGD3); merged into the dune layer */
export const FENTON_2020_DOI = "10.1016/j.icarus.2020.114018";

export const FV3_TEXT = "NASA Ames Mars Climate Modeling Center (MCMC). FV3-based Mars Global Climate Model, Beta Output Release 1 (fv3betaout1): c48 reference simulation, 6th simulated year, 2° × 2°, hourly.";
export const PD23_TEXT = "Pähtz, T. & Durán, O. (2023). Scaling laws for planetary sediment transport from DEM-RANS numerical simulations. Journal of Fluid Mechanics 963, A20.";

export const CITATION_SOURCES: Record<string, CitationSource> = {
  "dune-atlas-mars": {
    id: "dune-atlas-mars", title: "Mars Dune Atlas (method)",
    entries: [
      { label: "Method (wind-regime and dune-orientation fields)", text: "Gunn, A. (2026). The distribution of Earth's wind-blown sand dunes. Nature Communications.", doi: PAPER_DOI },
    ],
    notice: "Mars wind series, sand-flux fields and flux divergence computed for the Mars Dune Atlas from the FV3 lowest-level winds with the transport law of Pähtz & Durán (2023) and the methods outlined in Gunn (2026).",
  },
  fv3: {
    id: "fv3", title: "MCMC FV3 Mars GCM, beta release 1",
    entries: [
      { label: "Data", text: FV3_TEXT, doi: "", url: FV3_URL },
      { label: "Model physics", text: "Haberle, R. M. et al. (2019). Documentation of the NASA/Ames Legacy Mars Global Climate Model: simulations of the present seasonal water cycle. Icarus 333, 130–164.", doi: HABERLE_DOI },
    ],
  },
  "pahtz-duran": {
    id: "pahtz-duran", title: "Sediment transport law",
    entries: [{ label: "Paper", text: PD23_TEXT, doi: PAHTZ_DURAN_DOI }],
  },
  dunes: {
    id: "dunes", title: "Mars dune map (USGS Mars Global Digital Dune Database and Fenton 2020, merged)",
    entries: [
      { label: "Paper", text: "Hayward, R. K. et al. (2007). Mars Global Digital Dune Database and initial science results. Journal of Geophysical Research 112, E11007.", doi: MGD3_2007_DOI },
      { label: "Paper", text: "Hayward, R. K., Fenton, L. K. & Titus, T. N. (2014). Mars Global Digital Dune Database (MGD3): global dune distribution and wind pattern observations. Icarus 230, 38–46.", doi: MGD3_2014_DOI },
      { label: "Paper", text: "Fenton, L. K. (2020). Updating the global inventory of dune fields on Mars and identification of many small dune fields. Icarus 352, 114018.", doi: FENTON_2020_DOI },
    ],
  },
  dem: {
    id: "dem", title: "Topography (MOLA–HRSC blended DEM)",
    entries: [{ label: "Data", text: DEM_CITATION, doi: "", url: DEM_URL, license: DEM_LICENCE }],
  },
};
export const DEFAULT_SOURCE_IDS = ["dune-atlas-mars", "fv3", "pahtz-duran", "dunes"];
/** the atlas + GCM sources of a wind dataset (one Mars dataset) */
export function datasetSourceIds(_datasetId?: string): string[] { void _datasetId; return DEFAULT_SOURCE_IDS; }
/** sources of a cell download besides the dataset ones (elevation: the DEM) */
export const CELL_SOURCE_IDS = ["dem"];

export function citationSources(extra: string[] = [], datasetId?: string): CitationSource[] {
  const base = datasetSourceIds(datasetId);
  const ids = [...base, ...extra.filter((x) => !base.includes(x))];
  return ids.map((id) => CITATION_SOURCES[id]).filter((x): x is CitationSource => !!x);
}

export const CITATIONS: (CitationEntry & { source: string })[] = citationSources().flatMap((s) => s.entries.map((e) => ({ ...e, source: s.title })));

/** link of an entry: https://doi.org/<doi>, else its URL */
export const entryLink = (e: CitationEntry) => (e.doi ? `https://doi.org/${e.doi}` : e.url ?? "");

export function citationText(extra = "", sources: CitationSource[] = citationSources()): string {
  const lines: string[] = [...(extra ? [extra, ""] : []), "Please cite:", ""];
  for (const s of sources) {
    lines.push(s.title);
    for (const e of s.entries) lines.push(`  ${e.label}: ${e.text} ${entryLink(e)}${e.license ? ` (${e.license})` : ""}`);
    if (s.notice) lines.push(`  ${s.notice}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function referencesLine(sources: CitationSource[] = citationSources()): string {
  return sources.map((s) => `${s.title}: ${s.entries.map((e) => `${e.label}: ${e.text} ${entryLink(e)}`).join(" ")}${s.notice ? ` ${s.notice}` : ""}`).join(" | ");
}

export function citationJson(sources: CitationSource[] = citationSources()) {
  return sources.map((s) => {
    const seen = new Map<string, number>();
    const keys = s.entries.map((e) => { const k = e.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, ""); const n = (seen.get(k) ?? 0) + 1; seen.set(k, n); return n === 1 ? k : `${k}_${n}`; });
    return { source: s.title, id: s.id, ...Object.fromEntries(s.entries.map((e, i) => [keys[i], { text: e.text, ...(e.doi ? { doi: e.doi } : {}), url: entryLink(e), ...(e.license ? { license: e.license } : {}) }])), ...(s.notice ? { notice: s.notice } : {}) };
  });
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function citationHtml(sources: CitationSource[] = citationSources()): string {
  const link = (e: CitationEntry) => (e.doi ? `<a href="https://doi.org/${e.doi}" target="_blank" rel="noopener">doi:${e.doi}</a>` : e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url.replace(/^https?:\/\//, ""))}</a>` : "");
  return `<ul class="cite-list">${sources.map((s) => `<li><strong>${esc(s.title)}</strong><ul>${s.entries.map((e) => `<li>${esc(e.label)}: ${esc(e.text)} ${link(e)}</li>`).join("")}</ul>${s.notice ? `<p class="help">${richHtml(s.notice)}</p>` : ""}</li>`).join("")}</ul>`;
}

/** Map attribution of the wind-regime fields (Earth: follows the selected dataset); the Mars map attribution is
 *  set in src/bodies/mars/main.ts. Exported so the Mars module has the Earth module's names. */
export function mapAttributionHtml(datasetId: string): string {
  void datasetId;
  return "";
}
