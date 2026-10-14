// CI gate: merge registry/earth/layers.yaml + registry/earth/generated/*.yaml exactly as the app does and
// validate the result against registry/layers.schema.json plus semantic checks.
//   npm run validate-registry
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { mergeRegistry } from "../src/registry/merge";
import { validateRegistry } from "../src/registry/validate";
import type { Registry, RegistryFragment } from "../src/registry/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const regDir = path.resolve(here, "../../registry");
const earthDir = path.join(regDir, "earth");
const base = yaml.load(fs.readFileSync(path.join(earthDir, "layers.yaml"), "utf8")) as Registry;
const schema = JSON.parse(fs.readFileSync(path.join(regDir, "layers.schema.json"), "utf8"));
const genDir = path.join(earthDir, "generated");
const frags: [string, RegistryFragment][] = fs.existsSync(genDir)
  ? fs.readdirSync(genDir).filter((f) => f.endsWith(".yaml")).sort().map((f) => [f, yaml.load(fs.readFileSync(path.join(genDir, f), "utf8")) as RegistryFragment])
  : [];

const errors: string[] = [];
// the hand-written file must be valid on its own, too
errors.push(...validateRegistry(base, schema).map((e) => `layers.yaml: ${e}`));
const merged = mergeRegistry(base, frags);
errors.push(...merged.errors);
errors.push(...validateRegistry(merged.registry, schema).map((e) => `merged: ${e}`));

const r = merged.registry;
console.log(`registry: ${r.layers.length} layers in ${r.groups.length} groups, ${r.basemaps.length} basemaps; fragments: ${frags.map((f) => f[0]).join(", ") || "none"}`);
for (const x of merged.replaced) console.log(`  layer '${x.id}' from layers.yaml replaced by ${x.by}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
console.log("registry OK");
