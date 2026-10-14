// Shared checks (both builds): summary-table groups follow the registry's layer groups; no colour-bar notes.
import { expect } from "vitest";
import type { Registry } from "../src/registry/types";
import { TABLE_GROUPS } from "../src/ui/tablegroups";

export function checkGroupsMatchRegistry(reg: Registry) {
  const title = (id: string) => reg.groups.find((g) => g.id === id)?.title;
  for (const g of TABLE_GROUPS) {
    if (g.id === "related") expect(reg.groups.some((x) => x.title === "Related data")).toBe(true);
    else if (g.id !== "cell") expect(title(g.id), g.id).toBe(g.title);
    for (const id of g.rows) {
      const l = reg.layers.find((x) => x.id === id);
      if (l && g.id !== "related" && g.id !== "cell") expect(l.group, id).toBe(g.id);
    }
  }
  for (const l of reg.layers) expect(l.display?.legendNote, `${l.id}: colour-bar note (each explanation once, in the info)`).toBeUndefined();
}
