# Infrastructure checklist (one-off, done by the site owner)

Goal: `map.geomorphlab.org` (app, GitHub Pages) and `data.geomorphlab.org` (data, Cloudflare R2),
with the existing Google Site and email **unchanged**. Total hands-on time ≈ 45 min plus DNS
propagation. Do the sections in order. Tick each box.

> **Fastest path to getting data uploaded:** the upload only needs **C.1, C.2 and C.6** (R2 enabled, bucket,
> API token) — no DNS change. Do those first and send me the account ID; I stream the data straight into
> the bucket (`pipeline/.../stream_upload.py`, no external drive needed). Sections A–B (DNS move) and
> C.3–C.5 (custom domain, CORS, cache) can follow; they are needed before the public map can read the data.

---
## A. Record what exists today (Squarespace) — do not skip
- [ ] Squarespace → Domains → geomorphlab.org → **DNS** → screenshot / copy every record
      (host, type, value, TTL). Expect: Google Sites records (e.g. `www` CNAME
      `ghs.googlehosted.com`), any apex A/forwarding, MX (email), TXT (SPF,
      `google-site-verification`, DKIM `google._domainkey`), any others.
- [ ] Note whether **domain forwarding** (geomorphlab.org → www.geomorphlab.org) is configured
      in Squarespace. This is a Squarespace feature and will stop working after the move; step B6
      recreates it.
- [ ] Note whether **DNSSEC** is on.

## B. Move DNS to Cloudflare (registrar stays Squarespace)
1. [ ] Create a free Cloudflare account (ideally a lab/shared login) → **Add a domain** →
       choose **Connect a domain** (moves DNS only; Squarespace stays the registrar) — *not*
       "Transfer a domain", which moves the registration and isn't needed → `geomorphlab.org` →
       quick-scan DNS records → **Free** plan.
2. [ ] Cloudflare imports records automatically. **Compare against list A line by line**; add
       anything missing (MX and TXT records especially).
3. [ ] Set Google-related records to **DNS only (grey cloud)**: `www` CNAME
       `ghs.googlehosted.com`, all MX, all TXT.
4. [ ] If DNSSEC is on at Squarespace: **turn it off first** and wait for it to clear (otherwise
       the domain breaks during the switch).
5. [ ] Squarespace → Domains → geomorphlab.org → Nameservers → **Use custom nameservers** → enter
       the two Cloudflare nameservers. Wait until Cloudflare shows the zone as **Active**
       (minutes to a few hours).
6. [ ] Apex redirect (if A showed forwarding): Cloudflare → DNS → add `A @ 192.0.2.1`
       **Proxied** (placeholder), then Rules → **Redirect Rules** → hostname equals
       `geomorphlab.org` → 301 to `https://www.geomorphlab.org${path}`.
7. [ ] Verify: `https://www.geomorphlab.org` loads the Google Site; `geomorphlab.org` redirects;
       send and receive a test email if the domain has email.
8. [ ] Optional: re-enable DNSSEC in Cloudflare (DNS → Settings) and add the DS record at
       Squarespace.

## C. R2 data bucket
1. [ ] Cloudflare → **R2** → enable (needs a payment method; first 10 GB/month free, then
       ≈ US$0.015/GB-month; **egress is free**). Expected use ≈ 30–37 GB → ≈ US$0.30–0.45/month.
2. [ ] Create bucket **`dune-atlas-data`** (location: Automatic, or Oceania hint `oc` if the
       audience is mostly in Australia).
3. [ ] Bucket → Settings → **Custom Domains** → connect `data.geomorphlab.org`.
       Leave the **r2.dev** URL **disabled** (it is rate-limited and not for production).
4. [ ] Bucket → Settings → **CORS policy** → paste:
```json
[
  {
    "AllowedOrigins": ["https://map.geomorphlab.org", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["range", "if-none-match", "if-modified-since"],
    "ExposeHeaders": ["content-range", "content-length", "accept-ranges", "etag"],
    "MaxAgeSeconds": 86400
  }
]
```
5. [ ] Cloudflare → `geomorphlab.org` → Caching → **Cache Rules** → new rule: hostname equals
       `data.geomorphlab.org` → **Eligible for cache**, Edge TTL **1 month**, Browser TTL
       **1 day**. (Data paths are versioned `/dune-atlas/v1/...` and never overwritten, so long
       caching is safe; a new data release goes to `/v2/`.)
       In the same rule, under Edge TTL → **Status code TTL**, add `404` → **No cache** (or 10 s) and
       `400-499`/`500-599` → **No cache**. Otherwise a request made before a file exists caches the 404 for
       the whole edge TTL. If that has already happened: Caching → Configuration → **Purge Cache** →
       Purge Everything (safe: the data are immutable and simply re-fetched).
6. [ ] R2 → **Manage API tokens** → Create token → **Object Read & Write**, limited to bucket
       `dune-atlas-data`, TTL e.g. 30 days. Then add it in this app under
       **Customize → Credentials → Add Credential → AWS** (Access Key ID, Secret Access Key) and
       tell me your Cloudflare **Account ID** (R2 overview page, right-hand side; it is not a secret).
       Do not paste the secret into chat. I will then ask for network access to
       `<ACCOUNT_ID>.r2.cloudflarestorage.com` (the S3 upload endpoint).

## D. GitHub Pages for the app

> Status 2026-10-13: D1 and D3 done (repo created and pushed, Pages source = GitHub Actions, custom
> domain `map.geomorphlab.org` set, first deploy green). Remaining: D2 (verified domain) and D4 (CNAME).
`geomorphlab` is a GitHub **user** account (not an organisation); the app is served from
`geomorphlab.github.io` under the custom domain.
1. [ ] Nothing to do: I can create the public repo `geomorphlab/dune-atlas` and push with the
       stored token (classic, `repo` scope, expires 2026-11-17). **The CI workflow file needs
       `workflow` scope**: either regenerate the token with `repo` + `workflow`
       (GitHub → Settings → Developer settings → Tokens (classic)) and update it under
       Customize → Credentials, or paste `.github/workflows/deploy.yml` in via the GitHub web
       editor after my first push.
2. [ ] GitHub → (geomorphlab account) Settings → **Pages → Verified domains** → add
       `geomorphlab.org` → add the TXT record it gives you in Cloudflare (prevents domain
       takeover).
3. [ ] Repo → Settings → **Pages** → Source **GitHub Actions** → Custom domain
       `map.geomorphlab.org` → after the cert is issued tick **Enforce HTTPS**.
4. [ ] Cloudflare DNS → `CNAME map → geomorphlab.github.io` → **DNS only (grey cloud)**.

## E. Google Sites (after the app is live; detailed in docs/guide/google-sites.md)
- New page "Dune Atlas" → Insert → **Embed → By URL** → `https://map.geomorphlab.org/?embed=1`
  → Whole page; plus a Button "Open full screen" → `https://map.geomorphlab.org`. Publish.
  Existing pages are untouched.

## Rollback
- DNS: set Squarespace nameservers back to **Use Squarespace nameservers**. Check the
  Squarespace DNS records against your list from A and re-enter any that are missing
  (whether Squarespace keeps them while custom nameservers are active is not guaranteed).
