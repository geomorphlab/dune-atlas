// Citation text shown in the panels and written into downloads. The formatting is shared; the sources are
// the body's (@body/citation: the atlas, per-cell and layer sources) and the datasets' (registry
// `datasets[].citationSources`); which sources a dataset cites, its field citation and licence, its wind
// line of image exports and its data notice are the registry `datasets[].credits` (cell/datasetinfo.ts).
import { richHtml } from "../util/richtext";
import { ABOUT_SOURCE_IDS, BODY_CITATION_SOURCES } from "@body/citation";
import { DATASET_CITATION_SOURCES, DATASET_INFO, datasetCredits } from "./datasetinfo";
import { loadRegistry } from "../registry/load";
export { AI_NOTICE, fileAiNotice, PAPER_DOI } from "./paper";

/** One citable work: a DOI (preferred) or a URL. */
export interface CitationEntry {
  label: string; text: string; doi: string; url?: string; license?: string;
  /** metadata.json key (default: from the label) */
  key?: string;
}
/** Citations grouped by SOURCE (each with Paper / Data entries), optionally a usage notice. */
export interface CitationSource { id: string; title: string; entries: CitationEntry[]; notice?: string }

/** every citation source by id: the body's and the datasets' */
export const CITATION_SOURCES: Record<string, CitationSource> = { ...BODY_CITATION_SOURCES, ...Object.fromEntries(DATASET_CITATION_SOURCES.map((s) => [s.id, s])) };

/** the sources a wind dataset cites (atlas, wind data, ...; registry credits.sources); default dataset if unknown */
export function datasetSourceIds(datasetId?: string): string[] {
  return datasetCredits(datasetId).sources;
}
/** Citation of the atlas-derived map fields of a wind dataset, one format everywhere (info popover, About,
 *  downloads; = the pipeline's fields.fields_citation, tests compare them). */
export const fieldsCitation = (datasetId?: string): string => datasetCredits(datasetId).fieldsCitation;
/** Licence of the atlas-derived map fields of a wind dataset. */
export const fieldsLicence = (datasetId?: string): string => datasetCredits(datasetId).fieldsLicence;
/** the wind line of image exports (map and plots) */
export const windSourceText = (datasetId?: string): string => datasetCredits(datasetId).windSourceText;
/** data notice of a dataset written into downloads (e.g. the Copernicus notice); "" if none */
export const datasetNotice = (datasetId?: string): string => datasetCredits(datasetId).notice ?? "";
/** About, Citation: besides the default dataset's sources, the wind-data source of every other dataset and
 *  the body's extra sources (layers, cell downloads) */
export function aboutSourceIds(): string[] {
  const def = loadRegistry().registry.defaultDataset;
  const others = Object.keys(DATASET_INFO).filter((id) => id !== def).map((id) => datasetCredits(id).dataSource);
  return [...others, ...ABOUT_SOURCE_IDS];
}

/** The sources to cite: the dataset's atlas and wind-data sources, then any extra ids (e.g. the
 *  per-cell aridity / vegetation sources), in order. */
export function citationSources(extra: string[] = [], datasetId?: string): CitationSource[] {
  const base = datasetSourceIds(datasetId);
  const ids = [...base, ...extra.filter((x) => !base.includes(x))];
  return ids.map((id) => CITATION_SOURCES[id]).filter((x): x is CitationSource => !!x);
}

/** Flat list (Paper/Data per source), for compact UI lists. */
export const CITATIONS: (CitationEntry & { source: string })[] = citationSources().flatMap((s) => s.entries.map((e) => ({ ...e, source: s.title })));

/** link of an entry: https://doi.org/<doi>, else its URL */
export const entryLink = (e: CitationEntry) => (e.doi ? `https://doi.org/${e.doi}` : e.url ?? "");

/** Plain-text citation block grouped by source (TXT download, clipboard, README). */
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

/** One-line references string grouped by source (NetCDF `references`). */
export function referencesLine(sources: CitationSource[] = citationSources()): string {
  return sources.map((s) => `${s.title}: ${s.entries.map((e) => `${e.label}: ${e.text} ${entryLink(e)}`).join(" ")}${s.notice ? ` ${s.notice}` : ""}`).join(" | ");
}

/** JSON form (metadata.json `citation`). */
export function citationJson(sources: CitationSource[] = citationSources()) {
  return sources.map((s) => { const keys = entryKeys(s); return { source: s.title, id: s.id, ...Object.fromEntries(s.entries.map((e, i) => [keys[i], { text: e.text, ...(e.doi ? { doi: e.doi } : {}), url: entryLink(e), ...(e.license ? { license: e.license } : {}) }])), ...(s.notice ? { notice: s.notice } : {}) }; });
}

/** JSON keys of a source's entries: label in snake case, numbered when repeated (paper, paper_2). */
function entryKeys(s: CitationSource): string[] {
  const seen = new Map<string, number>();
  return s.entries.map((e) => {
    const k = e.key ?? e.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n === 1 ? k : `${k}_${n}`;
  });
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const entryAnchor = (e: CitationEntry) => (e.doi ? `<a href="https://doi.org/${e.doi}" target="_blank" rel="noopener">doi:${e.doi}</a>` : e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.url.replace(/^https?:\/\//, ""))}</a>` : "");
/** Grouped HTML list (panels): one item per source with its Paper / Data entries and notice. The reference
 *  text and its link are kept as written by page translators (translate="no"); the labels are translated. */
export function citationHtml(sources: CitationSource[] = citationSources()): string {
  return `<ul class="cite-list">${sources.map((s) => `<li><strong>${esc(s.title)}</strong><ul>${s.entries.map((e) => `<li>${esc(e.label)}: <span translate="no" class="notranslate">${esc(e.text)} ${entryAnchor(e)}</span></li>`).join("")}</ul>${s.notice ? `<p class="help">${richHtml(s.notice)}</p>` : ""}</li>`).join("")}</ul>`;
}
