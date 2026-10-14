#!/usr/bin/env node
// Built-string inventory of a dist/ tree (refactor gate): every string literal and template-literal
// text of the bundled JavaScript (parsed with Rollup's parser, so identifiers and minifier
// renames do not count) plus the text of index.html, sorted and de-duplicated, one per line
// (newlines escaped). Two builds that show the same text give the same inventory, whatever the
// module layout. Run from app/:  node ../tools/checks/strings.mjs dist > strings-earth.txt
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.resolve("package.json"));
const { parseAst } = await import(require.resolve("rollup/parseAst"));

const dir = process.argv[2];
const out = new Set();
// asset file names carry content hashes (name-XXXXXXXX.js); masked so that only text differences count
const add = (s) => { if (typeof s === "string" && s.length) out.add(s.replace(/-[A-Za-z0-9_-]{8}\.(js|css|woff2?|ttf|png|wasm)\b/g, "-<hash>.$1").replace(/\\/g, "\\\\").replace(/\n/g, "\\n")); };
function walk(n) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) { n.forEach(walk); return; }
  if (n.type === "Literal") add(n.value);
  else if (n.type === "TemplateElement") add(n.value?.cooked ?? n.value?.raw);
  for (const k in n) if (k !== "type" && k !== "start" && k !== "end") walk(n[k]);
}
const files = fs.readdirSync(path.join(dir, "assets")).filter((f) => f.endsWith(".js")).sort();
for (const f of files) walk(parseAst(fs.readFileSync(path.join(dir, "assets", f), "utf8")));
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace(/(src|href)="[^"]*assets\/[^"]*"/g, '$1="<asset>"');
for (const line of html.split("\n")) add(`[index.html] ${line.trim()}`);
process.stdout.write([...out].sort().join("\n") + "\n");
