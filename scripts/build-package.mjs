import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "lib");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  configFile: false,
  root: projectRoot,
  logLevel: "info",
  build: {
    outDir: outputDirectory,
    emptyOutDir: false,
    lib: {
      entry: {
        paperfold: resolve(projectRoot, "src/index.ts"),
        react: resolve(projectRoot, "src/react.tsx"),
        json: resolve(projectRoot, "src/json.ts"),
        pdf: resolve(projectRoot, "src/pdf.ts")
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "pdfjs-dist"],
      output: {
        exports: "named",
        chunkFileNames: "chunks/[name]-[hash].js"
      }
    }
  }
});

// Package only marked engine styles, leaving the magazine demo theme behind.
const sourceStyles = await readFile(resolve(projectRoot, "src/styles.css"), "utf8");
const styleSections = [...sourceStyles.matchAll(
  /\/\* paperfold-package:start \*\/([\s\S]*?)\/\* paperfold-package:end \*\//g
)];
if (styleSections.length === 0) throw new Error("No package stylesheet sections found");
await writeFile(
  resolve(outputDirectory, "paperfold.css"),
  `${styleSections.map((match) => match[1].trim()).join("\n\n")}\n`
);

const typeScriptCli = resolve(projectRoot, "node_modules/typescript/bin/tsc");
const declarationBuild = spawnSync(
  process.execPath,
  [typeScriptCli, "-p", resolve(projectRoot, "tsconfig.lib.json")],
  { cwd: projectRoot, stdio: "inherit" }
);

if (declarationBuild.status !== 0) {
  process.exit(declarationBuild.status ?? 1);
}
