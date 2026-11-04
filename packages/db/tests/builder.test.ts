import assert from "node:assert/strict";
import { test } from "node:test";
import { prototypeUrl } from "../src/builder-progress";

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
