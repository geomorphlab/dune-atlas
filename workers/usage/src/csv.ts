// The CSV files for the maintainer: one row per day, country, planet and measure (usage.csv), and the
// outcome of the daily collection (status.csv).

export const USAGE_COLUMNS = ["date", "country", "body", "measure", "value", "unit", "source", "sample_interval"] as const;
export const STATUS_COLUMNS = ["date", "source", "status", "rows", "message", "run_at"] as const;

export interface ExportRow { date: string; country: string; body: string; type: string; site: string; count: number; bytes: number }
export interface PulledDbRow { date: string; country: string; body: string; measure: string; value: number; unit: string; source: string; sample_interval: number | null }
export interface StatusRow { date: string; source: string; status: string; rows: number; message: string; run_at: string }

/** one CSV field: quoted when it holds a comma, quote or line break; a leading = + - @ is prefixed with
 *  an apostrophe so that a spreadsheet never reads text as a formula (numbers are written as numbers) */
export function field(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const line = (vals: unknown[]) => vals.map(field).join(",");

/** download counts become two measures each: export_count:<type> and export_bytes:<type>; downloads
 *  from a local preview of the site have source "counter-preview" so they can be left out */
export function exportMeasures(r: ExportRow): PulledDbRow[] {
  const source = r.site === "live" ? "counter" : `counter-${r.site}`;
  return [
    { date: r.date, country: r.country, body: r.body, measure: `export_count:${r.type}`, value: r.count, unit: "count", source, sample_interval: null },
    { date: r.date, country: r.country, body: r.body, measure: `export_bytes:${r.type}`, value: r.bytes, unit: "bytes", source, sample_interval: null },
  ];
}

const cmp = (a: PulledDbRow, b: PulledDbRow) =>
  a.date.localeCompare(b.date) || a.source.localeCompare(b.source) || a.measure.localeCompare(b.measure) || a.body.localeCompare(b.body) || a.country.localeCompare(b.country);

export function usageCsv(exports: ExportRow[], pulled: PulledDbRow[]): string {
  const rows = [...exports.flatMap(exportMeasures), ...pulled].sort(cmp);
  return [line([...USAGE_COLUMNS]), ...rows.map((r) => line(USAGE_COLUMNS.map((c) => r[c])))].join("\r\n") + "\r\n";
}

export function statusCsv(rows: StatusRow[]): string {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date) || a.source.localeCompare(b.source));
  return [line([...STATUS_COLUMNS]), ...sorted.map((r) => line(STATUS_COLUMNS.map((c) => r[c])))].join("\r\n") + "\r\n";
}
