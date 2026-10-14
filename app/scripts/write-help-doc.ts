// Write docs/reference/help-text.md from the Earth help text (src/ui/helpText.ts, src/bodies/earth/helpText.ts):  npm run help-doc
import fs from "node:fs";
import path from "node:path";
import { helpMarkdown } from "../src/ui/helpDoc";
const out = path.resolve(__dirname, "../../docs/reference/help-text.md");
fs.writeFileSync(out, helpMarkdown());
console.log(`wrote ${out}`);
