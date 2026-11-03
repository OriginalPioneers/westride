// ---------------------------------------------------------------------------
// WeStride Cloud: balances, the ledger, provider preference, and codes.
//
// The database driver (neon-http) has no interactive transactions, so every
// write here is a single statement that is safe to retry: inserts carry a
// unique reference and ignore conflicts, and the code counter is bumped
// with a guarded UPDATE ... RETURNING.
// ---------------------------------------------------------------------------
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  cloudAccounts,
  cloudCodeRedemptions,
  cloudLedgerEntries,
  cloudRedemptionCodes,
  type CloudAccount,
  type CloudCodeRedemption,
  type CloudLedgerEntry,
  type CloudLedgerKind,
  type CloudProviderPreference,
  type CloudRedemptionCode,
  type OwnSandboxProvider,
} from "./cloud-schema";

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function getCloudAccount(clerkUserId: string): Promise<CloudAccount | null> {
  const account = await getDb().query.cloudAccounts.findFirst({
    where: eq(cloudAccounts.clerkUserId, clerkUserId),
  });
  return account ?? null;
}

/** The account row, created on first touch. */
export async function ensureCloudAccount(clerkUserId: string): Promise<CloudAccount> {
  const db = getDb();
  await db.insert(cloudAccounts).values({ clerkUserId }).onConflictDoNothing();
  const account = await getCloudAccount(clerkUserId);
  if (!account) {
    throw new Error("The WeStride Cloud account could not be created.");
  }
  return account;
}

export async function getProviderPreference(clerkUserId: string): Promise<CloudProviderPreference> {
  const account = await getCloudAccount(clerkUserId);
  return account?.providerPreference ?? "OWN";
}

export async function setProviderPreference(
  clerkUserId: string,
  preference: CloudProviderPreference,
): Promise<CloudAccount> {
  const [account] = await getDb()
    .insert(cloudAccounts)
    .values({ clerkUserId, providerPreference: preference })
    .onConflictDoUpdate({
      target: cloudAccounts.clerkUserId,
      set: { providerPreference: preference, updatedAt: new Date() },
    })
    .returning();
  if (!account) {
    throw new Error("The provider preference could not be saved.");
  }
  return account;
}

/** Which of the member's own accounts hosts sandboxes when both are connected. Null until they connect one. */
export async function getSandboxProvider(clerkUserId: string): Promise<OwnSandboxProvider | null> {
  const account = await getCloudAccount(clerkUserId);
  return account?.sandboxProvider ?? null;
}

export async function setSandboxProvider(
  clerkUserId: string,
  provider: OwnSandboxProvider,
): Promise<void> {
  await getDb()
    .insert(cloudAccounts)
    .values({ clerkUserId, sandboxProvider: provider })
    .onConflictDoUpdate({
      target: cloudAccounts.clerkUserId,
      set: { sandboxProvider: provider, updatedAt: new Date() },
    });
}

export async function setStripeCustomerId(clerkUserId: string, stripeCustomerId: string): Promise<void> {
  await getDb()
    .insert(cloudAccounts)
    .values({ clerkUserId, stripeCustomerId })
    .onConflictDoUpdate({
      target: cloudAccounts.clerkUserId,
      set: { stripeCustomerId, updatedAt: new Date() },
    });
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/** USD in millionths. The sum of every ledger entry; zero for members with none. */
export async function getCloudBalanceMicros(clerkUserId: string): Promise<number> {
  const [row] = await getDb()
    .select({ balance: sql<string>`coalesce(sum(${cloudLedgerEntries.amountMicros}), 0)` })
    .from(cloudLedgerEntries)
    .where(eq(cloudLedgerEntries.clerkUserId, clerkUserId));
  return Number(row?.balance ?? 0);
}

export type LedgerEntryInput = {
  clerkUserId: string;
  kind: CloudLedgerKind;
  /** Positive credits the balance, negative spends it. */
  amountMicros: number;
  /** Unique. A second write with the same reference is ignored. */
  reference: string;
  description: string;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  computeSeconds?: number;
  vcpus?: number;
};

/**
 * Writes one ledger entry. Returns the entry, or null when one with the
 * same reference already exists, so callers can tell a retry from a first
 * write. Zero amounts are not recorded.
 */
export async function recordLedgerEntry(input: LedgerEntryInput): Promise<CloudLedgerEntry | null> {
  if (!Number.isFinite(input.amountMicros) || Math.round(input.amountMicros) === 0) {
    return null;
  }
  const [entry] = await getDb()
    .insert(cloudLedgerEntries)
    .values({
      clerkUserId: input.clerkUserId,
      kind: input.kind,
      amountMicros: Math.round(input.amountMicros),
      reference: input.reference,
      description: input.description,
      model: input.model ?? null,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      computeSeconds: input.computeSeconds ?? 0,
      vcpus: input.vcpus ?? 0,
    })
    .onConflictDoNothing({ target: cloudLedgerEntries.reference })
    .returning();
  return entry ?? null;
}

export async function hasLedgerEntry(reference: string): Promise<boolean> {
  const entry = await getDb().query.cloudLedgerEntries.findFirst({
    where: eq(cloudLedgerEntries.reference, reference),
    columns: { id: true },
  });
  return Boolean(entry);
}

export async function listLedgerEntries(clerkUserId: string, limit = 100): Promise<CloudLedgerEntry[]> {
  return getDb().query.cloudLedgerEntries.findMany({
    where: eq(cloudLedgerEntries.clerkUserId, clerkUserId),
    orderBy: [desc(cloudLedgerEntries.createdAt)],
    limit,
  });
}

export type CloudTotals = {
  /** Everything ever added: top-ups, codes, positive adjustments. */
  creditedMicros: number;
  aiSpentMicros: number;
  computeSpentMicros: number;
};

export async function sumCloudTotals(clerkUserId: string): Promise<CloudTotals> {
  const [row] = await getDb()
    .select({
      credited: sql<string>`coalesce(sum(case when ${cloudLedgerEntries.amountMicros} > 0 then ${cloudLedgerEntries.amountMicros} else 0 end), 0)`,
      ai: sql<string>`coalesce(sum(case when ${cloudLedgerEntries.kind} = 'AI_USAGE' then -${cloudLedgerEntries.amountMicros} else 0 end), 0)`,
      compute: sql<string>`coalesce(sum(case when ${cloudLedgerEntries.kind} = 'COMPUTE_USAGE' then -${cloudLedgerEntries.amountMicros} else 0 end), 0)`,
    })
    .from(cloudLedgerEntries)
    .where(eq(cloudLedgerEntries.clerkUserId, clerkUserId));
  return {
    creditedMicros: Number(row?.credited ?? 0),
    aiSpentMicros: Number(row?.ai ?? 0),
    computeSpentMicros: Number(row?.compute ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Redemption codes
// ---------------------------------------------------------------------------

export function normalizeRedemptionCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Letters and digits, dashes allowed, 4 to 64 characters, after normalising. */
export const REDEMPTION_CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;

/** Letters and digits that are hard to confuse, in groups of four: `K7QP-3RTX-WN2M`. */
export function generateRedemptionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
    if (i % 4 === 3 && i < bytes.length - 1) out += "-";
  }
  return out;
}

export type NewRedemptionCodeInput = {
  code: string;
  amountMicros: number;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  note?: string;
};

export async function createRedemptionCode(input: NewRedemptionCodeInput): Promise<CloudRedemptionCode> {
  const [code] = await getDb()
    .insert(cloudRedemptionCodes)
    .values({
      code: normalizeRedemptionCode(input.code),
      amountMicros: Math.round(input.amountMicros),
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ?? null,
      note: input.note ?? "",
    })
    .returning();
  if (!code) {
    throw new Error("The code could not be saved.");
  }
  return code;
}

export async function listRedemptionCodes(): Promise<CloudRedemptionCode[]> {
  return getDb().query.cloudRedemptionCodes.findMany({
    orderBy: [desc(cloudRedemptionCodes.createdAt)],
  });
}

export async function deactivateRedemptionCode(code: string): Promise<boolean> {
  return setRedemptionCodeActive(code, false);
}

/** Turns a code off or back on. A code that is off is refused as unknown. */
export async function setRedemptionCodeActive(code: string, isActive: boolean): Promise<boolean> {
  const updated = await getDb()
    .update(cloudRedemptionCodes)
    .set({ isActive })
    .where(eq(cloudRedemptionCodes.code, normalizeRedemptionCode(code)))
    .returning({ id: cloudRedemptionCodes.id });
  return updated.length > 0;
}

export async function getRedemptionCodeByCode(code: string): Promise<CloudRedemptionCode | null> {
  const row = await getDb().query.cloudRedemptionCodes.findFirst({
    where: eq(cloudRedemptionCodes.code, normalizeRedemptionCode(code)),
  });
  return row ?? null;
}

/** Who redeemed a code and when, newest first. */
export async function listCodeRedemptions(codeId: string): Promise<CloudCodeRedemption[]> {
  return getDb().query.cloudCodeRedemptions.findMany({
    where: eq(cloudCodeRedemptions.codeId, codeId),
    orderBy: [desc(cloudCodeRedemptions.createdAt)],
  });
}

export type RedeemResult =
  | { status: "ok"; amountMicros: number; entry: CloudLedgerEntry }
  | { status: "unknown" }
  | { status: "expired" }
  | { status: "exhausted" }
  | { status: "already-redeemed" };

/**
 * Redeems a code for a member. Three statements, each safe on its own:
 * take one use from the code (guarded by the limit), claim it for the
 * member (unique per member; a repeat hands the use back), then credit the
 * ledger with a reference derived from the pair, so a retry after a crash
 * between steps completes rather than doubles.
 */
export async function redeemCode(clerkUserId: string, rawCode: string): Promise<RedeemResult> {
  const db = getDb();
  const code = normalizeRedemptionCode(rawCode);
  if (!code) {
    return { status: "unknown" };
  }
  const existing = await db.query.cloudRedemptionCodes.findFirst({
    where: eq(cloudRedemptionCodes.code, code),
  });
  if (!existing || !existing.isActive) {
    return { status: "unknown" };
  }
  if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
    return { status: "expired" };
  }
  const reference = `code:${existing.id}:${clerkUserId}`;

  const priorRedemption = await db.query.cloudCodeRedemptions.findFirst({
    where: and(
      eq(cloudCodeRedemptions.codeId, existing.id),
      eq(cloudCodeRedemptions.clerkUserId, clerkUserId),
    ),
  });
  if (priorRedemption) {
    // A crash after claiming but before crediting leaves the member owed; finish it.
    const owed = await recordLedgerEntry({
      clerkUserId,
      kind: "CODE",
      amountMicros: existing.amountMicros,
      reference,
      description: `Code ${existing.code}`,
    });
    if (owed) {
      return { status: "ok", amountMicros: existing.amountMicros, entry: owed };
    }
    return { status: "already-redeemed" };
  }

  const now = new Date();
  const taken = await db
    .update(cloudRedemptionCodes)
    .set({ redemptionCount: sql`${cloudRedemptionCodes.redemptionCount} + 1` })
    .where(
      and(
        eq(cloudRedemptionCodes.id, existing.id),
        eq(cloudRedemptionCodes.isActive, true),
        or(isNull(cloudRedemptionCodes.expiresAt), gt(cloudRedemptionCodes.expiresAt, now)),
        or(
          isNull(cloudRedemptionCodes.maxRedemptions),
          sql`${cloudRedemptionCodes.redemptionCount} < ${cloudRedemptionCodes.maxRedemptions}`,
        ),
      ),
    )
    .returning({ id: cloudRedemptionCodes.id });
  if (taken.length === 0) {
    return { status: "exhausted" };
  }

  const claimed = await db
    .insert(cloudCodeRedemptions)
    .values({ codeId: existing.id, clerkUserId })
    .onConflictDoNothing()
    .returning({ codeId: cloudCodeRedemptions.codeId });
  if (claimed.length === 0) {
    // Lost a race with the same member's second click. Hand the use back.
    await db
      .update(cloudRedemptionCodes)
      .set({ redemptionCount: sql`greatest(${cloudRedemptionCodes.redemptionCount} - 1, 0)` })
      .where(eq(cloudRedemptionCodes.id, existing.id));
    return { status: "already-redeemed" };
  }

  const entry = await recordLedgerEntry({
    clerkUserId,
    kind: "CODE",
    amountMicros: existing.amountMicros,
    reference,
    description: `Code ${existing.code}`,
  });
  if (!entry) {
    return { status: "already-redeemed" };
  }
  return { status: "ok", amountMicros: existing.amountMicros, entry };
}
