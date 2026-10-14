// Citation text shown in the panels and written into downloads. The formatting is shared; the sources
// (which works to cite for a dataset, a cell download or a layer) are per body (@body/citation).
import { richHtml } from "../util/richtext";
import { CITATION_SOURCES, datasetSourceIds } from "@body/citation";
export { AI_NOTICE, PAPER_DOI } from "./paper";

/** One citable work: a DOI (preferred) or a URL. */
export interface CitationEntry {
  label: string; text: string; doi: string; url?: string; license?: string;
  /** metadata.json key (default: from the label) */
  key?: string;
}
/** Citations grouped by SOURCE (each with Paper / Data entries), optionally a usage notice. */
export interface CitationSource { id: string; title: string; entries: CitationEntry[]; notice?: string }

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
/** Grouped HTML list (panels): one item per source with its Paper / Data entries and notice. */
export function citationHtml(sources: CitationSource[] = citationSources()): string {
  return `<ul class="cite-list">${sources.map((s) => `<li><strong>${esc(s.title)}</strong><ul>${s.entries.map((e) => `<li>${esc(e.label)}: ${esc(e.text)} ${entryAnchor(e)}</li>`).join("")}</ul>${s.notice ? `<p class="help">${richHtml(s.notice)}</p>` : ""}</li>`).join("")}</ul>`;
}
