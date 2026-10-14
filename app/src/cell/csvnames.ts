// CSV column headers of the per-cell downloads (both builds; PI round 5 item 3). Every CSV header is plain
// ASCII snake_case [a-z0-9_]: no symbols, spaces, commas, quotes, slashes or asterisks, so the files open
// cleanly in Excel and are valid identifiers in pandas / R. One map for Earth and Mars: the same quantity
// has the same column name on both planets. The NetCDF variable names (short codes, unchanged) and the
// symbols / long names / units are listed per column in README.txt and metadata.json.
//
// Stable: a released name never changes meaning; new quantities get new names.

/** NetCDF variable name (and CsvColumn.name) -> CSV header. */
export const CSV_NAMES: Readonly<Record<string, string>> = {
  // threshold / grain-size axis
  ut: "ustar_threshold",
  d: "grain_diameter",
  // wind histogram (Earth)
  um_bin: "wind_speed_bin_centre",
  um_bin_lo: "wind_speed_bin_lower",
  um_bin_hi: "wind_speed_bin_upper",
  wind_hist: "hours",
  // direction bins (both)
  ua_bin: "direction_bin_centre",
  ua_bin_lo: "direction_bin_lower",
  ua_bin_hi: "direction_bin_upper",
  ua_bin_bearing_toward: "bearing_toward",
  ua_bin_bearing_from: "bearing_from",
  // flux rose (both)
  rose_mode: "rose_mode",
  flux_rose: "flux",
  // rose_16_sectors.csv (both; review U7)
  sector: "sector",
  sector_centre_bearing: "sector_centre_bearing",
  sector_start_bearing: "sector_start_bearing",
  sector_end_bearing: "sector_end_bearing",
  wind_from_percent: "wind_from_percent",
  sand_flux_toward: "sand_flux_toward",
  sand_flux_toward_percent: "sand_flux_toward_percent",
  // hourly series (Mars)
  hour: "hour",
  sol: "sol",
  ls: "solar_longitude",
  u: "wind_u",
  v: "wind_v",
  T: "air_temperature",
  rho: "air_density",
  z: "wind_height",
  // sand-flux fields (both)
  ab: "alpha_h",
  ae: "alpha_e",
  at: "alpha_t",
  ao: "alpha_o",
  rdpa: "rdd",
  dpm: "dp",
  rdpm: "rdp",
  qnlb: "q_along_net_h",
  qncb: "q_across_net_h",
  qalb: "q_along_abs_h",
  qacb: "q_across_abs_h",
  qnle: "q_along_net_e",
  qale: "q_along_abs_e",
  qace: "q_across_abs_e",
  qha_rdp_dp: "rdp_over_dp",
  sige_sigh: "sigma_e_over_sigma_h",
  qhab_nl_nc: "qhat_along_over_across_h",
  qhab_ac_nc: "qhat_across_abs_over_across_h",
  qhne_ac_nl: "qhat_across_abs_over_along_e",
  ufm: "ustar_mean_above_threshold_over_ustar_th",
  uft: "time_fraction_above_threshold",
  qhbf: "bed_mode_flux_fraction_above_threshold",
  qhef: "elongation_mode_flux_fraction_above_threshold",
  qsdiv: "flux_divergence",
};

export const CSV_NAME_RE = /^[a-z][a-z0-9_]*$/;

/** CSV header of a column (NetCDF name -> CSV_NAMES; unknown names are reduced to ASCII snake_case). */
export function csvName(name: string): string {
  const n = CSV_NAMES[name];
  if (n) return n;
  const s = name.normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(s) ? s : `x_${s || "col"}`;
}

/** UTF-8 byte-order mark: CSV files start with it so Excel decodes any remaining text cells as UTF-8. */
export const UTF8_BOM = "\ufeff";
