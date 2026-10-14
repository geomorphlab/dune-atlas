// Labels for image exports, with the symbols as TeX ($...$, rendered as SVG paths by texsvg.ts):
// layer titles from the registry (title + the math of titleTex), the threshold, units.
import { texToPlain } from "../util/plaintext";
import { unitsTex } from "./texsvg";
import { PROFILE } from "@body/profile";

/** the threshold friction velocity with its value, TeX: $u_{*,th}$ = 0.15 $\\mathrm{m\\,s^{-1}}$ */
export const utTex = (ut: number) => PROFILE.control.valueTex(ut);

const mathOf = (tex: string) => tex.split("$").filter((_, k) => k % 2 === 1);

/** Export title of a layer: the plain-English title with its symbol in TeX, e.g. "Drift potential
 *  (DP)" + "Drift potential $DP$" -> "Drift potential ($DP$)". The symbol is located in the title
 *  by its plain form, else the trailing parenthesis or ⟨...⟩ term is replaced, else appended. */
export function exportTitleTex(l: { title: string; titleTex?: string }): string {
  const title = l.title.trim();
  const m = l.titleTex ? mathOf(l.titleTex) : [];
  if (!m.length) return title;
  const tex = m.join(" ");
  const plainSym = texToPlain(`$${tex}$`).replace(/\s+/g, "");
  const squash = (s: string) => s.replace(/\s+/g, "");
  // 1. the plain symbol appears verbatim (ignoring spaces)
  const re = new RegExp(plainSym.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*"));
  if (plainSym && re.test(title)) return title.replace(re, `$${tex}$`);
  // 2. a trailing parenthesis
  const par = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/.exec(title);
  if (par) return `${title.slice(0, par.index)}($${tex}$)`;
  // 3. a trailing ⟨...⟩ term
  const ang = title.lastIndexOf("⟨");
  if (ang > 0 && squash(title.slice(ang)).endsWith("⟩")) return `${title.slice(0, ang)}$${tex}$`;
  return `${title} ($${tex}$)`;
}

/** units for export text: plain registry units -> TeX superscripts */
export const exportUnits = (u: string | undefined) => unitsTex(texToPlain(u ?? "").trim());
