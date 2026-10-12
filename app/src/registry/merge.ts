// Merge the hand-written registry (registry/layers.yaml) with generated fragments
// (registry/generated/*.yaml, written by the pipeline tracks). Pure; used by the app
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
