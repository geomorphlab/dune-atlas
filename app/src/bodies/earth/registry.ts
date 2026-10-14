// The earth registry files, inlined by Vite at build time (import.meta.glob, ?raw; the patterns must be
// literals): registry/earth/layers.yaml, the pipeline-written fragments registry/earth/generated/*.yaml and
// additional wind datasets registry/earth/datasets/<id>/{dataset.yaml, <fragment>.yaml}. Merged by
// registry/load.ts.
export const REGISTRY_DIR = "registry/earth";
export const baseFiles = import.meta.glob("../../../../registry/earth/layers.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const generatedFiles = import.meta.glob("../../../../registry/earth/generated/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const datasetFiles = import.meta.glob("../../../../registry/earth/datasets/*/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
