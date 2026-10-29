import { eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  githubConnections,
  ideaGithubRepos,
  type GithubConnection,
  type IdeaGithubRepo,
} from "./schema";

export type GithubConnectionInput = {
  clerkUserId: string;
  githubUserId: number;
  login: string;
  avatarUrl: string | null;
  /** Already encrypted by the caller. */
  accessToken: string;
  accessTokenExpiresAt: Date | null;
  /** Already encrypted by the caller. */
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
};

export async function getGithubConnection(
  clerkUserId: string,
): Promise<GithubConnection | null> {
  const row = await getDb().query.githubConnections.findFirst({
    where: eq(githubConnections.clerkUserId, clerkUserId),
  });
  return row ?? null;
}

/** Creates the connection, or replaces it when the member reconnects. */
export async function saveGithubConnection(
  input: GithubConnectionInput,
): Promise<void> {
  const { clerkUserId, ...fields } = input;
  await getDb()
    .insert(githubConnections)
    .values(input)
    .onConflictDoUpdate({
      target: githubConnections.clerkUserId,
      set: { ...fields, updatedAt: new Date() },
    });
}

export async function updateGithubTokens(
  clerkUserId: string,
  tokens: Pick<
    GithubConnectionInput,
    | "accessToken"
    | "accessTokenExpiresAt"
    | "refreshToken"
    | "refreshTokenExpiresAt"
  >,
): Promise<void> {
  await getDb()
    .update(githubConnections)
    .set({ ...tokens, updatedAt: new Date() })
    .where(eq(githubConnections.clerkUserId, clerkUserId));
}

export async function deleteGithubConnection(
  clerkUserId: string,
): Promise<void> {
  await getDb()
    .delete(githubConnections)
    .where(eq(githubConnections.clerkUserId, clerkUserId));
}

export type IdeaGithubRepoInput = Omit<IdeaGithubRepo, "ideaId" | "createdAt">;

/** An idea links to one repository. Linking another replaces it. */
export async function linkIdeaGithubRepo(
  ideaId: string,
  input: IdeaGithubRepoInput,
): Promise<void> {
  await getDb()
    .insert(ideaGithubRepos)
    .values({ ideaId, ...input })
    .onConflictDoUpdate({
      target: ideaGithubRepos.ideaId,
      set: { ...input, createdAt: new Date() },
    });
}

export async function getIdeaGithubRepo(
  ideaId: string,
): Promise<IdeaGithubRepo | null> {
  const row = await getDb().query.ideaGithubRepos.findFirst({
    where: eq(ideaGithubRepos.ideaId, ideaId),
  });
  return row ?? null;
}
