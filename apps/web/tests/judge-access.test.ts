import { test } from "node:test";
import assert from "node:assert/strict";
import { isJudgeNavVisible } from "../lib/judge-access";

const FLAG = "NEXT_PUBLIC_HACKATHON_JUDGE_ACCESS";
const JUDGE_ID = "user_judge";

function withFlag(value: string | undefined, run: () => void) {
  const previous = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env[FLAG];
    else process.env[FLAG] = previous;
  }
}

test("judge nav stays hidden until auth has loaded", () => {
  withFlag("1", () => {
    assert.equal(
      isJudgeNavVisible({ authLoaded: false, userId: undefined, judgeUserId: JUDGE_ID }),
      false,
    );
    assert.equal(
      isJudgeNavVisible({ authLoaded: false, userId: "user_member", judgeUserId: JUDGE_ID }),
      false,
    );
  });
});

test("signed-out visitors see the judge nav when the feature is on", () => {
  withFlag("1", () => {
    assert.equal(
      isJudgeNavVisible({ authLoaded: true, userId: null, judgeUserId: JUDGE_ID }),
      true,
    );
  });
});

test("a signed-in member who is not the judge does not see the judge nav", () => {
  withFlag("1", () => {
    assert.equal(
      isJudgeNavVisible({ authLoaded: true, userId: "user_member", judgeUserId: JUDGE_ID }),
      false,
    );
  });
});

test("the shared judge account still sees the judge nav", () => {
  withFlag("1", () => {
    assert.equal(
      isJudgeNavVisible({ authLoaded: true, userId: JUDGE_ID, judgeUserId: JUDGE_ID }),
      true,
    );
  });
});

test("the judge nav is absent when the feature is off, including for the judge", () => {
  withFlag(undefined, () => {
    assert.equal(
      isJudgeNavVisible({ authLoaded: true, userId: null, judgeUserId: JUDGE_ID }),
      false,
    );
    assert.equal(
      isJudgeNavVisible({ authLoaded: true, userId: JUDGE_ID, judgeUserId: JUDGE_ID }),
      false,
    );
  });
});
