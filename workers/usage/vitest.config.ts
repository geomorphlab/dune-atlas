// Tests run in Node with an in-memory SQLite database that has migrations/ applied (test/d1.ts) in place
// of D1, and a fake in place of Cloudflare's API; nothing is sent to Cloudflare.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
