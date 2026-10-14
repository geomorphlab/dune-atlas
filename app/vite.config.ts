import { configDefaults, defineConfig } from "vitest/config";
import { bodyPlugin } from "./scripts/body-plugin";

// Body switch (docs/mars-app.md): VITE_BODY=mars builds the Mars atlas (module substitutions and
// source patches from src/mars/build.ts, output dist-mars/, tests tests/mars/); anything else is the
// Earth atlas, built exactly as before (no plugin).
const MARS = process.env.VITE_BODY === "mars";

// Served from the root of map.geomorphlab.org (custom domain on GitHub Pages).
export default defineConfig({
  base: MARS ? (process.env.VITE_BASE || "/") : "/",
  plugins: MARS ? [bodyPlugin("mars")] : [],
  server: {
    port: 5173,
    // registry/*.yaml and registry/qsat_field_metadata.json live one level above app/
    fs: { allow: [".."] },
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
