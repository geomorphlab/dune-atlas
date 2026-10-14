#!/usr/bin/env node
// Drift record of the Mars build (app/src/bodies/mars/upstream.json): for every Earth module the Mars build
// substitutes, patches or was adapted from, the git blob id of the Earth source it was last
// reconciled with. tests/mars/upstream.test.ts (npm run test:mars) fails, naming
// each module, as soon as the Earth source differs from the record. See docs/guide/mars.md,
// "Keeping Mars in sync with Earth".
//
//   node scripts/mars/app/reconcile.mjs --check [--rev <rev>]
//       list recorded modules whose source differs from the record: in the working tree (default) or
//       at <rev> (e.g. --rev earth/main before a merge, to see what the merge will flag). Exit 1 if any.
//   node scripts/mars/app/reconcile.mjs --record <app path>... | --record-all
//       after porting: re-record the module(s) at the current HEAD (blob id of the committed source;
//       refuses a module with uncommitted changes unless --allow-dirty). Also adds missing entries.
//   node scripts/mars/app/reconcile.mjs --sync
//       add entries for modules newly substituted (src/bodies/mars/build.ts) or patched (src/bodies/mars/patches.json)
//       and drop entries no longer used; existing entries are kept as they are.
//
// Paths are app-relative (src/ui/cellPanel.ts = app/src/ui/cellPanel.ts). Run from anywhere in the repo.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();   // pathspecs are repo-relative
const APP = join(ROOT, "app");
const RECORD = join(APP, "src/bodies/mars/upstream.json");

// Earth modules that a Mars module (not a substitute) was adapted from: Mars-only code written as the
// counterpart of an Earth module, whose fixes usually need porting by hand.
export const DERIVED = {
  "src/cell/export.ts": "src/bodies/mars/cell/export.ts",
  "src/cell/analysis.ts": "src/bodies/mars/cell/analysis.ts",
  "src/cell/flux.ts": "src/bodies/mars/cell/marsflux.ts",
  "src/cell/cellstore.ts": "src/bodies/mars/cell/cellstore.ts",
};

/** the modules the Mars build depends on as copies or patches: {path: {kind, mars}} */
export function marsModules() {
  const build = readFileSync(join(APP, "src/bodies/mars/build.ts"), "utf8");
  const block = /MARS_SUBSTITUTES[^{]*\{([\s\S]*?)\};/.exec(build);
  if (!block) throw new Error("MARS_SUBSTITUTES not found in src/bodies/mars/build.ts");
  const out = {};
  for (const m of block[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) out[m[1]] = { kind: "substituted", mars: m[2] };
  const pf = join(APP, "src/bodies/mars/patches.json");
  for (const p of existsSync(pf) ? JSON.parse(readFileSync(pf, "utf8")) : []) {
    if (out[p.file]) throw new Error(`${p.file} is both substituted and patched`);
    out[p.file] = { kind: "patched", mars: `src/bodies/mars/patches.json (${p.edits.length} edit${p.edits.length === 1 ? "" : "s"})` };
  }
  for (const [k, v] of Object.entries(DERIVED)) if (!out[k]) out[k] = { kind: "derived", mars: v };
  return out;
}

export const blobAt = (rev, path) => { try { return git("rev-parse", `${rev}:app/${path}`); } catch { return null; } };
export const blobWorktree = (path) => (existsSync(join(APP, path)) ? git("hash-object", join(APP, path)) : null);
const load = () => (existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : { modules: {} });

function save(rec) {
  const sorted = Object.fromEntries(Object.entries(rec.modules).sort(([a], [b]) => a.localeCompare(b)));
  const out = {
    _about: "Earth modules the Mars build substitutes, patches or was adapted from, with the git blob id of the Earth source last reconciled. Checked by tests/mars/upstream.test.ts; updated with scripts/mars/app/reconcile.mjs. See docs/guide/mars.md.",
    modules: sorted,
  };
  writeFileSync(RECORD, JSON.stringify(out, null, 2) + "\n");
}

function record(rec, path, mods, allowDirty) {
  const head = git("rev-parse", "HEAD");
  const committed = blobAt("HEAD", path), work = blobWorktree(path);
  if (!work) throw new Error(`app/${path} does not exist`);
  if (committed !== work && !allowDirty) throw new Error(`app/${path} has uncommitted changes; commit the Earth change first (or --allow-dirty)`);
  rec.modules[path] = { ...mods[path], blob: work };
  console.log(`recorded ${path} ${work.slice(0, 10)} @ ${head.slice(0, 10)}`);
}

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
if (flag("--check")) {
  const rec = load();
  const i = args.indexOf("--rev"), rev = i >= 0 ? args[i + 1] : null;
  const mods = marsModules();
  let bad = 0;
  for (const p of Object.keys(mods)) if (!rec.modules[p]) { console.log(`UNRECORDED ${p} (${mods[p].kind})`); bad++; }
  for (const [p, e] of Object.entries(rec.modules)) {
    const now = rev ? blobAt(rev, p) : blobWorktree(p);
    if (now === e.blob) continue;
    bad++;
    console.log(`CHANGED ${p} (${e.kind} -> ${e.mars}): ${now ? "differs from the recorded blob" : "deleted"}\n    git diff ${e.blob.slice(0, 10)} ${rev ?? "HEAD"}:app/${p}    (blob of the last reconciled source)\n    git log --oneline -5 -- app/${p}`);
  }
  console.log(bad ? `${bad} module(s) to reconcile` : `all ${Object.keys(rec.modules).length} recorded modules match${rev ? ` at ${rev}` : ""}`);
  process.exit(bad ? 1 : 0);
} else if (flag("--record") || flag("--record-all")) {
  const rec = load(), mods = marsModules();
  const paths = flag("--record-all") ? Object.keys(mods) : args.filter((a) => !a.startsWith("--"));
  if (!paths.length) throw new Error("no module given");
  for (const p of paths) {
    if (!mods[p]) throw new Error(`${p} is not substituted, patched or derived (src/bodies/mars/build.ts, patches.json, DERIVED)`);
    record(rec, p, mods, flag("--allow-dirty"));
  }
  save(rec);
} else if (flag("--sync")) {
  const rec = load(), mods = marsModules();
  for (const p of Object.keys(mods)) if (!rec.modules[p]) record(rec, p, mods, flag("--allow-dirty"));
  for (const p of Object.keys(rec.modules)) if (!mods[p]) { delete rec.modules[p]; console.log(`dropped ${p}`); }
  for (const p of Object.keys(mods)) rec.modules[p] = { ...rec.modules[p], kind: mods[p].kind, mars: mods[p].mars };
  save(rec);
} else if (flag("--init")) {
  // one-off: record every module at an explicit commit whose sources equal the working tree
  const i = args.indexOf("--init"), rev = git("rev-parse", args[i + 1] ?? "HEAD");
  const mods = marsModules(), rec = { modules: {} };
  for (const p of Object.keys(mods)) {
    const b = blobAt(rev, p);
    if (b !== blobWorktree(p)) throw new Error(`app/${p} at ${rev.slice(0, 10)} differs from the working tree`);
    rec.modules[p] = { ...mods[p], blob: b };
  }
  save(rec);
  console.log(`initialised ${Object.keys(mods).length} modules at ${rev}`);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 20).join("\n"));
}
