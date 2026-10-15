# Usage counter (Cloudflare Worker)

Counts the atlas's downloads per day and country, and copies Cloudflare's daily traffic figures into a
D1 database; the figures are downloaded as CSV. What is counted, the limits, and the setup steps:
[docs/guide/usage-counter.md](../../docs/guide/usage-counter.md).

- `src/index.ts`: the Worker (routes and the daily timer); `src/events.ts`: download messages;
  `src/pull.ts`: Cloudflare's GraphQL Analytics API; `src/csv.ts`: the CSV files
- `migrations/`: the database tables
- `wrangler.toml`: settings (ids to fill in; no secrets)
- `npm test`, `npm run typecheck`: tests on your computer (SQLite in place of D1, no requests to Cloudflare)
