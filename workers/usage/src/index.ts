// Dune Atlas usage counter (one Cloudflare Worker with a D1 database; docs/guide/usage-counter.md).
//   GET  /dashboard    charts of the figures (key needed; reads /usage.csv)
//   POST /v1/n (or /event) one download from the atlas page: added to the day's total for the country
//                      (/v1/n: a plain path that content blockers do not single out)
//   GET  /usage.csv    all daily figures (needs the CSV key)
//   GET  /status.csv   outcome of the daily collection of Cloudflare's figures (needs the CSV key)
//   GET  /check        tests the API token and what the free plan allows, writes nothing (needs the key)
//   GET  /pull         collects Cloudflare's figures for ?from=YYYY-MM-DD&to=YYYY-MM-DD now (needs the key)
//   scheduled          once a day (Cron Trigger in wrangler.toml): collects the previous three days
// The CSV key is given as ?key=... or as the header "Authorization: Bearer ...".
/** the message path the atlas uses (VITE_USAGE_URL); /event is still accepted */
export const EVENT_PATH = "/v1/n";
import { DASHBOARD_HTML } from "./dashboard";
import { addEventStatement, countryCode, list, MAX_EVENT_BYTES, originKind, parseEvent, utcDate } from "./events";
import { daysToCollect, dayRange, graphql, pullSource, settingsQuery, shorten, SOURCES, writeStatements, type Fetcher, type PullConfig, type Source } from "./pull";
import { statusCsv, usageCsv, type ExportRow, type PulledDbRow, type StatusRow } from "./csv";

export interface Env {
  DB: D1Database;
  /** secret: Cloudflare API token that can read the analytics (wrangler secret put CF_API_TOKEN) */
  CF_API_TOKEN?: string;
  /** secret: the key of the CSV links (wrangler secret put CSV_KEY) */
  CSV_KEY?: string;
  CF_ACCOUNT_ID: string;
  CF_ZONE_ID: string;
  DATA_HOST: string;
  SITE_HOST: string;
  WEB_ANALYTICS_SITE_TAG?: string;
  /** comma-separated origins whose downloads count as the live site */
  ALLOWED_ORIGINS: string;
  /** comma-separated origins of a local preview: accepted, but marked "preview" */
  PREVIEW_ORIGINS?: string;
}

/** days collected per /pull call: 3 queries per day stay under the free plan's 50 outside requests */
export const MAX_PULL_DAYS = 10;
/** shortest CSV key accepted (a shorter one is treated as not set) */
export const MIN_KEY_LENGTH = 24;

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers } });
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v, null, 2), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function cors(origin: string): Record<string, string> {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
}

/** request body as text, or null when longer than `max` bytes (stops reading at the limit) */
export async function readLimited(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("Content-Length") ?? "NaN");
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await reader.cancel(); return null; }
    parts.push(value);
  }
  const all = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { all.set(p, o); o += p.byteLength; }
  return new TextDecoder().decode(all);
}

export async function handleEvent(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const origin = request.headers.get("Origin");
  const site = originKind(origin, list(env.ALLOWED_ORIGINS), list(env.PREVIEW_ORIGINS));
  if (!site || !origin) return text("origin not allowed", 403);
  const h = cors(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (request.method !== "POST") return text("method not allowed", 405, { ...h, Allow: "POST, OPTIONS" });
  const body = await readLimited(request, MAX_EVENT_BYTES);
  if (body === null) return text("too large", 413, h);
  const checked = parseEvent(body);
  if (!checked.ok) return text(checked.reason, checked.status, h);
  try {
    await addEventStatement(env.DB, checked.event, countryCode(request.cf), utcDate(now), site).run();
  } catch {
    return text("not counted", 500, h);
  }
  return new Response(null, { status: 204, headers: h });
}

async function sha256(s: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
}
/** does the request carry the CSV key? (compared in constant time; false when no usable key is set) */
export async function hasKey(request: Request, env: Env): Promise<boolean> {
  const want = env.CSV_KEY ?? "";
  if (want.length < MIN_KEY_LENGTH) return false;
  const auth = request.headers.get("Authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : new URL(request.url).searchParams.get("key") ?? "";
  const [a, b] = (await Promise.all([sha256(given), sha256(want)])).map((d) => new Uint8Array(d));
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]; // same work whatever the key: both are 32-byte digests
  return diff === 0;
}

export function pullConfig(env: Env): PullConfig {
  return { token: env.CF_API_TOKEN ?? "", accountId: env.CF_ACCOUNT_ID ?? "", zoneId: env.CF_ZONE_ID ?? "", dataHost: env.DATA_HOST ?? "", siteHost: env.SITE_HOST ?? "", siteTag: env.WEB_ANALYTICS_SITE_TAG || undefined };
}

/** collect every source for the given days and write the results; returns the outcome per day and source */
export async function collect(env: Env, days: string[], fetcher: Fetcher = fetch, now = Date.now()) {
  const cfg = pullConfig(env), runAt = new Date(now).toISOString();
  const out: Array<{ date: string; source: Source; status: "ok" | "error"; rows: number; message: string }> = [];
  for (const date of days) {
    for (const source of SOURCES) {
      const r = await pullSource(source, cfg, date, fetcher);
      try {
        await env.DB.batch(writeStatements(env.DB, source, date, r, runAt));
        out.push(r.ok ? { date, source, status: "ok", rows: r.rows.length, message: r.note } : { date, source, status: "error", rows: 0, message: r.error });
      } catch (e) {
        out.push({ date, source, status: "error", rows: 0, message: shorten(`database: ${String((e as Error)?.message ?? e)}`) });
      }
    }
  }
  return out;
}

/** /check: the token, what the free plan allows for each source, and a trial collection of one day
 *  (three days ago) without writing anything */
export async function check(env: Env, fetcher: Fetcher = fetch, now = Date.now()) {
  const cfg = pullConfig(env), date = daysToCollect(now, 3)[0];
  const sources: Record<string, unknown> = {};
  for (const source of SOURCES) {
    const settings = cfg.token ? await graphql(fetcher, cfg.token, settingsQuery(cfg, source)) : { error: "no token" };
    const trial = await pullSource(source, cfg, date, fetcher);
    sources[source] = {
      settings: "error" in settings ? { error: shorten(settings.error) } : settings.json?.data?.viewer,
      trial: trial.ok ? { day: date, rows: trial.rows.length, note: trial.note, sample: trial.rows.slice(0, 4) } : { day: date, error: trial.error },
    };
  }
  return { checked_at: new Date(now).toISOString(), csv_key_set: (env.CSV_KEY ?? "").length >= MIN_KEY_LENGTH, sources };
}

async function csvResponse(env: Env, which: "usage" | "status", now: number): Promise<Response> {
  const name = `dune-atlas-${which}-${utcDate(now)}.csv`;
  let body: string;
  if (which === "usage") {
    const [e, p] = await env.DB.batch([
      env.DB.prepare("SELECT date, country, body, type, site, count, bytes FROM exports"),
      env.DB.prepare("SELECT date, country, body, measure, value, unit, source, sample_interval FROM pulled"),
    ]);
    body = usageCsv((e.results ?? []) as unknown as ExportRow[], (p.results ?? []) as unknown as PulledDbRow[]);
  } else {
    const s = await env.DB.prepare("SELECT date, source, status, rows, message, run_at FROM pull_log").all();
    body = statusCsv((s.results ?? []) as unknown as StatusRow[]);
  }
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}

export async function route(request: Request, env: Env, fetcher: Fetcher = fetch, now = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/event" || url.pathname === EVENT_PATH) return handleEvent(request, env, now);
  const keyed = ["/usage.csv", "/status.csv", "/check", "/pull", "/dashboard"];
  if (!keyed.includes(url.pathname)) return url.pathname === "/" ? text("Dune Atlas usage counter\n", 200) : text("not found", 404);
  if (request.method !== "GET") return text("method not allowed", 405, { Allow: "GET" });
  if ((env.CSV_KEY ?? "").length < MIN_KEY_LENGTH) return text("the CSV key (secret CSV_KEY) is not set", 503);
  if (!(await hasKey(request, env))) return text("key missing or wrong", 403);
  if (url.pathname === "/dashboard") return new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
  if (url.pathname === "/usage.csv") return csvResponse(env, "usage", now);
  if (url.pathname === "/status.csv") return csvResponse(env, "status", now);
  if (url.pathname === "/check") return json(await check(env, fetcher, now));
  const days = dayRange(url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "", MAX_PULL_DAYS);
  if (!days) return text(`give ?from=YYYY-MM-DD&to=YYYY-MM-DD, at most ${MAX_PULL_DAYS} days`, 400);
  return json(await collect(env, days, fetcher, now));
}

export default {
  fetch(request, env) {
    return route(request, env);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(collect(env, daysToCollect(controller.scheduledTime)).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
