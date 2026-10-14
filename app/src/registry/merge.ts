// Merge the hand-written registry (registry/layers.yaml) with generated fragments
// (registry/generated/*.yaml, written by the pipeline). Pure; used by the app
// (via import.meta.glob), by scripts/validate-registry.ts and by the tests.
//
// Rules
//  - Fragments are applied in filename order.
//  - A fragment group with an existing id updates that group's fields in place; new groups append.
//  - A fragment layer with an existing id REPLACES that layer in place (this is how the
//    placeholder entries in layers.yaml are superseded by generated ones); new layers append.
//  - Fragments may only contain `groups` and `layers`; anything else is reported as an error.
import type { DatasetDef, GroupDef, LayerDef, Registry, RegistryFragment } from "./types";

export interface MergeResult {
  registry: Registry;
  /** ids of base/earlier entries replaced by a later fragment, with the fragment name */
  replaced: { id: string; by: string }[];
  errors: string[];
}

export function mergeRegistry(base: Registry, fragments: [name: string, frag: RegistryFragment | null | undefined][]): MergeResult {
  const groups: GroupDef[] = base.groups.map((g) => ({ ...g }));
  const layers: LayerDef[] = base.layers.map((l) => ({ ...l }));
  const replaced: MergeResult["replaced"] = [];
  const errors: string[] = [];
  const sorted = [...fragments].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, frag] of sorted) {
    if (frag == null) continue;
    if (typeof frag !== "object" || Array.isArray(frag)) {
      errors.push(`${name}: fragment must be a mapping with 'groups' and/or 'layers'`);
      continue;
    }
    for (const k of Object.keys(frag)) {
      if (k !== "groups" && k !== "layers") errors.push(`${name}: unexpected top-level key '${k}' (only groups, layers)`);
    }
    for (const g of frag.groups ?? []) {
      const i = groups.findIndex((x) => x.id === g.id);
      if (i >= 0) groups[i] = { ...groups[i], ...g };
      else groups.push({ ...g });
    }
    for (const l of frag.layers ?? []) {
      const i = layers.findIndex((x) => x.id === l.id);
      if (i >= 0) {
        layers[i] = { ...l };
        replaced.push({ id: l.id, by: name });
      } else layers.push({ ...l });
    }
  }
  return { registry: { ...base, groups, layers }, replaced, errors };
}

/** Resolve a registry `source` against the data base URL (absolute URLs pass through).
 *  '{dataset}' expands to the selected dataset's prefix (dataset-dependent data). */
export function resolveSource(source: string, dataBase: string, datasetPrefix?: string): string {
  let src = source;
  if (src.includes("{dataset}")) {
    if (datasetPrefix === undefined) throw new Error(`source '${source}' needs a dataset`);
    src = src.replace(/\{dataset\}/g, datasetPrefix.replace(/^\/+|\/+$/g, ""));
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src)) return src;
  return `${dataBase.replace(/\/+$/, "")}/${src.replace(/^\/+/, "")}`;
}

/** The selected dataset (by id), else the registry default, else the first. */
export function selectDataset(reg: Registry, id?: string): DatasetDef | undefined {
  const ds = reg.datasets ?? [];
  return ds.find((d) => d.id === id) ?? ds.find((d) => d.id === reg.defaultDataset) ?? ds[0];
}

/** Does this source depend on the selected dataset? */
export const isDatasetDependent = (source: string) => source.includes("{dataset}");

/** Registry files of an additional wind dataset (registry/datasets/<id>/): `dataset.yaml` (a list
 *  with its `datasets` entry) and fragments named like the generated ones (qsat_fields.yaml,
 *  x_extra_fields.yaml) that replace them for that dataset. */
export interface DatasetFiles { id: string; entries: DatasetDef[]; fragments: [string, RegistryFragment][] }

/** Add datasets to a merged registry: their `datasets` entries, and for each the layers whose
 *  definition differs from the default dataset's (sources, colour limits, citations), keyed by
 *  layer id in `datasetLayers[datasetId]`. Layer ids, groups and order are those of the default
 *  merged registry; a dataset fragment may not introduce new layer ids. */
export function addDatasets(merged: MergeResult, base: Registry, generated: [string, RegistryFragment][], datasets: DatasetFiles[]): MergeResult {
  const reg = merged.registry;
  const errors = [...merged.errors];
  const list: DatasetDef[] = [...(reg.datasets ?? [])];
  const datasetLayers: Record<string, Record<string, LayerDef>> = { ...(reg.datasetLayers ?? {}) };
  for (const d of datasets) {
    for (const e of d.entries) if (!list.some((x) => x.id === e.id)) list.push({ ...e });
    const own = new Map(d.fragments);
    const names = new Set([...generated.map((g) => g[0]), ...own.keys()]);
    const frags = [...names].map((n) => [n, own.get(n) ?? generated.find((g) => g[0] === n)![1]] as [string, RegistryFragment]);
    const m = mergeRegistry(base, frags);
    errors.push(...m.errors.map((e) => `dataset ${d.id}: ${e}`));
    const variants: Record<string, LayerDef> = {};
    for (const l of m.registry.layers) {
      const def = reg.layers.find((x) => x.id === l.id);
      if (!def) { errors.push(`dataset ${d.id}: layer '${l.id}' is not in the default registry`); continue; }
      if (JSON.stringify(def) !== JSON.stringify(l)) variants[l.id] = l;
    }
    datasetLayers[d.id] = variants;
  }
  return { ...merged, registry: { ...reg, datasets: list, datasetLayers }, errors };
}

const BASE_LAYERS = new WeakMap<Registry, Map<string, LayerDef>>();
/** Switch the registry's layer definitions to a dataset IN PLACE (the layer objects stay the same,
 *  so UI closures holding them see the new sources / colour limits / citations). The default
 *  dataset restores the original definitions. Returns the ids of layers whose definition changed. */
export function applyDatasetLayers(reg: Registry, datasetId: string): string[] {
  let base = BASE_LAYERS.get(reg);
  if (!base) { base = new Map(reg.layers.map((l) => [l.id, structuredClone(l)])); BASE_LAYERS.set(reg, base); }
  const variants = reg.datasetLayers?.[datasetId] ?? {};
  const changed: string[] = [];
  for (const l of reg.layers) {
    const next = structuredClone(variants[l.id] ?? base.get(l.id)!);
    if (JSON.stringify(next) === JSON.stringify(l)) continue;
    for (const k of Object.keys(l)) delete (l as unknown as Record<string, unknown>)[k];
    Object.assign(l, next);
    changed.push(l.id);
  }
  return changed;
}

/** Layer config after a dataset switch: colour-limit overrides of layers whose definition changed
 *  (other colour limits apply) are dropped; colour map, reversal, log, render mode, colours,
 *  spacing, opacity and visibility are kept. */
export function layersForDatasetSwitch<T extends { cfg?: { clim?: unknown } }>(layers: Record<string, T>, changed: string[]): Record<string, T> {
  let out = layers;
  for (const id of changed) {
    const st = layers[id];
    if (!st?.cfg || st.cfg.clim === undefined) continue;
    const { clim: _drop, ...cfg } = st.cfg as Record<string, unknown>;
    void _drop;
    if (out === layers) out = { ...layers };
    out[id] = { ...st, cfg: Object.keys(cfg).length ? cfg : undefined } as T;
  }
  return out;
}

/** Initial wind dataset: the URL's, else - unless the URL selects a cell (permalinks without a
 *  dataset are default-dataset links) - the last choice (localStorage), else the default. */
export function initialDataset(reg: Registry, urlDataset: string | undefined, urlHasCell: boolean, stored: string | undefined): string {
  return selectDataset(reg, urlDataset ?? (urlHasCell ? undefined : stored))?.id ?? "";
}
