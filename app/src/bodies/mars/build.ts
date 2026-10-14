// The Mars build (VITE_BODY=mars) as data, applied by scripts/body-plugin.ts. The Earth build
// never reads this file. See docs/guide/mars.md.
//
// MARS_SUBSTITUTES: Earth module -> Mars replacement (the entry module and the cell panel, until they
//   are shared). A replacement exports every name the Earth module exports.
// Everything else that differs per body is in the @body modules (src/bodies/<body>/).

/** app-relative paths */
export const MARS_SUBSTITUTES: Record<string, string> = {
  "src/main.ts": "src/bodies/mars/main.ts",
  "src/ui/cellPanel.ts": "src/bodies/mars/ui/cellPanel.ts",
};

export const MARS_HTML = {
  /** tab title: the group site style, identical for Earth and Mars (the header shows the body name) */
  title: "MGL - Dune Atlas",
  description: "Interactive atlas of Martian dunes, wind regimes and sand-flux roses from hourly winds of a Mars climate model (e.g., the MCMC FV3 Mars GCM) with the transport law of Pähtz &amp; Durán (2023) and the methods outlined in Gunn (2026).",
  noscript: "The Mars Dune Atlas needs JavaScript and WebGL.",
};
