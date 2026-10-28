import { neon } from "@neondatabase/serverless";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDistinctProductionUrl,
  databaseLabel,
  databaseUrl,
  dbTargetFromArgv,
  loadDbEnv,
  migrationUrl,
} from "./load-env";
import { fail, run } from "./run";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = dbTargetFromArgv(process.argv);

try {
  if (target === "production") {
    assertDistinctProductionUrl(packageDir);
  }
  loadDbEnv(packageDir, target);
} catch (error) {
  fail(error);
}

const label = databaseLabel(databaseUrl());
const confirmed = process.argv.includes("--yes");

if (!confirmed) {
  console.error(
    `Refusing to reset the ${target} database at ${label}.`,
  );
  console.error(
    "This drops every table, reapplies migrations, and reseeds catalogs.",
  );
  const command =
    target === "production"
      ? "bun run db:reset:production -- --yes"
      : "bun run db:reset -- --yes";
  console.error(`Re-run with --yes:\n  ${command}`);
  process.exit(1);
}

console.log(`Resetting the ${target} database at ${label}.`);

const sql = neon(migrationUrl());
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await sql`DROP SCHEMA IF EXISTS public CASCADE`;

console.log("Dropped schemas. Applying migrations.");

try {
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO public`;
  await run(
    process.execPath,
    ["src/drizzle-cli.ts", "migrate", "--target", target],
    packageDir,
  );
} catch (error) {
  console.error(
    "Reset failed after the wipe. Re-run the same command to finish.",
  );
  fail(error);
}

console.log("Seeding catalogs.");

try {
  await run(
    process.execPath,
    ["src/seed.ts", "--target", target],
    packageDir,
  );
} catch (error) {
  console.error(
    "Seed failed after migrations. Re-run the same command to finish.",
  );
  fail(error);
}

console.log(`Reset the ${target} database at ${label}.`);
