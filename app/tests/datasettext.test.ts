// Dataset text and map attribution follow the dataset table.
import { describe, expect, it } from "vitest";
import { DATASET_INFO, datasetFacts } from "../src/core/cell/datasetinfo";
import { mapAttributionHtml } from "@body/citation";
import { DATASET_INFO_TEXT } from "../src/core/ui/helpText";
import { THRESHOLD_INFO_DEFAULT } from "../src/bodies/earth/profile";
import { storedNote } from "../src/core/cell/export";

describe("dataset-selector text (§4 item 1)", () => {
  it("names every dataset with its grid and the period from the dataset table", () => {
    for (const d of Object.values(DATASET_INFO)) expect(DATASET_INFO_TEXT).toContain(`${d.name}, ${d.resolution}`);
    expect(DATASET_INFO_TEXT).toContain(datasetFacts("period"));
  });
  it("gives the Baas (2026) comparison as an example in the dataset text only", () => {
    expect(DATASET_INFO_TEXT).toMatch(/e\.g\., Baas \(2026\) reports ERA5-Land 10 m wind speeds 20–30 % below those of ERA5/);
    expect(THRESHOLD_INFO_DEFAULT).not.toMatch(/Baas/);
  });
});

describe("map attribution follows the dataset (§4 item 4)", () => {
  it("ERA5-Land: dune map MIT (its source record), wind-regime data from Gunn (2026), CC BY 4.0", () => {
    const a = mapAttributionHtml("era5-land");
    expect(a).toMatch(/^Dune map: <a [^>]*>Gunn \(2026\)<\/a>, MIT; wind-regime data: <a [^>]*>Gunn \(2026\)<\/a>, CC BY 4\.0$/);
  });
  it("ERA5: fields computed for the atlas, CC BY 4.0 (the ERA5 licence since 2 July 2025)", () => {
    const a = mapAttributionHtml("era5");
    expect(a).toMatch(/^Dune map: <a [^>]*>Gunn \(2026\)<\/a>, MIT; /);
    expect(a).toMatch(/computed for the atlas from ERA5 /);
    expect(a).toMatch(/, CC BY 4\.0$/);
    expect(a).not.toMatch(/wind-regime data: /);
  });
  it("driven by the dataset metadata", () => {
    for (const [id, d] of Object.entries(DATASET_INFO))
      expect(mapAttributionHtml(id).includes("; wind-regime data: ")).toBe(d.fieldsFrom === "paper");
  });
});

describe("export descriptions say how values are held in the file", () => {
  it("directions and axes in radians, fluxes in m2 s-1, once", () => {
    expect(storedNote({ kind: "direction" }, "A bearing.")).toMatch(/radians counter-clockwise from east \(the direction pointed toward\)/);
    expect(storedNote({ kind: "axis" }, "An axis.")).toMatch(/value \+ pi are the same line/);
    expect(storedNote({ kind: "flux" }, "A flux.")).toMatch(/m2 s-1 \(x 31557600 = m2 yr-1\)\.$/);
    expect(storedNote({ kind: "axis" }, "Already in radians.")).toBe("Already in radians.");
    expect(storedNote({ kind: "scalar" }, "Plain.")).toBe("Plain.");
    expect(storedNote({ kind: "flux" }, "")).toBe("");
  });
});
