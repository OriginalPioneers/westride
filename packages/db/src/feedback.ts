import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import {
  feedback,
  feedbackComments,
  feedbackVotes,
  type Feedback,
  type FeedbackComment,
} from "./schema";

export type FeedbackSummary = Feedback & {
  voteCount: number;
  commentCount: number;
  /** Always false for a signed-out visitor. */
  viewerHasVoted: boolean;
};

export type FeedbackWithComments = FeedbackSummary & {
  /** Oldest first. */
  comments: FeedbackComment[];
};

export type FeedbackInput = {
  title: string;
  /** Markdown. */
  body: string;
};

export const FEEDBACK_SORTS = ["top", "newest", "oldest"] as const;

export type FeedbackSort = (typeof FEEDBACK_SORTS)[number];

export function isFeedbackSort(value: string): value is FeedbackSort {
  return (FEEDBACK_SORTS as readonly string[]).includes(value);
}

/** Who is looking. `null` is a signed-out visitor, who can still read. */
export type FeedbackViewer = { clerkUserId: string | null };

const ANYONE: FeedbackViewer = { clerkUserId: null };

const SIGN_IN_REQUIRED = "Sign in to do that.";

function requireUser(clerkUserId: string): string {
  const id = clerkUserId.trim();
  if (!id) {
    throw new Error(SIGN_IN_REQUIRED);
  }
  return id;
}

function feedbackQuery(viewer: FeedbackViewer) {
  const db = getDb();
  const votes = db
    .select({
      feedbackId: feedbackVotes.feedbackId,
      total: count().as("vote_count"),
    })
    .from(feedbackVotes)
    .groupBy(feedbackVotes.feedbackId)
    .as("vote_totals");
  const comments = db
    .select({
      feedbackId: feedbackComments.feedbackId,
      total: count().as("comment_count"),
    })
    .from(feedbackComments)
    .groupBy(feedbackComments.feedbackId)
    .as("comment_totals");
  const viewerVote = alias(feedbackVotes, "viewer_vote");

  const voteCount = sql<number>`coalesce(${votes.total}, 0)`.mapWith(Number);
  const commentCount = sql<number>`coalesce(${comments.total}, 0)`.mapWith(
    Number,
  );

  const query = db
    .select({
      ...getTableColumns(feedback),
      voteCount,
      commentCount,
      viewerHasVoted: sql<boolean>`${viewerVote.clerkUserId} is not null`,
    })
    .from(feedback)
    .leftJoin(votes, eq(votes.feedbackId, feedback.id))
    .leftJoin(comments, eq(comments.feedbackId, feedback.id))
    .leftJoin(
      viewerVote,
      viewer.clerkUserId
        ? and(
            eq(viewerVote.feedbackId, feedback.id),
            eq(viewerVote.clerkUserId, viewer.clerkUserId),
          )
        : sql`false`,
    );

  return { query, voteCount };
}

function orderFor(sort: FeedbackSort, voteCount: SQL): SQL[] {
  switch (sort) {
    case "newest":
      return [desc(feedback.createdAt)];
    case "oldest":
      return [asc(feedback.createdAt)];
    case "top":
      return [desc(voteCount), desc(feedback.createdAt)];
  }
}

export async function listFeedback(
  sort: FeedbackSort = "top",
  viewer: FeedbackViewer = ANYONE,
): Promise<FeedbackSummary[]> {
  const { query, voteCount } = feedbackQuery(viewer);
  return query.orderBy(...orderFor(sort, voteCount));
}

export async function getFeedback(
  id: string,
  viewer: FeedbackViewer = ANYONE,
): Promise<FeedbackWithComments | null> {
  const [rows, comments] = await Promise.all([
    feedbackQuery(viewer).query.where(eq(feedback.id, id)).limit(1),
    getDb().query.feedbackComments.findMany({
      where: eq(feedbackComments.feedbackId, id),
      orderBy: [asc(feedbackComments.createdAt)],
    }),
  ]);
  const [item] = rows;
  return item ? { ...item, comments } : null;
}

async function assertFeedbackExists(id: string): Promise<void> {
  const found = await getDb().query.feedback.findFirst({
    where: eq(feedback.id, id),
    columns: { id: true },
  });
  if (!found) {
    throw new Error(`Unknown feedback: ${id}`);
  }
}

export async function createFeedback(
  clerkUserId: string,
  input: FeedbackInput,
): Promise<{ id: string }> {
  const [created] = await getDb()
    .insert(feedback)
    .values({
      clerkUserId: requireUser(clerkUserId),
      title: input.title,
      body: input.body,
    })
    .returning({ id: feedback.id });

  if (!created) {
    throw new Error("The feedback could not be saved.");
  }
  return created;
}

/** +1s the feedback. Voting twice is a no-op. */
export async function addFeedbackVote(
  feedbackId: string,
  clerkUserId: string,
): Promise<void> {
  const voter = requireUser(clerkUserId);
  await assertFeedbackExists(feedbackId);
  await getDb()
    .insert(feedbackVotes)
    .values({ feedbackId, clerkUserId: voter })
    .onConflictDoNothing({
      target: [feedbackVotes.feedbackId, feedbackVotes.clerkUserId],
    });
}

/** Takes back a +1. Removing a vote that was never cast is a no-op. */
export async function removeFeedbackVote(
  feedbackId: string,
  clerkUserId: string,
): Promise<void> {
  await getDb()
    .delete(feedbackVotes)
    .where(
      and(
        eq(feedbackVotes.feedbackId, feedbackId),
        eq(feedbackVotes.clerkUserId, requireUser(clerkUserId)),
      ),
    );
}

export async function addFeedbackComment(
  feedbackId: string,
  clerkUserId: string,
  body: string,
): Promise<{ id: string }> {
  const author = requireUser(clerkUserId);
  await assertFeedbackExists(feedbackId);
  const [created] = await getDb()
    .insert(feedbackComments)
    .values({ feedbackId, clerkUserId: author, body })
    .returning({ id: feedbackComments.id });

  if (!created) {
    throw new Error("The comment could not be saved.");
  }
  return created;
}
