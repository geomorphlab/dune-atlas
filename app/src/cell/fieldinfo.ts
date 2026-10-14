// Display metadata for the 23 qsat fields: kind -> display transform and units.
// Long names: the atlas's one name per quantity (registry/field_names.json, = the layer titles); descriptions
// from registry/qsat_field_metadata.json (source attrs) unless field_names.json defines one.
// Which fields exist is decided by the cell store root attrs `field_vars`; fields in
// constants.WITHHELD_VARS (currently none) are never displayed or exported (isPublishedField).
import meta from "../../../registry/qsat_field_metadata.json";
// one name per quantity (review L5): the registry title / titleTex, written by the pipeline with the registry
import names from "../../../registry/field_names.json";
import { C } from "../util/constants";
import { mathToAxisDeg, mathToBearingDeg } from "../util/angles";

export type FieldKind = "flux" | "direction" | "axis" | "fraction" | "ratio";

export interface FieldInfo {
  id: string;
  kind: FieldKind;
  longName: string; // TeX-ish
  description: string;
  sourceUnits: string;
  displayUnits: string; // TeX-ish
  toDisplay: (v: number) => number;
}

const FLUX = new Set(["dpm", "rdpm", "qnlb", "qncb", "qalb", "qacb", "qnle", "qale", "qace"]);
const DIRECTION = new Set(["ae", "at", "ao", "rdpa"]);
/** dimensionless fractions in [0, 1] (NaN = undefined, e.g. no crest flux) */
const FRACTION = new Set(["uft", "qhbf", "qhef", "qha_rdp_dp"]);
const AXIS = new Set(["ab"]);

type Meta = Record<string, { long_name: string; units: string; description: string }>;
const M = meta as unknown as Meta;

/** Typos in the source attribute texts (fixed here until the source metadata is regenerated). */
const TEXT_FIXES: [RegExp, string][] = [[/signed signed/g, "signed"]];
const fix = (t: string) => TEXT_FIXES.reduce((a, [re, r]) => a.replace(re, r), t);

/** the atlas name of a quantity, with its symbol in TeX (e.g. "Drift potential $DP$") and an own definition */
export const FIELD_NAMES = names as Record<string, { title: string; titleTex: string; description?: string }>;

export function fieldInfo(id: string): FieldInfo {
  const m0 = M[id] ?? { long_name: id, units: "", description: "" };
  const n = FIELD_NAMES[id];
  const m = { ...m0, long_name: n?.titleTex ?? fix(m0.long_name), description: n?.description ?? fix(m0.description) };
  const kind: FieldKind = FLUX.has(id) ? "flux" : DIRECTION.has(id) ? "direction" : AXIS.has(id) ? "axis" : FRACTION.has(id) ? "fraction" : "ratio";
  const base = { id, kind, longName: m.long_name, description: m.description, sourceUnits: m.units };
  switch (kind) {
    case "flux":
      return { ...base, displayUnits: "m$^2$/yr", toDisplay: (v) => v * C.S2Y };
    case "direction":
      return { ...base, displayUnits: "° (bearing, toward)", toDisplay: mathToBearingDeg };
    case "axis":
      return { ...base, displayUnits: "° (axis, 0–180)", toDisplay: mathToAxisDeg };
    case "fraction":
      return { ...base, displayUnits: "fraction (0–1)", toDisplay: (v) => v };
    default:
      return { ...base, displayUnits: "ratio", toDisplay: (v) => v };
  }
}
