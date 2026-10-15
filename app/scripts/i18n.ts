// Translations:  npm run i18n   (runs for Earth, then Mars)
//  1. adds every string of this atlas missing from docs/translations/<lang>.md (empty translation, English shown),
//     taking the translation of an identical English string where one exists;
//  2. updates the "EN:" line of an entry whose English changed and marks it STALE (translation kept for review);
//  3. writes src/i18n/<lang>.json from the .md: text + hash of the English it was translated from.
// The .md files are what reviewers edit: the line after "FR:" / "ZH:" only.
import fs from "node:fs";
import path from "node:path";
import { catalogue } from "../src/i18n/catalogue";
import { enHash } from "../src/i18n";
import { BODY } from "../src/core/body";
import { parseTranslations, renderTranslations, type MdEntry } from "../src/i18n/md";

const LANGS = [{ id: "fr", tag: "FR", name: "French" }, { id: "zh-Hans", tag: "ZH", name: "Simplified Chinese" }] as const;
const root = path.resolve(__dirname, "../..");
const cat = catalogue();
for (const L of LANGS) {
  const mdPath = path.join(root, "docs/translations", `${L.id}.md`);
  const entries: MdEntry[] = fs.existsSync(mdPath) ? parseTranslations(fs.readFileSync(mdPath, "utf8"), L.tag) : [];
  const byKey = new Map(entries.map((e) => [e.key, e]));
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
  fs.mkdirSync(path.dirname(mdPath), { recursive: true });
  fs.writeFileSync(mdPath, renderTranslations(entries, L.tag, L.name));
  const json: Record<string, { text: string; en: string }> = {};
  for (const e of entries) if (e.text && !e.stale) json[e.key] = { text: e.text, en: enHash(e.en) };
  fs.writeFileSync(path.resolve(__dirname, `../src/i18n/${L.id}.json`), JSON.stringify(json, null, 1) + "\n");
  console.log(`${BODY} ${L.id}: ${cat.length} strings, ${added} added, ${stale} marked stale, ${entries.filter((e) => !e.text).length} untranslated (all atlases)`);
}
