// The daily copy of Cloudflare's own figures (GraphQL Analytics API), so that they are kept after
// Cloudflare drops them (at least 31 days for the data-host dataset; about six months for Web Analytics).
// Three sources, each asked separately so that one failing source does not stop the others:
//   data_host      requests and bytes served by data.geomorphlab.org, by country (visitors' browsers and
//                  scripts; Cloudflare's own internal traffic excluded with requestSource "eyeball")
//   zone_daily     unique IP addresses per day for the whole geomorphlab.org zone, worldwide only
//   web_analytics  visits and page views of map.geomorphlab.org by country, Earth and Mars separately,
//                  bots excluded
// Field names follow the Cloudflare documentation cited in docs/guide/usage-counter.md; the ones the
// documentation does not show are listed there as not verified, and /check tests them with the real token.

export const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
export const SOURCES = ["data_host", "zone_daily", "web_analytics"] as const;
export type Source = (typeof SOURCES)[number];
/** row limit asked of Cloudflare per query; a reply this long may be cut short (noted in the log) */
export const ROW_LIMIT = 1000;

export interface PullConfig { token: string; accountId: string; zoneId: string; dataHost: string; siteHost: string; siteTag?: string }
export interface PulledRow {
  date: string; country: string; body: "earth" | "mars" | "all"; measure: string;
  value: number; unit: "count" | "bytes"; source: Source; sample_interval: number | null;
}
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type PullResult = { ok: true; rows: PulledRow[]; note: string } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TAG = /^[0-9a-f]{32}$/;
const HOST = /^[a-z0-9.-]+$/;

export const isDay = (d: string) => DAY.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** the days a scheduled run collects: the `n` UTC days before the run's day (newest last). Collecting
 *  each day again on the next runs repairs a late or missed run, and lets figures that Cloudflare
 *  completes late (free plan: "delayed 24 hours") settle. */
export function daysToCollect(scheduledMs: number, n = 3): string[] {
  const today = new Date(scheduledMs).toISOString().slice(0, 10);
  return Array.from({ length: n }, (_, i) => addDays(today, i - n));
}

/** days from `from` to `to` inclusive, at most `max` of them; null if the range is not valid */
export function dayRange(from: string, to: string, max: number): string[] | null {
  if (!isDay(from) || !isDay(to) || to < from) return null;
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) { out.push(d); if (out.length > max) return null; }
  return out;
}

/** a configuration problem that stops a source, or null */
export function configProblem(cfg: PullConfig, source: Source): string | null {
  if (!cfg.token) return "the API token (secret CF_API_TOKEN) is not set";
  if (source === "web_analytics" && !TAG.test(cfg.accountId)) return "CF_ACCOUNT_ID is not set (32 hexadecimal characters)";
  if (source !== "web_analytics" && !TAG.test(cfg.zoneId)) return "CF_ZONE_ID is not set (32 hexadecimal characters)";
  if (source === "data_host" && !HOST.test(cfg.dataHost)) return "DATA_HOST is not a host name";
  if (source === "web_analytics" && !cfg.siteTag && !HOST.test(cfg.siteHost)) return "SITE_HOST is not a host name";
  if (source === "web_analytics" && cfg.siteTag && !TAG.test(cfg.siteTag)) return "WEB_ANALYTICS_SITE_TAG is not 32 hexadecimal characters";
  return null;
}

// Values are written into the query text only after the checks above (dates, ids and host names have
// fixed forms), so no text from outside can change the query.
const day = (d: string) => { if (!isDay(d)) throw new Error(`not a date: ${d}`); return d; };

export function dataHostQuery(cfg: PullConfig, date: string): string {
  return `{ viewer { zones(filter: { zoneTag: "${cfg.zoneId}" }) {
  httpRequestsAdaptiveGroups(limit: ${ROW_LIMIT}, filter: { datetime_geq: "${day(date)}T00:00:00Z", datetime_lt: "${addDays(date, 1)}T00:00:00Z", clientRequestHTTPHost: "${cfg.dataHost}", requestSource: "eyeball" }) {
    count avg { sampleInterval } sum { edgeResponseBytes } dimensions { clientCountryName }
  } } } }`;
}

export function zoneDailyQuery(cfg: PullConfig, date: string): string {
  return `{ viewer { zones(filter: { zoneTag: "${cfg.zoneId}" }) {
  httpRequests1dGroups(limit: 1, filter: { date_geq: "${day(date)}", date_leq: "${date}" }) {
    uniq { uniques } dimensions { date }
  } } } }`;
}

export function webAnalyticsQuery(cfg: PullConfig, date: string): string {
  const site = cfg.siteTag ? `siteTag: "${cfg.siteTag}"` : `requestHost: "${cfg.siteHost}"`;
  return `{ viewer { accounts(filter: { accountTag: "${cfg.accountId}" }) {
  rumPageloadEventsAdaptiveGroups(limit: ${ROW_LIMIT}, filter: { datetime_geq: "${day(date)}T00:00:00Z", datetime_lt: "${addDays(date, 1)}T00:00:00Z", ${site}, bot: 0 }) {
    count avg { sampleInterval } sum { visits } dimensions { countryName requestPath }
  } } } }`;
}

/** Earth or Mars from a page path: everything under /mars/ is the Mars atlas, the rest Earth */
export const bodyOfPath = (p: unknown): "earth" | "mars" => (typeof p === "string" && /^\/mars(\/|$)/.test(p) ? "mars" : "earth");
const code = (c: unknown) => (typeof c === "string" && /^[A-Z][A-Z0-9]$/.test(c) ? c : "XX");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const interval = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const maxInterval = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.max(a, b));

type Groups = Array<Record<string, any>>;
function groupsOf(json: any, scope: "zones" | "accounts", node: string): Groups | null {
  const g = json?.data?.viewer?.[scope]?.[0]?.[node];
  return Array.isArray(g) ? g : null;
}
const truncNote = (g: Groups) => (g.length >= ROW_LIMIT ? `reply reached the row limit (${ROW_LIMIT}); figures may be incomplete` : "");

/** data host: requests and bytes per country (countries Cloudflare cannot name are merged under XX) */
export function parseDataHost(json: unknown, date: string): PullResult {
  const g = groupsOf(json, "zones", "httpRequestsAdaptiveGroups");
  if (!g) return { ok: false, error: "reply has no httpRequestsAdaptiveGroups" };
  const by = new Map<string, { req: number; bytes: number; si: number | null }>();
  for (const r of g) {
    const c = code(r.dimensions?.clientCountryName), t = by.get(c) ?? { req: 0, bytes: 0, si: null };
    t.req += num(r.count); t.bytes += num(r.sum?.edgeResponseBytes); t.si = maxInterval(t.si, interval(r.avg?.sampleInterval));
    by.set(c, t);
  }
  const rows: PulledRow[] = [];
  for (const [country, t] of by) {
    rows.push({ date, country, body: "all", measure: "data_host_requests", value: t.req, unit: "count", source: "data_host", sample_interval: t.si });
    rows.push({ date, country, body: "all", measure: "data_host_bytes", value: t.bytes, unit: "bytes", source: "data_host", sample_interval: t.si });
  }
  return { ok: true, rows, note: truncNote(g) };
}

/** zone daily: unique IP addresses of the whole zone that day (worldwide; not available by country) */
export function parseZoneDaily(json: unknown, date: string): PullResult {
  const g = groupsOf(json, "zones", "httpRequests1dGroups");
  if (!g) return { ok: false, error: "reply has no httpRequests1dGroups" };
  const r = g.find((x) => x.dimensions?.date === date);
  if (!r) return { ok: true, rows: [], note: "no figure for this day" };
  return { ok: true, rows: [{ date, country: "all", body: "all", measure: "unique_ips_zone", value: num(r.uniq?.uniques), unit: "count", source: "zone_daily", sample_interval: null }], note: "" };
}

/** Web Analytics: visits and page views per country and planet (bots excluded in the query) */
export function parseWebAnalytics(json: unknown, date: string): PullResult {
  const g = groupsOf(json, "accounts", "rumPageloadEventsAdaptiveGroups");
  if (!g) return { ok: false, error: "reply has no rumPageloadEventsAdaptiveGroups" };
  const by = new Map<string, { views: number; visits: number; si: number | null }>();
  for (const r of g) {
    const k = `${code(r.dimensions?.countryName)}|${bodyOfPath(r.dimensions?.requestPath)}`, t = by.get(k) ?? { views: 0, visits: 0, si: null };
    t.views += num(r.count); t.visits += num(r.sum?.visits); t.si = maxInterval(t.si, interval(r.avg?.sampleInterval));
    by.set(k, t);
  }
  const rows: PulledRow[] = [];
  for (const [k, t] of by) {
    const [country, body] = k.split("|") as [string, "earth" | "mars"];
    rows.push({ date, country, body, measure: "visits", value: t.visits, unit: "count", source: "web_analytics", sample_interval: t.si });
    rows.push({ date, country, body, measure: "page_views", value: t.views, unit: "count", source: "web_analytics", sample_interval: t.si });
  }
  return { ok: true, rows, note: truncNote(g) };
}

const QUERY: Record<Source, (cfg: PullConfig, date: string) => string> = { data_host: dataHostQuery, zone_daily: zoneDailyQuery, web_analytics: webAnalyticsQuery };
const PARSE: Record<Source, (json: unknown, date: string) => PullResult> = { data_host: parseDataHost, zone_daily: parseZoneDaily, web_analytics: parseWebAnalytics };

/** shorten an error message for the log (the token is never part of a message) */
export const shorten = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** send one query; the reply's JSON, or an error text */
export async function graphql(fetcher: Fetcher, token: string, query: string): Promise<{ json: any } | { error: string }> {
  let res: Response;
  try {
    res = await fetcher(GRAPHQL_URL, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  } catch (e) { return { error: `request failed: ${String((e as Error)?.message ?? e)}` }; }
  let json: any;
  try { json = await res.json(); } catch { return { error: `HTTP ${res.status}, reply is not JSON` }; }
  const errs = Array.isArray(json?.errors) ? json.errors : [];
  if (errs.length) return { error: errs.map((e: any) => String(e?.message ?? e)).join("; ") };
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { json };
}

/** collect one source for one day (no database writes) */
export async function pullSource(source: Source, cfg: PullConfig, date: string, fetcher: Fetcher): Promise<PullResult> {
  const problem = configProblem(cfg, source);
  if (problem) return { ok: false, error: problem };
  const r = await graphql(fetcher, cfg.token, QUERY[source](cfg, date));
  if ("error" in r) return { ok: false, error: shorten(r.error) };
  return PARSE[source](r.json, date);
}

/** database statements that replace a source's rows for a day and record the outcome (one batch,
 *  applied together). A failed collection only records the error and keeps the earlier rows. */
export function writeStatements(db: D1Database, source: Source, date: string, r: PullResult, runAt: string): D1PreparedStatement[] {
  const log = (status: string, rows: number, message: string) => db.prepare(
    `INSERT INTO pull_log (date, source, status, rows, message, run_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (date, source) DO UPDATE SET status = excluded.status, rows = excluded.rows, message = excluded.message, run_at = excluded.run_at`,
  ).bind(date, source, status, rows, message, runAt);
  if (!r.ok) return [log("error", 0, shorten(r.error))];
  return [
    db.prepare("DELETE FROM pulled WHERE date = ?1 AND source = ?2").bind(date, source),
    ...r.rows.map((x) => db.prepare(
      "INSERT INTO pulled (date, country, body, measure, value, unit, source, sample_interval) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    ).bind(x.date, x.country, x.body, x.measure, x.value, x.unit, x.source, x.sample_interval)),
    log("ok", r.rows.length, r.note),
  ];
}

/** settings query of one source (what the free plan allows: enabled, fields, how far back, widest range) */
export function settingsQuery(cfg: PullConfig, source: Source): string {
  const fields = "enabled availableFields maxDuration notOlderThan maxPageSize";
  if (source === "web_analytics") return `{ viewer { accounts(filter: { accountTag: "${cfg.accountId}" }) { settings { rumPageloadEventsAdaptiveGroups { ${fields} } } } } }`;
  const node = source === "data_host" ? "httpRequestsAdaptiveGroups" : "httpRequests1dGroups";
  return `{ viewer { zones(filter: { zoneTag: "${cfg.zoneId}" }) { settings { ${node} { ${fields} } } } } }`;
}
