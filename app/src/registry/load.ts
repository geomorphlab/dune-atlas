// Build-time registry assembly: registry/layers.yaml + registry/generated/*.yaml are inlined
// by Vite (import.meta.glob, ?raw) and merged at startup. Validation runs in CI
// (npm run validate-registry) and in tests, not in the browser.
import yaml from "js-yaml";
import { addDatasets, mergeRegistry, type DatasetFiles, type MergeResult } from "./merge";
import type { DatasetDef, Registry, RegistryFragment } from "./types";

const baseFiles = import.meta.glob("../../../registry/layers.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const generatedFiles = import.meta.glob("../../../registry/generated/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
// additional wind datasets: registry/datasets/<id>/{dataset.yaml, <fragment>.yaml}
const datasetFiles = import.meta.glob("../../../registry/datasets/*/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

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
  if (!baseText) throw new Error("registry/layers.yaml not found at build time");
  const base = yaml.load(baseText) as Registry;
  const frags = Object.entries(generatedFiles).map(([path, text]) => [path.split("/").pop()!, yaml.load(text) as RegistryFragment] as [string, RegistryFragment]);
  return addDatasets(mergeRegistry(base, frags), base, frags, datasetDirs());
}

export const generatedFragmentNames = Object.keys(generatedFiles).map((p) => p.split("/").pop()!);
