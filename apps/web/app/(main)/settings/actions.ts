"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { disconnectGithubAccount } from "@/lib/github/user";

export async function disconnectGithub(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    return;
  }
  await disconnectGithubAccount(userId);
  revalidatePath("/settings");
}
