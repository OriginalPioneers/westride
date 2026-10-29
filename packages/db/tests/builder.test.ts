import assert from "node:assert/strict";
import { test } from "node:test";
import { changedPitch, prototypeUrl } from "../src/builder-progress";

test("pitch refinement ignores casing, whitespace, and punctuation-only changes", () => {
  assert.equal(
    changedPitch(
      "Help neighbors share tools",
      " HELP neighbors, share tools! ",
    ),
    false,
  );
  assert.equal(changedPitch("Help neighbors share tools", "..."), false);
  assert.equal(
    changedPitch(
      "Help neighbors share tools",
      "Help neighbors borrow tools using a shared calendar",
    ),
    true,
  );
});
test("prototype links require HTTPS and reject embedded credentials and executable schemes", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "http://example.com",
    "https://name:secret@example.com",
    "/relative",
    "not a link",
    "https://localhost",
  ])
    assert.equal(prototypeUrl(value), null);
  assert.equal(
    prototypeUrl(" https://example.com/demo "),
    "https://example.com/demo",
  );
});
