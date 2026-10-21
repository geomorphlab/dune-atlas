// Mars profile (see profile.ts). The slider quantity is the median grain diameter d (µm); plots use
// log10 d as their x.
import type { BodyProfile } from "../../core/profile";
import { mathHtml } from "../../core/util/math";
import { MARS_CIRCUMFERENCE_M, R_MARS } from "./body";

const log10 = (xs: number[]) => xs.map(Math.log10);

export const PROFILE: BodyProfile = {
  radiusM: R_MARS,
  mercatorCircumferenceM: MARS_CIRCUMFERENCE_M,
  scaleBarCircumferenceM: MARS_CIRCUMFERENCE_M,
  filePrefix: "mars-dune-atlas",
  exports: {
    mapHeading: "Mars Dune Atlas",
    mercatorName: "Web Mercator (Mars sphere, R = 3389.5 km)",
    mapExportedFrom: "the Mars Dune Atlas",
    plotExportedFrom: "the Mars Dune Atlas",
  },
  coordsTitle: { pointer: "Cursor position (planetocentric latitude, east longitude)", touch: "Last tapped point (planetocentric latitude, east longitude)" },
  search: { lonRange: 180, example: "e.g. 4.5, 137.4 or 4°30′N 137°24′E", conventionNote: "Planetocentric latitude, east-positive longitude (−180° to 180°; 0–360° E is converted)." },
  invert: {
    note: "Invert: colour the areas WITHOUT mapped dunes instead of the dunes.",
    toggleAria: "Invert: colour areas without dunes",
    toggleLabel: " invert (areas without dunes)",
    legend: "Areas without mapped dunes",
    swatch: "areas without mapped dunes",
  },
  control: {
    symbolTex: "$d$",
    format: (v) => `${Math.round(v)} µm`,
    valueTex: (v) => `$d$ = ${Math.round(v)} $\\mathrm{\\mu m}$`,
    exportName: "median grain diameter",
    fileSuffix: (v) => `_d${Math.round(v)}um`,
    infoIntroHtml: () => `<p>The median diameter ${mathHtml("$d$")} of the sand grains. Every grain-size-dependent map layer (its ⓘ says so) and the cell panel use the value set here. The threshold friction velocity ${mathHtml("$u_{*,th}$")} is computed for each time step from ${mathHtml("$d$")} and that step's air density and temperature (Pähtz & Durán 2023).</p>`,
    rangeAdjective: "log-spaced ",
    dependentNoteHtml: () => `<p class="help">Updates with the grain-diameter ${mathHtml("$d$")} control.</p>`,
    independentNoteHtml: () => `<p class="help">Independent of the grain diameter: not affected by the ${mathHtml("$d$")} control.</p>`,
    plot: {
      ariaRange: (x0, x1) => `median grain diameter (radius, log scale, ${Math.round(10 ** x0)} µm at the centre to ${Math.round(10 ** x1)} µm at the rim)`,
      rings: log10([50, 100, 200, 500, 1000]),
      ringLabels: log10([100, 200, 500]),
      ringText: (u) => `${Math.round(10 ** u)}`,
      currentTitle: (u) => `current d = ${Math.round(10 ** u)} µm`,
      radiusLabel: "radius: d (µm, log scale)",
      lineTicks: log10([50, 100, 200, 500, 1000]),
      lineTickText: (t) => String(Math.round(10 ** t)),
    },
  },
  /** globe over the north polar erg (the most dune-rich region), FV3 beta 1, d = 200 µm, shaded relief; RDD as
   *  streamlines (85 %) over the dune fields (55 %) over DP (85 %); dune-field names shown */
  defaultView: {
    lon: 160, lat: 62, zoom: 2.2, proj: "globe",
    dataset: "fv3-beta1", basemap: "hrsc-mola-hillshade", ut: 29,
    layers: [
      { id: "rdpa", opacity: 0.85, cfg: { mode: "streamlines" } },
      { id: "dunes", opacity: 0.55 },
      { id: "dpm", opacity: 0.85 },
    ],
    cell: null,
    panel: true,
    names: true,
  },
};
