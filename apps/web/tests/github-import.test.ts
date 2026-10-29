import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGithubRepoRef } from "../lib/github/repo-ref";
import {
  ideaDescriptionFromRepo,
  ideaNameFromRepo,
} from "../lib/github/idea-draft";
import { MAX_IDEA_DESCRIPTION } from "../lib/ideas/create-schema";

const westride = { owner: "WeStrideOrg", repo: "westride" };

test("reads the repository from the forms people paste", () => {
  for (const input of [
    "https://github.com/WeStrideOrg/westride",
    "https://github.com/WeStrideOrg/westride/",
    "https://github.com/WeStrideOrg/westride.git",
    "https://www.github.com/WeStrideOrg/westride/tree/main/apps/web",
    "https://github.com/WeStrideOrg/westride/blob/main/README.md?plain=1#L3",
    "github.com/WeStrideOrg/westride",
    "git@github.com:WeStrideOrg/westride.git",
    "WeStrideOrg/westride",
    "  WeStrideOrg/westride  ",
  ]) {
    assert.deepEqual(parseGithubRepoRef(input), westride, input);
  }
});

test("rejects links that are not a GitHub repository", () => {
  for (const input of [
    "",
    "https://github.com/WeStrideOrg",
    "https://gitlab.com/WeStrideOrg/westride",
    "https://github.com.evil.example/WeStrideOrg/westride",
    "https://github.com/-bad/westride",
    "https://github.com/WeStrideOrg/..",
    "not a url",
  ]) {
    assert.equal(parseGithubRepoRef(input), null, input);
  }
});

test("turns a repository name into an idea name", () => {
  assert.equal(ideaNameFromRepo("neighborhood-tool-library"), "Neighborhood tool library");
  assert.equal(ideaNameFromRepo("WeStride"), "WeStride");
  assert.equal(ideaNameFromRepo("snake_case__name"), "Snake case name");
});

test("builds the description from the repo description and README", () => {
  const readme = "<!-- badges -->\n# Tool Library\n\nLend tools to neighbors.\n\n\n\n## Setup\nRun it.";
  assert.equal(
    ideaDescriptionFromRepo("Share tools.", readme),
    "Share tools.\n\nLend tools to neighbors.\n\n## Setup\nRun it.",
  );
  assert.equal(
    ideaDescriptionFromRepo(null, "Tool Library\n===\n\nBody"),
    "Body",
  );
  assert.equal(ideaDescriptionFromRepo(null, null), "");
});

test("drops logo rows, badges, and an HTML title from the README", () => {
  const readme = [
    '<div align="center">',
    '  <a href="https://example.com">',
    "    <picture>",
    '      <img src="logo.png" />',
    "    </picture>",
    "  </a>",
    "  <h1>Tool Library</h1>",
    "",
    "[![CI](https://x/badge.svg)](https://x) ![License](https://x/l.svg)",
    "",
    "</div>",
    "",
    "Lend tools to <b>neighbors</b>.",
  ].join("\n");
  assert.equal(
    ideaDescriptionFromRepo(null, readme),
    "Lend tools to <b>neighbors</b>.",
  );
});

test("keeps long READMEs within the description limit", () => {
  const paragraph = "word ".repeat(200).trim();
  const readme = Array.from({ length: 20 }, () => paragraph).join("\n\n");
  const description = ideaDescriptionFromRepo(null, readme);
  assert.ok(description.length <= MAX_IDEA_DESCRIPTION);
  assert.ok(description.endsWith("…"));
  assert.ok(!description.includes("\n\n…"));
});
