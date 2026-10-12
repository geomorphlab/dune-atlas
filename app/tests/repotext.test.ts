// Repository text check: no tracked (or new, not ignored) file outside notes/ and staging/ contains
// a term of the maintainer's local denylist (tests/denylist.ts). Skipped when that list is absent.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { localList, REPO_ROOT } from "./denylist";

/** file (repo-relative) -> regex of allowed matching text in that file */
const ALLOW: Record<string, RegExp> = {};
const BINARY = /\.(png|jpe?g|gif|ico|pmtiles|pbf|zip|nc|woff2?|ttf|gz)$/i;

describe("repository text", () => {
  const list = localList();
  it.skipIf(!list)("no denylisted terms in repository files (excluding notes/, staging/)", () => {
    const pats = [...(list!.repo_patterns_i ?? []).map((p) => new RegExp(p, "i")), ...(list!.repo_patterns_cs ?? []).map((p) => new RegExp(p))];
    const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\n").filter((f) => f && !/^(notes|staging)\//.test(f) && !BINARY.test(f) && !/node_modules\//.test(f));
    expect(files.length).toBeGreaterThan(100);
    const hits: string[] = [];
    for (const f of files) {
      const p = path.join(REPO_ROOT, f);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const re of pats) {
          const m = line.match(re);
          if (m && !(ALLOW[f]?.test(m[0]))) hits.push(`${f}:${i + 1}: ${m[0]} | ${line.trim().slice(0, 120)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
