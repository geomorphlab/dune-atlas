// Write docs/help-text.md from src/ui/helpText.ts:  npm run help-doc
import fs from "node:fs";
import path from "node:path";
import { helpMarkdown } from "../src/ui/helpDoc";
const out = path.resolve(__dirname, "../../docs/help-text.md");
fs.writeFileSync(out, helpMarkdown());
console.log(`wrote ${out}`);
