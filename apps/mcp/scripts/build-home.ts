import { createHash } from "node:crypto";
import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const homeDir = join(import.meta.dir, "..", "src", "home");
const outDir = join(homeDir, "dist");
const outFile = join(outDir, "assets.json");

export async function buildHome({ isDev = false } = {}) {
  const result = await Bun.build({
    entrypoints: [join(homeDir, "client.tsx")],
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
    throw new Error("Home page build failed.");
  }

  const js = result.outputs.find((output) => output.kind === "entry-point");
  const css = result.outputs.find((output) => output.path.endsWith(".css"));
  if (!js || !css) {
    throw new Error("Home page build did not emit both a script and a stylesheet.");
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

export function watchHome() {
  let timer: Timer | undefined;
  return watch(homeDir, { recursive: true }, (_event, filename) => {
    if (!filename || filename.startsWith("dist")) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const { version } = await buildHome({ isDev: true });
        console.log(`home page rebuilt (${version})`);
      } catch (error) {
        console.error(error);
      }
    }, 100);
  });
}

if (import.meta.main) {
  const { version, bytes } = await buildHome();
  console.log(
    `home page built (${version}, ${Math.round(bytes / 1024)} KB) -> ${outFile}`,
  );
}
