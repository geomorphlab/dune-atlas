// Shared checks of the translations (tests/i18n.test.ts for Earth, tests/mars/i18n.test.ts for Mars).
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { catalogue } from "../src/i18n/catalogue";
import { enHash, trIn, DICTS, resolveLang, switchLang } from "../src/i18n";
import { parseTranslations, type MdEntry } from "../src/i18n/md";

const ROOT = path.resolve(__dirname, "../..");
export const LANG_FILES = [{ id: "fr", tag: "FR" }, { id: "zh-Hans", tag: "ZH" }] as const;
const md = (id: string, tag: string) => parseTranslations(fs.readFileSync(path.join(ROOT, "docs/translations", `${id}.md`), "utf8"), tag);
const FORM = /\$[^$]+\$/g, TAG = /<[^>]+>/g, PH = /\{\w+\}/g;
/** terms kept as written in every language (the protected terms of core/util/notranslate.ts that occur here) */
const KEEP = ["DP", "RDP", "RDD", "RDP/DP", "VU", "ERA5-Land", "ERA5", "MOLA", "HRSC", "CTX", "HiRISE", "OpenFreeMap", "OpenTopoMap", "OpenPlanetaryMap", "Esri", "Mapterhorn", "NetCDF", "CSV", "PNG", "SVG", "README", "Gunn (2026)", "Fryberger & Dean (1979)", "Pähtz & Durán (2023)", "αT", "αE", "αH", "αO"];
const sorted = (a: string[] | null) => [...(a ?? [])].sort();

/** what is wrong with one translation (empty: nothing) */
export function translationProblems(en: string, text: string): string[] {
  const p: string[] = [];
  if (JSON.stringify(sorted(en.match(FORM))) !== JSON.stringify(sorted(text.match(FORM)))) p.push("formulas ($…$) differ from the English");
  if (JSON.stringify(en.match(TAG) ?? []) !== JSON.stringify(text.match(TAG) ?? [])) p.push("HTML tags differ from the English");
  if (JSON.stringify(sorted(en.match(PH))) !== JSON.stringify(sorted(text.match(PH)))) p.push("{placeholders} differ from the English");
  const ne = en.replace(FORM, ""), nt = text.replace(FORM, "");
  for (const k of KEEP) if (new RegExp(`(?<![\\w-])${k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![\\w-])`).test(ne) && !nt.includes(k)) p.push(`"${k}" must be kept as written`);
  return p;
}

export function i18nChecks(body: string) {
  const cat = catalogue();
  for (const L of LANG_FILES) {
    it(`${body} ${L.id}: every string of the atlas is in docs/translations/${L.id}.md (run npm run i18n)`, () => {
      const keys = new Set(md(L.id, L.tag).map((e) => e.key));
      expect(cat.filter((c) => !keys.has(c.key)).map((c) => c.key)).toEqual([]);
    });
    it(`${body} ${L.id}: untranslated and stale strings are listed (warning only; the English is shown for them)`, () => {
      const by = new Map(md(L.id, L.tag).map((e) => [e.key, e] as [string, MdEntry]));
      const stale = cat.filter((c) => { const e = by.get(c.key); return e && (e.stale || e.en !== c.en); }).map((c) => c.key);
      const empty = cat.filter((c) => !by.get(c.key)?.text).map((c) => c.key);
      if (stale.length) console.warn(`${L.id}: ${stale.length} stale translation(s): ${stale.join(", ")}`);
      if (empty.length) console.warn(`${L.id}: ${empty.length} untranslated: ${empty.join(", ")}`);
      expect(Array.isArray(stale)).toBe(true);
    });
    it(`${body} ${L.id}: translations keep formulas, tags, placeholders and protected terms`, () => {
      const bad = md(L.id, L.tag).filter((e) => e.text).flatMap((e) => translationProblems(e.en, e.text).map((p) => `${e.key}: ${p}`));
      expect(bad).toEqual([]);
    });
    it(`${body} ${L.id}: src/i18n/${L.id}.json is compiled from the .md (run npm run i18n)`, () => {
      const want: Record<string, { text: string; en: string }> = {};
      for (const e of md(L.id, L.tag)) if (e.text && !e.stale) want[e.key] = { text: e.text, en: enHash(e.en) };
      expect(DICTS[L.id]).toEqual(want);
    });
  }
  it(`${body}: a translation made from other English is not shown`, () => {
    const c = cat.find((x) => DICTS.fr[x.key])!;
    expect(trIn("fr", c.key, c.en)).toBe(DICTS.fr[c.key].text);
    expect(trIn("fr", c.key, c.en + " (edited)")).toBe(c.en + " (edited)");
    expect(trIn("en", c.key, c.en)).toBe(c.en);
  });
}

export function langChoiceChecks() {
  it("language: address first, then this browser's choice, else English; never the browser language", () => {
    expect(resolveLang("?lang=fr", "zh-Hans")).toBe("fr");
    expect(resolveLang("?zoom=2", "zh-Hans")).toBe("zh-Hans");
    expect(resolveLang("?lang=de", null)).toBe("en");
    expect(resolveLang("", null)).toBe("en");
  });
  it("switching keeps the view in the address and sets or removes lang", () => {
    const go: string[] = [];
    const loc = { search: "?lon=10.0000&lat=20.0000&zoom=3.00&lang=fr", pathname: "/mars/", hash: "", assign: (u: string) => { go.push(u); } };
    switchLang("zh-Hans", loc); switchLang("en", loc);
    expect(go).toEqual(["/mars/?lon=10.0000&lat=20.0000&zoom=3.00&lang=zh-Hans", "/mars/?lon=10.0000&lat=20.0000&zoom=3.00"]);
  });
}
