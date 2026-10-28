import { createHash } from "node:crypto";
import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const explorerDir = join(import.meta.dir, "..", "explorer");
const outDir = join(explorerDir, "dist");
const outFile = join(outDir, "assets.json");

export async function buildExplorer({ isDev = false } = {}) {
  const result = await Bun.build({
    entrypoints: [join(explorerDir, "main.tsx")],
    target: "browser",
    minify: !isDev,
    sourcemap: isDev ? "inline" : "none",
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        isDev ? "development" : "production",
      ),
    },
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error("Explorer build failed.");
  }

  const js = result.outputs.find((output) => output.kind === "entry-point");
  const css = result.outputs.find((output) => output.path.endsWith(".css"));
  if (!js || !css) {
    throw new Error("Explorer build did not emit both a script and a stylesheet.");
  }

  const [jsText, cssText] = await Promise.all([js.text(), css.text()]);
  const version = createHash("sha256")
    .update(jsText)
    .update(cssText)
    .digest("hex")
    .slice(0, 12);
  const json = JSON.stringify({ version, js: jsText, css: cssText });

  // Rewriting identical output would restart `bun --watch` for nothing.
  const previous = await readFile(outFile, "utf8").catch(() => null);
  if (previous !== json) {
    await mkdir(outDir, { recursive: true });
    await writeFile(outFile, json);
  }

  return { version, bytes: jsText.length + cssText.length };
}

export function watchExplorer() {
  let timer: Timer | undefined;
  return watch(explorerDir, { recursive: true }, (_event, filename) => {
    if (!filename || filename.startsWith("dist")) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const { version } = await buildExplorer({ isDev: true });
        console.log(`explorer rebuilt (${version})`);
      } catch (error) {
        console.error(error);
      }
    }, 100);
  });
}

if (import.meta.main) {
  const { version, bytes } = await buildExplorer();
  console.log(
    `explorer built (${version}, ${Math.round(bytes / 1024)} KB) -> ${outFile}`,
  );
}
