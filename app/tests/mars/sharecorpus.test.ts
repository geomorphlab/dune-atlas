// Recorded Mars share links (tests/fixtures/share-links-mars.json) still encode, decode and open identically.
import { describe, it } from "vitest";
import { loadRegistry } from "../../src/core/registry/load";
import { checkShareCorpus } from "../sharecorpuslib";

describe("share-link corpus (Mars)", () => {
  it("every recorded link encodes, decodes and opens the recorded state", () => checkShareCorpus("mars", loadRegistry().registry));
});
