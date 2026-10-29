import { test } from "node:test";
import assert from "node:assert/strict";
import { achievementCatalog, mainAchievementCatalog } from "@westride/db";
import {
  challengeCatalog,
  learningAwards,
  type Interest,
} from "@westride/db/challenges";
import {
  trackProgress,
  milestoneHint,
  challengeMilestones,
} from "../app/(main)/achievements/track-progress";

function attempt(slug: string, interest: Interest = "games") {
  return {
    challengeSlug: slug,
    interest,
    depth: "simple" as const,
    answer: "A useful answer",
    feedback: null as { observation: string; suggestion: string } | null,
    revision: "",
    completedAt: null as Date | null,
    createdAt: new Date(0),
  };
}
test("signed-out learners get sign-in; a first challenge predicts its actual three unlocks", () => {
  assert.equal(trackProgress([], new Set(), false).next.href, "/sign-in");
  const progress = trackProgress([], new Set(["newbie"]), true);
  assert.deepEqual(
    new Set(progress.next.unlocks),
    new Set(["Prompt Pilot", "Clear Intent", "Game Thinker"]),
  );
  assert.equal(progress.state("clear-intent"), "Ready");
  assert.equal(progress.state("second-draft"), "Needs feedback");
});
test("resume preserves the newest unfinished challenge's interest and depth", () => {
  const older = attempt("clear-intent");
  const newest = {
    ...attempt("context-counts", "helping"),
    depth: "deeper" as const,
    createdAt: new Date(1000),
    feedback: { observation: "Clear", suggestion: "Add a limit" },
  };
  const progress = trackProgress([older, newest], new Set(["newbie"]), true);
  assert.deepEqual(progress.next.challenge, {
    slug: "context-counts",
    interest: "helping",
    depth: "deeper",
  });
  assert.equal(progress.state("context-counts"), "In progress");
  assert.equal(progress.state("second-draft"), "Ready");
  assert.ok(!progress.next.unlocks.includes("Second Draft"));
});
test("repeat interests don't inflate milestones, and next-up skips completed challenge types", () => {
  const attempts = ["games", "helping"].map((interest) => ({
    ...attempt("clear-intent", interest as Interest),
    completedAt: new Date(1),
  }));
  const progress = trackProgress(
    attempts,
    new Set(learningAwards(attempts)),
    true,
  );
  assert.equal(progress.completed.size, 1);
  assert.equal(progress.next.challenge?.slug, "context-counts");
  assert.equal(progress.state("clear-intent"), "Earned");
  assert.equal(progress.state("three-for-three"), "In progress");
  assert.ok(!progress.next.unlocks.includes("Clear Intent"));
  assert.equal(
    milestoneHint(2, challengeMilestones, "challenge"),
    "1 more challenge to Three for Three.",
  );
});
test("after twelve challenges, missing interests still give a useful next step", () => {
  const attempts = challengeCatalog.map((c) => ({
    ...attempt(c.slug),
    completedAt: new Date(1),
  }));
  const progress = trackProgress(
    attempts,
    new Set(learningAwards(attempts)),
    true,
  );
  assert.equal(progress.next.challenge?.interest, "everyday");
  assert.deepEqual(progress.next.unlocks, ["Everyday Inventor"]);
});
test("revision recommendations reuse feedback and don't promise an unearned threshold", () => {
  const attempts = challengeCatalog.map((c, i) => ({
    ...attempt(c.slug, (["games", "everyday", "helping"] as const)[i % 3]),
    completedAt: new Date(1),
    feedback: { observation: "Clear", suggestion: "Add a limit" },
    revision: i === 0 ? "An improved answer" : "",
  }));
  const progress = trackProgress(
    attempts,
    new Set(learningAwards(attempts)),
    true,
  );
  assert.equal(progress.next.label, "Revisit answer");
  assert.equal(progress.next.challenge?.slug, "context-counts");
  assert.deepEqual(progress.next.unlocks, []);
});
test("fully earned tracks offer an idea action without promising more badges", () => {
  const attempts = challengeCatalog.map((c, i) => ({
    ...attempt(c.slug, (["games", "everyday", "helping"] as const)[i % 3]),
    completedAt: new Date(1),
    feedback: { observation: "Clear", suggestion: "Add a limit" },
    revision: "An improved answer",
  }));
  const progress = trackProgress(
    attempts,
    new Set(achievementCatalog.map((a) => a.slug)),
    true,
  );
  assert.equal(progress.next.href, "/ideas");
  assert.deepEqual(progress.next.unlocks, []);
  assert.ok(
    progress.next.description.includes(
      `All ${mainAchievementCatalog.length} earned`,
    ),
  );
});

test("builder badges require an idea, then suggest the next unearned builder action", () => {
  assert.equal(
    trackProgress([], new Set(["newbie"]), true).state("idea-refiner"),
    "Needs an idea",
  );
  const attempts = challengeCatalog.map((c, i) => ({
    ...attempt(c.slug, (["games", "everyday", "helping"] as const)[i % 3]),
    completedAt: new Date(1),
    feedback: { observation: "Clear", suggestion: "Add detail" },
    revision: "A more specific answer",
  }));
  const earned = new Set([
    ...learningAwards(attempts),
    "newbie",
    "curious-cat",
    "first-spark",
  ]);
  assert.deepEqual(trackProgress(attempts, earned, true).next.unlocks, [
    "Better by Design",
  ]);
  earned.add("idea-refiner");
  assert.deepEqual(trackProgress(attempts, earned, true).next.unlocks, [
    "Team Up",
  ]);
  earned.add("team-builder");
  assert.deepEqual(trackProgress(attempts, earned, true).next.unlocks, [
    "Made Real",
  ]);
});

test("bonus badges are never required to finish the main journey", () => {
  const attempts = challengeCatalog.map((c, i) => ({
    ...attempt(c.slug, (["games", "everyday", "helping"] as const)[i % 3]),
    completedAt: new Date(1),
    feedback: { observation: "Clear", suggestion: "Add detail" },
    revision: "An improved answer",
  }));
  const progress = trackProgress(
    attempts,
    new Set(mainAchievementCatalog.map((a) => a.slug)),
    true,
  );
  assert.ok(progress.next.description.includes("All 27 earned"));
  assert.deepEqual(progress.next.unlocks, []);
});
