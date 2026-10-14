// Recorded Earth share links (tests/fixtures/share-links-earth.json) still encode, decode and open identically.
import { describe, it } from "vitest";
import { loadRegistry } from "../src/registry/load";
import { checkShareCorpus } from "./sharecorpuslib";

describe("share-link corpus (Earth)", () => {
  it("every recorded link encodes, decodes and opens the recorded state", () => checkShareCorpus("earth", loadRegistry().registry));
});
