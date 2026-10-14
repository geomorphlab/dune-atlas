// Repository text checks over every tracked file outside notes/ and staging/ (git add new files first):
//  1. hygiene (always runs, also in CI): no private machine paths anywhere, and no development-process
//     notes (decision provenance, review-round and item ids, work-stream names, agent wording) outside the
//     dated records in docs/records/; code comments say what the code does and why;
//  2. the maintainer's optional local word list (tests/denylist.ts), skipped when that list is absent.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { localList, REPO_ROOT } from "./denylist";

const BINARY = /\.(png|jpe?g|gif|ico|pmtiles|pbf|zip|nc|woff2?|ttf|gz)$/i;
/** private machine paths: none anywhere (NCI public data collections rt52 and tc43 are allowed) */
export const PATH_PATTERNS = [/\/g\/data\/(?!<|rt52\/|tc43\/)/, /\/scratch\/(?!<)/, /\/Volumes\//, /\/Users\//, /(^|[\s\"'`(=:])\/home\/[a-z]/, /ag5517/, /omega-claude/, /Documents\/research/];
/** development-process notes: none outside docs/records/ */
export const PROCESS_PATTERNS = [/(?<![.\w])PI\b(?![\w;(])/, /\b[Rr]ound \d/, /\b(App|Wind|Terrain|Data|UI|Text|pipeline|other|three|build) tracks?\b/, /Wind\/Terrain/, /\bagents?\b/, /host\.compute/,
  /\breview (item )?[A-Z]?\d+\b/, /\(review\b/, /\b[UL]\d{1,2} ?\/ ?[UL]\d{1,2}\b/];
/** file (repo-relative) -> regex of allowed matching lines in that file */
const ALLOW: Record<string, RegExp> = {
  "app/tests/repotext.test.ts": /./, // the patterns themselves
  "app/tests/usertextlib.ts": /by the PI/, // a site-text check pattern
  "app/tests/angles.test.ts": /\bPI\b/, // const PI = Math.PI
  "app/src/mars/map/polarcap.ts": /\bPI\b/, // GLSL constant
  // published store metadata (immutable data attributes of dune-atlas/mars/v2), written by the cell-store builder
  "pipeline/src/dune_atlas_pipeline/mars/cells.py": /PI shapefile aggregated from the/,
};
/** kept verbatim (approved text for a later panel) */
const EXEMPT = /^(notes|staging)\/|^docs\/concepts\//;

function files(): string[] {
  return execFileSync("git", ["ls-files", "--cached"], { cwd: REPO_ROOT, encoding: "utf8" })
    .split("\n").filter((f) => f && !EXEMPT.test(f) && !BINARY.test(f) && !/node_modules\//.test(f) && fs.existsSync(path.join(REPO_ROOT, f)));
}
function scan(list: string[], pats: RegExp[], skip: (f: string) => boolean): string[] {
  const hits: string[] = [];
  for (const f of list) {
    if (skip(f)) continue;
    fs.readFileSync(path.join(REPO_ROOT, f), "utf8").split("\n").forEach((line, i) => {
      for (const re of pats) {
        const m = line.match(re);
        if (m && !ALLOW[f]?.test(line)) hits.push(`${f}:${i + 1}: ${m[0]} | ${line.trim().slice(0, 120)}`);
      }
    });
  }
  return hits;
}
const inGit = (() => { try { execFileSync("git", ["rev-parse", "--git-dir"], { cwd: REPO_ROOT, stdio: "ignore" }); return true; } catch { return false; } })();

describe("repository text", () => {
  it.skipIf(!inGit)("no private machine paths; no development-process notes outside docs/records/", () => {
    const list = files();
    expect(list.length).toBeGreaterThan(100);
    expect(scan(list, PATH_PATTERNS, () => false)).toEqual([]);
    expect(scan(list, PROCESS_PATTERNS, (f) => f.startsWith("docs/records/"))).toEqual([]);
  });
  const local = localList();
  it.skipIf(!local || !inGit)("no terms of the maintainer's local word list (excluding notes/, staging/)", () => {
    const pats = [...(local!.repo_patterns_i ?? []).map((p) => new RegExp(p, "i")), ...(local!.repo_patterns_cs ?? []).map((p) => new RegExp(p))];
    expect(scan(files(), pats, () => false)).toEqual([]);
  });
});
