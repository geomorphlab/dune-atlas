// @vitest-environment happy-dom
// Mars: the Concepts entries of the Mars atlas (Mars and both), the grain-size entry linked from the slider,
// the search convention (planetocentric, east-positive) and the place list (enabled; tests/mars/places.test.ts).
import { describe, expect, it } from "vitest";
import { CONCEPTS, conceptFor } from "../../src/core/ui/concepts";
import { loadRegistry } from "../../src/core/registry/load";
import { PROFILE } from "../../src/bodies/mars/profile";
import { loadPlaces } from "../../src/core/search/places";
import { parseConcepts } from "../../src/core/ui/concepts";
import md from "../../../docs/concepts/concepts-earth-mars.md?raw";

describe("Mars concepts and search", () => {
  it("the Mars atlas shows the Mars and both entries", () => {
    expect(CONCEPTS.map((c) => c.title)).toEqual(parseConcepts(md).entries.filter((e) => e.tag !== "Earth").map((e) => e.title));
    expect(CONCEPTS.find((c) => c.id === "saturated-sand-flux-and-the-transport-law")!.paragraphs[0]).toMatch(/Pähtz & Durán \(2023\)/);
    expect(conceptFor("@threshold")!.title).toBe("Grain size and threshold");
    expect(conceptFor("uft")!.title).toBe("Grain size and threshold");
    expect(conceptFor("@dataset")).toBeUndefined();
  });
  it("every wind-derived Mars map field links to an entry", () => {
    const reg = loadRegistry().registry;
    for (const l of reg.layers.filter((x) => x.type === "zarr-field" && x.thresholdAware)) expect(conceptFor(l.id), l.id).toBeDefined();
  });
  it("search: planetocentric latitude, east-positive longitude -180..180 (0-360 converted); the named search is enabled", () => {
    expect(PROFILE.search.lonRange).toBe(180);
    expect(PROFILE.search.conventionNote).toBe("Planetocentric latitude, east-positive longitude (−180° to 180°; 0–360° E is converted).");
    expect(loadPlaces().enabled).toBe(true);
  });
});
