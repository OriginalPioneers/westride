import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_TICKET_COUNTS,
  projectKeyPrefix,
  ticketKey,
  ticketProgressPercent,
  ticketStatusChange,
} from "../src/build-rules";

test("ticket keys take initials from multi-word names and a stem from single words", () => {
  assert.equal(projectKeyPrefix("Neighborhood Tool Library"), "NTL");
  assert.equal(projectKeyPrefix("WeStride"), "WEST");
  assert.equal(projectKeyPrefix("a very long project name here"), "AVLP");
  assert.equal(projectKeyPrefix("Café-Connect 2"), "CC");
  assert.equal(projectKeyPrefix("2026"), "PRJ");
  assert.equal(projectKeyPrefix(""), "PRJ");
  assert.equal(ticketKey("Neighborhood Tool Library", 12), "NTL-12");
});

test("blocking needs a reason and leaving blocked clears it", () => {
  assert.throws(
    () => ticketStatusChange({ status: "BACKLOG", completedAt: null }, "BLOCKED", "  "),
    /blocking/,
  );
  const blocked = ticketStatusChange(
    { status: "IN_PROGRESS", completedAt: null },
    "BLOCKED",
    " Waiting on API keys ",
  );
  assert.deepEqual(blocked, {
    status: "BLOCKED",
    blockedReason: "Waiting on API keys",
    completedAt: null,
  });
  const resumed = ticketStatusChange(
    { status: "BLOCKED", completedAt: null },
    "IN_PROGRESS",
    "stale reason",
  );
  assert.equal(resumed.blockedReason, null);
});

test("done stamps completion once and leaving done clears it", () => {
  const now = new Date("2026-10-29T00:00:00Z");
  const done = ticketStatusChange(
    { status: "IN_REVIEW", completedAt: null },
    "DONE",
    null,
    now,
  );
  assert.equal(done.completedAt, now);
  const stillDone = ticketStatusChange(
    { status: "DONE", completedAt: now },
    "DONE",
    null,
    new Date("2026-11-01T00:00:00Z"),
  );
  assert.equal(stillDone.completedAt, now);
  const reopened = ticketStatusChange({ status: "DONE", completedAt: now }, "BACKLOG", null);
  assert.equal(reopened.completedAt, null);
});

test("progress is the share of tickets that are done", () => {
  assert.equal(ticketProgressPercent(EMPTY_TICKET_COUNTS), 0);
  assert.equal(
    ticketProgressPercent({ ...EMPTY_TICKET_COUNTS, DONE: 1, BACKLOG: 2 }),
    33,
  );
  assert.equal(ticketProgressPercent({ ...EMPTY_TICKET_COUNTS, DONE: 4 }), 100);
});
