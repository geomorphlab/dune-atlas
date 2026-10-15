// @vitest-environment happy-dom
// Rendered text of the mars atlas for translation (tests/i18ncollectlib.ts). With I18N_COLLECT=1 (npm run i18n)
// it writes src/i18n/collected-mars.json; otherwise it lists texts not yet collected (warning only).
import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { collectRendered } from "../i18ncollectlib";

it("rendered text of the mars atlas is collected for translation", async () => {
  const file = path.resolve(__dirname, "../../src/i18n/collected-mars.json");
  const got = await collectRendered("mars");
  if (process.env.I18N_COLLECT) { fs.writeFileSync(file, JSON.stringify(got, null, 1) + "\n"); return; }
  const have = new Set((fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) as { en: string }[] : []).map((x) => x.en));
  const missing = got.filter((g) => !have.has(g.en));
  if (missing.length) console.warn(`${missing.length} rendered text(s) not yet collected for translation (run npm run i18n)`);
}, 60000);
