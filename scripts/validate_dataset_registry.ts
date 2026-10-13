// Validate the registry files of an additional wind dataset (registry/datasets/<id>/, written by
// `python -m dune_atlas_pipeline.dataset_registry write`) with the app's own merge + validator, as the
// registry would look with that dataset added: registry/layers.yaml + its `datasets` entry, and
// registry/generated/*.yaml with the dataset's fragments in place of the same-named generated ones.
//   cd app && npx vite-node ../scripts/validate_dataset_registry.ts era5
// (imports resolved by absolute path so this script needs nothing outside app/node_modules)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const app = path.join(repo, "app");
const id = process.argv[2] ?? "era5";

const yaml = (await import(path.join(app, "node_modules", "js-yaml", "dist", "js-yaml.mjs"))).default;
const { mergeRegistry } = await import(path.join(app, "src", "registry", "merge.ts"));
const { validateRegistry } = await import(path.join(app, "src", "registry", "validate.ts"));

const reg = path.join(repo, "registry");
const dsDir = path.join(reg, "datasets", id);
const base = yaml.load(fs.readFileSync(path.join(reg, "layers.yaml"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(reg, "layers.schema.json"), "utf8"));
const entry = yaml.load(fs.readFileSync(path.join(dsDir, "dataset.yaml"), "utf8"));
base.datasets = [...(base.datasets ?? []).filter((d: { id: string }) => d.id !== id), ...entry];
const gen = path.join(reg, "generated");
const names = new Set(fs.readdirSync(gen).filter((f) => f.endsWith(".yaml")));
const own = fs.readdirSync(dsDir).filter((f) => f.endsWith(".yaml") && f !== "dataset.yaml");
for (const f of own) names.add(f);
const frags = [...names].sort().map((f) => {
  const p = own.includes(f) ? path.join(dsDir, f) : path.join(gen, f);
  return [f, yaml.load(fs.readFileSync(p, "utf8"))];
});
const errors: string[] = [];
errors.push(...validateRegistry(base, schema).map((e: string) => `layers.yaml + ${id} entry: ${e}`));
const merged = mergeRegistry(base, frags);
errors.push(...merged.errors);
errors.push(...validateRegistry(merged.registry, schema).map((e: string) => `merged: ${e}`));
const r = merged.registry;
const dsLayers = r.layers.filter((l: { source?: string }) => (l.source ?? "").includes("{dataset}"));
console.log(`${id}: ${r.layers.length} layers (${dsLayers.length} with '{dataset}' sources) in ${r.groups.length} groups; ` +
  `datasets ${r.datasets.map((d: { id: string }) => d.id).join(", ")}; fragments from ${id}: ${own.join(", ")}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
console.log("registry OK");
