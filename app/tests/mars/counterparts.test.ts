// Counterpart guard: the Earth modules whose Mars counterpart is kept in step by hand (cell store,
// analysis, flux, export, cell panel) are recorded in src/bodies/mars/counterparts.json with the git blob
// id of the Earth source last reconciled. When an Earth change touches one of them, this test fails naming
// the module and printing the diff from the recorded blob (or the file's recent history): port what applies
// to the Mars counterpart, then re-record with `node scripts/mars/app/counterparts.mjs --record <path>`
// (docs/guide/mars.md, "Keeping Mars in step with Earth").
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import record from "../../src/bodies/mars/counterparts.json";

interface Entry { mars: string; blob: string }
const MODULES = (record as { modules: Record<string, Entry> }).modules;
const APP = resolve(__dirname, "../..");
const git = (...a: string[]): string => execFileSync("git", a, { cwd: APP, encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const hasGit = (() => { try { git("rev-parse", "--show-toplevel"); return true; } catch { return false; } })();
const ROOT = hasGit ? git("rev-parse", "--show-toplevel") : "";

describe("Mars counterpart guard (src/bodies/mars/counterparts.json)", () => {
  it("records each Earth module with an existing Mars counterpart (blob ids only)", () => {
    expect(Object.keys(MODULES).length).toBe(5);
    for (const [p, e] of Object.entries(MODULES)) {
      expect(e.blob, p).toMatch(/^[0-9a-f]{40}$/);
      expect(existsSync(resolve(APP, p)), p).toBe(true);
      expect(existsSync(resolve(APP, e.mars)), e.mars).toBe(true);
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
      let diff: string;
      if (has) { try { diff = execFileSync("git", ["diff", e.blob, now], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }); } catch { diff = "(current file not in the object store: git add it first)"; } }
      else { try { diff = execFileSync("git", ["log", "--oneline", "-5", "--", rel], { cwd: ROOT, encoding: "utf8" }); } catch { diff = "(no history in this clone)"; } }
      changed.push(`${p}  [-> ${e.mars}]\n${diff}`);
    }
    if (changed.length) {
      const names = changed.map((c) => "  " + c.split("\n")[0]).join("\n");
      console.error(`Earth modules changed since their Mars counterparts were reconciled:\n${names}\n\n${changed.join("\n")}`);
      throw new Error(`${changed.length} Earth module(s) changed since reconciled (port to Mars, then node scripts/mars/app/counterparts.mjs --record <path>):\n${names}`);
    }
  });
});
