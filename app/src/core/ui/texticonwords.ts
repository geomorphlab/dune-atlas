// {icon_<name>} placeholders of the help and tour text (drawn by ui/texticons.ts); no imports, so the
// document generator (scripts/write-help-doc.ts) can use it.
export const TEXT_ICON = /\{icon_(\w+)\}/g;

/** plain-text form for documents (docs/reference/help-text.md): {icon_concepts} -> [Concepts icon] */
export function iconWords(text: string): string {
  const words: Record<string, string> = { help: "Help", concepts: "Concepts", share: "share", camera: "camera",
    region: "region", planet: "planet", centre: "centre-map" };
  return text.replace(TEXT_ICON, (m, k: string) => (k in words ? `[${words[k]} icon]` : m));
}
