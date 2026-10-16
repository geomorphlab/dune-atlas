// Earth profile (see profile.ts).
import type { BodyProfile } from "../../core/profile";
import { mathHtml } from "../../core/util/math";

/** Earth mean radius (IUGG, m): great-circle distances on the map */
export const R_EARTH_MEAN = 6371008.8;
/** WGS 84 semi-major axis (m): the Web Mercator sphere */
export const WEB_MERCATOR_R = 6378137;
/** Web Mercator equator length, 2 pi x 6378137 m rounded to 1 mm (map-export scale bar) */
export const WEB_MERCATOR_EQUATOR_M = 40075016.686;

/** the slider's ⓘ, middle paragraphs: the default and its equivalents */
export const THRESHOLD_INFO_DEFAULT = `<p>The default, 0.15 m/s, is the value used for the global analysis of Gunn (2026), one value for the whole globe, not calibrated for any site. Values between 0.1 and 0.4 m/s are typical; for loose, dry sand the threshold depends mainly on grain size and density.</p>`
  + `<p>With the roughness length of 1 mm used here, 0.15 m/s corresponds to a 10 m wind of 3.4 m/s (6.6 knots); the 12-knot threshold of Fryberger &amp; Dean (1979) corresponds to about 0.27 m/s.</p>`;   // the Baas (2026) point is in the Wind dataset ⓘ

export const PROFILE: BodyProfile = {
  radiusM: R_EARTH_MEAN,
  mercatorCircumferenceM: 2 * Math.PI * WEB_MERCATOR_R,
  scaleBarCircumferenceM: WEB_MERCATOR_EQUATOR_M,
  filePrefix: "dune-atlas",
  exports: {
    mapHeading: "Dune Atlas · map.geomorphlab.org",
    mercatorName: "Web Mercator EPSG:3857",
    mapExportedFrom: "the Dune Atlas",
    plotExportedFrom: "the Dune Atlas (map.geomorphlab.org)",
  },
  coordsTitle: { pointer: "Cursor position (latitude, longitude)", touch: "Last tapped point (latitude, longitude)" },
  search: { lonRange: 180, example: "e.g. -24.5, 15.2 or 24°30′S 15°12′E" },
  invert: {
    note: "Invert: colour the land WITHOUT mapped dunes instead of the dunes. Latitudes beyond ±85.05° (interior Antarctica) are not coloured.",
    toggleAria: "Invert: colour land without dunes",
    toggleLabel: " invert (land without dunes)",
    legend: "Land without mapped dunes",
    swatch: "land without mapped dunes",
  },
  control: {
    symbolTex: "$u_{*,th}$",
    format: (v) => `${v.toFixed(2)} m/s`,
    valueTex: (v) => `$u_{*,th}$ = ${v.toFixed(2)} $\\mathrm{m\\,s^{-1}}$`,
    exportName: "threshold friction velocity",
    fileSuffix: (v) => `_ut${v.toFixed(2)}`,
    infoIntroHtml: () => `<p>The friction velocity ${mathHtml("$u_{*,th}$")} above which the wind moves sand. Every threshold-dependent map layer (its ⓘ says so) and the cell panel use the value set here.</p>`
      + THRESHOLD_INFO_DEFAULT,
    rangeAdjective: "",
    dependentNoteHtml: () => `<p class="help">Updates with the ${mathHtml("$u_{*,th}$")} control.</p>`,
    independentNoteHtml: () => `<p class="help">Threshold-independent: not affected by the ${mathHtml("$u_{*,th}$")} control.</p>`,
    plot: {
      ariaRange: (x0, x1) => `threshold friction velocity (radius, ${x0} m/s at the centre to ${x1} m/s at the rim)`,
      rings: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
      ringLabels: [0.2, 0.4, 0.6],
      ringText: (u) => u.toFixed(1),
      currentTitle: (u) => `current u*,th = ${u.toFixed(2)} m/s`,
      radiusLabel: "radius: u*,th (m/s)",
      lineTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
    },
  },
  /** Africa and Arabia, globe; ERA5 0.25°; u*,th = 0.15 m/s (index 14); dark basemap; RDD as streamlines
   *  (85 %) over the dune fields (100 %) over DP (85 %); layer list open. */
  defaultView: {
    lon: 17.5025, lat: 15.1644, zoom: 3.52, proj: "globe",
    dataset: "era5", basemap: "openfreemap-dark", ut: 14,
    layers: [
      { id: "rdpa", opacity: 0.85, cfg: { mode: "streamlines" } },
      { id: "dunes", opacity: 1 },
      { id: "dpm", opacity: 0.85 },
    ],
    cell: null,
    panel: true,
  },
};
