import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = fileURLToPath(new URL(".", import.meta.url));
const appDir = join(testsDir, "..", "app");

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...sourceFiles(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

test("settings/api gates API keys with Show, not removed Clerk components", () => {
  const source = readFileSync(
    join(appDir, "(main)", "settings", "api", "api-overview.tsx"),
    "utf8",
  );

  for (const removed of ["<SignedIn", "</SignedIn>", "<SignedOut", "</SignedOut>", "<Protect", "</Protect>"]) {
    assert.ok(!source.includes(removed), `api-overview.tsx must not render ${removed} (removed in Clerk Core 3)`);
  }
  assert.ok(
    !/from "@clerk\/nextjs"/.test(source) || !/\b(SignedIn|SignedOut|Protect)\b/.test(source),
    "api-overview.tsx must not import removed Clerk control components",
  );

  // Behavior preserved: API keys UI for signed-in visitors, sign-in CTA otherwise.
  assert.ok(source.includes('<Show when="signed-in">'), "expected <Show when=\"signed-in\"> around <APIKeys />");
  assert.ok(source.includes('<Show when="signed-out">'), "expected <Show when=\"signed-out\"> around the sign-in CTA");
  assert.ok(source.includes("<APIKeys"), "expected the <APIKeys /> manager to remain on the page");
});

test("no removed Clerk control components remain in app source", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(appDir)) {
    const source = readFileSync(file, "utf8");
    if (
      source.includes("<SignedIn") ||
      source.includes("<SignedOut") ||
      source.includes("<Protect")
    ) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], "Clerk Core 3 throws at render for <SignedIn>/<SignedOut>/<Protect>; use <Show>");
});
