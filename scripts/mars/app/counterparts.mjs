#!/usr/bin/env node
// Counterpart record of the Mars atlas (app/src/bodies/mars/counterparts.json): the Earth modules whose
// Mars counterpart was written after them and is kept in step by hand (cell store, analysis, flux, export,
// cell panel), each with the git blob id of the Earth source last reconciled. tests/mars/counterparts.test.ts
// (npm run test:mars) fails, naming each module, as soon as the Earth source differs from the record. See
// docs/guide/mars.md, "Keeping Mars in step with Earth".
//
//   node scripts/mars/app/counterparts.mjs --check [--rev <rev>]   modules that changed (working tree or <rev>); exit 1 if any
//   node scripts/mars/app/counterparts.mjs --record <app path>...  after porting: re-record (blob of the committed source;
//                                                                  --allow-dirty to record uncommitted changes)
//   node scripts/mars/app/counterparts.mjs --record-all            re-record every module
// Paths are app-relative (src/core/cell/export.ts = app/src/core/cell/export.ts). Run from anywhere in the repo.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: here, encoding: "utf8" }).trim();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const APP = join(ROOT, "app");
const RECORD = join(APP, "src/bodies/mars/counterparts.json");

/** Earth module -> its Mars counterpart */
export const COUNTERPARTS = {
  "src/core/cell/cellstore.ts": "src/bodies/mars/cell/cellstore.ts",
  "src/core/cell/analysis.ts": "src/bodies/mars/cell/analysis.ts",
  "src/core/cell/flux.ts": "src/bodies/mars/cell/marsflux.ts",
  "src/core/cell/export.ts": "src/bodies/mars/cell/export.ts",
  "src/bodies/earth/cellPanel.ts": "src/bodies/mars/cellPanel.ts",
};

const blobAt = (rev, path) => { try { return git("rev-parse", `${rev}:app/${path}`); } catch { return null; } };
const blobWorktree = (path) => (existsSync(join(APP, path)) ? git("hash-object", join(APP, path)) : null);
const load = () => (existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : { modules: {} });
function save(rec) {
  const modules = Object.fromEntries(Object.keys(COUNTERPARTS).sort().map((p) => [p, rec.modules[p]]).filter(([, v]) => v));
  writeFileSync(RECORD, JSON.stringify({ _about: "Earth modules whose Mars counterpart is kept in step by hand, with the git blob id of the Earth source last reconciled. Checked by tests/mars/counterparts.test.ts; updated with scripts/mars/app/counterparts.mjs. See docs/guide/mars.md.", modules }, null, 2) + "\n");
}
function record(rec, path, allowDirty) {
  const committed = blobAt("HEAD", path), work = blobWorktree(path);
  if (!work) throw new Error(`app/${path} does not exist`);
  if (committed !== work && !allowDirty) throw new Error(`app/${path} has uncommitted changes; commit the Earth change first (or --allow-dirty)`);
  rec.modules[path] = { mars: COUNTERPARTS[path], blob: work };
  console.log(`recorded ${path} ${work.slice(0, 10)}`);
}

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
if (flag("--check")) {
  const rec = load(), i = args.indexOf("--rev"), rev = i >= 0 ? args[i + 1] : null;
  let bad = 0;
  for (const p of Object.keys(COUNTERPARTS)) {
    const e = rec.modules[p];
    if (!e) { console.log(`UNRECORDED ${p}`); bad++; continue; }
    const now = rev ? blobAt(rev, p) : blobWorktree(p);
    if (now === e.blob) continue;
    bad++;
    console.log(`CHANGED ${p} (-> ${e.mars})\n    git diff ${e.blob.slice(0, 10)} ${rev ?? "HEAD"}:app/${p}\n    git log --oneline -5 -- app/${p}`);
  }
  console.log(bad ? `${bad} module(s) to reconcile` : `all ${Object.keys(COUNTERPARTS).length} modules match${rev ? ` at ${rev}` : ""}`);
  process.exit(bad ? 1 : 0);
} else if (flag("--record") || flag("--record-all")) {
  const rec = load();
  const paths = flag("--record-all") ? Object.keys(COUNTERPARTS) : args.filter((a) => !a.startsWith("--"));
  if (!paths.length) throw new Error("no module given");
  for (const p of paths) { if (!COUNTERPARTS[p]) throw new Error(`${p} has no Mars counterpart (COUNTERPARTS)`); record(rec, p, flag("--allow-dirty")); }
  save(rec);
} else {
  console.log("usage: counterparts.mjs --check [--rev <rev>] | --record <path>... [--allow-dirty] | --record-all");
}
