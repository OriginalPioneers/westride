import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attachmentNote,
  contentTypeOf,
  isUploadPathname,
  kindFromContentType,
  titleFromFilename,
  uploadRejection,
  userMessageForMuse,
} from "../lib/idea-factory/uploads";
import { buildChatInput } from "../lib/idea-factory/prompts";
import { redactMuseInput, withInlineFiles } from "../lib/idea-factory/muse-input";

test("reads the type from the filename when the browser leaves it blank", () => {
  assert.equal(contentTypeOf({ type: "", name: "notes.md" }), "text/markdown");
  assert.equal(contentTypeOf({ type: "image/jpg", name: "logo.jpg" }), "image/jpeg");
  assert.equal(contentTypeOf({ type: "application/pdf", name: "deck.pdf" }), "application/pdf");
  assert.equal(contentTypeOf({ type: "", name: "virus.exe" }), null);
});

test("rejects files advisors cannot read", () => {
  assert.equal(uploadRejection({ type: "image/png", name: "mark.png", size: 1200 }), null);
  assert.match(
    uploadRejection({ type: "", name: "notes.docx", size: 1200 }) ?? "",
    /not a type/,
  );
  assert.match(uploadRejection({ type: "image/png", name: "empty.png", size: 0 }) ?? "", /empty/);
});

test("keeps upload pathnames on this idea", () => {
  const ideaId = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const path = `idea-factory/${ideaId}/document/33333333-3333-4333-8333-333333333333.md`;
  assert.equal(isUploadPathname(ideaId, path), true);
  assert.equal(isUploadPathname(other, path), false);
  assert.equal(isUploadPathname(ideaId, "public/logo.png"), false);
  assert.equal(kindFromContentType("image/webp"), "IMAGE");
  assert.equal(kindFromContentType("application/pdf"), "DOCUMENT");
  assert.equal(titleFromFilename("  Pitch Deck v2.pdf  "), "Pitch Deck v2.pdf");
});

test("names attached files in the Muse transcript", () => {
  assert.equal(attachmentNote(["logo.png"]), "Attached file: logo.png");
  assert.equal(attachmentNote(["a.pdf", "b.txt"]), "Attached files: a.pdf, b.txt");
  assert.equal(
    userMessageForMuse("What do you think?", ["logo.png"]),
    "What do you think?\n\nAttached file: logo.png",
  );
  assert.equal(userMessageForMuse("  ", ["logo.png"]), "Attached file: logo.png");

  const input = buildChatInput([
    { role: "USER", content: "Here is the deck", attachmentTitles: ["deck.pdf"] },
    { role: "AGENT", content: "Thanks, I will read it." },
  ]);
  assert.equal(input[0]?.content, "Here is the deck\n\nAttached file: deck.pdf");
  assert.equal(input[1]?.content, "Thanks, I will read it.");
});

test("puts readable files on the last user turn and redacts them in the log", () => {
  const items = withInlineFiles(
    [
      { role: "user", content: "Look at this" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "And this" },
    ],
    [
      {
        title: "notes.txt",
        contentType: "text/plain",
        bytes: Buffer.from("hello team"),
        as: "text",
      },
      {
        title: "mark.png",
        contentType: "image/png",
        bytes: Buffer.from("png-bytes"),
        as: "image",
      },
    ],
  );
  const last = items[2];
  assert.ok(last && Array.isArray(last.content));
  assert.deepEqual(
    last.content.map((part) => part.type),
    ["input_text", "input_text", "input_image"],
  );

  const redacted = redactMuseInput(items);
  assert.ok(Array.isArray(redacted));
  const redactedLast = redacted[2];
  assert.ok(redactedLast && Array.isArray(redactedLast.content));
  const image = redactedLast.content.find((part) => part.type === "input_image");
  assert.ok(image && image.type === "input_image");
  assert.match(image.image_url, /data-url chars/);
});
