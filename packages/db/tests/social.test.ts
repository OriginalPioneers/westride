import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dayInZone,
  sharedPostUrl,
  socialProgress,
  type SocialProgressPost,
} from "../src/social-progress";
const post = (day: string, platform = "facebook"): SocialProgressPost => ({
  generatedAt: null,
  sharedAt: new Date(`${day}T12:00:00Z`),
  sharedDay: day,
  platform,
  engagement: null,
});
test("drafts and copied text don't count as published shares", () => {
  const progress = socialProgress(
    [{ ...post("2026-10-28"), sharedAt: null, generatedAt: new Date() }],
    "2026-10-28",
  );
  assert.deepEqual(progress.slugs, ["post-maker"]);
  assert.equal(progress.sharedCount, 0);
});
test("three posts must be on one day, not spread across days", () => {
  assert.ok(
    !socialProgress(
      [post("2026-10-27"), post("2026-10-28"), post("2026-10-29")],
      "2026-10-29",
    ).slugs.includes("triple-feature"),
  );
  assert.ok(
    socialProgress(
      Array.from({ length: 3 }, () => post("2026-10-28")),
      "2026-10-28",
    ).slugs.includes("triple-feature"),
  );
});
test("a week requires seven consecutive distinct days; gaps don't revoke the earned badge", () => {
  const week = Array.from({ length: 7 }, (_, i) => post(`2026-10-${20 + i}`));
  const progress = socialProgress(week, "2026-10-28");
  assert.equal(progress.bestStreak, 7);
  assert.equal(progress.currentStreak, 0);
  assert.ok(progress.slugs.includes("seven-day-signal"));
  assert.equal(
    socialProgress([...week.slice(0, 6), post("2026-10-28")], "2026-10-28")
      .bestStreak,
    6,
  );
  assert.equal(
    socialProgress(
      Array.from({ length: 7 }, () => post("2026-10-28")),
      "2026-10-28",
    ).bestStreak,
    1,
  );
});
test("cross-platform and engagement badges require confirmed posts", () => {
  assert.ok(
    socialProgress(
      [post("2026-10-28"), post("2026-10-28", "threads")],
      "2026-10-28",
    ).slugs.includes("across-the-feed"),
  );
  assert.ok(
    !socialProgress(
      [
        {
          ...post("2026-10-28"),
          sharedAt: null,
          engagement: "Useful feedback",
        },
      ],
      "2026-10-28",
    ).slugs.includes("audience-engaged"),
  );
});
test("calendar days respect local midnight and daylight savings", () => {
  assert.equal(
    dayInZone(new Date("2026-10-29T02:00:00Z"), "America/Los_Angeles"),
    "2026-10-28",
  );
  const dates = [
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
  ];
  assert.equal(
    socialProgress(
      dates.map((d) => post(d)),
      "2026-11-05",
    ).bestStreak,
    7,
  );
});
test("post URLs reject other domains and deduplicate tracking/legacy variants", () => {
  assert.equal(
    sharedPostUrl(
      "https://www.threads.net/@me/post/abc?tracking=1#foo",
      "threads",
    ),
    "https://threads.com/@me/post/abc",
  );
  assert.equal(
    sharedPostUrl("https://instagram.com/p/abc/", "instagram"),
    "https://instagram.com/p/abc",
  );
  for (const url of [
    "https://instagram.com",
    "https://evil.example/p/abc",
    "javascript:alert(1)",
    "https://user:pass@instagram.com/p/abc",
    "https://instagram.com/p/abc/embed",
  ])
    assert.equal(sharedPostUrl(url, "instagram"), null);
});
test("each post route reduces to one identity key", () => {
  assert.equal(
    sharedPostUrl("https://instagram.com/reel/abc/?igsh=x", "instagram"),
    "https://instagram.com/p/abc",
  );
  const permalink = "https://facebook.com/permalink.php?story_fbid=1&id=2";
  for (const url of [
    "https://m.facebook.com/story.php?id=2&story_fbid=1&ref=share",
    "https://facebook.com/permalink.php?story_fbid=1&id=2&fbid=9",
  ])
    assert.equal(sharedPostUrl(url, "facebook"), permalink);
  for (const url of [
    "https://facebook.com/photo.php?fbid=123456",
    "https://facebook.com/photo.php?fbid=123456&id=7&set=a.1",
  ])
    assert.equal(
      sharedPostUrl(url, "facebook"),
      "https://facebook.com/photo.php?fbid=123456",
    );
  assert.equal(
    sharedPostUrl("https://facebook.com/Page/posts/42/?mibextid=x", "facebook"),
    "https://facebook.com/page/posts/42",
  );
  for (const url of [
    "https://facebook.com/permalink.php?story_fbid=1",
    "https://facebook.com/Page/posts/42/comments",
    "https://facebook.com/photo.php",
  ])
    assert.equal(sharedPostUrl(url, "facebook"), null);
  assert.equal(
    sharedPostUrl("https://threads.com/@me/post/abc/media", "threads"),
    null,
  );
});
