"use client";

import { useState } from "react";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ArrowRightIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { judgeHomePath } from "@/lib/judge-access";
import { DocPage, DocSection } from "../doc-page";
import { startJudgeSession } from "./actions";

/** Who is looking at the page, decided on the server. */
export type JudgeVisitor = "signed-out" | "judge" | "other";

const HACKATHON_DOC_URL = "https://github.com/WeStrideOrg/westride/blob/main/HACKATHON.MD";

const CAN_DO = [
  { label: "Idea Workshop", detail: "Open an existing idea or bring your own, run the advisory team, and expand an advisor to see its cited sources and the request's cost." },
  { label: "Project Factory", detail: "Browse the seeded projects, let Muse draft or rank tickets, and run a ticket in a sandbox. The work log streams live and the result is a pull request." },
  { label: "Agent Studio", detail: "Create a standing agent with a schedule and a spend cap, or read the usage ledger of one that has already run." },
  { label: "WePledge™, Mentorship, AI Academy", detail: "Everything else on the site works too, as it does for any member." },
];

const GOOD_TO_KNOW = [
  { label: "The account is shared", detail: "Every judge signs in to the same WeStride account, so you will see work other judges have done. Treat it as a shared workbench, not a private one." },
  { label: "Spend comes from WeStride Cloud", detail: "The account is pre-funded. Muse calls and sandboxes run on WeStride's own accounts and are charged to that balance, so you do not need a Meta, Vercel, or Modal account." },
  { label: "Please leave the connections alone", detail: "Settings lets you connect or disconnect provider accounts. The judge account relies on WeStride Cloud only, so there is nothing to connect there." },
  { label: "This route is temporary", detail: "It exists for the judging window of the Meta Global AI Developer Hackathon and will be removed afterwards." },
];

function Points({ items }: { items: { label: string; detail: string }[] }) {
  return (
    <List edge="flush" hasDividers>
      {items.map((item) => (
        <ListItem key={item.label} label={item.label} description={<Text type="supporting">{item.detail}</Text>} />
      ))}
    </List>
  );
}

export function JudgeAccess({ visitor }: { visitor: JudgeVisitor }) {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  async function explore() {
    setError(null);
    if (visitor === "judge") {
      router.push(judgeHomePath);
      return;
    }
    if (signIn == null) {
      setError("Sign-in is still loading. Try again in a second.");
      return;
    }
    const outcome = await startJudgeSession();
    if (outcome.status === "error") {
      setError(outcome.message);
      return;
    }
    // The server-minted token is redeemed with Clerk's ticket strategy; the
    // sign-in resource updates in place, so its status is read afterwards.
    const ticket = await signIn.ticket({ ticket: outcome.token });
    if (ticket.error != null) {
      console.error("Judge ticket sign-in failed", ticket.error);
      setError("The sign-in ticket was not accepted. Reload the page and try once more.");
      return;
    }
    if (signIn.status !== "complete") {
      setError("The judge account needs more than a ticket to sign in. Check its sign-in settings in Clerk.");
      return;
    }
    const finalized = await signIn.finalize({ navigate: () => router.push(judgeHomePath) });
    if (finalized.error != null) {
      console.error("Judge session could not be activated", finalized.error);
      setError("The session could not be started. Reload the page and try once more.");
    }
  }

  const hero = (
    <Card padding={6}>
      <VStack gap={5}>
        <HStack gap={3} vAlign="center">
          <Icon icon={TrophyIcon} size="lg" color="accent" />
          <VStack gap={0}>
            <Heading level={2}>One click, no sign-up</Heading>
            <Text type="supporting">
              The button below signs you in to a shared, pre-funded judge account. No email, no password.
            </Text>
          </VStack>
        </HStack>
        {visitor === "other" ? (
          <Banner
            status="info"
            title="You are signed in to your own WeStride account"
            description="Sign out first and the judge button will sign you in to the shared account."
            endContent={
              <Button
                label="Sign out"
                variant="secondary"
                clickAction={async () => {
                  await signOut();
                  // Same URL, so re-run the server page to recompute `visitor`.
                  router.refresh();
                }}
              />
            }
          />
        ) : (
          <HStack gap={3} vAlign="center" wrap="wrap">
            <Button
              label={visitor === "judge" ? "Continue exploring as a Hackathon Judge" : "Explore WeStride as a Hackathon Judge"}
              variant="primary"
              size="lg"
              icon={<Icon icon={TrophyIcon} />}
              endContent={<Icon icon={ArrowRightIcon} />}
              clickAction={explore}
            />
            {visitor === "judge" ? <Text type="supporting">You are already signed in as the judge.</Text> : null}
          </HStack>
        )}
        {error != null ? <Banner status="error" title="Could not start the judge session" description={error} /> : null}
      </VStack>
    </Card>
  );

  return (
    <DocPage
      title="Hackathon judge access"
      lede="For judges of the Meta Global AI Developer Hackathon: use the live WeStride platform, with real data and a funded balance, without creating an account."
      hero={hero}
    >
      <DocSection id="what-you-can-do" title="What you can do">
        <Text>
          The judge account already holds ideas, projects, tickets, and agents, so there is something to look
          at straight away. Anything a member can do, you can do from it.
        </Text>
        <Points items={CAN_DO} />
      </DocSection>

      <DocSection id="good-to-know" title="Good to know">
        <Points items={GOOD_TO_KNOW} />
      </DocSection>

      <DocSection id="submission" title="The submission">
        <Text>
          The write-up for judges, with the rubric mapping, the list of Meta models in use, and a step-by-step
          walk through the product, is in the repository:{" "}
          <Link href={HACKATHON_DOC_URL} target="_blank">
            HACKATHON.MD
          </Link>
          . The source is open under Apache 2.0 and every commit is inside the hackathon window.
        </Text>
      </DocSection>
    </DocPage>
  );
}
