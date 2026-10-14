// The per-body profile (@body/profile): the constants and public wording in which the two atlases
// differ inside shared modules - the planet radius, export names, the wording of the dune-layer invert,
// the slider quantity (Earth: threshold friction velocity u*,th; Mars: median grain diameter d) and
// its plot axes, and the opening view. Larger per-body content (citations, datasets, help text, auxiliary
// variables) lives in the other @body modules; see docs/guide/extending.md.
import type { ShareState } from "./share/shortlink";

export interface ControlProfile {
  /** TeX symbol of the slider quantity, e.g. "$u_{*,th}$" */
  symbolTex: string;
  /** readout of a slider value, e.g. "0.15 m/s" */
  format(v: number): string;
  /** value with its symbol in image exports (TeX), e.g. "$u_{*,th}$ = 0.15 $\\mathrm{m\\,s^{-1}}$" */
  valueTex(v: number): string;
  /** the quantity in export strips, e.g. "threshold friction velocity" */
  exportName: string;
  /** file-name suffix of a slider-dependent plot export, e.g. "_ut0.15" */
  fileSuffix(v: number): string;
  /** the slider's ⓘ before the range paragraph (HTML) */
  infoIntroHtml(): string;
  /** word before "values" in the range paragraph of the ⓘ ("" or "log-spaced ") */
  rangeAdjective: string;
  /** layer ⓘ: a slider-dependent / independent map field (HTML) */
  dependentNoteHtml(): string;
  independentNoteHtml(): string;
  /** modes plot (radius = plot x) and line plots (x axis); plot x is the slider value (Earth) or
   *  its log10 (Mars) */
  plot: {
    ariaRange(x0: number, x1: number): string;
    rings: number[];
    ringLabels: number[];
    ringText(x: number): string;
    currentTitle(x: number): string;
    radiusLabel: string;
    lineTicks: number[];
    /** line-plot x tick text; default: the value with 3 significant digits */
    lineTickText?: (x: number) => string;
  };
}

export interface BodyProfile {
  /** sphere radius (m) of on-map distances (vector spacing at the view centre) */
  radiusM: number;
  /** equator length (m) of the Web Mercator world (layer spacing in km -> px) */
  mercatorCircumferenceM: number;
  /** equator length (m) for the scale bar of map exports */
  scaleBarCircumferenceM: number;
  /** export file names start with this, e.g. "dune-atlas" */
  filePrefix: string;
  /** image exports */
  exports: {
    mapHeading: string;
    mercatorName: string;
    /** "Exported <date> from <...>." of map and plot exports */
    mapExportedFrom: string;
    plotExportedFrom: string;
  };
  /** coordinates readout tooltip */
  coordsTitle: { pointer: string; touch: string };
  /** wording of the dune layer's invert (the area outside the mapped dunes) */
  invert: {
    /** layer ⓘ and the toggle tooltip */
    note: string;
    toggleAria: string;
    toggleLabel: string;
    /** legend line and map-export swatch */
    legend: string;
    swatch: string;
  };
  control: ControlProfile;
  /** opening view (tests: encoding it gives the default share code of the body) */
  defaultView: ShareState;
}
