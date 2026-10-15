// The reviewer files docs/translations/<lang>.md: one block per string,
//   ## <key>  (area)
//   EN: <English, do not edit>
//   FR: <translation>        (ZH: for Chinese)
// "STALE" after the key: the English changed since the translation; check it and delete the word STALE.
export interface MdEntry { key: string; area: string; en: string; text: string; stale: boolean }

const HEADER = (tag: string, name: string) => `# Dune Atlas: ${name} text

Edit only the text after \`${tag}:\`. Keep each translation on one line. Keep unchanged:
- anything between $ signs (formulas, e.g. $u_{*,th}$), HTML tags such as <br> and <a href="…">…</a>, and {placeholders};
- names of datasets, products and people, acronyms (DP, RDD, ERA5-Land …) and references.
An empty \`${tag}:\` line shows the English on the site. **STALE** after a heading: the English was changed after it
was translated; check the translation against the new English, then delete the word STALE.
Glossary of agreed terms: translation-glossary.csv.
`;

export function parseTranslations(md: string, tag: string): MdEntry[] {
  const out: MdEntry[] = [];
  for (const block of md.split(/^## /m).slice(1)) {
    const lines = block.split("\n");
    const head = /^(\S+)(\s+STALE)?(?:\s+\((.*)\))?\s*$/.exec(lines[0].trim());
    if (!head) continue;
    const get = (p: string) => { const l = lines.find((x) => x.startsWith(`${p}:`)); return l === undefined ? "" : l.slice(p.length + 1).trim(); };
    out.push({ key: head[1], stale: !!head[2], area: head[3] ?? "", en: get("EN"), text: get(tag) });
  }
  return out;
}

export function renderTranslations(entries: MdEntry[], tag: string, name: string): string {
  let area = "", s = HEADER(tag, name);
  for (const e of entries) {
    if (e.area !== area) { area = e.area; s += `\n# ${area}\n`; }
    s += `\n## ${e.key}${e.stale ? " STALE" : ""} (${e.area})\nEN: ${e.en}\n${tag}: ${e.text}\n`;
  }
  return s;
}
