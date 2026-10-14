// The mars registry files, inlined by Vite at build time (import.meta.glob, ?raw; the patterns must be
// literals): registry/mars/layers.yaml, the pipeline-written fragments registry/mars/generated/*.yaml and
// additional wind datasets registry/mars/datasets/<id>/{dataset.yaml, <fragment>.yaml}. Merged by
// registry/load.ts.
export const REGISTRY_DIR = "registry/mars";
export const baseFiles = import.meta.glob("../../../../registry/mars/layers.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const generatedFiles = import.meta.glob("../../../../registry/mars/generated/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const datasetFiles = import.meta.glob("../../../../registry/mars/datasets/*/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
