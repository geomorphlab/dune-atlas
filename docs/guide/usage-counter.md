# Usage counter

How the atlas counts its own use: what is counted, what is not, how to set the counter up in Cloudflare,
how to download the numbers, and how to keep it running. The counter is free on Cloudflare's free plans.

The code is in [`workers/usage/`](../../workers/usage/) (the counter) and
[`app/src/core/usage.ts`](../../app/src/core/usage.ts) (the part in the atlas page).

**Words used here**

- **Worker**: a small program that runs on Cloudflare's servers and answers web requests. The counter is one Worker.
- **D1**: Cloudflare's small SQL database. The counter keeps its daily totals in one D1 database.
- **Cron Trigger**: a timer that runs the Worker on a schedule (here once a day).
- **GraphQL Analytics API**: Cloudflare's way of reading its own traffic figures from a program.
- **API token**: a password-like key that lets a program act on your Cloudflare account, limited to the permissions you give it.
- **Secret**: a value (such as the API token) kept inside Cloudflare for the Worker, never written into the repository.
- **Wrangler**: Cloudflare's command-line tool for creating, configuring and uploading Workers. It is run with `npx wrangler …` from `workers/usage/`.
- **workers.dev address**: the free web address every Worker gets, `https://<worker-name>.<your-subdomain>.workers.dev`.

## 1. What is counted

The counter does two jobs.

**(a) Downloads, counted by the atlas page.** Each download sends one small message to the counter with
three things only: the export type, the planet (Earth or Mars) and the file size in bytes. The counter
adds 1 to that day's total for the visitor's country and adds the file size to the day's byte total.
The country is the two-letter code Cloudflare attaches to every request (`request.cf.country`, the same
value as the `CF-IPCountry` header) [Request].

| Type | What the visitor did |
|---|---|
| `map-image` | saved the map as a PNG (camera button) |
| `region` | saved a region (box) export (zip with a NetCDF file) |
| `cell-netcdf` | saved a cell's NetCDF file (.nc) |
| `cell-csv` | saved a cell's CSV bundle (.zip) |
| `citation` | saved a cell's citation text file (also when "Copy citation" falls back to a file) |
| `plot` | saved one cell-panel plot as PNG or SVG |
| `copy-code` | pressed "Copy code" in "Get the whole grid" (counted after the copy succeeded) |
| `copy-citation` | pressed "Copy citation" in the cell panel (counted after the copy succeeded) |

**(b) Cloudflare's own figures, copied once a day.** Cloudflare keeps its traffic figures only for a
limited time: adaptive datasets such as the one for `data.geomorphlab.org` "retain at least 31 days of
data on every plan" [GraphQL limits]; Web Analytics data can be viewed "for the previous six months"
[Web Analytics FAQ]. Once a day at 03:17 UTC the Worker copies the three previous days into its database,
so the series is kept for as long as the database exists. Each run collects the last three days again;
this repairs a missed run and lets late figures settle (on the free plan, "Metrics are delayed 24 hours"
[About Cloudflare Analytics]).

| Measure | What it is | Cloudflare dataset |
|---|---|---|
| `data_host_requests` | requests answered by `data.geomorphlab.org`, by country | `httpRequestsAdaptiveGroups`, filtered to that host name and to visitor traffic (`requestSource: "eyeball"`) [Hostname tutorial] |
| `data_host_bytes` | bytes sent by `data.geomorphlab.org`, by country | the same (`edgeResponseBytes`) |
| `unique_ips_zone` | unique IP addresses that day, whole `geomorphlab.org` zone, worldwide only | `httpRequests1dGroups`, `uniq { uniques }` [Datasets] |
| `visits` | Web Analytics visits to `map.geomorphlab.org`, by country, Earth and Mars separately, bots excluded | `rumPageloadEventsAdaptiveGroups` |
| `page_views` | Web Analytics page views, same split | the same |

Earth and Mars are told apart by the page path: everything under `/mars/` is Mars, the rest Earth.

## 2. What is not counted, and how to read the numbers

**Nothing that identifies a person is kept.** The counter's database holds daily totals per country only:
no IP address, no browser details, no file name, no place on the map, no time of day. The atlas page sends
no identifier, sets no cookie and keeps nothing in the browser for the counter. Cloudflare itself sees
each visitor's IP address when the message arrives, as it already does for every map tile; the counter
reads only the country code from it. The Worker's invocation logs are switched off in `wrangler.toml`
(`[observability] enabled = false`), because such logs would record details of each request.

**Unique users cannot be counted** without cookies or similar identifiers. The stand-in is
`unique_ips_zone`, and it must be read with care:

- one person can appear under several IP addresses in a day (phones change address); bots and scripts count;
- a whole university network can share one IP address;
- it covers the whole zone (`data.geomorphlab.org` and the `geomorphlab.org` redirect), not the atlas page;
- daily values **cannot be added up** into weekly or monthly unique counts (the same address on two days would be counted twice);
- Cloudflare offers it worldwide only: the country breakdown of these datasets carries requests and bytes, not unique addresses.

**Whether the free plan provides `unique_ips_zone` is not verified.** Cloudflare's documentation shows
`uniq { uniques }` on the hourly and minute datasets [Datasets]; the daily dataset
`httpRequests1dGroups` is not named in the current documentation text, and its availability on the free
plan can only be checked with your token (step 7). If it is not available, `status.csv` shows an error
for `zone_daily` every day and the CSV has no `unique_ips_zone` rows. Hourly values cannot replace it,
because hourly unique counts cannot be added into a daily one.

**Other limits**

| Effect | Applies to | Direction |
|---|---|---|
| Ad-blockers block the Web Analytics script ("Cloudflare is aware that the analytics beacon is blocked by these services" [Web Analytics FAQ]); some may block the counter's messages too | visits, page views, downloads | too low, by an amount that cannot be measured |
| Sampling: Cloudflare may answer from a sample and returns "an estimate derived from the sampled value" [Sampling]. Web Analytics keeps unsampled data for 7 days, then "aggregated down to around 10%" [Web Analytics FAQ] | visits, page views, data host figures | estimates; the `sample_interval` column holds Cloudflare's average sampling figure (1 = every event counted; for a day split into groups, the largest group value) |
| A visitor's browser keeps data-host files for a day and does not ask again | data host figures | repeat use is missing |
| Bots and crawlers | data host figures, unique IP addresses | too high (Web Analytics rows exclude bots with Cloudflare's `bot` field) |
| Python readers of the Zarr stores ("Get the whole grid") | data host figures only | their bytes count there; they are not downloads in the counter |
| Country comes from the IP address | all by-country figures | VPN users appear in the VPN's country; `XX` = unknown, `T1` = Tor |
| Downloads from a local preview of the site (`http://127.0.0.1:5173`) | downloads | counted separately with source `counter-preview` |
| Messages larger than 256 bytes, unknown types or planets, sizes over 10 GB, or from any other site | downloads | refused |

**Abuse.** The counter accepts messages only from pages on `https://map.geomorphlab.org` (and the local
preview), checked with the browser's `Origin` header. A program can fake that header, so this stops casual
misuse only. Paid rate-limiting products are not used. If false counts ever appear, a day's download counts
can be removed with
`npx wrangler d1 execute dune-atlas-usage --remote --command "DELETE FROM exports WHERE date = 'YYYY-MM-DD'"`.

**Free-plan limits** (all from Cloudflare's pages listed in section 6):

| Limit | Free allowance | What happens |
|---|---|---|
| Worker requests | 100,000 per day, "resetting at midnight UTC"; above it Cloudflare returns Error 1027 [Workers limits] | counting stops for the rest of the day; downloads themselves are not affected |
| D1 rows written | 100,000 per day [Workers pricing] | each counted download writes one row (the tables have no separate index); the daily collection writes a few hundred rows |
| D1 rows read | 5 million per day [Workers pricing] | each CSV download reads every row once |
| D1 size | 500 MB per database [D1 limits] | daily totals are a few kilobytes per day |
| CPU time | 10 ms per request and per Cron run; waiting for Cloudflare's replies does not count [Workers limits] | whether the daily run stays under 10 ms is not verified until it runs |
| Outside requests per run | 50 per invocation [Workers limits] | a daily run makes 9 requests; one `/pull` call at most 30 (10 days) |
| Cron Triggers | 5 per account [Workers limits] | the counter uses 1 |

## 3. Setting it up (once, about 45 minutes)

You need Node.js (the same as for the atlas app) and a terminal. Commands are run from
`workers/usage/` in the repository. Nothing below changes the live atlas: the page sends nothing until
step 9.

### Step 1. Find the account id and zone id

- **Account id**: Cloudflare dashboard, **Workers & Pages**, section **Account Details**, copy button next
  to **Account ID** (or press Cmd+K, type "Copy account ID") [Find account and zone IDs].
- **Zone id**: dashboard, **Domains**, select `geomorphlab.org`; on its **Overview** page the **API**
  section near the bottom has **Zone ID** with a copy button [Find account and zone IDs].

Put both into `workers/usage/wrangler.toml`: the account id in `account_id` and in `CF_ACCOUNT_ID`, the
zone id in `CF_ZONE_ID`. These ids are not secrets.

### Step 2. Create the API token (12-month expiry)

1. Dashboard, **My Profile**, **API Tokens**, **Create Token** [Create API token].
2. **Custom token**, **Get started**. Name: `dune-atlas-usage`.
3. **Permissions** (three drop-downs per line; add four lines):
   - Account · **Workers Scripts** · **Edit** (upload the Worker, its secrets and its daily timer)
   - Account · **D1** · **Edit** (create the database and add its tables)
   - Account · **Account Analytics** · **Read** (Web Analytics figures)
   - Zone · **Analytics** · **Read** (data host figures and unique IP addresses)
   These names are as listed on Cloudflare's permissions page [Token permissions], which shows the
   edit level in two tables, once as "Edit" and once as "Write"; choose whichever of the two the
   drop-down offers.
4. **Account Resources**: Include, your account. **Zone Resources**: Include, Specific zone, `geomorphlab.org`.
5. **TTL**: set the end date 12 months from today.
6. **Continue to summary**, **Create Token**. The token is shown only once [Create API token]. Keep it in
   your password manager. Do not paste it into chat, e-mail or a file in the repository.
7. Put a reminder in your calendar two weeks before the end date (section 5).

Notes. (i) Cloudflare's own "Edit Cloudflare Workers" token template also includes Account Settings Read,
User Details Read and Memberships Read [Token templates]. Whether Wrangler needs these when the account id
is given in `wrangler.toml` is **not verified**. If a Wrangler command below stops with an authentication
error, edit the token and add those three read permissions. (ii) The same token becomes the Worker's
secret in step 5, so it sits inside Cloudflare with edit rights to Workers and D1. A safer choice is a
second token with only the two Read permissions for the Worker's secret, keeping the edit token on your
computer. This guide follows the one-token setup; the two-token setup changes only step 5 (put the read-only token). (iii) Account API
tokens (Manage Account, Account API tokens) may also work; Cloudflare's compatibility table lists Account
Analytics, D1 and Workers but not zone analytics by name [Account API tokens], so this is not verified.

### Step 3. Install Wrangler and give it the token

```sh
cd workers/usage
npm ci
export CLOUDFLARE_API_TOKEN='paste-the-token-here'   # this terminal window only; not saved to a file
```

Wrangler reads the token from `CLOUDFLARE_API_TOKEN` [Wrangler environment variables]. Run the next steps
in the same terminal window.

### Step 4. Create the database and its tables

```sh
npx wrangler d1 create dune-atlas-usage
```

If Wrangler asks whether to add the database to your configuration, answer **No**. Copy the
`database_id` it prints into `wrangler.toml` (`database_id = "…"`). Then add the tables
(file `migrations/0001_init.sql`) to the database in Cloudflare:

```sh
npx wrangler d1 migrations apply dune-atlas-usage --remote
```

`--remote` means the database in Cloudflare, not a local copy [D1 Wrangler commands]. Wrangler asks you to
confirm and keeps a backup point [D1 Wrangler commands].

### Step 5. Set the two secrets

```sh
npx wrangler secret put CF_API_TOKEN     # paste the API token when asked
openssl rand -hex 24                     # prints a random 48-character key; copy it
npx wrangler secret put CSV_KEY          # paste that key when asked
```

Keep the CSV key in your password manager: it opens the CSV links. The Worker refuses keys shorter than
24 characters. Secrets are set with `wrangler secret put` [Secrets].

### Step 6. Upload the Worker

```sh
npx wrangler deploy
```

This uploads the Worker, connects the database and sets the daily timer from `wrangler.toml`
(`crons = ["17 3 * * *"]`, UTC; Cron Triggers "execute on UTC time" and changes "may take several minutes
(up to 15 minutes) to propagate" [Cron Triggers]). Wrangler prints the Worker's address,
`https://dune-atlas-usage.<your-subdomain>.workers.dev`. If your account has no workers.dev subdomain yet,
choose one in the dashboard (**Workers & Pages**, **Change** next to **Your subdomain**) [workers.dev].
Opening the address in a browser shows "Dune Atlas usage counter".

### Step 7. Check what the free plan allows

Open, in your browser (replace the two parts):

`https://dune-atlas-usage.<your-subdomain>.workers.dev/check?key=<CSV key>`

The page lists, for each of the three sources, Cloudflare's settings for your account (whether the
dataset is enabled, which fields are available, how far back it reaches, the widest time range per query)
[Settings node], and a trial collection of the day three days ago (number of rows or the error). Nothing is
written. Expected results and what to do:

- `data_host`: rows by country. An error here means the token lacks Zone Analytics Read for `geomorphlab.org`.
- `zone_daily`: one row, or an error if the daily dataset or unique addresses are not on the free plan (section 2). There is no free substitute.
- `web_analytics`: rows by country once Web Analytics is switched on for `map.geomorphlab.org` and the site has had visits. If it reports an unknown field `requestHost`, set `WEB_ANALYTICS_SITE_TAG` in `wrangler.toml` to the Web Analytics site tag (32 characters; it differs from the token in the page snippet; where the dashboard shows it is not verified) and run `npx wrangler deploy` again.

### Step 8. Copy the weeks since launch (back-fill)

The data host figures go back at least 31 days [GraphQL limits]. The site went live about 13 October
2026, so do this before about 13 November 2026 to keep the series from launch. Each call collects up to
10 days:

`https://dune-atlas-usage.<your-subdomain>.workers.dev/pull?key=<CSV key>&from=2026-10-13&to=2026-10-22`

then `from=2026-10-23&to=2026-11-01`, and so on up to yesterday. Each call shows the outcome per day and
source. Days older than Cloudflare keeps give errors and can be ignored.

### Step 9. Switch on counting in the atlas

The atlas sends messages only when it is built with `VITE_USAGE_URL` set. Two changes, then a release:

1. **About text first.** The privacy line in About (`PRIVACY_NOTE` in `app/src/core/ui/layerPanel.ts`)
   currently mentions page visits only. It should also say that downloads are counted by country, for
   example: "To understand how the atlas is used, we count page visits and downloads by country. No
   cookies are set and no IP addresses are kept." (The exact wording is your decision; the test in
   `app/tests/webanalytics.test.ts` checks it.)
2. **The counter address.** In `.github/workflows/ci.yml`, add to the `env` of both build steps (Earth and
   Mars):
   `VITE_USAGE_URL: "https://dune-atlas-usage.<your-subdomain>.workers.dev/event"`
   This address is not a secret.

To try it before release: run the atlas preview at `http://127.0.0.1:5173` with `VITE_USAGE_URL` set,
download something, and look for a `counter-preview` row in the CSV.

## 4. Downloading the numbers

- **All figures**: `https://dune-atlas-usage.<your-subdomain>.workers.dev/usage.csv?key=<CSV key>`
  (file `dune-atlas-usage-<date>.csv`). Opens in Excel or Google Sheets.
- **Collection log**: `…/status.csv?key=<CSV key>`: one row per day and source with `ok` or `error`, the
  number of rows and Cloudflare's error text. Look at it now and then; the newest days are at the top.

The key can also be sent as a header instead of in the address (it then does not appear in the browser
history): `curl -H "Authorization: Bearer <CSV key>" -o usage.csv https://…/usage.csv`.

Columns of `usage.csv`: `date` (UTC), `country` (two-letter code, or `all`), `body` (`earth`, `mars` or
`all`), `measure`, `value`, `unit` (`count` or `bytes`), `source`, `sample_interval`.

| `measure` | `source` | Meaning |
|---|---|---|
| `export_count:<type>` | `counter` (or `counter-preview`) | number of downloads (or copies) of that type |
| `export_bytes:<type>` | `counter` | total size of the files saved, bytes (0 for copies) |
| `data_host_requests`, `data_host_bytes` | `data_host` | section 1 |
| `unique_ips_zone` | `zone_daily` | section 2: do not add days together |
| `visits`, `page_views` | `web_analytics` | section 1 |

Running totals (cumulative downloads, total gigabytes) are sums in the spreadsheet
(1 GB = 1,000,000,000 bytes). The database can also be browsed in the dashboard (**Storage & databases**,
**D1 SQL database**).

## 5. Maintenance

**Token renewal (every 12 months).** Two weeks before the token's end date: create a new token with the
same four permissions (step 2), run `npx wrangler secret put CF_API_TOKEN` from `workers/usage/` with the
new token, then delete the old token in **My Profile**, **API Tokens**.

**If the token expires** (or is deleted): the daily copy of Cloudflare's figures stops, and `status.csv`
shows an error for every source from that day. Download counting and the CSV links keep working (they do
not use the token). After renewal, use `/pull` (step 8) for the missed days. Data host days older than 31
days, and Web Analytics days older than six months, cannot be recovered.

**Other checks**

- If the atlas's export file names change, `app/src/core/usage.ts` must still recognise them; the test
  `app/tests/usage.test.ts` builds the real names and fails if one is no longer recognised.
- A new export type needs the same name added in `app/src/core/usage.ts` and
  `workers/usage/src/events.ts`; a test checks that the two lists agree.
- The counter's own tests: `cd workers/usage && npm test` (and `npm run typecheck`). They run on your
  computer with a local SQLite database in place of D1 and a fake in place of Cloudflare's API.
- D1 keeps 7 days of "Time Travel" restore points on the free plan [D1 limits].

**Weekly backup.** The private repository `geomorphlab/dune-atlas-usage` copies `usage.csv` and `status.csv`
every Monday at 04:41 UTC (GitHub Actions workflow "Weekly usage backup"; it can also be run by hand from the
repository's Actions tab) and commits them, so the repository's history keeps every week. It reads the CSV key
from the repository secret `CSV_KEY`: if the key is changed, update that secret too. GitHub emails the owner
if a run fails. First run: 15 October 2026.

## 6. Sources

Cloudflare documentation pages, with the "last updated" date printed on each page; all read on 15 October 2026.

- [About Cloudflare Analytics] https://developers.cloudflare.com/analytics/faq/about-analytics/ (2 Oct 2026)
- [Account API tokens] https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/ (28 Sep 2026)
- [Create API token] https://developers.cloudflare.com/fundamentals/api/get-started/create-token/ (20 Apr 2026)
- [Cron Triggers] https://developers.cloudflare.com/workers/configuration/cron-triggers/ (4 Sep 2026)
- [D1 limits] https://developers.cloudflare.com/d1/platform/limits/ (21 Apr 2026)
- [D1 Wrangler commands] https://developers.cloudflare.com/d1/wrangler-commands/ (21 Apr 2026)
- [D1 get started] https://developers.cloudflare.com/d1/get-started/ (25 Aug 2026)
- [Datasets] https://developers.cloudflare.com/analytics/graphql-api/features/data-sets/ (23 Apr 2026)
- [Find account and zone IDs] https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/ (3 Aug 2026)
- [GraphQL limits] https://developers.cloudflare.com/analytics/graphql-api/limits/ (2 Oct 2026)
- [GraphQL API token] https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/ (23 Apr 2026)
- [Hostname tutorial] https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/ (23 Apr 2026)
- [Request] https://developers.cloudflare.com/workers/runtime-apis/request/ (2 Jul 2026)
- [Sampling] https://developers.cloudflare.com/analytics/graphql-api/sampling/ (23 Apr 2026)
- [Secrets] https://developers.cloudflare.com/workers/configuration/secrets/ (3 Jul 2026)
- [Settings node] https://developers.cloudflare.com/analytics/graphql-api/features/discovery/settings/ (23 Apr 2026)
- [Token permissions] https://developers.cloudflare.com/fundamentals/api/reference/permissions/ (12 Oct 2026)
- [Token templates] https://developers.cloudflare.com/fundamentals/api/reference/template/ (20 Apr 2026)
- [Web Analytics FAQ] https://developers.cloudflare.com/web-analytics/faq/ (14 Jul 2026)
- [Workers limits] https://developers.cloudflare.com/workers/platform/limits/ (12 Oct 2026)
- [Workers pricing] https://developers.cloudflare.com/workers/platform/pricing/ (2 Oct 2026)
- [workers.dev] https://developers.cloudflare.com/workers/configuration/routing/workers-dev/ (22 Sep 2026)
- [Wrangler configuration] https://developers.cloudflare.com/workers/wrangler/configuration/ (12 Oct 2026)
- [Wrangler environment variables] https://developers.cloudflare.com/workers/wrangler/system-environment-variables/ (1 Oct 2026)

**Not verified** (checked only when the counter runs with your token): the free-plan availability of
`httpRequests1dGroups` with unique addresses; the Web Analytics filter fields `requestHost` and `bot`
(the field names follow Cloudflare's GraphQL schema as used by its dashboard, not a documentation page);
whether the free plan's largest page size allows the 1,000-row limit the queries ask for (step 7 shows
`maxPageSize`); whether a daily run stays under 10 ms of CPU time; whether Wrangler needs extra read
permissions on the token; how much ad-blockers reduce the counts.


## Update (15 October 2026): own address, plain path, dashboard

- **Address.** The counter also answers at `https://api.geomorphlab.org` (a custom domain of the Worker, set in
  `wrangler.toml` `routes`; Cloudflare creates the DNS record on `npx wrangler deploy`). The atlas sends to
  `https://api.geomorphlab.org/v1/n`. Content blockers stopped messages to `*.workers.dev/event` in testing
  (`ERR_BLOCKED_BY_CLIENT`); `/event` and the workers.dev address still work.
- **Request type.** The atlas sends an ordinary `fetch` with `keepalive` instead of `navigator.sendBeacon`
  (blockers often stop every beacon); the beacon is used only where `fetch` is missing.
- **Dashboard.** `https://api.geomorphlab.org/dashboard?key=<CSV key>`: visits per day (Earth, Mars), cumulative
  downloads by type, data served per day, unique IP addresses per day (whole domain) and a country table, for
  the last 30 days, 90 days, year or all; it reads `/usage.csv` in the browser and loads no other scripts.
  Bookmark it; nothing needs to be run.
