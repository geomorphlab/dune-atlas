// Mars registry validation: the Earth schema + semantic checks (registry/validate.ts), with the
// threshold block checked against the Mars grain-size slider (pipeline mars/constants.py
// D_VALUES_UM, D_DEFAULT_INDEX) instead of the Earth u*,th values. Not bundled in the app.
import { validateRegistry } from "../../../core/registry/validate";
import type { Registry } from "../../../core/registry/types";
import { M } from "../marsphysics";

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
  // every Mars wind dataset states its cell-store grid and sampling (info.grid, info.series): the app needs them
  // for non-square cells, rows that stop short of the poles and series that are not hourly
  for (const d of r.datasets ?? []) {
    const g = d.info?.grid, se = d.info?.series;
    if (!g) errs.push(`dataset ${d.id}: info.grid missing`);
    else {
      if (d.info && Math.abs(Math.abs(g.dlat) - d.info.resDeg) > 1e-9) errs.push(`dataset ${d.id}: info.resDeg ${d.info.resDeg} differs from the grid's |dlat| ${Math.abs(g.dlat)}`);
      if (Math.abs(g.dlon * g.nx - 360) > 1e-6) errs.push(`dataset ${d.id}: the grid's columns span ${g.dlon * g.nx}°, not 360°`);
      if (g.lat0 - g.dlat / 2 > 90 + 1e-6 || g.lat0 + g.dlat * (g.ny - 0.5) < -90 - 1e-6) errs.push(`dataset ${d.id}: grid rows beyond the poles`);
    }
    if (!se) errs.push(`dataset ${d.id}: info.series missing`);
    if (!d.prefix.startsWith("dune-atlas/mars/")) errs.push(`dataset ${d.id}: prefix '${d.prefix}' is not under dune-atlas/mars/`);
  }
  return errs;
}
