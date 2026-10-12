// Text denylists for the public-text and repository checks. General style terms are listed here;
// project-specific terms are read from the maintainer's local list (notes/, not in the repository)
// and added when that file exists.
import fs from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCAL = path.join(REPO_ROOT, "notes", "paper-comparison", "denylist.json");

interface LocalList { site_terms?: string[]; repo_patterns_i?: string[]; repo_patterns_cs?: string[] }
export function localList(): LocalList | null {
  try { return JSON.parse(fs.readFileSync(LOCAL, "utf8")) as LocalList; } catch { return null; }
}

/** Words that must not appear in public (site and download) text; case-insensitive except NaN. */
export const GENERAL_SITE_TERMS = ["paper", "stored", "TODO", "FIXME"];
export function siteDeny(): RegExp {
  const terms = [...GENERAL_SITE_TERMS, ...(localList()?.site_terms ?? [])];
  return new RegExp(`\\b(${terms.join("|")})\\b`, "i");
}
export const NAN_WORD = /\bNaN\b/;
