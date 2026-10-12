import { defineConfig } from "vitest/config";

// Served from the root of map.geomorphlab.org (custom domain on GitHub Pages).
export default defineConfig({
  base: "/",
  server: {
    port: 5173,
    // registry/*.yaml and registry/qsat_field_metadata.json live one level above app/
    fs: { allow: [".."] },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2000, // maplibre-gl alone is ~1 MB
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
