import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { bodyHtml, webAnalytics } from "./scripts/body-html";
import { HTML as EARTH_HTML } from "./src/bodies/earth/html";
import { HTML as MARS_HTML } from "./src/bodies/mars/html";

// Body switch (docs/guide/extending.md): VITE_BODY=mars builds the Mars atlas (per-body modules from
// src/bodies/mars/ through the @body alias, output dist-mars/, tests tests/mars/); anything else is the
// Earth atlas (src/bodies/earth/).
const MARS = process.env.VITE_BODY === "mars";
/** `@body/<module>` resolves to the per-body module of the built body (src/bodies/<body>/<module>.ts) */
const BODY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/bodies", MARS ? "mars" : "earth");

// Served from the root of map.geomorphlab.org (custom domain on GitHub Pages).
export default defineConfig({
  base: MARS ? (process.env.VITE_BASE || "/") : "/",
  plugins: [bodyHtml(MARS ? MARS_HTML : EARTH_HTML), webAnalytics()],
  resolve: { alias: [{ find: /^@body\//, replacement: `${BODY_DIR}/` }] },
  server: {
    port: 5173,
    // registry/*.yaml and registry/earth/qsat_field_metadata.json live one level above app/
    fs: { allow: [".."] },
    // Local preview against the live data without CORS: with VITE_DATA_BASE=http://<host>:<port>/r2 the dev
    // server forwards /r2/* to the data server (dev only; not used by builds).
    proxy: {
      "/r2": {
        target: process.env.PREVIEW_DATA_ORIGIN || "https://data.geomorphlab.org",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/r2/, ""),
      },
      // One local address for both planets, laid out as the live site: with PREVIEW_MARS_ORIGIN set (the
      // Mars dev server, run with VITE_BASE=/mars/), the Earth dev server forwards /mars/* to it (dev only).
      ...(!MARS && process.env.PREVIEW_MARS_ORIGIN
        ? { "^/mars(/|$)": { target: process.env.PREVIEW_MARS_ORIGIN, changeOrigin: true, ws: true } }
        : {}),
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2000, // maplibre-gl alone is ~1 MB
    ...(MARS ? { outDir: "dist-mars" } : {}),
  },
  test: {
    include: MARS ? ["tests/mars/**/*.test.ts"] : ["tests/**/*.test.ts"],
    exclude: MARS ? configDefaults.exclude : [...configDefaults.exclude, "tests/mars/**"],
    environment: "node",
    // shared CI runners are several times slower than a laptop (the default 5 s was hit there)
    testTimeout: 20000,
  },
});
