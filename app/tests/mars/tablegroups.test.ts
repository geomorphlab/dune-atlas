// Mars: summary-table groups follow the Mars registry's layer groups; no colour-bar notes.
import { describe, it } from "vitest";
import { loadRegistry } from "../../src/core/registry/load";
import { checkGroupsMatchRegistry } from "../tablegroupslib";

describe("Mars summary table groups", () => {
  it("groups follow the registry; no layer has a colour-bar note", () => checkGroupsMatchRegistry(loadRegistry().registry));
});
