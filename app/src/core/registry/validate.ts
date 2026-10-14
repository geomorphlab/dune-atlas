// Registry validation: JSON-schema (ajv, draft 2020-12) + semantic checks the schema
// cannot express. Used by scripts/validate-registry.ts (CI) and tests; not bundled in the app.
import Ajv2020 from "ajv/dist/2020";
import type { Registry } from "./types";
import { COLORMAPS } from "../util/colormaps";
import C from "../generated/constants.json";


export function validateRegistry(reg: unknown, schema: object, withheld: Iterable<string> = C.WITHHELD_VARS): string[] {
  const WITHHELD = new Set<string>(withheld);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const errors: string[] = [];
  if (!validate(reg)) {
    for (const e of validate.errors ?? []) errors.push(`schema: ${e.instancePath || "/"} ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
    return errors; // semantic checks assume a schema-valid object
  }
  const r = reg as Registry;
  const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
  for (const d of dup(r.layers.map((l) => l.id))) errors.push(`layers: duplicate id '${d}'`);
  for (const d of dup(r.groups.map((g) => g.id))) errors.push(`groups: duplicate id '${d}'`);
  for (const d of dup(r.basemaps.map((b) => b.id))) errors.push(`basemaps: duplicate id '${d}'`);
  const groupIds = new Set(r.groups.map((g) => g.id));
  const t = r.threshold;
  if (t.defaultIndex >= t.values.length) errors.push(`threshold: defaultIndex ${t.defaultIndex} >= ${t.values.length} values`);
  if (t.values.length !== C.UT_VALUES.length) errors.push(`threshold: ${t.values.length} values, pipeline has ${C.UT_VALUES.length}`);
  else t.values.forEach((v, i) => {
    if (Math.abs(v - C.UT_VALUES[i]) > 1e-9) errors.push(`threshold.values[${i}] = ${v} differs from pipeline UT_VALUES ${C.UT_VALUES[i]}`);
  });
  if (r.basemaps.filter((b) => b.default).length > 1) errors.push("basemaps: more than one default");
  const ds = r.datasets ?? [];
  for (const d of dup(ds.map((x) => x.id))) errors.push(`datasets: duplicate id '${d}'`);
  if (r.defaultDataset && !ds.some((d) => d.id === r.defaultDataset)) errors.push(`defaultDataset '${r.defaultDataset}' is not in datasets`);
  if (ds.length && !r.defaultDataset) errors.push("defaultDataset is required when datasets are listed");
  // every dataset says what it is and how to cite it (the panel, About, downloads and exports read these)
  const defined = new Set(ds.flatMap((d) => (d.citationSources ?? []).map((s) => s.id)));
  for (const d of ds) {
    if (!d.info) errors.push(`datasets: '${d.id}' has no info`);
    if (!d.credits) { errors.push(`datasets: '${d.id}' has no credits`); continue; }
    if (!d.credits.sources.includes(d.credits.dataSource)) errors.push(`datasets: '${d.id}' credits.dataSource '${d.credits.dataSource}' is not in credits.sources`);
    if (!defined.has(d.credits.dataSource)) errors.push(`datasets: '${d.id}' credits.dataSource '${d.credits.dataSource}' is not defined in any citationSources`);
  }
  for (const b of r.basemaps) {
    if ((b.kind === "raster" || b.kind === "hillshade") && !(b.tiles && b.tiles.length)) errors.push(`basemap ${b.id}: kind ${b.kind} needs tiles`);
    if (b.kind === "style" && !b.style) errors.push(`basemap ${b.id}: kind style needs style URL`);
    if (b.kind === "hillshade" && !b.encoding) errors.push(`basemap ${b.id}: hillshade needs encoding`);
  }
  const fieldVars = new Set(r.layers.filter((l) => l.type === "zarr-field" && l.variable).map((l) => l.variable!));
  for (const l of r.layers) {
    const at = `layer ${l.id}`;
    for (const name of [l.id, l.variable ?? ""]) if (WITHHELD.has(name)) errors.push(`${at}: '${name}' is withheld (constants.WITHHELD_VARS) and must not be published`);
    if (!groupIds.has(l.group)) errors.push(`${at}: unknown group '${l.group}'`);
    if ((l.source.includes("{dataset}") || l.invertSource?.includes("{dataset}")) && !ds.length) errors.push(`${at}: source uses {dataset} but the registry has no datasets`);
    if (/\{(?!dataset\})[^}]*\}/.test(l.source)) errors.push(`${at}: unknown placeholder in source '${l.source}' (only {dataset})`);
    if (l.type === "zarr-field") {
      if (!l.variable) errors.push(`${at}: zarr-field needs 'variable'`);
      if (!l.display?.clim) errors.push(`${at}: zarr-field needs display.clim`);
      if (!l.display?.colormap) errors.push(`${at}: zarr-field needs display.colormap`);
      if (l.display?.log && l.display.clim && !(l.display.clim[0] > 0 || (l.display.clim[0] < 0 && l.display.clim[1] > 0))) errors.push(`${at}: log display needs clim[0] > 0 (log) or clim[0] < 0 < clim[1] (symlog)`);
      if (l.display?.transform === "scale" && l.display.scale === undefined) errors.push(`${at}: transform 'scale' needs display.scale`);
      for (const k of ["magnitudeVar", "maskVar"] as const) {
        const v = l.display?.[k];
        if (v === undefined) continue;
        if (WITHHELD.has(v)) errors.push(`${at}: display.${k} '${v}' is withheld`);
        if (!fieldVars.has(v)) errors.push(`${at}: display.${k} '${v}' is not the variable of any zarr-field layer`);
      }
    }
    if (l.display?.colormap && !(l.display.colormap in COLORMAPS)) errors.push(`${at}: unknown colormap '${l.display.colormap}' (have ${Object.keys(COLORMAPS).join(", ")})`);
    if (l.display?.clim && !(l.display.clim[1] > l.display.clim[0])) errors.push(`${at}: clim must be increasing`);
    if (l.thresholdAware && l.type !== "zarr-field") errors.push(`${at}: thresholdAware only supported for zarr-field`);
    if (l.type === "pmtiles-vector" && !l.sourceLayer) errors.push(`${at}: pmtiles-vector needs sourceLayer`);
    if (l.style) {
      const ok = new Set(["fill", "line", "circle", "raster"]);
      for (const k of Object.keys(l.style)) if (!ok.has(k)) errors.push(`${at}: style key '${k}' must be one of ${[...ok].join(", ")}`);
    }
  }
  return errors;
}

/** The body's named places (registry/<body>/places.yaml) against registry/places.schema.json, plus unique ids. */
export function validatePlaces(doc: unknown, schema: object): string[] {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const v = ajv.compile(schema);
  if (!v(doc)) return (v.errors ?? []).map((e) => `places schema: ${e.instancePath || "/"} ${e.message}`);
  const ids = (doc as { places: { id: string }[] }).places.map((p) => p.id);
  return ids.filter((x, i) => ids.indexOf(x) !== i).map((d) => `places: duplicate id '${d}'`);
}
