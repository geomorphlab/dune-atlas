// Markdown copy of all help / tour text for review (docs/reference/help-text.md; kept in sync by a test).
import { TOUR_FALLBACK, EXPORT_TEXT, HELP_ABOUT_LINK, HELP_BUTTON_LABEL, HELP_RESTART, HELP_SECTIONS, HELP_TITLE, SHARE_TEXT, TOUR_LABELS, TOUR_STEPS } from "./helpText";
import { iconWords } from "./texticonwords";

export function helpMarkdown(): string {
  const L: string[] = [
    "# Dune Atlas: help and tour text",
    "",
    "Generated from the Earth help text (`app/src/bodies/earth/helpText.ts`, shared labels in `app/src/core/ui/helpText.ts`) by `npm run help-doc` (do not edit here; a test checks that",
    "this file matches the source). `$...$` is rendered as inline maths.",
    "",
    "## Help button and panel",
    "",
    `- Button (top right, under the zoom buttons): \"?\", accessible label \"${HELP_BUTTON_LABEL}\"`,
    `- Panel title: ${HELP_TITLE}`,
    `- Button: ${HELP_RESTART}`,
    `- Link at the end: ${HELP_ABOUT_LINK}`,
    "",
  ];
  for (const s of HELP_SECTIONS) L.push(`### ${s.title}`, "", iconWords(s.body), "");
  L.push("## Guided tour", "", `Shown once on the first visit (not in embed mode unless \`?tour=1\`). Buttons: ${TOUR_LABELS.back} / ${TOUR_LABELS.next} (${TOUR_LABELS.done} on the last step) / ${TOUR_LABELS.skip}; counter \"${TOUR_LABELS.step(1, TOUR_STEPS.length)}\". Esc or a click outside skips.`, "");
  TOUR_STEPS.forEach((s, i) => L.push(`### ${i + 1}. ${s.title}`, "", `Highlights: \`${s.targets.join("` or `")}\``, "", iconWords(s.body), ""));
  L.push(`Fallback (example cell not loaded): ${TOUR_FALLBACK.cell}`, "");
  L.push("## Share", "", `- Button: ${SHARE_TEXT.button}`, `- Popover: ${SHARE_TEXT.title}; ${SHARE_TEXT.copy}; confirmation \"${SHARE_TEXT.copied}\"`, `- Note: ${SHARE_TEXT.note}`, "");
  L.push("## Export", "", `- Button: ${EXPORT_TEXT.button}`, `- Popover: ${EXPORT_TEXT.title}; ${EXPORT_TEXT.basemap}; ${EXPORT_TEXT.run}; while rendering \"${EXPORT_TEXT.working}\"`, `- Note: ${EXPORT_TEXT.note}`,
    `- Cell-panel plots: menu \"${EXPORT_TEXT.plotMenu}\" with ${EXPORT_TEXT.png}, ${EXPORT_TEXT.svg}`, "");
  return L.join("\n");
}
