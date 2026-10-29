import assert from "node:assert/strict";
import { test } from "node:test";
import {
  achievementCatalog,
  achievementGroups,
} from "../src/achievement-catalog";
import {
  challengeCatalog,
  challengePrompt,
  learningAwards,
  isChangedAnswer,
  type ChallengeProgress,
} from "../src/challenge-catalog";
const attempt = (
  slug = "clear-intent",
  interest = "games",
  complete = true,
  revised = false,
): ChallengeProgress => ({
  challengeSlug: slug,
  interest,
  completedAt: complete ? new Date() : null,
  revision: revised ? "A more specific answer" : "",
  feedback: revised
    ? { observation: "A goal", suggestion: "Add detail" }
    : null,
});
test("33 unique achievements, learning and builder families, all twelve challenges represented", () => {
  assert.equal(achievementCatalog.length, 33);
  assert.equal(new Set(achievementCatalog.map((a) => a.slug)).size, 33);
  for (const group of achievementGroups)
    assert.equal(
      achievementCatalog.filter((a) => a.group === group).length,
      group === "Build something real" ? 3 : 6,
    );
  for (const challenge of challengeCatalog)
    assert.ok(achievementCatalog.some((a) => a.slug === challenge.slug));
  assert.equal(
    achievementCatalog.find((a) => a.slug === "newbie")?.name,
    "First Step",
  );
});
test("unfinished attempts earn no completion awards; repeated interests do not inflate challenge counts", () => {
  assert.deepEqual(
    learningAwards([attempt("clear-intent", "games", false)]),
    [],
  );
  const awards = learningAwards([
    attempt(),
    attempt("clear-intent", "everyday"),
    attempt("clear-intent", "helping"),
  ]);
  assert.ok(awards.includes("prompt-pilot"));
  assert.ok(awards.includes("helping-hand"));
  assert.ok(!awards.includes("three-for-three"));
});
test("threshold awards arrive exactly at three, six, and twelve distinct completed challenges", () => {
  for (let count = 0; count <= 12; count++) {
    const awards = learningAwards(
      challengeCatalog.slice(0, count).map((c) => attempt(c.slug)),
    );
    assert.equal(awards.includes("three-for-three"), count >= 3);
    assert.equal(awards.includes("on-a-roll"), count >= 6);
    assert.equal(awards.includes("full-circle"), count === 12);
  }
});
test("revisions require feedback and count distinct challenges", () => {
  assert.ok(
    !learningAwards([{ ...attempt(), revision: "changed" }]).includes(
      "second-draft",
    ),
  );
  assert.ok(
    learningAwards([attempt("clear-intent", "games", false, true)]).includes(
      "second-draft",
    ),
  );
  assert.ok(
    !learningAwards([
      attempt("clear-intent", "games", true, true),
      attempt("clear-intent", "helping", true, true),
    ]).includes("thoughtful-revisions"),
  );
  assert.ok(
    learningAwards(
      challengeCatalog
        .slice(0, 3)
        .map((c) => attempt(c.slug, "games", true, true)),
    ).includes("thoughtful-revisions"),
  );
});
test("whitespace, casing, and punctuation-only revisions do not earn revision badges", () => {
  assert.equal(isChangedAnswer("Help a friend", "  help  a friend "), false);
  assert.equal(isChangedAnswer("Help a friend", "..."), false);
  assert.equal(
    isChangedAnswer("Help a friend", "Help a friend learn a game"),
    true,
  );
});
test("every challenge supports three interests and both explanation levels without AI calls", () => {
  for (const c of challengeCatalog)
    for (const interest of ["games", "everyday", "helping"] as const) {
      assert.ok(
        challengePrompt(c.slug, interest, "simple").includes("grown-up"),
      );
      assert.ok(
        challengePrompt(c.slug, interest, "deeper").includes("tradeoff"),
      );
    }
  assert.throws(() => challengePrompt("unknown", "games", "simple"));
});
