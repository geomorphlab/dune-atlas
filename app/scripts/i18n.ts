// Translations:  npm run i18n   (runs for Earth, then Mars)
//  1. adds every string of this atlas missing from docs/translations/<lang>.md (empty translation, English shown),
//     taking the translation of an identical English string where one exists;
//  2. updates the "EN:" line of an entry whose English changed and marks it STALE (translation kept for review);
//  3. writes src/i18n/<lang>.json from the .md: text + hash of the English it was translated from.
// The .md files are what reviewers edit: the line after "FR:" / "ZH:" only.
import fs from "node:fs";
import path from "node:path";
import { catalogue } from "../src/i18n/catalogue";
import { contentKey, enHash } from "../src/i18n";
import { BODY } from "../src/core/body";
import { parseTranslations, renderTranslations, type MdEntry } from "../src/i18n/md";

const LANGS = [{ id: "fr", tag: "FR", name: "French" }, { id: "zh-Hans", tag: "ZH", name: "Simplified Chinese" }] as const;
const root = path.resolve(__dirname, "../..");
// keyed strings, then the rendered texts collected by tests/i18ncollect.test.ts (keyed by their own English)
const collectedFile = path.resolve(__dirname, `../src/i18n/collected-${BODY}.json`);
const collected = fs.existsSync(collectedFile) ? (JSON.parse(fs.readFileSync(collectedFile, "utf8")) as { en: string; area: string }[]) : [];
const cat = [...catalogue(), ...collected.map((c) => ({ key: contentKey(c.en), en: c.en, area: c.area }))];
for (const L of LANGS) {
  const mdPath = path.join(root, "docs/translations", `${L.id}.md`);
  const entries: MdEntry[] = fs.existsSync(mdPath) ? parseTranslations(fs.readFileSync(mdPath, "utf8"), L.tag) : [];
  const byKey = new Map(entries.map((e) => [e.key, e]));
  // rendered texts no longer on any atlas: untranslated ones are dropped, translated ones kept under "Unused"
  const live = new Set(["earth", "mars"].flatMap((b) => { const f = path.resolve(__dirname, `../src/i18n/collected-${b}.json`); return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as { en: string }[]).map((c) => contentKey(c.en)) : []; }));
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (!e.key.startsWith("c.") || live.has(e.key)) continue;
    if (!e.text) { entries.splice(i, 1); byKey.delete(e.key); } else e.area = "Unused (English changed or removed)";
  }
  let added = 0, stale = 0;
  for (const c of cat) {
    const e = byKey.get(c.key);
    if (!e) {
      const same = entries.find((x) => x.en === c.en && x.text);
      const n: MdEntry = { key: c.key, area: c.area, en: c.en, text: same?.text ?? "", stale: false };
      entries.push(n); byKey.set(c.key, n); added++;
    } else if (e.en !== c.en) { e.en = c.en; e.stale = true; stale++; }
    else e.area = c.area;
  }
  entries.sort((x, y) => Number(x.area.startsWith("Unused")) - Number(y.area.startsWith("Unused")));
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, renderTranslations(entries, L.tag, L.name));
  const json: Record<string, { text: string; en: string }> = {};
  for (const e of entries) if (e.text && !e.stale) json[e.key] = { text: e.text, en: enHash(e.en) };
  fs.writeFileSync(path.resolve(__dirname, `../src/i18n/${L.id}.json`), JSON.stringify(json, null, 1) + "\n");
  console.log(`${BODY} ${L.id}: ${cat.length} strings, ${added} added, ${stale} marked stale, ${entries.filter((e) => !e.text).length} untranslated (all atlases)`);
}
