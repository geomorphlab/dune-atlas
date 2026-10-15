// The queries sent to Cloudflare's GraphQL Analytics API and the reading of its replies
import { describe, expect, it } from "vitest";
import {
  bodyOfPath, configProblem, dataHostQuery, dayRange, daysToCollect, isDay, parseDataHost, parseWebAnalytics, parseZoneDaily,
  ROW_LIMIT, webAnalyticsQuery, zoneDailyQuery, type PullConfig,
} from "../src/pull";

const cfg: PullConfig = { token: "t", accountId: "b".repeat(32), zoneId: "a".repeat(32), dataHost: "data.geomorphlab.org", siteHost: "map.geomorphlab.org" };

describe("days", () => {
  it("a run collects the three UTC days before its own day", () => {
    expect(daysToCollect(Date.UTC(2026, 9, 15, 3, 17))).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(daysToCollect(Date.UTC(2026, 2, 1, 0, 0))).toEqual(["2026-02-26", "2026-02-27", "2026-02-28"]);
  });
  it("ranges are checked and capped", () => {
    expect(dayRange("2026-10-01", "2026-10-03", 10)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(dayRange("2026-10-03", "2026-10-01", 10)).toBeNull();
    expect(dayRange("2026-10-01", "2026-10-20", 10)).toBeNull();
    expect(dayRange("2026-02-30", "2026-03-01", 10)).toBeNull();
    expect(isDay("2026-10-01\"}")).toBe(false);
  });
});

describe("queries", () => {
  it("data host: one hostname, visitors only, one day, by country", () => {
    const q = dataHostQuery(cfg, "2026-10-12");
    expect(q).toContain(`zoneTag: "${cfg.zoneId}"`);
    expect(q).toContain("httpRequestsAdaptiveGroups");
    expect(q).toContain('clientRequestHTTPHost: "data.geomorphlab.org"');
    expect(q).toContain('requestSource: "eyeball"');
    expect(q).toContain('datetime_geq: "2026-10-12T00:00:00Z", datetime_lt: "2026-10-13T00:00:00Z"');
    expect(q).toMatch(/sum \{ edgeResponseBytes \}.*clientCountryName/s);
  });
  it("zone daily: unique IP addresses of one day", () => {
    const q = zoneDailyQuery(cfg, "2026-10-12");
    expect(q).toContain("httpRequests1dGroups");
    expect(q).toContain('date_geq: "2026-10-12", date_leq: "2026-10-12"');
    expect(q).toContain("uniq { uniques }");
  });
  it("Web Analytics: the atlas host (or a site tag), bots excluded, by country and path", () => {
    const q = webAnalyticsQuery(cfg, "2026-10-12");
    expect(q).toContain(`accountTag: "${cfg.accountId}"`);
    expect(q).toContain('requestHost: "map.geomorphlab.org"');
    expect(q).toContain("bot: 0");
    expect(q).toContain("dimensions { countryName requestPath }");
    expect(webAnalyticsQuery({ ...cfg, siteTag: "c".repeat(32) }, "2026-10-12")).toContain(`siteTag: "${"c".repeat(32)}"`);
  });
  it("refuses to build a query from a value that is not a date", () => {
    expect(() => dataHostQuery(cfg, '2026-10-12" } } }')).toThrow();
  });
  it("names configuration problems before asking Cloudflare", () => {
    expect(configProblem({ ...cfg, token: "" }, "data_host")).toMatch(/CF_API_TOKEN/);
    expect(configProblem({ ...cfg, zoneId: "REPLACE_WITH_ZONE_ID" }, "zone_daily")).toMatch(/CF_ZONE_ID/);
    expect(configProblem({ ...cfg, accountId: "REPLACE_WITH_ACCOUNT_ID" }, "web_analytics")).toMatch(/CF_ACCOUNT_ID/);
    expect(configProblem({ ...cfg, siteTag: "x" }, "web_analytics")).toMatch(/SITE_TAG/);
    expect(configProblem(cfg, "data_host")).toBeNull();
  });
});

describe("replies", () => {
  it("Earth and Mars are told apart by the page path", () => {
    expect(bodyOfPath("/")).toBe("earth");
    expect(bodyOfPath("/mars/")).toBe("mars");
    expect(bodyOfPath("/mars")).toBe("mars");
    expect(bodyOfPath("/marshland")).toBe("earth");
    expect(bodyOfPath(undefined)).toBe("earth");
  });
  it("Web Analytics groups are summed per country and planet, with the largest sampling figure", () => {
    const r = parseWebAnalytics({ data: { viewer: { accounts: [{ rumPageloadEventsAdaptiveGroups: [
      { count: 5, avg: { sampleInterval: 1 }, sum: { visits: 3 }, dimensions: { countryName: "AU", requestPath: "/" } },
      { count: 4, avg: { sampleInterval: 2 }, sum: { visits: 1 }, dimensions: { countryName: "AU", requestPath: "/index.html" } },
    ] }] } } }, "2026-10-12");
    expect(r).toMatchObject({ ok: true, rows: [
      { country: "AU", body: "earth", measure: "visits", value: 4, sample_interval: 2 },
      { country: "AU", body: "earth", measure: "page_views", value: 9, sample_interval: 2 },
    ] });
  });
  it("names Cloudflare cannot match to a two-letter code are merged under XX", () => {
    const r = parseDataHost({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [
      { count: 1, sum: { edgeResponseBytes: 10 }, dimensions: { clientCountryName: "" } },
      { count: 2, sum: { edgeResponseBytes: 20 }, dimensions: { clientCountryName: "XX" } },
    ] }] } } }, "2026-10-12");
    expect(r).toMatchObject({ ok: true, rows: [{ country: "XX", measure: "data_host_requests", value: 3, sample_interval: null }, { country: "XX", measure: "data_host_bytes", value: 30 }] });
  });
  it("a reply as long as the row limit is noted as possibly incomplete", () => {
    const g = Array.from({ length: ROW_LIMIT }, () => ({ count: 1, sum: { edgeResponseBytes: 1 }, dimensions: { clientCountryName: "AU" } }));
    const r = parseDataHost({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: g }] } } }, "2026-10-12");
    expect(r.ok && r.note).toMatch(/row limit/);
  });
  it("a day without a zone figure gives no row; a reply without the dataset is an error", () => {
    expect(parseZoneDaily({ data: { viewer: { zones: [{ httpRequests1dGroups: [] }] } } }, "2026-10-12")).toEqual({ ok: true, rows: [], note: "no figure for this day" });
    expect(parseZoneDaily({ data: null }, "2026-10-12").ok).toBe(false);
  });
});
