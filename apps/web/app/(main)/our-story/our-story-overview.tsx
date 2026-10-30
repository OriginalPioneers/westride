"use client";

import Image from "next/image";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { AGENTS } from "@/lib/idea-factory/agents";
import { DocPage, DocSection } from "../doc-page";

const SOURCE_URL = "https://github.com/OriginalPioneers/westride";
const HACKATHON_URL = "https://cerebralvalley.ai/e/meta-ai-developer-hackathon";

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  /** Square photo under public/team, e.g. "/team/garrett-hampton.jpg". */
  headshot: string | null;
  linkedinUrl: string | null;
};

const TEAM: TeamMember[] = [
  {
    name: "Garrett Hampton",
    role: "Technology, code, and AI",
    bio: "Garrett architects and writes WeStride's code, and works out how each part of the platform puts Meta's models to work.",
    headshot: null,
    linkedinUrl: null,
  },
  {
    name: "Lauren Hampton",
    role: "Brand, marketing, and design",
    bio: "Lauren shapes how WeStride looks, sounds, and reaches people, from the brand and the digital design to the marketing that brings new members in.",
    headshot: null,
    linkedinUrl: null,
  },
  {
    name: "Jace Whitten",
    role: "Front end, achievements, and artifacts",
    bio: "Jace makes WeStride fun. He builds the front end, the achievements members earn, and the artifacts they collect along the way.",
    headshot: null,
    linkedinUrl: null,
  },
];

const OBSERVATIONS = [
  {
    label: "Every level of experience",
    detail:
      "Computer science students on their first real project, people who had never written code, and engineers with decades behind them, all in the same channels.",
  },
  {
    label: "A need for mentors",
    detail:
      "Beginners had questions an experienced builder could answer in minutes, but there was no easy way to find that person and ask.",
  },
  {
    label: "The same building questions",
    detail:
      "Once ideas were picked and teams started building, the questions turned to how to get the most out of Muse to build them.",
  },
  {
    label: "Agents on every list",
    detail:
      "As teams described their products, they kept talking about the Muse agents those products would need.",
  },
];

type PathStep = {
  step: string;
  where: string;
  href: string;
  how: string;
};

const PATH: PathStep[] = [
  {
    step: "Learn",
    where: "Academy and Achievements",
    href: "/academy",
    how: "Short tracks on AI fundamentals, prompting, agents, and building. Hands-on challenges get feedback from Muse, and achievements mark the progress.",
  },
  {
    step: "Find a mentor",
    where: "Mentorship",
    href: "/mentorship",
    how: "Free, one-to-one guidance. Mentors list their skills, locations, and languages so the people who need them can find them.",
  },
  {
    step: "Validate",
    where: "Idea Studio",
    href: "/ideas",
    how: `An advisory team of ${AGENTS.length} Muse specialists, from market analyst to grants advisor, pressure-tests a business or non-profit idea with live web research.`,
  },
  {
    step: "Build",
    where: "Build Studio",
    href: "/build",
    how: "Projects, tickets, and linked GitHub repositories. Muse drafts the backlog, and a Muse Code agent can take a ticket and open a pull request.",
  },
  {
    step: "Add agents",
    where: "Agent Studio",
    href: "/agents",
    how: "Design the Muse agents a project needs and add them to it. This is what we are building next.",
  },
];

const META_AI = [
  {
    label: "Muse Spark and Muse Wonder",
    detail:
      "Every Idea Studio advisor is Muse with its own specialist brief. Advisors search the web and cite their sources, and answer in structured JSON the page renders directly. When a member asks for a full evaluation, the advisors work in parallel and a final pass compares their findings. Members choose Muse Spark 1.3, its lower-cost Contributor tier, or Muse Wonder 1.0, and see an estimate of what each request cost.",
  },
  {
    label: "Muse planning",
    detail:
      "In Build Studio, Muse reads the project description, the linked idea, and the repository's README, then drafts a backlog and roadmap and ranks the open tickets. Every ticket it writes is a self-contained brief, ready for a coding agent.",
  },
  {
    label: "Muse Code agents",
    detail:
      "A member can hand a ticket to Muse Code without installing anything. WeStride starts an isolated sandbox, clones the repository, runs Muse Code headless on a branch named for the ticket, streams its work log to the ticket page as it happens, and opens a pull request when it finishes.",
  },
  {
    label: "Muse as a learning companion",
    detail:
      "The Muse dock helps people practice talking with an AI and suggests a next step. Muse gives feedback on Academy challenges and helps learners write a post about what they built, under guardrails written for beginners and for children learning with an adult.",
  },
  {
    label: "Free to learn, your account to build",
    detail:
      "WeStride covers Muse for learning, with a daily allowance. To validate and build, members connect their own Meta account through the same device sign-in Muse Code uses, so that work runs on their own key and credits.",
  },
  {
    label: "Built with Muse, too",
    detail:
      "We used Muse to vet the idea for WeStride, draft the first Academy tracks, and shape the prompt behind our logo. The prompts are in the repository.",
  },
];

const AUDIENCE = [
  {
    label: "Students",
    detail:
      "A guided path from a first prompt to a shipped project, and a mentor to ask when they get stuck.",
  },
  {
    label: "People who don't code",
    detail:
      "Founders, organizers, and career changers who have an idea and now have AI agents that can build much of it with them.",
  },
  {
    label: "Experienced builders",
    detail:
      "A way to pass on what they know as mentors, and a faster path from idea to pull request for their own work.",
  },
  {
    label: "Non-profits",
    detail:
      "Idea Studio has a non-profit path, with advisors for grants, donors and volunteers, governance, and program evaluation.",
  },
];

type Milestone = { date: string; built: string };

const MILESTONES: Milestone[] = [
  {
    date: "October 26",
    built:
      "Kickoff. Created the repository and set up the website, sign-in, the design site, the Academy data model, and the WeStride stamp.",
  },
  {
    date: "October 27",
    built:
      "Seeded the Academy tracks, achievements, and Mentorship. Shipped the public API, the MCP server, and the first iOS and Android builds.",
  },
  {
    date: "October 28",
    built:
      "Opened Idea Studio with its Muse advisory team. Added the achievement track, Muse learning challenges, and the Muse dock.",
  },
  {
    date: "October 29",
    built:
      "Connected GitHub and Meta accounts, and started Build Studio: projects, tickets, Muse planning, and Muse Code agent runs.",
  },
];

const hackathonLogo = {
  width: "calc(var(--spacing-12) * 2)",
  height: "auto",
  borderRadius: "var(--radius-element)",
};

function NamedList({
  items,
}: {
  items: { label: string; detail: string }[];
}) {
  return (
    <List edge="flush" hasDividers>
      {items.map((item) => (
        <ListItem
          key={item.label}
          label={item.label}
          description={<Text type="supporting">{item.detail}</Text>}
        />
      ))}
    </List>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <Card>
      <VStack gap={4}>
        <Avatar
          src={member.headshot ?? undefined}
          name={member.name}
          size={96}
          tooltip={false}
        />
        <VStack gap={1}>
          <Heading level={3}>{member.name}</Heading>
          <Text type="supporting">{member.role}</Text>
        </VStack>
        <Text>{member.bio}</Text>
        {member.linkedinUrl ? (
          <Link href={member.linkedinUrl} isExternalLink isStandalone>
            LinkedIn
          </Link>
        ) : null}
      </VStack>
    </Card>
  );
}

export function OurStoryOverview() {
  return (
    <DocPage
      title="Our Story"
      lede="Three friends, one hackathon, and a problem we kept seeing in the Discord."
      actions={
        <>
          <Button label="Start learning" variant="primary" href="/academy" />
          <Button label="View the source" href={SOURCE_URL} target="_blank" />
        </>
      }
    >
      <DocSection id="team" title="The team">
        <Text>
          WeStride was started by Garrett and Lauren Hampton, a husband and
          wife team, and Jace Whitten, Garrett&apos;s friend of many years.
        </Text>
        <Grid columns={{ minWidth: 240, max: 3 }} gap={4}>
          {TEAM.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </Grid>
      </DocSection>

      <DocSection id="how-it-started" title="How it started">
        <Card variant="muted">
          <HStack gap={4} vAlign="center">
            <Image
              src="/logos/meta-global-ai-developer-hackathon.jpg"
              alt="Meta Global AI Developer Hackathon"
              width={630}
              height={630}
              // The optimizer fetches this file without a browser user agent,
              // and the proxy refuses that request.
              unoptimized
              style={hackathonLogo}
            />
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={3}>Meta Global AI Developer Hackathon</Heading>
                <Text type="supporting">
                  Hosted by Cerebral Valley. Kickoff was October 26, 2026, and
                  the building period runs through November 4.
                </Text>
                <Link href={HACKATHON_URL} isExternalLink>
                  Event details
                </Link>
              </VStack>
            </StackItem>
          </HStack>
        </Card>
        <Text>
          When the three of us were accepted into the hackathon, we did what
          every team does first: we traded ideas. Dozens went back and forth,
          and we used Muse to vet them. We asked it to poke holes in our
          assumptions, size up the market, and tell us what already existed.
        </Text>
      </DocSection>

      <DocSection id="what-we-saw" title="What we saw">
        <Text>
          We were not the only ones. In the hackathon Discord, team after team
          was doing the same thing: ideating, vetting, and researching. The
          people doing it could not have been more different.
        </Text>
        <NamedList items={OBSERVATIONS} />
      </DocSection>

      <DocSection id="the-idea" title="That's when it hit us">
        <Text>
          The project was not any one of our ideas. It was the path every team
          was walking: learn enough AI to start, find someone who has done it
          before, check that the idea holds up, build it, and give it agents.
          That path would be our project, and our contribution.
        </Text>
        <Text>
          WeStride.org is a non-profit, open-source platform that walks the
          whole path with you, powered by Meta&apos;s models.
        </Text>
        <Table
          data={PATH}
          idKey="step"
          columns={[
            {
              key: "step",
              header: "Step",
              width: proportional(1),
              renderCell: (row) => (
                <VStack gap={0.5}>
                  <Text weight="semibold">{row.step}</Text>
                  <Link href={row.href}>{row.where}</Link>
                </VStack>
              ),
            },
            { key: "how", header: "How it works", width: proportional(3) },
          ]}
        />
      </DocSection>

      <DocSection id="built-on-meta-ai" title="Built on Meta AI">
        <Text>
          Meta&apos;s models are not a feature bolted onto WeStride. They are
          the coach on every challenge, the advisory team behind every idea,
          and the engineer working every ticket.
        </Text>
        <NamedList items={META_AI} />
        <Text type="supporting">
          The <Link href="/tech-stack">Tech Stack</Link> page covers the rest
          of the platform: the website, public API, MCP server, and mobile app.
        </Text>
      </DocSection>

      <DocSection id="who-its-for" title="Who it's for">
        <Text>
          We built WeStride for the world we were in that week: a room full of
          people with good ideas and very different starting points. It is
          free to learn on, and the path is the same whether you are writing
          your first prompt or your thousandth pull request.
        </Text>
        <NamedList items={AUDIENCE} />
      </DocSection>

      <DocSection id="built-during-the-hackathon" title="Built during the hackathon">
        <Text>
          Every line of WeStride was written during the hackathon, starting at
          kickoff. The full commit history is public.
        </Text>
        <Table
          data={MILESTONES}
          idKey="date"
          columns={[
            { key: "date", header: "Date", width: proportional(1) },
            { key: "built", header: "What we built", width: proportional(4) },
          ]}
        />
      </DocSection>

      <DocSection id="stride-with-us" title="Stride with us">
        <Text>
          WeStride is a non-profit, and all of it is open source. Learn
          something, share what you know, or bring an idea and build it with
          us.
        </Text>
        <HStack gap={2} wrap="wrap">
          <Button label="Start an idea" variant="primary" href="/ideas" />
          <Button label="Become a mentor" href="/mentorship/become" />
          <Button label="View the source" href={SOURCE_URL} target="_blank" />
        </HStack>
      </DocSection>
    </DocPage>
  );
}
