// Share-link corpus check shared by both atlases (tests/sharecorpus.test.ts, tests/mars/sharecorpus.test.ts):
// a recorded link code must decode to the recorded state and open the recorded app state; the recorded
// state must encode to the same code. Corpus files: tests/fixtures/share-links-<body>.json, written once
// by tools/checks/make-share-corpus.ts.
import fs from "node:fs";
import path from "node:path";
import { expect } from "vitest";
import type { Registry } from "../src/registry/types";
import { decodeShare, encodeShare, type ShareState } from "../src/share/shortlink";
import { openShareCode } from "./shareopen";

export function checkShareCorpus(body: string, reg: Registry) {
  const file = path.resolve(__dirname, `fixtures/share-links-${body}.json`);
  const { entries } = JSON.parse(fs.readFileSync(file, "utf8")) as { entries: { state: ShareState; code: string; decoded: ShareState; app: unknown }[] };
  expect(entries.length).toBeGreaterThan(30);
  for (const e of entries) {
    expect(encodeShare(e.state), e.code).toBe(e.code);
    expect(decodeShare(e.code), e.code).toEqual(e.decoded);
    expect(openShareCode(reg, e.code).app, e.code).toEqual(e.app);
  }
}
