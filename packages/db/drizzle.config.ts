import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(packageDir, ".env") });
config({ path: resolve(packageDir, "../../apps/web/.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to apps/web/.env before running migrations.",
  );
}

// Migrations need a direct Neon connection. Pooled hostnames include "-pooler".
const migrationUrl = (
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  databaseUrl
).replace("-pooler.", ".");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
