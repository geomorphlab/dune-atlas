// The Mars build (VITE_BODY=mars) as data, applied by scripts/body-plugin.ts. The Earth build
// never reads this file. See docs/guide/mars.md.
//
// MARS_SUBSTITUTES: Earth module -> Mars replacement (whole modules whose logic or text differs).
//   A replacement exports every name the Earth module exports (shared modules import them) and
//   may import the Earth original itself.
// MARS_PATCHES (patches.json): exact find/replace edits of Earth modules for constants (the planet
//   radius) and public texts; each `find` must match exactly `count` (default 1) times or the build
//   fails (tests/mars/patches.test.ts checks them against the current Earth sources).
import patches from "./patches.json";

export interface SourceEdit { find: string; replace: string; count?: number; note?: string }
export interface SourcePatch { file: string; edits: SourceEdit[] }

/** app-relative paths */
export const MARS_SUBSTITUTES: Record<string, string> = {
  "src/main.ts": "src/mars/main.ts",
  "src/config.ts": "src/mars/config.ts",
  "src/ui/cellPanel.ts": "src/mars/ui/cellPanel.ts",
  "src/ui/helpText.ts": "src/mars/ui/helpText.ts",
  "src/cell/citation.ts": "src/mars/cell/citation.ts",
  "src/cell/datasetinfo.ts": "src/mars/cell/datasetinfo.ts",
  "src/cell/auxinfo.ts": "src/mars/cell/auxinfo.ts",
  "src/cell/fieldinfo.ts": "src/mars/cell/fieldinfo.ts",
};

export const MARS_PATCHES: SourcePatch[] = patches as SourcePatch[];

export const MARS_HTML = {
  /** tab title: the group site style, identical for Earth and Mars (the header shows the body name) */
  title: "MGL - Dune Atlas",
  description: "Interactive atlas of Martian dunes, wind regimes and sand-flux roses from hourly winds of a Mars climate model (e.g., the MCMC FV3 Mars GCM) with the transport law of Pähtz &amp; Durán (2023) and the methods outlined in Gunn (2026).",
  noscript: "The Mars Dune Atlas needs JavaScript and WebGL.",
};
