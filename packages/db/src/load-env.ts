import { config, parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type DbTarget = "development" | "production";

const productionEnvFile = ".env.production";

export function dbTargetFromArgv(argv: readonly string[]): DbTarget {
  const flag = argv.indexOf("--target");
  if (flag >= 0) {
    return parseDbTarget(argv[flag + 1], "--target");
  }

  if (
    process.env.WESTRIDE_DB_TARGET === undefined ||
    process.env.WESTRIDE_DB_TARGET === ""
  ) {
    return "development";
  }

  return parseDbTarget(process.env.WESTRIDE_DB_TARGET, "WESTRIDE_DB_TARGET");
}

export function loadDbEnv(packageDir: string, target: DbTarget): void {
  const webDir = webEnvDir(packageDir);
  const devEnv = resolve(webDir, ".env");

  if (target === "development" && !existsSync(devEnv)) {
    throw new Error(
      "Missing apps/web/.env. Copy apps/web/.env.example and set DATABASE_URL.",
    );
  }

  config({ path: devEnv });

  if (target === "production") {
    const prodEnv = resolve(webDir, productionEnvFile);
    if (!existsSync(prodEnv)) {
      throw new Error(
        "Missing apps/web/.env.production. Copy apps/web/.env.production.example and set the production DATABASE_URL.",
      );
    }

    const result = config({ path: prodEnv, override: true });
    if (result.error) {
      throw new Error(
        `Could not read apps/web/.env.production: ${result.error.message}`,
      );
    }
  }

  process.env.WESTRIDE_DB_TARGET = target;
}

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to apps/web/.env, or to apps/web/.env.production for a production command.",
    );
  }
  return url;
}

/** Migrations and schema resets need a direct Neon connection. Pooled hosts include "-pooler". */
export function migrationUrl(): string {
  return (
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DIRECT_URL ??
    databaseUrl()
  ).replace("-pooler.", ".");
}

export function databaseLabel(url: string): string {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "") || "database";
  return `${parsed.hostname}/${name}`;
}

/**
 * Production reset must name its own database. Falling through to the
 * development URL would wipe development while reporting production.
 */
export function assertDistinctProductionUrl(packageDir: string): void {
  const webDir = webEnvDir(packageDir);
  const prodPath = resolve(webDir, productionEnvFile);
  if (!existsSync(prodPath)) {
    throw new Error(
      "Missing apps/web/.env.production. Copy apps/web/.env.production.example and set the production DATABASE_URL.",
    );
  }

  const prodUrl = readDatabaseUrl(prodPath);
  if (!prodUrl) {
    throw new Error(
      "apps/web/.env.production must set DATABASE_URL to the production database.",
    );
  }

  const devUrl = readDatabaseUrl(resolve(webDir, ".env"));
  if (devUrl && devUrl === prodUrl) {
    throw new Error(
      "Refusing to reset production because its DATABASE_URL matches apps/web/.env. Point apps/web/.env.production at the production database.",
    );
  }
}

function webEnvDir(packageDir: string): string {
  return resolve(packageDir, "../../apps/web");
}

function parseDbTarget(value: string | undefined, source: string): DbTarget {
  if (value === "development") return "development";
  if (value === "production") return "production";
  throw new Error(
    `Unknown database target "${value ?? ""}" from ${source}. Use development or production.`,
  );
}

function readDatabaseUrl(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const value = parse(readFileSync(path)).DATABASE_URL?.trim();
  return value || undefined;
}
