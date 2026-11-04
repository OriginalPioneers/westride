import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { judgeClerkUserId } from "@/lib/judge-access";
import { JudgeAccess, type JudgeVisitor } from "./judge-access";

export const metadata: Metadata = {
  title: "Hackathon judge access",
  description:
    "Judges of the Meta Global AI Developer Hackathon can explore the live WeStride platform without signing up.",
};

export default async function JudgeAccessPage() {
  const judgeId = judgeClerkUserId();
  if (judgeId === null) {
    notFound();
  }
  const { userId } = await auth();
  const visitor: JudgeVisitor = userId === null ? "signed-out" : userId === judgeId ? "judge" : "other";
  return <JudgeAccess visitor={visitor} />;
}
