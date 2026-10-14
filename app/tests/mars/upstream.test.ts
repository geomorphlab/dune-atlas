// Drift guard: every Earth module the Mars build substitutes, patches or was adapted from is recorded in
// src/mars/upstream.json with the git blob id of the Earth source last reconciled. When an Earth change
// touches one of them, this test fails naming every such module and printing the diff from the recorded
// blob (when it is in the object store) and the recent history of the file: port what applies to the Mars copy / patch,
// then re-record with `node scripts/mars/app/reconcile.mjs --record <path>` (docs/guide/mars.md,
// "Keeping Mars in sync with Earth").
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MARS_PATCHES, MARS_SUBSTITUTES } from "../../src/mars/build";
import upstream from "../../src/mars/upstream.json";

interface Entry { kind: "substituted" | "patched" | "derived"; mars: string; blob: string }
const MODULES = (upstream as { modules: Record<string, Entry> }).modules;
const APP = resolve(__dirname, "../..");
const git = (...a: string[]): string => execFileSync("git", a, { cwd: APP, encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const hasGit = (() => { try { git("rev-parse", "--show-toplevel"); return true; } catch { return false; } })();
const ROOT = hasGit ? git("rev-parse", "--show-toplevel") : "";

describe("Mars drift guard (src/mars/upstream.json)", () => {
  it("records every substituted and every patched Earth module", () => {
    const missing = [...Object.keys(MARS_SUBSTITUTES), ...MARS_PATCHES.map((p) => p.file)].filter((p) => !MODULES[p]);
    expect(missing, "add with: node scripts/mars/app/reconcile.mjs --sync").toEqual([]);
    for (const [p, e] of Object.entries(MODULES)) {
      expect(e.blob, p).toMatch(/^[0-9a-f]{40}$/);
      expect(e, p).not.toHaveProperty("commit"); // blob ids only: valid in any clone of the repository
      if (e.kind === "substituted") expect(MARS_SUBSTITUTES[p], p).toBe(e.mars);
    }
  });

  it.skipIf(!hasGit)("no recorded Earth module changed since it was reconciled", () => {
    const changed: string[] = [];
    for (const [p, e] of Object.entries(MODULES)) {
      const file = resolve(APP, p);
      const now = existsSync(file) ? git("hash-object", file) : "(deleted)";
      if (now === e.blob) continue;
      const rel = `app/${p}`;
      const has = (() => { try { git("cat-file", "-e", e.blob); return true; } catch { return false; } })();
      let cmd: string, diff: string;
      if (has) {
        cmd = `git diff ${e.blob} ${now} (recorded blob -> current ${rel})`;
        try { diff = execFileSync("git", ["diff", e.blob, now], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }); } catch { diff = "(current file not in the object store: git add it first)"; }
      } else {
        cmd = `git log --oneline -5 -- ${rel}`;
        try { diff = execFileSync("git", ["log", "--oneline", "-5", "--", rel], { cwd: ROOT, encoding: "utf8" }); } catch { diff = "(no history in this clone)"; }
      }
      changed.push(`${p}  [${e.kind} -> ${e.mars}]\n$ ${cmd}\n${diff}`);
    }
    if (changed.length) {
      const names = changed.map((c) => "  " + c.split("\n")[0]).join("\n");
      console.error(`Earth modules changed since the Mars build was reconciled:\n${names}\n\n${changed.join("\n")}`);
      throw new Error(`${changed.length} Earth module(s) changed since reconciled (port to Mars, then node scripts/mars/app/reconcile.mjs --record <path>):\n${names}`);
    }
  });
});
