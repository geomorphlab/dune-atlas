// Mars dune 'invert' view: registry/mars/layers.yaml carries invertSource / invertSourceLayer on the
// dunes placeholder (Earth puts them on its generated dunes layer). The generated dunes fragment
// (registry/mars/generated/dunes.yaml) replaces the placeholder as a whole; until it carries its own
// invert fields, keep the base layer's on the merged layer. Applied by the Mars patch of registry/load.ts.
import type { MergeResult } from "../../registry/merge";
import type { Registry } from "../../registry/types";

export function withBaseInvert(merged: MergeResult, base: Registry): MergeResult {
  for (const b of base.layers) {
    if (!b.invertSource) continue;
    const l = merged.registry.layers.find((x) => x.id === b.id);
    if (l && !l.invertSource) Object.assign(l, { invertSource: b.invertSource, invertSourceLayer: b.invertSourceLayer });
  }
  return merged;
}
