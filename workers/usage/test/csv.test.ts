// The CSV files: columns, order, quoting, and protection against spreadsheet formulas
import { describe, expect, it } from "vitest";
import { exportMeasures, field, statusCsv, usageCsv } from "../src/csv";

describe("CSV", () => {
  it("quotes fields with commas, quotes or line breaks, and never starts text with a formula sign", () => {
    expect(field("a,b")).toBe('"a,b"');
    expect(field('say "hi"')).toBe('"say ""hi"""');
    expect(field("=1+1")).toBe("'=1+1");
    expect(field(-5)).toBe("-5");
    expect(field(null)).toBe("");
    expect(field(1.5)).toBe("1.5");
  });
  it("a preview download is labelled counter-preview", () => {
    expect(exportMeasures({ date: "2026-10-15", country: "AU", body: "earth", type: "region", site: "preview", count: 1, bytes: 9 })[0].source).toBe("counter-preview");
  });
  it("usage rows are sorted by date, source, measure, planet, country", () => {
    const csv = usageCsv(
      [{ date: "2026-10-15", country: "DE", body: "mars", type: "plot", site: "live", count: 2, bytes: 10 }],
      [{ date: "2026-10-14", country: "all", body: "all", measure: "unique_ips_zone", value: 17, unit: "count", source: "zone_daily", sample_interval: null }],
    ).split("\r\n");
    expect(csv[0]).toBe("date,country,body,measure,value,unit,source,sample_interval");
    expect(csv.slice(1, 4)).toEqual([
      "2026-10-14,all,all,unique_ips_zone,17,count,zone_daily,",
      "2026-10-15,DE,mars,export_bytes:plot,10,bytes,counter,",
      "2026-10-15,DE,mars,export_count:plot,2,count,counter,",
    ]);
  });
  it("status rows are newest first", () => {
    const s = statusCsv([
      { date: "2026-10-12", source: "data_host", status: "ok", rows: 4, message: "", run_at: "2026-10-15T03:17:00.000Z" },
      { date: "2026-10-14", source: "zone_daily", status: "error", rows: 0, message: "unknown field, sorry", run_at: "2026-10-15T03:17:00.000Z" },
    ]).split("\r\n");
    expect(s[1]).toBe('2026-10-14,zone_daily,error,0,"unknown field, sorry",2026-10-15T03:17:00.000Z');
  });
});
