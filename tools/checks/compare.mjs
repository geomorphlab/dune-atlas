#!/usr/bin/env node
// Compare two equivalence snapshots (tools/checks/snapshot.ts) section by section, or two string
// inventories (tools/checks/strings.mjs, *.txt): prints "identical" or the differing paths / lines.
//   node tools/checks/compare.mjs <baseline.json|txt> <current.json|txt> [--max 20]
// Exit status 1 when they differ.
import fs from "node:fs";
const [a, b] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const max = Number(process.argv[process.argv.indexOf("--max") + 1]) || 20;
if (a.endsWith(".txt")) {
  const A = new Set(fs.readFileSync(a, "utf8").split("\n")), B = new Set(fs.readFileSync(b, "utf8").split("\n"));
  const gone = [...A].filter((x) => !B.has(x)), added = [...B].filter((x) => !A.has(x));
  if (!gone.length && !added.length) { console.log(`strings: identical (${A.size})`); process.exit(0); }
  console.log(`strings: ${gone.length} removed, ${added.length} added`);
  for (const x of gone.slice(0, max)) console.log(`  - ${x.slice(0, 300)}`);
  for (const x of added.slice(0, max)) console.log(`  + ${x.slice(0, 300)}`);
  process.exit(1);
}
const A = JSON.parse(fs.readFileSync(a, "utf8")), B = JSON.parse(fs.readFileSync(b, "utf8"));
let bad = false;
function diff(x, y, p, out) {
  if (out.length >= max) return;
  if (typeof x !== typeof y || Array.isArray(x) !== Array.isArray(y) || (x === null) !== (y === null)) { out.push(`${p}: ${JSON.stringify(x)?.slice(0, 200)} != ${JSON.stringify(y)?.slice(0, 200)}`); return; }
  if (x && typeof x === "object") {
    const ks = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const k of ks) diff(x[k], y[k], `${p}.${k}`, out);
  } else if (x !== y) {
    if (typeof x === "string" && x.length > 200) {
      let i = 0; while (i < x.length && x[i] === y[i]) i++;
      out.push(`${p} @${i}: …${x.slice(Math.max(0, i - 80), i + 120)}… != …${y.slice(Math.max(0, i - 80), i + 120)}…`);
    } else out.push(`${p}: ${JSON.stringify(x)} != ${JSON.stringify(y)}`);
  }
}
for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
  const out = [];
  diff(A[k], B[k], k, out);
  console.log(`${k}: ${out.length ? `DIFFERS (${out.length >= max ? `${max}+` : out.length})` : "identical"}`);
  for (const o of out) console.log(`  ${o}`);
  if (out.length) bad = true;
}
process.exit(bad ? 1 : 0);
