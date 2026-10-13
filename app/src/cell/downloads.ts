// Download helpers for a clicked cell: citation text and the browser download trigger. The data
// downloads (NetCDF, CSV bundle) are built in ./export.ts.
import { CELL_SOURCE_IDS, citationSources, citationText } from "./citation";
import { datasetInfo } from "./datasetinfo";

export function citationFile(cell?: { iy: number; ix: number; lat: number; lon: number }, datasetId?: string): string {
  const ds = datasetInfo(datasetId);
  return citationText(cell ? `Dune Atlas (map.geomorphlab.org), ${ds.name} ${ds.resolution} cell ${cell.iy},${cell.ix} (${cell.lat} N, ${cell.lon} E)` : "", citationSources(CELL_SOURCE_IDS, datasetId));
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
}
