// "Get the whole grid": how to read the public Zarr stores behind the atlas (Download & cite in the cell panel,
// and About). Every URL, variable name, threshold axis and licence comes from the registry for the selected
// wind dataset of this body, so a new dataset or planet needs no text here.
import { loadRegistry } from "../registry/load";
import { resolveSource, selectDataset } from "../registry/merge";
import type { LayerDef, Registry } from "../registry/types";
import { CONFIG } from "../config";
import { datasetInfo } from "../cell/datasetinfo";
import { fieldsLicence } from "../cell/citation";
import { escapeHtml } from "../util/format";
import { countCopy } from "../usage";
import { APP_HOOKS } from "@body/app";
import { PROFILE } from "@body/profile";

/** the licences of every store (repository file) */
export const DATA_LICENSE_URL = "https://github.com/geomorphlab/dune-atlas/blob/main/DATA_LICENSE.md";
export const STORAGE_LAYOUT_URL = "https://github.com/geomorphlab/dune-atlas/blob/main/docs/reference/storage-layout.md";
export const BULK_TEXT = { title: "Get the whole grid", copy: "Copy code", copied: "Copied" };

const REG = loadRegistry().registry;

/** the public data server of the body (the registry's; not a development override) */
const publicBase = (reg: Registry) => reg.dataBase;

export interface BulkGuide {
  datasetId: string;
  name: string;
  /** level 0 (full resolution) of each dataset-dependent map field: variable, title, units, URL */
  fields: { variable: string; title: string; units: string; url: string }[];
  /** per-cell store (Earth: wind histograms; Mars: hourly series) */
  cellStore: string;
  code: string;
  licence: string;
}

/** The guide's facts for one dataset (registry-driven). */
export function bulkGuide(datasetId?: string, reg: Registry = REG): BulkGuide {
  const ds = selectDataset(reg, datasetId);
  const prefix = ds?.prefix ?? "";
  const base = publicBase(reg);
  const isField = (l: LayerDef) => l.type === "zarr-field" && typeof l.source === "string" && l.source.includes("{dataset}") && !!l.variable;
  const fields = reg.layers.filter(isField).map((l) => ({
    variable: l.variable!, title: l.title, units: l.units ?? "",
    url: `${resolveSource(l.source as string, base, prefix)}/0`,
  }));
  const dp = fields.find((f) => f.variable === "dpm") ?? fields[0];
  const t = reg.threshold;
  const dim = t.dim ?? "ut";
  const v = t.values[t.defaultIndex];
  const ex = APP_HOOKS.exampleCell;
  const lon = ex.lon > 180 ? ex.lon - 360 : ex.lon;
  const r = (x: number) => Math.round(x * 10) / 10;
  const info = datasetInfo(ds?.id);
  const code = [
    `# ${info.name} ${info.resolution}: ${dp.title}, the whole grid at ${dim} = ${PROFILE.control.format(v)}`,
    `import numpy as np, xarray as xr, zarr        # zarr >= 3, with fsspec and aiohttp for https`,
    `url = "${dp.url}"   # level 0 = full resolution`,
    `z = {n: zarr.open_array(f"{url}/{n}", mode="r") for n in ("${dp.variable}", "${dim}", "y", "x")}`,
    `k = int(np.abs(z["${dim}"][:] - ${v}).argmin())`,
    `${dp.variable} = xr.DataArray(z["${dp.variable}"][k], dims=("y", "x"), coords={"y": z["y"][:], "x": z["x"][:]},`,
    `                   name="${dp.variable}", attrs={"units": "${dp.units}"})`,
    `${dp.variable}.sel(y=slice(${r(ex.lat + 2)}, ${r(ex.lat - 2)}), x=slice(${r(lon - 2)}, ${r(lon + 2)})).mean()   # e.g. a 4° box (y runs north to south)`,
  ].join("\n");
  return { datasetId: ds?.id ?? "", name: `${info.name} ${info.resolution}`, fields, cellStore: resolveSource(ds?.cellStore ?? CONFIG.cellStorePath, base, prefix), code, licence: fieldsLicence(ds?.id) };
}

/** HTML of the guide (a disclosure); `idBase` keeps ids unique where it appears twice */
export function bulkGuideHtml(datasetId?: string, idBase = "bulk"): string {
  const g = bulkGuide(datasetId);
  const base = publicBase(REG).replace(/\/+$/, "");
  const t = REG.threshold;
  const vars = g.fields.map((f) => `<code title="${escapeHtml(f.title)}">${escapeHtml(f.variable)}</code>`).join(", ");
  return `<details class="bulk-guide" id="${idBase}-guide"><summary>${BULK_TEXT.title}</summary>
<p>The atlas reads public Zarr (v3) stores on <a href="${escapeHtml(base)}/" target="_blank" rel="noopener">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a>, which anyone can read, e.g. with Python. The map fields of ${escapeHtml(g.name)} are one store per variable, each holding the field against the ${escapeHtml(t.label.toLowerCase().replace(/\s+\S+$/, ""))} (<code>${escapeHtml(t.dim ?? "ut")}</code>, ${t.values.length} values) and latitude <code>y</code> and longitude <code>x</code> (cell centres in degrees; x from −180 to 180°, east positive). Level <code>0</code> of each store is the full-resolution grid; levels 1, 2, … are coarser copies for the map.</p>
<pre class="bulk-code" id="${idBase}-code"><code>${escapeHtml(g.code)}</code></pre>
<p><button type="button" class="copy-code" data-copy="${idBase}-code">${BULK_TEXT.copy}</button></p>
<p>Variables (replace <code>${escapeHtml(g.fields.find((f) => f.variable === "dpm")?.variable ?? g.fields[0]?.variable ?? "")}</code> in the URL): ${vars}. Per-cell data of the cell panel: <code>${escapeHtml(g.cellStore)}</code> (layout: <a href="${STORAGE_LAYOUT_URL}" target="_blank" rel="noopener">storage-layout.md</a>).</p>
<p>Licence of these map fields: ${escapeHtml(g.licence)}. Licences of every store: <a href="${DATA_LICENSE_URL}" target="_blank" rel="noopener">DATA_LICENSE.md</a>. Please cite the sources listed under Download &amp; cite.</p>
</details>`;
}

/** wire the guide's copy buttons inside `root` (delegated; survives re-rendering) */
export function wireBulkGuide(root: HTMLElement) {
  root.addEventListener("click", (e) => {
    const b = (e.target as Element | null)?.closest?.("button.copy-code[data-copy]") as HTMLButtonElement | null;
    if (!b) return;
    const code = root.ownerDocument.getElementById(b.dataset.copy!)?.textContent ?? "";
    void navigator.clipboard?.writeText(code).then(() => { countCopy("copy-code"); b.textContent = BULK_TEXT.copied; setTimeout(() => { b.textContent = BULK_TEXT.copy; }, 1500); }, () => undefined);
  });
}
