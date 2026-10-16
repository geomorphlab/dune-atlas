// @vitest-environment happy-dom
// Public text: no references to issues with the source data / paper in the site or the downloads.
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { allowed, collectPublicText, DENY, ERA5_V2_STORE_ATTRS, strip } from "./publictext";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

describe("public text denylist", () => {
  it("the αH mode is the bed-instability mode everywhere", async () => {
    const t = await collectPublicText();
    expect(Object.entries(t).filter(([, v]) => /migration[- ]mode/i.test(v)).map(([k]) => k)).toEqual([]);
    expect(Object.values(t).some((v) => /bed-instability mode/.test(v))).toBe(true);
  });
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
    const { auxSourceAttrs } = await import("../src/core/cell/auxinfo");
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

describe("text shown or exported comes from the app, not from cell-store root attrs", () => {
  it("the ERA5 v2 store attrs contain free text the site must not show (dataset.land_cells: '... stored ...')", () => {
    expect(String((ERA5_V2_STORE_ATTRS.dataset as Record<string, string>).land_cells)).toMatch(/\bstored\b/);
  });
  it("sentinel: every free-text store attr and the generated dataset descriptions marked; none of the marks reaches the site (dataset selector tooltips included), panel or downloads", async () => {
    const MARK = "ZZSTOREATTR";
    // keep what the app legitimately reads from the store (grid, bins, thresholds, field list,
    // units, hours); mark every other string, nested ones included
    const KEEP = new Set(["grid", "um_edges", "ua_edges", "ut_values", "ut_default_index", "field_vars", "field_units", "n_hours"]);
    const mark = (v: unknown): unknown => typeof v === "string" ? `${MARK} ${v}` : Array.isArray(v) ? v.map(mark) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mark(x)])) : v;
    const attrs = Object.fromEntries(Object.entries(ERA5_V2_STORE_ATTRS).map(([k, v]) => [k, KEEP.has(k) ? v : mark(v)]));
    const t = await collectPublicText({}, attrs, { markDatasetDescriptions: MARK });
    expect(Object.keys(t).some((k) => k.startsWith("metadata.era5."))).toBe(true);
    expect(t["cell.nonland.era5"]).toMatch(/fraction above 0, i\.e\. any land in the cell\)\. This cell has no land/);
    // the Wind dataset selector tooltips: app text, not the generated registry descriptions
    expect(t["panel.dataset-option.era5"]).toBe("ERA5 0.25°, 1950–2024; land cells: land–sea mask fraction > 0");
    expect(t["panel.dataset-option.era5-land"]).toBe("ERA5-Land 0.1°, 1950–2024; land cells: land–sea mask fraction > 0.5");
    for (const ds of ["era5", "era5-land"]) expect(t[`panel.dataset-option.${ds}`]).not.toMatch(/\blsm\b|zarr|stored/);
    const leaks = Object.entries(t).filter(([, v]) => v.includes(MARK)).map(([k, v]) => `${k}: ${v.slice(0, 120)}`);
    expect(leaks).toEqual([]);
  });
});
