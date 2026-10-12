// Build-time registry assembly: registry/layers.yaml + registry/generated/*.yaml are inlined
// by Vite (import.meta.glob, ?raw) and merged at startup. Validation runs in CI
// (npm run validate-registry) and in tests, not in the browser.
import yaml from "js-yaml";
import { mergeRegistry, type MergeResult } from "./merge";
import type { Registry, RegistryFragment } from "./types";

const baseFiles = import.meta.glob("../../../registry/layers.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const generatedFiles = import.meta.glob("../../../registry/generated/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export function loadRegistry(): MergeResult {
  const baseText = Object.values(baseFiles)[0];
  if (!baseText) throw new Error("registry/layers.yaml not found at build time");
  const base = yaml.load(baseText) as Registry;
  const frags = Object.entries(generatedFiles).map(([path, text]) => [path.split("/").pop()!, yaml.load(text) as RegistryFragment] as [string, RegistryFragment]);
  return mergeRegistry(base, frags);
}

export const generatedFragmentNames = Object.keys(generatedFiles).map((p) => p.split("/").pop()!);
