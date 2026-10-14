// Keyboard: Escape closes the cell panel only when the key is meant for it (otherwise a visitor closing a
// dropdown, an ⓘ popover or a slider in the layer panel with Escape lost the selected cell). Shared by both
// builds (src/main.ts).

/** Elements whose own Escape (close a list, leave a field) must not also close the cell panel. */
const OWN_ESCAPE = "#layer-panel, .info-popover, .tool-pop, .tour-pop, .start-tour-bubble, select, input, textarea, [contenteditable]";

/** true if this Escape keydown should close the cell panel */
export function escapeClosesCell(e: KeyboardEvent): boolean {
  if (e.key !== "Escape" || e.defaultPrevented) return false;
  const t = e.target as Element | null;
  if (t && typeof t.closest === "function" && t.closest(OWN_ESCAPE) && !t.closest("#cell-panel")) return false;
  return true;
}
