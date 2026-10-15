-- Usage counter tables (docs/guide/usage-counter.md). Daily totals only: no IP addresses, no browser
-- details, no file names, no times of day. WITHOUT ROWID: the primary key is the table itself, so each
-- update writes one row (D1 counts rows written per day on the free plan).

-- downloads counted by the atlas page, one row per day, country, planet, export type and site
CREATE TABLE exports (
  date TEXT NOT NULL,        -- UTC date, YYYY-MM-DD
  country TEXT NOT NULL,     -- two-letter code from Cloudflare; XX = unknown, T1 = Tor
  body TEXT NOT NULL,        -- earth | mars
  type TEXT NOT NULL,        -- map-image | region | cell-netcdf | cell-csv | citation | plot | copy-code | copy-citation
  site TEXT NOT NULL,        -- live (map.geomorphlab.org) | preview (a local preview of the site)
  count INTEGER NOT NULL,    -- number of downloads (or copies)
  bytes INTEGER NOT NULL,    -- total size of the saved files, in bytes (0 for copies)
  PRIMARY KEY (date, country, body, type, site)
) WITHOUT ROWID;

-- daily figures copied from Cloudflare's analytics by the scheduled job; one source replaces its own
-- rows for a day each time it is collected again
CREATE TABLE pulled (
  date TEXT NOT NULL,        -- UTC date, YYYY-MM-DD
  country TEXT NOT NULL,     -- two-letter code, or "all" for worldwide figures
  body TEXT NOT NULL,        -- earth | mars | all
  measure TEXT NOT NULL,     -- visits | page_views | data_host_requests | data_host_bytes | unique_ips_zone
  value REAL NOT NULL,
  unit TEXT NOT NULL,        -- count | bytes
  source TEXT NOT NULL,      -- web_analytics | data_host | zone_daily (the Cloudflare dataset it came from)
  sample_interval REAL,      -- Cloudflare's average sampling figure (1 = every event counted); NULL if not given
  PRIMARY KEY (date, country, body, measure, source)
) WITHOUT ROWID;

-- the outcome of the latest collection of each source for each day
CREATE TABLE pull_log (
  date TEXT NOT NULL,        -- the day that was collected
  source TEXT NOT NULL,
  status TEXT NOT NULL,      -- ok | error
  rows INTEGER NOT NULL,     -- rows written for that day
  message TEXT NOT NULL,     -- error text from Cloudflare, shortened; empty when ok
  run_at TEXT NOT NULL,      -- UTC time of the collection, ISO 8601
  PRIMARY KEY (date, source)
) WITHOUT ROWID;
