// The Worker with a local database (SQLite with migrations/ applied, test/d1.ts): counting downloads,
// refusing other sites, the CSV links and the daily collection (Cloudflare's API replaced by a fake that
// answers like the documented examples)
import { beforeEach, describe, expect, it } from "vitest";
import worker, { collect, MIN_KEY_LENGTH, route, type Env } from "../src/index";
import type { Fetcher } from "../src/pull";
import { testCtx, testDb, withCf } from "./d1";

const LIVE = "https://map.geomorphlab.org";
const KEY = "k".repeat(MIN_KEY_LENGTH + 8);
const ZONE = "a".repeat(32), ACCOUNT = "b".repeat(32);
const NOW = Date.UTC(2026, 9, 15, 3, 17);
// the [vars] of wrangler.toml, with test ids, a test token and a test key
let DB: D1Database;
const base = (): Env => ({
  DB, CSV_KEY: KEY, CF_API_TOKEN: "test-token", CF_ZONE_ID: ZONE, CF_ACCOUNT_ID: ACCOUNT, WEB_ANALYTICS_SITE_TAG: "",
  DATA_HOST: "data.geomorphlab.org", SITE_HOST: "map.geomorphlab.org", ALLOWED_ORIGINS: LIVE, PREVIEW_ORIGINS: "http://127.0.0.1:5173",
});

const post = (body: string, origin: string | null = LIVE, country = "AU") => withCf(
  new Request("https://counter.example/event", { method: "POST", body, headers: { "Content-Type": "text/plain;charset=UTF-8", ...(origin ? { Origin: origin } : {}) } }),
  country);
const get = (path: string, auth?: string) => new Request(`https://counter.example${path}`, auth ? { headers: { Authorization: auth } } : {});
const rows = async (sql: string) => (await DB.prepare(sql).all()).results as Record<string, unknown>[];

beforeEach(() => { DB = testDb(); });

describe("POST /event", () => {
  it("adds each download to the day's total for the country and planet", async () => {
    const e = base();
    for (const [b, c] of [['{"type":"region","body":"earth","bytes":1000}', "AU"], ['{"type":"region","body":"earth","bytes":500}', "AU"], ['{"type":"region","body":"earth","bytes":7}', "DE"], ['{"type":"plot","body":"mars","bytes":42}', "AU"]] as const) {
      const r = await route(post(b, LIVE, c), e, fetch, NOW);
      expect(r.status).toBe(204);
      expect(r.headers.get("Access-Control-Allow-Origin")).toBe(LIVE);
    }
    expect(await rows("SELECT date, country, body, type, site, count, bytes FROM exports ORDER BY country, type")).toEqual([
      { date: "2026-10-15", country: "AU", body: "mars", type: "plot", site: "live", count: 1, bytes: 42 },
      { date: "2026-10-15", country: "AU", body: "earth", type: "region", site: "live", count: 2, bytes: 1500 },
      { date: "2026-10-15", country: "DE", body: "earth", type: "region", site: "live", count: 1, bytes: 7 },
    ]);
  });
  it("keeps no IP address or other identifier: the tables hold daily totals only", async () => {
    const cols = (await rows("SELECT name FROM pragma_table_info('exports')")).map((r) => r.name);
    expect(cols).toEqual(["date", "country", "body", "type", "site", "count", "bytes"]);
  });
  it("accepts the plain path /v1/n as well as /event", async () => {
    const e = base();
    const r = await route(new Request("https://api.geomorphlab.org/v1/n", { method: "POST", body: '{"type":"plot","body":"mars","bytes":3}', headers: { Origin: LIVE, "Content-Type": "text/plain;charset=UTF-8" } }), e, fetch, NOW);
    expect(r.status).toBe(204);
  });
  it("counts a local preview separately", async () => {
    expect((await route(post('{"type":"copy-code","body":"earth"}', "http://127.0.0.1:5173"), base(), fetch, NOW)).status).toBe(204);
    expect(await rows("SELECT site, type FROM exports")).toEqual([{ site: "preview", type: "copy-code" }]);
  });
  it("refuses other sites, missing origins, bad messages and large ones, and counts nothing", async () => {
    const e = base();
    const forbidden = await route(post('{"type":"region","body":"earth","bytes":1}', "https://elsewhere.example"), e, fetch, NOW);
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect((await route(post('{"type":"region","body":"earth","bytes":1}', null), e, fetch, NOW)).status).toBe(403);
    expect((await route(post('{"type":"bogus","body":"earth","bytes":1}'), e, fetch, NOW)).status).toBe(400);
    expect((await route(post("x".repeat(5000)), e, fetch, NOW)).status).toBe(413);
    const g = new Request("https://counter.example/event", { headers: { Origin: LIVE } });
    expect((await route(g, e, fetch, NOW)).status).toBe(405);
    expect(await rows("SELECT * FROM exports")).toEqual([]);
  });
  it("answers the browser's permission check (preflight) for the atlas only", async () => {
    const pre = (origin: string) => new Request("https://counter.example/event", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST" } });
    const ok = await route(pre(LIVE), base(), fetch, NOW);
    expect(ok.status).toBe(204);
    expect(ok.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect((await route(pre("https://elsewhere.example"), base(), fetch, NOW)).status).toBe(403);
  });
  it("works through the deployed entry point with Cloudflare's country", async () => {
    const r = await worker.fetch(post('{"type":"cell-netcdf","body":"earth","bytes":9}', LIVE, "BR") as Request<unknown, IncomingRequestCfProperties>, base());
    expect(r.status).toBe(204);
    expect(await rows("SELECT country, type, count FROM exports")).toEqual([{ country: "BR", type: "cell-netcdf", count: 1 }]);
  });
});

describe("CSV links", () => {
  it("need the key, by header or ?key=", async () => {
    const e = base();
    expect((await route(get("/usage.csv"), e, fetch, NOW)).status).toBe(403);
    expect((await route(get("/usage.csv?key=wrong"), e, fetch, NOW)).status).toBe(403);
    expect((await route(get("/usage.csv", `Bearer ${KEY}`), e, fetch, NOW)).status).toBe(200);
    expect((await route(get(`/status.csv?key=${KEY}`), e, fetch, NOW)).status).toBe(200);
    expect((await route(get(`/check?key=wrong`), e, fetch, NOW)).status).toBe(403);
  });
  it("the dashboard page needs the key and draws from /usage.csv", async () => {
    const e = base();
    expect((await route(get("/dashboard"), e, fetch, NOW)).status).toBe(403);
    const ok = await route(get(`/dashboard?key=${KEY}`), e, fetch, NOW);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toMatch(/text\/html/);
    const html = await ok.text();
    expect(html).toContain("/usage.csv?key=");
    expect(html).not.toMatch(/<script[^>]+src=/);
  });
  it("are closed while no key (or a short one) is set", async () => {
    expect((await route(get(`/usage.csv?key=short`), { ...base(), CSV_KEY: "short" }, fetch, NOW)).status).toBe(503);
    expect((await route(get(`/usage.csv?key=`), { ...base(), CSV_KEY: undefined }, fetch, NOW)).status).toBe(503);
  });
  it("list downloads as export_count and export_bytes per type, with the pulled figures", async () => {
    const e = base();
    await route(post('{"type":"map-image","body":"earth","bytes":2048}'), e, fetch, NOW);
    await DB.prepare("INSERT INTO pulled VALUES ('2026-10-14','AU','earth','visits',12,'count','web_analytics',1)").run();
    const r = await route(get(`/usage.csv?key=${KEY}`), e, fetch, NOW);
    expect(r.headers.get("Content-Type")).toContain("text/csv");
    expect(r.headers.get("Content-Disposition")).toContain("dune-atlas-usage-2026-10-15.csv");
    expect((await r.text()).split("\r\n")).toEqual([
      "date,country,body,measure,value,unit,source,sample_interval",
      "2026-10-14,AU,earth,visits,12,count,web_analytics,1",
      "2026-10-15,AU,earth,export_bytes:map-image,2048,bytes,counter,",
      "2026-10-15,AU,earth,export_count:map-image,1,count,counter,",
      "",
    ]);
  });
  it("other paths are not found; the root answers plainly", async () => {
    expect((await route(get("/admin"), base(), fetch, NOW)).status).toBe(404);
    expect((await route(get("/"), base(), fetch, NOW)).status).toBe(200);
  });
});

/** fake GraphQL API: answers each of the three queries with a fixed reply, or an error */
function fakeApi(o: { fail?: string } = {}) {
  const seen: string[] = [];
  const f: Fetcher = async (_url, init) => {
    const q = JSON.parse(String(init.body)).query as string;
    seen.push(q);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    if (o.fail && q.includes(o.fail)) return Response.json({ data: null, errors: [{ message: "unknown field" }] });
    const date = q.match(/(\d{4}-\d{2}-\d{2})/)![1];
    if (q.includes("httpRequestsAdaptiveGroups")) return Response.json({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [
      { count: 300, avg: { sampleInterval: 1 }, sum: { edgeResponseBytes: 9_000_000 }, dimensions: { clientCountryName: "AU" } },
      { count: 20, avg: { sampleInterval: 1 }, sum: { edgeResponseBytes: 50_000 }, dimensions: { clientCountryName: "US" } },
    ] }] } }, errors: null });
    if (q.includes("httpRequests1dGroups")) return Response.json({ data: { viewer: { zones: [{ httpRequests1dGroups: [{ uniq: { uniques: 17 }, dimensions: { date } }] }] } }, errors: null });
    return Response.json({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
      { count: 5, avg: { sampleInterval: 1 }, sum: { visits: 3 }, dimensions: { countryName: "AU", requestPath: "/" } },
      { count: 2, avg: { sampleInterval: 1 }, sum: { visits: 2 }, dimensions: { countryName: "AU", requestPath: "/mars/" } },
    ] }] } }, errors: null });
  };
  return { f, seen };
}

describe("daily collection", () => {
  it("writes each source's rows for each day and logs the outcome", async () => {
    const api = fakeApi();
    const out = await collect(base(), ["2026-10-12"], api.f, NOW);
    expect(out.map((o) => [o.source, o.status, o.rows])).toEqual([["data_host", "ok", 4], ["zone_daily", "ok", 1], ["web_analytics", "ok", 4]]);
    expect(await rows("SELECT country, body, measure, value, source FROM pulled ORDER BY source, measure, body, country")).toEqual([
      { country: "AU", body: "all", measure: "data_host_bytes", value: 9_000_000, source: "data_host" },
      { country: "US", body: "all", measure: "data_host_bytes", value: 50_000, source: "data_host" },
      { country: "AU", body: "all", measure: "data_host_requests", value: 300, source: "data_host" },
      { country: "US", body: "all", measure: "data_host_requests", value: 20, source: "data_host" },
      { country: "AU", body: "earth", measure: "page_views", value: 5, source: "web_analytics" },
      { country: "AU", body: "mars", measure: "page_views", value: 2, source: "web_analytics" },
      { country: "AU", body: "earth", measure: "visits", value: 3, source: "web_analytics" },
      { country: "AU", body: "mars", measure: "visits", value: 2, source: "web_analytics" },
      { country: "all", body: "all", measure: "unique_ips_zone", value: 17, source: "zone_daily" },
    ]);
    expect(await rows("SELECT source, status FROM pull_log ORDER BY source")).toEqual([
      { source: "data_host", status: "ok" }, { source: "web_analytics", status: "ok" }, { source: "zone_daily", status: "ok" },
    ]);
  });
  it("collecting a day again replaces its rows instead of adding to them", async () => {
    await collect(base(), ["2026-10-12"], fakeApi().f, NOW);
    await collect(base(), ["2026-10-12"], fakeApi().f, NOW + 86_400_000);
    expect(await rows("SELECT value FROM pulled WHERE measure = 'unique_ips_zone'")).toEqual([{ value: 17 }]);
  });
  it("a failing source keeps its earlier rows, logs the error, and does not stop the others", async () => {
    await collect(base(), ["2026-10-12"], fakeApi().f, NOW);
    const out = await collect(base(), ["2026-10-12"], fakeApi({ fail: "httpRequests1dGroups" }).f, NOW + 1000);
    expect(out.find((o) => o.source === "zone_daily")).toMatchObject({ status: "error", message: "unknown field" });
    expect(await rows("SELECT value FROM pulled WHERE measure = 'unique_ips_zone'")).toEqual([{ value: 17 }]);
    expect(await rows("SELECT status, message FROM pull_log WHERE source = 'zone_daily'")).toEqual([{ status: "error", message: "unknown field" }]);
    expect(out.filter((o) => o.status === "ok").length).toBe(2);
  });
  it("without a token nothing is asked of Cloudflare and the log says why", async () => {
    const api = fakeApi();
    const out = await collect({ ...base(), CF_API_TOKEN: undefined }, ["2026-10-12"], api.f, NOW);
    expect(api.seen).toEqual([]);
    expect(out.every((o) => o.status === "error" && o.message.includes("CF_API_TOKEN"))).toBe(true);
  });
  it("/pull collects a range of days (with the key), at most 10 days per call", async () => {
    const api = fakeApi();
    const r = await route(get(`/pull?key=${KEY}&from=2026-10-10&to=2026-10-11`), base(), api.f, NOW);
    expect(r.status).toBe(200);
    expect(((await r.json()) as unknown[]).length).toBe(6);
    expect((await route(get(`/pull?key=${KEY}&from=2026-09-01&to=2026-10-11`), base(), api.f, NOW)).status).toBe(400);
  });
  it("/check reports settings and a trial day without writing anything", async () => {
    const api = fakeApi();
    const r = await route(get(`/check?key=${KEY}`), base(), api.f, NOW);
    const body = (await r.json()) as { csv_key_set: boolean; sources: Record<string, { trial: { day: string; rows: number } }> };
    expect(body.csv_key_set).toBe(true);
    expect(body.sources.data_host.trial).toMatchObject({ day: "2026-10-12", rows: 4 });
    expect(await rows("SELECT * FROM pulled")).toEqual([]);
  });
  it("the scheduled run collects the three days before the run's day", async () => {
    const ctrl = { scheduledTime: NOW, cron: "17 3 * * *", noRetry: () => {} } as ScheduledController;
    const { ctx, done } = testCtx();
    // the deployed entry uses the global fetch; with no token no request leaves, and the log shows the days
    await worker.scheduled(ctrl, { ...base(), CF_API_TOKEN: undefined }, ctx);
    await done();
    expect((await rows("SELECT DISTINCT date FROM pull_log ORDER BY date")).map((r) => r.date)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
  });
});
