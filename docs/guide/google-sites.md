# Adding the atlas to the Google Site

The atlas lives at `https://map.geomorphlab.org` (its own static site). The Google Site only shows
it in an embed, so all existing pages, editing and publishing work exactly as before.

1. Open the site in Google Sites editor → **Pages** → **+** → **New page** → name it
   `Dune Atlas` (it appears in the navigation automatically; drag to reorder).
2. On the new page: **Insert → Embed → By URL** → `https://map.geomorphlab.org/?embed=1` →
   choose **Whole page** → Insert.
3. Resize the embed box to the full content width and as tall as the editor allows (Google Sites
   caps the height; the embedded map scrolls/zooms inside it).
4. Above or below it: **Insert → Button** → label `Open full screen` → link
   `https://map.geomorphlab.org` (opens in a new tab; recommended on phones).
5. Optional: a short text box with the citation (Gunn 2026, Nat. Commun.,
   doi:10.1038/s41467-026-75466-y) and data DOI (10.5281/zenodo.20046812).
6. **Publish**.

Notes
- `?embed=1` compacts the header, starts with the layer panel collapsed, omits the browser
  full-screen button (blocked inside iframes) and adds an "Open full screen" link that carries the
  current view, layers, threshold and selected cell to the standalone page.
- Links to a specific view (location, layers, threshold, selected cell) can be copied from the full
  screen app's address bar and used anywhere, including as embed URLs.
- If the embed shows "refused to connect", check that `map.geomorphlab.org` serves over HTTPS
  (GitHub Pages → Enforce HTTPS) — Google Sites only embeds HTTPS pages.
