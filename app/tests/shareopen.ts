// Opening state of a share-link code, as main.ts resolves it (no vitest import: also used by
// tools/checks/make-share-corpus.ts).
import type { Registry } from "../src/core/registry/types";
import { shareFromHash } from "../src/core/share/shortlink";
import { initialAppState, resolveInitialState } from "../src/core/defaultview";
import { selectDataset } from "../src/core/registry/merge";

/** decoded state and opening app state of a link code (as main.ts resolves it) */
export function openShareCode(reg: Registry, code: string) {
  const decoded = shareFromHash(`#v=${code}`);
  const start = resolveInitialState(decoded, {}, reg.defaultDataset, undefined);
  const ds = selectDataset(reg, start.dataset)?.id ?? "";
  return { decoded, app: JSON.parse(JSON.stringify(initialAppState(reg, start.url, ds))) as unknown };
}
