// Build-time registry assembly: the body's registry files (@body/registry: registry/<body>/layers.yaml,
// generated/*.yaml, datasets/<id>/*.yaml) are inlined by Vite and merged at startup. Validation runs
// in CI (npm run validate-registry, validate-registry:mars) and in tests, not in the browser.
import yaml from "js-yaml";
import { baseFiles, datasetFiles, generatedFiles, REGISTRY_DIR } from "@body/registry";
import { addDatasets, mergeRegistry, type DatasetFiles, type MergeResult } from "./merge";
import type { DatasetDef, Registry, RegistryFragment } from "./types";

function datasetDirs(): DatasetFiles[] {
  const by = new Map<string, DatasetFiles>();
  for (const [p, text] of Object.entries(datasetFiles)) {
    const parts = p.split("/"), name = parts.pop()!, id = parts.pop()!;
    const d = by.get(id) ?? by.set(id, { id, entries: [], fragments: [] }).get(id)!;
    if (name === "dataset.yaml") d.entries.push(...((yaml.load(text) as DatasetDef[]) ?? []));
    else d.fragments.push([name, yaml.load(text) as RegistryFragment]);
  }
  return [...by.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function loadRegistry(): MergeResult {
  const baseText = Object.values(baseFiles)[0];
  if (!baseText) throw new Error(`${REGISTRY_DIR}/layers.yaml not found at build time`);
  const base = yaml.load(baseText) as Registry;
  const frags = Object.entries(generatedFiles).map(([path, text]) => [path.split("/").pop()!, yaml.load(text) as RegistryFragment] as [string, RegistryFragment]);
  return addDatasets(mergeRegistry(base, frags), base, frags, datasetDirs());
}

export const generatedFragmentNames = Object.keys(generatedFiles).map((p) => p.split("/").pop()!);
