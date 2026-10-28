import { defineConfig } from "drizzle-kit";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dbTargetFromArgv,
  loadDbEnv,
  migrationUrl,
} from "./src/load-env";

const packageDir = dirname(fileURLToPath(import.meta.url));

loadDbEnv(packageDir, dbTargetFromArgv(process.argv));

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl(),
  },
});
