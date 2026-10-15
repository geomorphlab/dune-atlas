// index.html texts of the Earth build (scripts/body-html.ts; no imports: read by vite.config.ts).
export const HTML = {
  /** tab title: the group site style, identical for Earth and Mars (the header shows the body name) */
  title: "MGL - Dune Atlas",
  description: "Interactive explorer for aeolian geomorphology on Earth and Mars. Developed by the Monash Geomorphology Lab.",
  noscript: "The Dune Atlas needs JavaScript and WebGL.",
  /** link previews (scripts/body-html.ts previewTags): one title, text and image (public/og-image.png) for the whole site */
  ogTitle: "Dune Atlas · Earth & Mars",
  url: "https://map.geomorphlab.org/",
  image: "https://map.geomorphlab.org/og-image.png",
  imageAlt: "Dune Atlas globe of Africa and Europe with sand-flux streamlines over drift potential",
};
