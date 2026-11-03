"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import type { OwnSandboxProvider } from "@westride/db";
import { chooseSandboxProvider } from "../modal-actions";

const NAMES: Record<OwnSandboxProvider, string> = { VERCEL: "Vercel", MODAL: "Modal" };

/**
 * Shown on both the Vercel and Modal panels when the member has connected
 * both: which one sandboxes run on, and a button to switch to this one.
 */
export function SandboxProviderSwitch({
  thisProvider,
  active,
}: {
  thisProvider: OwnSandboxProvider;
  active: OwnSandboxProvider;
}) {
  if (active === thisProvider) {
    return (
      <Banner
        status="success"
        title={`Your sandboxes run on ${NAMES[thisProvider]}`}
        description={`${NAMES[other(thisProvider)]} is connected too and stays available; switch from its panel.`}
      />
    );
  }
  return (
    <Banner
      status="info"
      title={`Your sandboxes run on ${NAMES[active]}`}
      description={`${NAMES[thisProvider]} is connected but not in use.`}
    >
      <Button
        label={`Use ${NAMES[thisProvider]} instead`}
        variant="secondary"
        clickAction={() => chooseSandboxProvider(thisProvider)}
      />
    </Banner>
  );
}

function other(provider: OwnSandboxProvider): OwnSandboxProvider {
  return provider === "VERCEL" ? "MODAL" : "VERCEL";
}
