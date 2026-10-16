// The paper behind both atlases and the AI-assistance notice (shown in About and written into every
// download of both atlases).

/** AI-assistance notice (verbatim; shown in About and written into every download). */
export const AI_NOTICE = "This page was created with assistance from Claude AI. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at a.gunn@monash.edu.";
/** AI-assistance notice of a downloaded file (NetCDF comment, README, metadata.json, citation text): names the website
 *  that produced the file, not "this page". `atlas` e.g. "Dune Atlas", `site` e.g. "map.geomorphlab.org". */
export const fileAiNotice = (atlas: string, site: string): string =>
  `This file was produced by, and downloaded from, the ${atlas} website (${site}). The website and the code that produced this file were created with assistance from Claude AI. I have reviewed the functionality and underlying data but if you notice any issues or errors please contact me at a.gunn@monash.edu.`;
export const PAPER_DOI = "10.1038/s41467-026-75466-y";
