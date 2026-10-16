#!/usr/bin/env bash
# Pages layout of the two builds (run from app/ after both builds): Earth dist/ at the site root, Mars
# dist-mars/ copied to dist/mars/ with its assets under /mars/, tab icons under each base, page titles.
set -euo pipefail
rm -rf dist/mars && cp -R dist-mars dist/mars
test -f dist/index.html && test -f dist/mars/index.html
grep -q 'src="/mars/assets/' dist/mars/index.html || { echo "layout: Mars assets not under /mars/"; exit 1; }
for f in favicon.ico favicon-32.png apple-touch-icon.png; do test -f "dist/$f" && test -f "dist/mars/$f" || { echo "layout: $f missing in dist/ or dist/mars/"; exit 1; }; done
grep -q 'href="/favicon.ico?v=' dist/index.html && grep -q 'href="/mars/favicon.ico?v=' dist/mars/index.html || { echo "layout: icon links not under the base"; exit 1; }
grep -q '<title>MGL - Dune Atlas</title>' dist/index.html && grep -q '<title>MGL - Dune Atlas</title>' dist/mars/index.html || { echo "layout: page title"; exit 1; }
echo "layout: OK"
