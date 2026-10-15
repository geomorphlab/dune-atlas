// A small stand-in for a D1 database in tests: the parts of the D1 API the Worker uses (prepare, bind,
// run, all, batch), on an in-memory SQLite database (node:sqlite) with migrations/ applied. D1 is SQLite,
// so the same SQL runs; batch() is one transaction, as in D1.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = path.join(import.meta.dirname, "..", "migrations");

class Stmt {
  constructor(private db: DatabaseSync, readonly sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) { return new Stmt(this.db, this.sql, params); }
  private exec() {
    const s = this.db.prepare(this.sql);
    const p = this.params as Array<string | number | null>;
    if (/^\s*(SELECT|WITH|PRAGMA)/i.test(this.sql)) return { results: s.all(...p).map((r) => ({ ...r })), success: true, meta: {} };
    s.run(...p);
    return { results: [], success: true, meta: {} };
  }
  async run() { return this.exec(); }
  async all() { return this.exec(); }
  runNow() { return this.exec(); }
}

export function testDb(): D1Database {
  const db = new DatabaseSync(":memory:");
  for (const f of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  const d1 = {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec("BEGIN");
      try { const out = stmts.map((s) => s.runNow()); db.exec("COMMIT"); return out; } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
  return d1 as unknown as D1Database;
}

/** a request as the Worker receives it, with Cloudflare's request.cf (country) attached */
export function withCf(r: Request, country: string): Request {
  Object.defineProperty(r, "cf", { value: { country } });
  return r;
}

/** an execution context that collects waitUntil() work so a test can wait for it */
export function testCtx() {
  const work: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => { work.push(p); }, passThroughOnException: () => {}, props: {} };
  return { ctx: ctx as unknown as ExecutionContext, done: () => Promise.all(work) };
}
