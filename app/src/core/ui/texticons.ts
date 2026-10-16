// Icons inside running text (help panel, guided tour): {icon_<name>} in the English and in every translation
// is drawn as the button's own symbol, so the text shows what the reader sees instead of naming the picture
// ("mortarboard", "crosshair"). Each icon carries the button's label for screen readers (role="img").
// {icon_...} is a placeholder like {name}: the translation tests require the same set as the English.
import { t, trc } from "../../i18n";
import { BODY, bodyName, otherBody } from "../body";
import { CENTRE_ICON } from "../map/centre";
import { escapeHtml } from "../util/format";
import { TOOL_ICONS } from "./icons";
import { TEXT_ICON } from "./texticonwords";
export { TEXT_ICON };

/** name -> [svg, accessible label (the button's own aria-label, translated)] */
function icons(): Record<string, [string, string]> {
  return {
    help: [TOOL_ICONS.help, t("tools.help")],
    concepts: [TOOL_ICONS.concepts, t("tools.concepts")],
    share: [TOOL_ICONS.share, t("tools.share")],
    camera: [TOOL_ICONS.camera, t("tools.export")],
    region: [TOOL_ICONS.region, trc("Download a region")],
    planet: [TOOL_ICONS.planet, trc(`Switch to ${bodyName(otherBody(BODY))}`)],
    centre: [CENTRE_ICON, trc("Centre map on this cell")],
  };
}

export const TEXT_ICON_NAMES = ["help", "concepts", "share", "camera", "region", "planet", "centre"] as const;

/** html with every {icon_<name>} replaced by the inline icon (unknown names are left as they are) */
export function withIcons(html: string): string {
  if (!html.includes("{icon_")) return html;
  const all = icons();
  return html.replace(TEXT_ICON, (m, k: string) => {
    const ic = all[k];
    if (!ic) return m;
    return `<span class="text-icon" role="img" aria-label="${escapeHtml(ic[1])}" title="${escapeHtml(ic[1])}" translate="no" data-i18n-attrs="no">${ic[0]}</span>`;
  });
}
