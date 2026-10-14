// Mars registry validation: the Earth schema + semantic checks (registry/validate.ts), with the
// threshold block checked against the Mars grain-size slider (pipeline mars/constants.py
// D_VALUES_UM, D_DEFAULT_INDEX) instead of the Earth u*,th values. Not bundled in the app.
import { validateRegistry } from "../../registry/validate";
import type { Registry } from "../../registry/types";
import { M } from "../../cell/marsphysics";

export function validateMarsRegistry(reg: unknown, schema: object): string[] {
  const errs = validateRegistry(reg, schema, []).filter((e) => !/^threshold: \d+ values, pipeline has|^threshold\.values\[\d+\]/.test(e));
  if (errs.some((e) => e.startsWith("schema:"))) return errs;
  const r = reg as Registry;
  const t = r.threshold;
  if (t.dim !== "d") errs.push(`threshold: dim '${t.dim}', Mars uses 'd'`);
  if (t.units !== "µm") errs.push(`threshold: units '${t.units}', Mars uses 'µm'`);
  if (t.label !== "Median grain diameter d") errs.push(`threshold: label '${t.label}'`);
  if (t.defaultIndex !== M.D_DEFAULT_INDEX) errs.push(`threshold: defaultIndex ${t.defaultIndex}, pipeline has ${M.D_DEFAULT_INDEX}`);
  if (t.values.length !== M.D_VALUES_UM.length) errs.push(`threshold: ${t.values.length} values, pipeline has ${M.D_VALUES_UM.length}`);
  else t.values.forEach((v, i) => { if (v !== M.D_VALUES_UM[i]) errs.push(`threshold.values[${i}] = ${v} differs from pipeline D_VALUES_UM ${M.D_VALUES_UM[i]}`); });
  // Earth-only layers must not appear on Mars
  for (const id of ["aridity", "vegetation"]) if (r.layers.some((l) => l.id === id)) errs.push(`layer ${id}: Earth-only layer in the Mars registry`);
  if ((r.datasets ?? []).some((d) => /era5/i.test(d.id))) errs.push("datasets: ERA5 datasets in the Mars registry");
  for (const l of r.layers) if (/(^|\/)dune-atlas\/v\d/.test(l.source)) errs.push(`layer ${l.id}: Earth data path '${l.source}'`);
  return errs;
}
