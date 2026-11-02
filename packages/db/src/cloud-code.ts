// ---------------------------------------------------------------------------
// WeStride Cloud redemption codes, for the WeStride team.
//
//   bun run cloud:code -- --amount 25 --code HACKATHON25 --uses 100 --expires 2026-12-31 --note "Judges"
//   bun run cloud:code -- --amount 10                      (random code, unlimited, never expires)
//   bun run cloud:code -- --list
//   bun run cloud:code -- --deactivate HACKATHON25
//   bun run cloud:code -- --amount 5 --target production
//
// --amount is in US dollars. Codes are upper case; members can type them in
// any case.
// ---------------------------------------------------------------------------
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRedemptionCode,
  deactivateRedemptionCode,
  listRedemptionCodes,
  normalizeRedemptionCode,
} from "./cloud";
import { databaseLabel, databaseUrl, dbTargetFromArgv, loadDbEnv } from "./load-env";
import { fail } from "./run";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = dbTargetFromArgv(process.argv);

try {
  loadDbEnv(packageDir, target);
} catch (error) {
  fail(error);
}

const args = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) return "";
  return value;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/** Letters and digits that are hard to confuse, in groups of four. */
function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
    if (i % 4 === 3 && i < 11) out += "-";
  }
  return out;
}

function usd(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

console.log(`WeStride Cloud codes on the ${target} database at ${databaseLabel(databaseUrl())}.`);

try {
  if (hasFlag("list")) {
    const codes = await listRedemptionCodes();
    if (codes.length === 0) {
      console.log("No codes yet.");
    }
    for (const code of codes) {
      const uses = code.maxRedemptions === null ? `${code.redemptionCount} used` : `${code.redemptionCount}/${code.maxRedemptions} used`;
      const expiry = code.expiresAt ? `expires ${code.expiresAt.toISOString().slice(0, 10)}` : "never expires";
      const state = code.isActive ? "active" : "inactive";
      console.log(`${code.code}  ${usd(code.amountMicros)}  ${uses}  ${expiry}  ${state}${code.note ? `  (${code.note})` : ""}`);
    }
    process.exit(0);
  }

  const deactivate = option("deactivate");
  if (deactivate !== undefined) {
    if (!deactivate) fail("--deactivate needs a code.");
    const done = await deactivateRedemptionCode(deactivate);
    console.log(done ? `Deactivated ${normalizeRedemptionCode(deactivate)}.` : "No such code.");
    process.exit(0);
  }

  const amountText = option("amount");
  if (amountText === undefined || amountText === "") {
    fail("Pass --amount <dollars>, --list, or --deactivate <code>.");
  }
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) {
    fail("--amount must be a dollar amount between 0 and 10,000.");
  }

  const usesText = option("uses");
  let maxRedemptions: number | null = null;
  if (usesText !== undefined && usesText !== "") {
    maxRedemptions = Number.parseInt(usesText, 10);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0) {
      fail("--uses must be a positive whole number.");
    }
  }

  const expiresText = option("expires");
  let expiresAt: Date | null = null;
  if (expiresText !== undefined && expiresText !== "") {
    expiresAt = new Date(`${expiresText}T23:59:59Z`);
    if (Number.isNaN(expiresAt.getTime())) {
      fail("--expires must be a date like 2026-12-31.");
    }
  }

  const codeText = option("code");
  const code = codeText ? normalizeRedemptionCode(codeText) : randomCode();
  if (!/^[A-Z0-9-]{4,64}$/.test(code)) {
    fail("--code may use letters, digits, and dashes only (4 to 64 characters).");
  }

  const created = await createRedemptionCode({
    code,
    amountMicros: Math.round(amount * 1_000_000),
    maxRedemptions,
    expiresAt,
    note: option("note") ?? "",
  });
  console.log(`Created ${created.code} worth ${usd(created.amountMicros)} each` +
    (maxRedemptions ? `, ${maxRedemptions} uses` : ", unlimited uses") +
    (expiresAt ? `, expires ${expiresText}` : "") +
    ".");
  console.log(`Members redeem it at /cloud.`);
  process.exit(0);
} catch (error) {
  fail(error);
}
