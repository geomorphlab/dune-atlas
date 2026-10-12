// @vitest-environment happy-dom
// Public text: no references to issues with the source data / paper in the site or the downloads.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { allowed, collectPublicText, DENY, strip } from "./publictext";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

describe("public text denylist", () => {
  it("site and download strings contain no denylisted terms", async () => {
    const t = await collectPublicText();
    if (process.env.TEXT_DUMP) fs.writeFileSync(process.env.TEXT_DUMP, JSON.stringify(t, null, 1));
    const bad = Object.entries(t).filter(([k, v]) => !allowed(k, v) && DENY.test(strip(v))).map(([k, v]) => `${k}: ${v.slice(0, 160)}`);
    if (process.env.TEXT_DENY_SOFT) { console.log(bad.join("\n")); return; }
    expect(bad).toEqual([]);
  });
});

describe("download attributes from the real cells-aux store attrs", () => {
  it("auxSourceAttrs output of the fixture store contains no denylisted terms", async () => {
    const path = await import("node:path");
    const { auxSourceAttrs } = await import("../src/cell/auxinfo");
    const { siteDeny, NAN_WORD } = await import("./denylist");
    const root = path.resolve(__dirname, "../../staging/fixture/cells-aux.zarr");
    if (!fs.existsSync(root)) return;
    for (const v of ["qsdiv", "ai_mean", "ai_valid_frac", "ai_sat_frac"]) {
      const attrs = JSON.parse(fs.readFileSync(path.join(root, v, "zarr.json"), "utf8")).attributes;
      const out = auxSourceAttrs({ series: {}, scalars: {}, attrs: { [v]: attrs } } as never, v);
      expect(Object.keys(out).length).toBeGreaterThan(2);
      for (const [k, t] of Object.entries(out)) expect(siteDeny().test(t) || NAN_WORD.test(t), `${v}.${k}: ${t}`).toBe(false);
    }
  });
});
