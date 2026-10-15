// The download message check: allowed types and planets, size limits, country and origin handling
import { describe, expect, it } from "vitest";
import { countryCode, EVENT_TYPES, list, MAX_EVENT_BYTES, originKind, parseEvent, utcDate } from "../src/events";

describe("parseEvent", () => {
  it("accepts every export type with a planet and a file size", () => {
    for (const type of EVENT_TYPES) {
      const bytes = type.startsWith("copy-") ? 0 : 1234;
      expect(parseEvent(JSON.stringify({ type, body: "mars", bytes }))).toEqual({ ok: true, event: { type, body: "mars", bytes } });
    }
  });
  it("treats a missing size as 0", () => {
    expect(parseEvent('{"type":"copy-code","body":"earth"}')).toEqual({ ok: true, event: { type: "copy-code", body: "earth", bytes: 0 } });
  });
  it("refuses unknown types, planets, extra fields and bad sizes", () => {
    const bad = [
      { type: "everything", body: "earth", bytes: 1 },
      { type: "region", body: "venus", bytes: 1 },
      { type: "region", body: "earth", bytes: 1, lat: -23.5 },
      { type: "region", body: "earth", bytes: -1 },
      { type: "region", body: "earth", bytes: 1.5 },
      { type: "region", body: "earth", bytes: "12" },
      { type: "region", body: "earth", bytes: 2e10 },
      { type: "copy-code", body: "earth", bytes: 5 },
    ];
    for (const b of bad) expect(parseEvent(JSON.stringify(b)).ok).toBe(false);
    expect(parseEvent("not json")).toMatchObject({ ok: false, status: 400 });
    expect(parseEvent("[1,2]")).toMatchObject({ ok: false, status: 400 });
    expect(parseEvent("null")).toMatchObject({ ok: false, status: 400 });
  });
  it("refuses messages over the size limit", () => {
    const big = JSON.stringify({ type: "region", body: "earth", bytes: 1, pad: "x".repeat(MAX_EVENT_BYTES) });
    expect(parseEvent(big)).toMatchObject({ ok: false, status: 413 });
  });
});

describe("country, date and origin", () => {
  it("keeps two-letter codes from Cloudflare and maps anything else to XX", () => {
    expect(countryCode({ country: "AU" })).toBe("AU");
    expect(countryCode({ country: "T1" })).toBe("T1");
    expect(countryCode({ country: "au" })).toBe("XX");
    expect(countryCode({ country: "AUS" })).toBe("XX");
    expect(countryCode({})).toBe("XX");
    expect(countryCode(undefined)).toBe("XX");
  });
  it("uses the UTC calendar date", () => {
    expect(utcDate(Date.UTC(2026, 9, 14, 23, 59, 59))).toBe("2026-10-14");
    expect(utcDate(Date.UTC(2026, 9, 15, 0, 0, 0))).toBe("2026-10-15");
  });
  it("tells the live site, a local preview and others apart", () => {
    const live = list("https://map.geomorphlab.org"), preview = list(" http://127.0.0.1:5173 ,");
    expect(originKind("https://map.geomorphlab.org", live, preview)).toBe("live");
    expect(originKind("http://127.0.0.1:5173", live, preview)).toBe("preview");
    expect(originKind("https://map.geomorphlab.org.evil.example", live, preview)).toBeNull();
    expect(originKind("http://map.geomorphlab.org", live, preview)).toBeNull();
    expect(originKind(null, live, preview)).toBeNull();
  });
});
