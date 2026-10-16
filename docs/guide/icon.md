# Atlas icon

`app/public/favicon.svg` is the source of the icon of both atlases (October 2026). It shows a circle of random-point
Voronoi cells with white seams, in four colours of the map's magma scale (#721f81, #b73779, #f1605d, #feb078). No two
touching cells share a colour. A black ring surrounds the circle, and the barchan of the Monash Geomorphology Lab logo
sits on top as a black silhouette at 60 % of the circle. The silhouette was traced from the high-resolution lab logo.

How it was made:
- **Cells:** 9 random points (seed 3) in the circle, two half-steps of Lloyd relaxation, and a Voronoi diagram
  (scipy.spatial), clipped to the circle in the SVG.
- **Colours:** an exhaustive four-colouring, with the bottom-right cell in the palest colour (PI's choice).
- **Barchan:** the outline of the lab logo, with its inner edge smoothed by a polynomial where the sand grains overlap it.

The PNG and ICO files are rendered from the SVG. Run this from `app/`:

    node scripts/build-icons.mjs

It writes four files:
- `favicon.ico`: 16, 32 and 48 px;
- `favicon-32.png`;
- `icon-192.png`;
- `apple-touch-icon.png`: 180 px on white, because iOS fills transparency with black.

`index.html` links the ICO, the SVG, the 32 px PNG and the Apple icon, relative to the build base, so `/mars/`
gets the same files.
