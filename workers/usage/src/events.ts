// The download counter: one small JSON message per download from the atlas page, checked here and
// added to that day's total for the visitor's country. Nothing that identifies a person is kept: no IP
// address, no browser details, no file name, no time of day.

/** export types the atlas sends (app/src/core/usage.ts); anything else is refused */
export const EVENT_TYPES = [
  "map-image", // camera button: PNG of the map
  "region", // "Download a region": zip with a NetCDF file
  "cell-netcdf", // cell panel: NetCDF (.nc)
  "cell-csv", // cell panel: CSV bundle (.zip)
  "citation", // cell panel: citation text file
  "plot", // cell panel: one plot as PNG or SVG
  "copy-code", // "Get the whole grid": Copy code button
  "copy-citation", // cell panel: Copy citation button
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const BODIES = ["earth", "mars"] as const;
export type Body = (typeof BODIES)[number];

/** largest accepted message, in bytes (a real one is about 60) */
export const MAX_EVENT_BYTES = 256;
/** largest accepted file size, in bytes (10 GB; a region export is far smaller) */
export const MAX_FILE_BYTES = 10_000_000_000;

export interface UsageEvent { type: EventType; body: Body; bytes: number }
export type Checked = { ok: true; event: UsageEvent } | { ok: false; status: number; reason: string };

/** check one message (the raw text of the request body) */
export function parseEvent(text: string): Checked {
  if (new TextEncoder().encode(text).length > MAX_EVENT_BYTES) return { ok: false, status: 413, reason: "too large" };
  let v: unknown;
  try { v = JSON.parse(text); } catch { return { ok: false, status: 400, reason: "not JSON" }; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, status: 400, reason: "not an object" };
  const o = v as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => !["type", "body", "bytes"].includes(k));
  if (extra.length) return { ok: false, status: 400, reason: "unknown field" };
  if (!(EVENT_TYPES as readonly unknown[]).includes(o.type)) return { ok: false, status: 400, reason: "unknown type" };
  if (!(BODIES as readonly unknown[]).includes(o.body)) return { ok: false, status: 400, reason: "unknown body" };
  const bytes = o.bytes === undefined ? 0 : o.bytes;
  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes < 0 || bytes > MAX_FILE_BYTES) return { ok: false, status: 400, reason: "bad bytes" };
  const type = o.type as EventType;
  if (type.startsWith("copy-") && bytes !== 0) return { ok: false, status: 400, reason: "bad bytes" };
  return { ok: true, event: { type, body: o.body as Body, bytes } };
}

/** two-letter country code from Cloudflare (request.cf.country); anything else is "XX" (unknown).
 *  Cloudflare also uses "T1" for Tor; it passes through unchanged. */
export function countryCode(cf: unknown): string {
  const c = (cf as { country?: unknown } | undefined)?.country;
  return typeof c === "string" && /^[A-Z][A-Z0-9]$/.test(c) ? c : "XX";
}

/** UTC calendar date "YYYY-MM-DD" of a time in milliseconds */
export const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** which allowed site a request comes from: "live" (the atlas), "preview" (a local preview), or null */
export function originKind(origin: string | null, live: string[], preview: string[]): "live" | "preview" | null {
  if (!origin) return null;
  if (live.includes(origin)) return "live";
  if (preview.includes(origin)) return "preview";
  return null;
}

/** comma-separated list from a Worker variable */
export const list = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** the statement that adds one event to its daily total (one row written per event) */
export function addEventStatement(db: D1Database, e: UsageEvent, country: string, date: string, site: "live" | "preview"): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO exports (date, country, body, type, site, count, bytes) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)
     ON CONFLICT (date, country, body, type, site) DO UPDATE SET count = count + 1, bytes = bytes + excluded.bytes`,
  ).bind(date, country, e.body, e.type, site, e.bytes);
}
