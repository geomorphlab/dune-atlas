#!/usr/bin/env bash
# CI-like check from a clean export (as .github/workflows/deploy.yml on ubuntu-latest): no notes/,
# no staging/, fresh `npm ci`, then validate-registry (+ :mars), test (+ test:mars), build, build:mars
# with VITE_BASE=/mars/ copied to dist/mars (the Pages layout).
#   npm run test:ci            # HEAD plus uncommitted changes to tracked files (git stash create)
#   npm run test:ci -- <ref>   # any commit / tag
# Set CI_NODE=/path/to/node22/bin to run with the CI Node version (deploy.yml: node-version 22).
set -euo pipefail
repo="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
ref="${1:-$(git -C "$repo" stash create)}"
ref="${ref:-HEAD}"
tmpbase="$(cd "${TMPDIR:-/tmp}" && pwd)"
tmp="$(mktemp -d "$tmpbase/dune-atlas-ci.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT
git -C "$repo" archive "$ref" | tar -x -C "$tmp"
cd "$tmp/app"
[ -n "${CI_NODE:-}" ] && export PATH="$CI_NODE:$PATH"
echo "ci: $(git -C "$repo" rev-parse --short "$ref") in $tmp, node $(node --version)"
test ! -e "$tmp/staging" && test ! -e "$tmp/notes" || { echo "ci: export contains staging/ or notes/"; exit 1; }
# reuse the repo's npm cache if present (offline-friendly); CI itself uses actions/setup-node's cache
export npm_config_cache="${npm_config_cache:-$repo/app/.npm-cache}"
npm ci --prefer-offline --no-audit --no-fund
npm run validate-registry
npm run validate-registry:mars
CI=true npm test
CI=true npm run test:mars
# list what was skipped (fixture-dependent tests: staging/ is not in git)
CI=true npx vitest run --reporter=verbose 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^\s+↓' | sed 's/^ */ci: skipped: /' || true
VITE_DATA_BASE="https://data.geomorphlab.org" npm run build
VITE_BODY=mars VITE_BASE=/mars/ VITE_DATA_BASE="https://data.geomorphlab.org" VITE_SITE_URL="https://map.geomorphlab.org/mars/" npm run build:mars
rm -rf dist/mars && cp -R dist-mars dist/mars
test -f dist/index.html && test -f dist/mars/index.html
grep -q 'src="/mars/assets/' dist/mars/index.html || { echo "ci: Mars assets not under /mars/"; exit 1; }
# tab icon (app/public): served at / and /mars/ in the Pages layout, linked under each build's base
for f in favicon.ico favicon-32.png apple-touch-icon.png; do test -f "dist/$f" && test -f "dist/mars/$f" || { echo "ci: $f missing in dist/ or dist/mars/"; exit 1; }; done
grep -q 'href="/favicon.ico"' dist/index.html && grep -q 'href="/mars/favicon.ico"' dist/mars/index.html || { echo "ci: icon links not under the base"; exit 1; }
grep -q '<title>MGL - Dune Atlas</title>' dist/index.html && grep -q '<title>MGL - Dune Atlas</title>' dist/mars/index.html || { echo "ci: page title"; exit 1; }
echo "ci: OK"
