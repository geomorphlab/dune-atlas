// CI gate for the Mars build: merge registry/mars/layers.yaml + registry/mars/generated/*.yaml
// exactly as the Mars app does and validate the result.
//   npm run validate-registry:mars
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { mergeRegistry } from "../src/registry/merge";
import { validateMarsRegistry } from "../src/bodies/mars/registry/validate";
import type { Registry, RegistryFragment } from "../src/registry/types";

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
const merged = mergeRegistry(base, frags);
errors.push(...merged.errors);
errors.push(...validateMarsRegistry(merged.registry, schema).map((e) => `merged: ${e}`));
const r = merged.registry;
console.log(`mars registry: ${r.layers.length} layers in ${r.groups.length} groups, ${r.basemaps.length} basemaps; fragments: ${frags.map((f) => f[0]).join(", ") || "none"}`);
for (const x of merged.replaced) console.log(`  layer '${x.id}' from mars/layers.yaml replaced by ${x.by}`);
if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
console.log("mars registry OK");
