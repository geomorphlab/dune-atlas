// Mars build (replaces cell/fieldinfo.ts): a thin wrapper of the Earth module. Kinds, display units and
// transforms are Earth's (flux m^2/yr with the same S2Y, Julian year; checked in tests/mars/panel.test.ts);
// only the long names / descriptions / source units come from registry/mars/qsat_field_metadata.json
// (Wind track; texts of the per-hour Mars threshold).
import meta from "../../../../registry/mars/qsat_field_metadata.json";
import { fieldInfo as earthFieldInfo, type FieldInfo } from "../../cell/fieldinfo";

export type { FieldInfo, FieldKind } from "../../cell/fieldinfo";

type Meta = Record<string, { long_name: string; units: string; description: string }>;
const M = meta as unknown as Meta;

/** Typos in the source attribute texts (as Earth). */
const TEXT_FIXES: [RegExp, string][] = [[/signed signed/g, "signed"]];
const fix = (t: string) => TEXT_FIXES.reduce((a, [re, r]) => a.replace(re, r), t);

export function fieldInfo(id: string): FieldInfo {
  const m = M[id] ?? { long_name: id, units: "", description: "" };
  return { ...earthFieldInfo(id), longName: fix(m.long_name), description: fix(m.description), sourceUnits: m.units };
}
