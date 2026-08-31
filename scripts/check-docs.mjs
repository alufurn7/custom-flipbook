import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const documents = [
  "README.md",
  "ROADMAP.md",
  "docs/API.md",
  "docs/THEMING.md",
  "docs/ACCESSIBILITY.md",
  "docs/MANUAL_VALIDATION.md",
  "docs/TROUBLESHOOTING.md"
];

const failures = [];
for (const relative of documents) {
  const absolute = resolve(root, relative);
  const markdown = await readFile(absolute, "utf8");
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#", 1)[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    try {
      await access(resolve(dirname(absolute), target));
    } catch {
      failures.push(`${relative}: missing link target ${target}`);
    }
  }
}

const api = await readFile(resolve(root, "docs/API.md"), "utf8");
for (const required of [
  "FlipbookEngine",
  "PageDefinition",
  "FlipbookOptions",
  "FlipbookSnapshot",
  "paperfold-flipbook/react",
  "paperfold-flipbook/json",
  "paperfold-flipbook/pdf"
]) {
  if (!api.includes(required)) failures.push(`docs/API.md: missing ${required}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Documentation check passed (${documents.length} files).`);
