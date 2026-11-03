import type { Metadata } from "next";
import { listRedemptionCodes } from "@westride/db/cloud";
import { PageFrame } from "../page-frame";
import { CodesTable, IssueCodeButton, type CodeRow } from "./codes-panel";

export const metadata: Metadata = { title: "Redemption codes" };

export const dynamic = "force-dynamic";

/** The list as the table shows it, judged against the time of the request. */
async function loadCodeRows(): Promise<CodeRow[]> {
  const codes = await listRedemptionCodes();
  const now = Date.now();
  return codes.map((code) => ({
    id: code.id,
    code: code.code,
    amountMicros: code.amountMicros,
    maxRedemptions: code.maxRedemptions,
    redemptionCount: code.redemptionCount,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    isActive: code.isActive,
    isExpired: code.expiresAt !== null && code.expiresAt.getTime() <= now,
    isExhausted: code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions,
    note: code.note,
    createdAt: code.createdAt.toISOString(),
  }));
}

export default async function CodesPage() {
  const rows = await loadCodeRows();

  return (
    <PageFrame
      title="Redemption codes"
      description="Codes add WeStride Cloud funds when a member redeems one on their Cloud page. Each member can redeem a given code once."
      actions={<IssueCodeButton />}
    >
      <CodesTable rows={rows} />
    </PageFrame>
  );
}
