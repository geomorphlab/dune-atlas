// CI gate for the Mars build: merge registry/mars/layers.yaml + registry/mars/generated/*.yaml and the wind
// datasets registry/mars/datasets/<id>/ (dataset.yaml + fragments named like the generated ones) exactly as the
// Mars app does (core/registry/load.ts) and validate the result.
//   npm run validate-registry:mars
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { validatePlaces } from "../src/core/registry/validate";
import { addDatasets, mergeRegistry, type DatasetFiles } from "../src/core/registry/merge";
import { validateMarsRegistry } from "../src/bodies/mars/registry/validate";
import type { DatasetDef, Registry, RegistryFragment } from "../src/core/registry/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const regDir = path.resolve(here, "../../registry");
const marsDir = path.join(regDir, "mars");
const base = yaml.load(fs.readFileSync(path.join(marsDir, "layers.yaml"), "utf8")) as Registry;
const schema = JSON.parse(fs.readFileSync(path.join(regDir, "layers.schema.json"), "utf8"));
const genDir = path.join(marsDir, "generated");
const frags: [string, RegistryFragment][] = fs.existsSync(genDir)
  ? fs.readdirSync(genDir).filter((f) => f.endsWith(".yaml")).sort().map((f) => [f, yaml.load(fs.readFileSync(path.join(genDir, f), "utf8")) as RegistryFragment])
  : [];

const errors: string[] = [];
errors.push(...validateMarsRegistry(base, schema).map((e) => `mars/layers.yaml: ${e}`));
// wind datasets besides the default: their entries, and fragments replacing the generated ones for that dataset
const dsRoot = path.join(marsDir, "datasets");
const datasets: DatasetFiles[] = fs.existsSync(dsRoot) ? fs.readdirSync(dsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort().map((id) => {
  const dir = path.join(dsRoot, id), files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();
  const entries = files.includes("dataset.yaml") ? (yaml.load(fs.readFileSync(path.join(dir, "dataset.yaml"), "utf8")) as DatasetDef[]) ?? [] : [];
  if (!entries.length) errors.push(`datasets/${id}: no dataset.yaml entry`);
  for (const e of entries) if (e.id !== id) errors.push(`datasets/${id}/dataset.yaml: entry id '${e.id}' differs from the folder`);
  return { id, entries, fragments: files.filter((f) => f !== "dataset.yaml").map((f) => [f, yaml.load(fs.readFileSync(path.join(dir, f), "utf8")) as RegistryFragment] as [string, RegistryFragment]) };
}) : [];
const merged = addDatasets(mergeRegistry(base, frags), base, frags, datasets);
errors.push(...merged.errors);
errors.push(...validateMarsRegistry(merged.registry, schema).map((e) => `merged: ${e}`));
const r = merged.registry;
console.log(`mars registry: ${r.layers.length} layers in ${r.groups.length} groups, ${r.basemaps.length} basemaps; fragments: ${frags.map((f) => f[0]).join(", ") || "none"}`);
for (const d of datasets) console.log(`  dataset ${d.id}: ${d.fragments.length ? `own fragments ${d.fragments.map((f) => f[0]).join(", ")}` : "no own fragments (the generated layer definitions with its sources)"}; ${Object.keys(r.datasetLayers?.[d.id] ?? {}).length} layer definitions differ from the default dataset's`);
for (const x of merged.replaced) console.log(`  layer '${x.id}' from mars/layers.yaml replaced by ${x.by}`);
// named places of the search box (registry/<body>/places.yaml)
const placesFile = path.join(marsDir, "places.yaml");
if (fs.existsSync(placesFile)) errors.push(...validatePlaces(yaml.load(fs.readFileSync(placesFile, "utf8")), JSON.parse(fs.readFileSync(path.join(regDir, "places.schema.json"), "utf8"))).map((e) => `places.yaml: ${e}`));
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
console.log("mars registry OK");
