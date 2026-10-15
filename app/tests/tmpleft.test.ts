// @vitest-environment happy-dom
import { it } from "vitest";
import fs from "node:fs";
import { leftoverEnglish } from "./i18nleftover";
it("report", async () => { const r = await leftoverEnglish("fr"); fs.writeFileSync("/tmp/leftover.json", JSON.stringify(r, null, 1)); });
