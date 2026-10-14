// Concepts panel (mortarboard button): what the quantities of the atlas mean, with references. The text is the
// approved file docs/concepts/concepts-earth-mars.md, read at build time and used unchanged; only the markup
// is adapted (the symbols are set in TeX as elsewhere on the site, and the references are linked). Entries are
// tagged Earth, Mars or both; each atlas shows its own and "both". Layer ⓘ popovers link to their entry
// (CONCEPT_OF_LAYER).
import conceptsMd from "../../../../docs/concepts/concepts-earth-mars.md?raw";
import { BODY } from "../body";
import { escapeHtml } from "../util/format";
import { mathHtml } from "../util/math";

export type ConceptTag = "Earth" | "Mars" | "both";
export interface Concept { id: string; title: string; tag: ConceptTag; paragraphs: string[]; refs: string[] }
export interface ConceptReference { key: string; text: string }

/** "Drift potential (DP)" -> "drift-potential-dp"; Greek letters are kept ("migration-direction-αt") */
export const conceptId = (title: string) => title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

/** "Courrech du Pont et al. (2024)" / "Courrech du Pont, S., Rubin, ... (2024)." -> "courrech du pont 2024" */
export function refKey(s: string): string {
  const year = /\((\d{4}[a-z]?)\)/.exec(s)?.[1] ?? "";
  const first = s.split(/,| et al\.| & | and | \(/)[0].trim();
  return `${first.toLowerCase()} ${year}`;
}

/** Parse the concepts file: the entries of section 5 and the references of section 6. */
export function parseConcepts(md: string): { entries: Concept[]; references: ConceptReference[] } {
  const sec = (n: number) => {
    const m = new RegExp(`^## ${n}\\. .*$`, "m").exec(md);
    if (!m) return "";
    const rest = md.slice(m.index + m[0].length);
    const end = /^## \d+\. |^---\s*$/m.exec(rest);
    return end ? rest.slice(0, end.index) : rest;
  };
  const entries: Concept[] = [];
  for (const block of sec(5).split(/^### /m).slice(1)) {
    const [head, ...lines] = block.split("\n");
    const m = /^(.*) — (Earth|Mars|both)\s*$/.exec(head.trim());
    if (!m) continue;
    const body = lines.join("\n").trim();
    const refLine = /^References: (.*)$/m.exec(body);
    const text = (refLine ? body.slice(0, refLine.index) : body).trim();
    const refs = refLine && !/^none\.?$/i.test(refLine[1].trim()) ? refLine[1].replace(/\.\s*$/, "").split(/;\s*/).map((r) => r.trim()).filter(Boolean) : [];
    entries.push({ id: conceptId(m[1]), title: m[1], tag: m[2] as ConceptTag, paragraphs: text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean), refs });
  }
  const references = sec(6).split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean).map((text) => ({ key: refKey(text), text }));
  return { entries, references };
}

const PARSED = parseConcepts(conceptsMd);
/** the concepts of this atlas (its own and those tagged "both"), in file order */
export const CONCEPTS: Concept[] = PARSED.entries.filter((c) => c.tag === "both" || c.tag.toLowerCase() === BODY);
export const CONCEPT_REFERENCES = PARSED.references;

/** Symbols of the text in the TeX the site uses for them (layer titles, tables); longest first. Markup only. */
const TEX: [RegExp, string][] = [
  [/Q̂\|⊥\|\/⊥,H/g, "$\\hat{Q}_{|\\bot|/\\bot,H}$"],
  [/Q̂\|⊥\|\/∥,E/g, "$\\hat{Q}_{|\\bot|/\\parallel,E}$"],
  [/Q̂∥\/⊥,H/g, "$\\hat{Q}_{\\parallel/\\bot,H}$"],
  [/σE\/σH/g, "$\\sigma_E/\\sigma_H$"],
  [/α([TEHO])(?![\p{L}\p{N}])/gu, "$\\alpha_$1$"],
  [/u\*,th/g, "$u_{*,th}$"],
  [/u\*/g, "$u_*$"],
  [/V²\(V − Vt\)/g, "$V^2(V - V_t)$"],
];
export const texify = (s: string) => TEX.reduce((t, [re, r]) => t.replace(re, r), s);

/** a reference with its DOI linked */
function referenceHtml(text: string): string {
  const m = /doi:(10\.\S+?)\.?$/.exec(text);
  if (!m) return escapeHtml(text);
  const before = text.slice(0, m.index);
  return `${escapeHtml(before)}<a href="https://doi.org/${escapeHtml(m[1])}" target="_blank" rel="noopener">doi:${escapeHtml(m[1])}</a>`;
}

/** the full references of an entry (from section 6), in the entry's order; unknown keys as written */
export function entryReferences(c: Concept): string[] {
  return c.refs.map((r) => CONCEPT_REFERENCES.find((x) => x.key === refKey(r))?.text ?? r);
}

/** HTML of one entry: its paragraphs, the short references line and the full references */
export function conceptBodyHtml(c: Concept): string {
  const paras = c.paragraphs.map((p) => `<p>${mathHtml(texify(p))}</p>`).join("");
  const refs = c.refs.length
    ? `<p class="concept-refs">References: ${escapeHtml(c.refs.join("; "))}.</p><ul class="concept-reflist">${entryReferences(c).map((r) => `<li>${referenceHtml(r)}</li>`).join("")}</ul>`
    : "";
  return paras + refs;
}
export const conceptTitleHtml = (c: Concept) => mathHtml(texify(c.title));

/** Concept entry of each layer's ⓘ and of the slider and dataset ⓘ (ids of conceptId). Entries missing on a body
 *  are skipped (conceptFor). */
export const CONCEPT_OF_LAYER: Record<string, string[]> = {
  dpm: ["drift-potential-dp"],
  rdpm: ["resultant-drift-potential-rdp"],
  rdpa: ["resultant-drift-direction-rdd"],
  qha_rdp_dp: ["directionality-rdp-dp"],
  at: ["migration-direction-αt"],
  ab: ["crest-orientation-αh"],
  ae: ["elongation-direction-αe"],
  ao: ["along-crest-transport-direction-αo"],
  sige_sigh: ["stability-of-elongating-dunes-σe-σh"],
  qhab_nl_nc: ["along-crest-versus-across-crest-transport-q-h"],
  qhab_ac_nc: ["growth-in-height-versus-migration-q-h"],
  qhne_ac_nl: ["morphology-of-elongating-dunes-q-e"],
  qsdiv: ["flux-divergence"],
  // crest fluxes and the mode flux fractions: the two orientation modes
  qncb: ["two-ways-dunes-orient-bed-instability-and-elongation"], qacb: ["two-ways-dunes-orient-bed-instability-and-elongation"],
  qnlb: ["two-ways-dunes-orient-bed-instability-and-elongation"], qalb: ["two-ways-dunes-orient-bed-instability-and-elongation"],
  qnle: ["two-ways-dunes-orient-bed-instability-and-elongation"], qale: ["two-ways-dunes-orient-bed-instability-and-elongation"],
  qace: ["two-ways-dunes-orient-bed-instability-and-elongation"],
  qhbf: ["two-ways-dunes-orient-bed-instability-and-elongation"], qhef: ["two-ways-dunes-orient-bed-instability-and-elongation"],
  // wind statistics and the slider: the threshold (Earth) or grain size (Mars)
  uft: ["threshold-friction-velocity", "grain-size-and-threshold"], ufm: ["threshold-friction-velocity", "grain-size-and-threshold"],
  "@threshold": ["threshold-friction-velocity", "grain-size-and-threshold"],
  "@dataset": ["the-two-era5-wind-datasets"],
};

/** the entry linked from a layer (or "@threshold" / "@dataset"), if this atlas has it */
export function conceptFor(layerId: string): Concept | undefined {
  for (const id of CONCEPT_OF_LAYER[layerId] ?? []) { const c = CONCEPTS.find((x) => x.id === id); if (c) return c; }
  return undefined;
}

/** event that opens the Concepts panel at an entry (tools.ts listens; buttons carry data-concept) */
export const CONCEPT_EVENT = "duneatlas:concept";
export const CONCEPT_LINK_TEXT = "Concept";
/** the "Concept: <title>" link of an ⓘ popover (HTML), or "" */
export function conceptLinkHtml(layerId: string): string {
  const c = conceptFor(layerId);
  return c ? `<p class="concept-link"><button type="button" class="link-button" data-concept="${escapeHtml(c.id)}">${CONCEPT_LINK_TEXT}: ${conceptTitleHtml(c)}</button></p>` : "";
}
