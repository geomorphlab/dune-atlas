// Download helpers for a clicked cell: citation text and the browser download trigger. The data
// downloads (NetCDF, CSV bundle) are built in ./export.ts.
import { CELL_SOURCE_IDS, citationSources, citationText } from "./citation";
import { datasetInfo } from "./datasetinfo";

/** "23.25° S, 15.00° E": cell centre with hemisphere letters, 2 decimals (never "-23.25 N") */
export function latLonText(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v < 0 ? neg : pos}`;
  return `${f(lat, "N", "S")}, ${f(lon, "E", "W")}`;
}

/** Citation TXT: the cell (centre, wind dataset and record) and the slider setting the values were taken at
 *  (`setting`, e.g. "threshold friction velocity u*,th = 0.15 m/s"), then the sources. */
export function citationFile(cell?: { iy: number; ix: number; lat: number; lon: number }, datasetId?: string, setting?: string): string {
  const ds = datasetInfo(datasetId);
  const head = cell ? [
    `Dune Atlas (map.geomorphlab.org), ${ds.name} ${ds.resolution} cell ${cell.iy},${cell.ix}, centre ${latLonText(cell.lat, cell.lon)}`,
    `Wind dataset: ${ds.name} ${ds.resolution}, ${ds.period}`,
    ...(setting ? [`Values at ${setting}`] : []),
  ].join("\n") : "";
  return citationText(head, citationSources(CELL_SOURCE_IDS, datasetId));
}

/** document event of every download (detail: { name }): the page confirms it (ui/tools.ts) */
export const DOWNLOAD_EVENT = "duneatlas:download";
export function announceDownload(name: string): void {
  try { globalThis.document?.dispatchEvent(new CustomEvent(DOWNLOAD_EVENT, { detail: { name } })); } catch { /* no DOM */ }
}

export function triggerDownload(name: string, data: string | Uint8Array, mime: string): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announceDownload(name);
}
