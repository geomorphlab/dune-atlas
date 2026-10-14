// @vitest-environment happy-dom
// Earth user-facing text: no implementation / failure-handling / internal / relict wording (round 7 item 3).
import { describe, expect, it, vi } from "vitest";
import { collectPublicText } from "./publictext";
import { devPhraseHits } from "./usertextlib";

vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} });

describe("user-facing text (Earth)", () => {
  it("the check catches each kind of phrase (not vacuous)", () => {
    expect(devPhraseHits({ a: "Shaded relief computed in the browser from Terrarium tiles", b: "coarser zoom levels are means", c: "values rounded for compression", d: "or does not respond" })).toHaveLength(5);
    expect(devPhraseHits({ "metadata.files.0": "fields_by_threshold.csv", "csv.x.y": "zarr" })).toEqual([]);
  });
  it("site and download strings are written for visitors", async () => {
    const hits = devPhraseHits(await collectPublicText());
    if (process.env.TEXT_DENY_SOFT) { console.log(hits.join("\n")); return; }
    expect(hits).toEqual([]);
  });
});
