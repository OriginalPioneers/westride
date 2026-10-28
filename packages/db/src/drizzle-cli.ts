import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dbTargetFromArgv, loadDbEnv } from "./load-env";
import { fail, run } from "./run";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = dbTargetFromArgv(process.argv);

try {
  loadDbEnv(packageDir, target);
} catch (error) {
  fail(error);
}

const drizzleArgs = process.argv.slice(2).filter((arg, index, all) => {
  if (arg === "--target") return false;
  return all[index - 1] !== "--target";
});

await run(process.execPath, ["x", "drizzle-kit", ...drizzleArgs], packageDir);
