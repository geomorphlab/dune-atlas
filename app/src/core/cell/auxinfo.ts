// Metadata of the per-cell auxiliary variables (cells-aux sidecars) as shown in the panel and written to
// the downloads. Which variables a body has, their texts and source statements: @body/auxinfo.
export * from "@body/auxinfo";

export interface AuxMeta {
  longName: string;
  /** LaTeX symbol (without $) */
  symbolTex: string;
  units: string;
  /** threshold series (ut) or cell scalar; descriptions may contain {res} (cell size, e.g.
   *  0.25°), {half} (half cell size), {npx} (30″ pixels per cell) - see auxDescription */
  kind: "series" | "scalar";
  /** panel display: multiply by displayScale, show in displayUnits */
  displayUnits?: string;
  displayScale?: number;
  description: string;
}
