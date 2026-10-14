// Number formatting for panel/legend display.

/** shown for NaN / missing values (e.g. no crest flux) */
export const MISSING = "—";

export function fmtNum(v: number | null | undefined, sig = 3): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return MISSING;
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) {
    const [m, e] = v.toExponential(sig - 1).split("e");
    return `${m}×10<sup>${Number(e)}</sup>`;
  }
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(a)));
  return v.toFixed(Math.min(digits, 6));
}

/** Plain-text version (no HTML), e.g. for CSV/aria. */
export function fmtNumText(v: number | null | undefined, sig = 3): string {
  return fmtNum(v, sig).replace(/×10<sup>(-?\d+)<\/sup>/, "e$1");
}

export function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
}
export function fmtLon(lon: number): string {
  return `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
