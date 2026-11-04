# WeStride.org at the Meta Global AI Developer Hackathon

WeStride.org takes an idea from a hunch to a shipped product with AI agents of its own, and lets anyone back it with tokens or compute instead of money. This document is for the judges: what was built during the hackathon, how it uses Meta's models, how it maps to the judging rubric, and why it should win the Startup track.

| | |
| --- | --- |
| Track | Startups |
| Problem statement | Push the Frontier (software): give a solo founder the team, the plan, the engineers, and the funding that an idea needs to become a product |
| Team | [Garrett Hampton](https://www.linkedin.com/in/garretthampton/), solo |
| Built | October 26 to November 4, 2026, from an empty repository at kickoff. No prior codebase. |
| Live | [westride.org](https://www.westride.org) |
| Demo video | [Watch on YouTube](https://youtu.be/YfN8RQ1bZfs) |
| Source | [github.com/WeStrideOrg/westride](https://github.com/WeStrideOrg/westride), Apache 2.0, [full commit history](https://github.com/WeStrideOrg/westride/commits/main) |
| Getting started | [README.md](README.md#getting-started) |

## 1. The problem

Most ideas die between "this could work" and a first pull request. The person who has the idea usually lacks four things at once: a team to pressure-test it, a plan that turns it into tickets, engineers to work those tickets, and money to pay for any of it. Accelerators and crowdfunding address the last one, for a small number of people, by moving money. Coding assistants address the third, for people who already know how to run a software project.

WeStride fills all four gaps with agents running on Meta's models, and it funds them without moving money: supporters pledge Meta API tokens, their own computer's compute, or a link to their capital, and WeStride never holds funds.

## 2. What I built

Everything in this repository was written during the hackathon. There is no "before"; the first commit (`878e0d2`, October 26) is the project's initial commit. The README's [Built during the hackathon](README.md#built-during-the-hackathon) table lists the first commit of every feature by day.

### The three studios

**Idea Workshop.** A member brings a business, non-profit, game, open-source, website, or mobile app idea, or imports a public GitHub repository to start from existing work. A team of Muse advisors, each with a specialist brief for that kind of idea, researches it with live web search and cited sources, evaluates it in parallel, and a synthesis step reports where the advisors agree and disagree. Every advisor returns schema-validated JSON, so the output is a structured assessment a founder can check claim by claim, not a chat transcript.

**Project Factory.** Projects, tickets, milestones, and linked GitHub repositories (existing ones, or one WeStride creates for you). Muse drafts the backlog and roadmap from the idea and ranks the open tickets. A member picks a ticket and a place to run it, and Muse Code takes it from there: it works the ticket in an isolated sandbox on the member's own Vercel or Modal account, or on their own computer, or on a supporter's pledged computer, streams the work log live into the ticket, and opens a pull request on GitHub when it is done.

**Agent Studio.** Standing Muse agents that belong to a project, with their own instructions, backlog, schedule, model choice, and usage ledger. An agent with a repository works tickets as Muse Code on a schedule; an agent without one answers with researched, cited reports. Scheduled work runs from a cron route, so a product keeps moving after launch without anyone opening the site.

### WePledge™

The funding layer, and the part that has no direct analogue elsewhere in the field. A supporter who believes in an idea can, without joining the team:

- **Pledge tokens.** Their Meta API key pays for the team's agents, up to a cap they set. Because every Meta Model API call is billed to the key that made it, the usage ledger shows exactly where each pledged token went.
- **Pledge compute.** They link their computer by running one command. The supporter runner is a Docker container that picks up the team's jobs, runs Muse Code on a fresh clone with no access to the host's files, and sends the changes back; WeStride commits them and opens the pull request. It works on the supporter's Meta key or on an open-weight model through Ollama with no API key at all.
- **Pledge capital.** Follow the team's own links to wherever they raise money. WeStride never collects or holds funds, so it is not a payments business and carries none of that risk.

### Around the studios

Free one-to-one Mentorship, an AI Academy with tracks and lessons, a public REST API with an OpenAPI explorer, an MCP server so other agents can drive WeStride, Slack, Discord, and WhatsApp bots, iOS and Android apps (Expo), an admin portal, and WeStride Cloud, a funded balance for members who have no Meta, Vercel, or Modal account of their own.

### By the numbers

- 98 commits in nine days, one author
- 7 apps and 4 shared packages in a Turborepo (`apps/web`, `admin`, `api`, `mcp`, `mobile`, `runner`, `design`; `packages/db`, `api-client`, `runner-protocol`, `theme`)
- 31 database migrations
- 42 unit tests across 8 files (`bun test`)
- 5 Meta models in production use, plus open weights through Ollama

## 3. How it uses Meta's models

Every AI job in WeStride is a Meta Model API call or a Muse Code run. WeStride has no server-side key for member work: members connect their own Meta account, with the same OAuth device flow Muse Code uses or by pasting a key from dev.meta.ai, and the key is used only for the call it arrives with. Each request's usage block is metered and shown to the member as an estimated cost.

| Capability | Where it is used | Beyond a basic integration |
| --- | --- | --- |
| **Muse Spark 1.3** via the Responses API | Every advisor, evaluation, synthesis, backlog, roadmap, ticket ranking, and agent report | Configurable reasoning effort per job; the Contributor variant is offered as a 90%-cheaper option with the trade-off explained to the member |
| **Muse Wonder 1.0** | Deeper evaluation pass a member can opt into; selectable per standing agent | A Spark-to-Wonder ladder lets members match spend to stakes: a full advisory team runs cheaply on every idea, and Wonder is paid for only when it is worth it |
| **`web_search` tool** with `web_search_call.results` included | Idea Workshop research, agent reports | Advisors cite their sources, so an assessment is a set of checkable claims rather than an opinion |
| **`json_schema` structured output** | Every advisor, planner, ranker, and synthesis step | One thin client serves a dozen advisor personas, a planner, and a ranker because every one of them returns validated JSON against a schema |
| **Usage metering** (`usage`, reasoning tokens, web-search call counts) | Every request; the per-agent usage ledger; WePledge token caps | Metering is what makes a token pledge enforceable: a supporter's cap is checked against real spend |
| **Muse Code**, headless (`muse exec --json`) | Project Factory ticket runs, Agent Studio code jobs | Runs unattended inside Vercel Sandbox microVMs, Modal Sandboxes, and supporters' Docker containers; every event is streamed back as a live work log; the result is a pull request on GitHub. Muse Code is the product's engineering team, not the developer's assistant |
| **Muse Image 1.0** | A picture for every idea, project, and agent | Spark writes the image prompt from the entity's own description, then Image renders it |
| **Muse Voice Transcribe 1.0** | Dictation on every long-text field on web and mobile | Billed to the member's own key like everything else |
| **Meta device sign-in** (`auth.meta.com/oidc/device`) | Connecting a Meta account | Members sign in the way Muse Code does instead of handling raw keys |
| **Open weights through Ollama** | Supporter runners | A supporter with a GPU and no API budget can still work a team's jobs; the runner offers whichever local models Ollama reports as tool-capable and writes the Muse Code provider settings for them |

What surprised me while building: Muse Code holds up as a headless engine. Given a ticket, a clean clone, and a sandbox, it works the branch and produces a reviewable diff with no human in the loop, which is what lets Project Factory and Agent Studio ship code rather than suggest it.

## 4. How it fits the hackathon

**Problem statement.** Push the Frontier, in software: WeStride gives a solo founder capabilities they did not have, namely a research team, a planner, engineers who finish tickets unattended, and a way for other people to fund those engineers with tokens and compute. It also serves Build for Your World, since it is the tool I wanted for my own ideas, but the frontier framing is the honest one: the loop from idea to merged pull request to standing agents, funded without money, was not possible before models that can research with citations, return strict JSON, and run a coding agent headless.

**Rules.**

- Open source: the repository is public under Apache 2.0.
- New work only: the repository was created at kickoff. Every commit is inside the building window, and the README dates each feature's first commit.
- Team size: one.
- Demo requirements: the video and the live site show only work built during the event, because there is no other work.
- Not an anti-project: not a RAG wrapper, not an image analyzer, not a chatbot. It is an agent workflow with side effects in the real world (repositories, pull requests, scheduled jobs, pledged spend).

**Bonus categories it is a candidate for.** Best Agentic Use-Case (agents that research, plan, write code, open pull requests, and run on schedules with spend caps), Best Build on Meta Open Weight Models (supporter runners on Ollama), and Best Creative Build (Muse Image and Muse Wonder in the product).

## 5. Against the rubric

### Impact (30%)

Who benefits: anyone with an idea and no team, which is most people with ideas. Students, first-time founders, people inside companies with a side project, open-source maintainers with a backlog and no contributors, and non-profits and game studios of one. The Idea Workshop has advisor teams for each of those shapes.

Who else benefits: supporters. WePledge gives people who want to help a project a way to do it that is cheaper and more direct than money. A $20 token pledge with a cap buys a measurable amount of engineering, and the ledger proves it was spent on the thing they backed. A spare computer becomes a contribution.

Could it become something people use: it already is something people can use. It is live, it has a free path (bring your own key), a funded path (WeStride Cloud), mobile apps, bots in the chat tools people already open, and an API and MCP server so it composes with other tools. Mentorship and the Academy give it a reason to come back between ideas.

### Use of Meta AI tooling (25%)

The table in section 3 is the answer. Five Meta models and the open-weight path are in production use, each for the job it is best at, and the integration goes past "call the model": cited web search, strict schemas shared across a dozen personas, per-request metering that makes pledges enforceable, device-flow sign-in, a Spark-to-Wonder cost ladder, Spark writing prompts for Image, and Muse Code run headless as the product's engineering team in three different kinds of sandbox. Bring-your-own-key is not a workaround; it is the design that makes WePledge possible, and it means every Meta API call in WeStride is paid for by the person who chose to make it.

### Technical depth and execution (20%)

- A Turborepo with 7 apps and 4 shared packages, typed end to end, with one schema (`packages/db`) and one API client shared by web, mobile, and MCP.
- Three execution substrates for Muse Code behind one protocol: Vercel Sandbox microVMs on the member's account, Modal Sandboxes on the member's or WeStride's account, and the supporter runner in Docker on arbitrary machines, including no-key Ollama runs. A sandbox posts its work log back to the site and the member watches it live.
- Security choices made deliberately: members' Meta, GitHub, Vercel, and Modal tokens are encrypted at rest with separate keys; the supporter runner never receives write credentials, clones public repositories anonymously, gets a short-lived read-only token only for the owner's own private repositories, and wipes its work directory after every job; WeStride never holds money.
- A GitHub App that commits and opens pull requests as a bot, imports public repositories, and can create repositories during project creation.
- Scheduled agents with a cron route, spend ledgers, and caps; WeStride Cloud with Stripe Checkout and a code-redemption path; an admin portal gated by Clerk role metadata.
- 42 unit tests on the domain rules (ticket state machine, agent rules, claim rules, pricing, import parsing), Storybook for the design system, Astryx components with no raw CSS.

### Demo (25%)

The product is live at westride.org and the [demo video](https://youtu.be/YfN8RQ1bZfs) walks the whole loop: advisors research an idea and disagree, Muse turns it into a backlog, Muse Code works a ticket in a sandbox with the log streaming, a pull request opens on GitHub, a supporter pledges tokens with a cap and the ledger shows the spend, and a standing agent delivers a scheduled report. Judges can reproduce any step on the live site with their own Meta key.

## 6. Why first place in the Startup track

The Startup rubric asks a harder question than the Indie one: not just "is this impressive" but "is this a company." Here is the one-sentence answer, then the evidence.

**WeStride is a marketplace where ideas are funded with AI tokens and compute instead of money, and where the agents those pledges pay for do the work of turning the idea into a product.**

**There is a buyer and a price, and both are already in the code.** The free path is bring-your-own-key, which has zero marginal cost to WeStride. The paid path is WeStride Cloud: members without their own accounts fund a balance through Stripe and run Muse and sandboxes on WeStride's accounts at Meta's list price plus a markup (default 20%) and a per-vCPU-hour compute price. This is the same model that works for every cloud reseller, applied to agent labor, and it is live in the repository today (`docs/westride-cloud.md`), not on a slide.

**The supply side costs nothing to acquire.** Every supporter who pledges a key or a computer adds capacity to the platform without WeStride buying it. Every idea that gets built adds a repository, a team, and a reason for more supporters to arrive. That is the two-sided loop a marketplace needs, and WePledge is the only mechanic in this hackathon's field that creates it without touching funds.

**The moat is the ledger.** Pledging tokens only works if the pledger can trust where they went. WeStride's per-request metering, per-agent ledgers, and caps are what make a pledge an enforceable promise rather than a donation. Once a founder's projects, supporters, agents, and usage history live in WeStride, moving them is expensive.

**It is already shaped like a company.** A live product with a domain, a brand, terms of service and a privacy policy, mobile apps, an admin portal, a public API with an explorer, an MCP server, chat-platform bots, a design system with its own Storybook, and a documented revenue path. Most Startup-track entries show a product; this one shows the surface area a company needs on day one.

**It is distribution-ready for Meta's ecosystem.** WeStride turns every Meta API credit into demand for Meta's models from people who could not otherwise justify a developer account, and it makes Muse Code visible as a product engine rather than a developer tool. A platform whose unit of account is Meta tokens is a platform whose growth is Meta's growth.

**One person did this in nine days, on Meta's models.** That is not only a point about effort. It is the strongest available evidence for the thesis: that the gap between an idea and a product has collapsed to the point where the binding constraints are the team, the plan, the engineers, and the money, and that all four can be supplied by agents and pledges. WeStride is both the proof and the product.

## 7. What is not done

Judges should know the edges.

- There is no evaluation harness yet. Advisor agreement rates across many ideas, and ticket runs attempted versus pull requests opened versus pull requests mergeable, are the metrics the next week should produce.
- Muse Code's output is as good as the ticket and the repository it is given. WeStride improves the ticket (the planner writes them) and controls the sandbox, but a reviewer still merges the pull request, and should.
- The supporter runner offers whichever tool-capable models the supporter's Ollama has pulled; model quality varies and the runner's README is frank about which ones actually call tools well.
- Device-flow sign-in for Meta and Vercel uses flows those vendors do not document for third parties, so both are optional and key pasting is always available.

## 8. Verify it yourself

1. Open [westride.org/judge](https://www.westride.org/judge) and press **Explore WeStride as a Hackathon Judge**. No sign-up: it signs you in to a shared judge account that already holds ideas, projects, and agents and is funded through WeStride Cloud, so every step below runs on WeStride's own Meta and compute accounts. (Prefer your own account? Sign in normally and connect your Meta account in Settings, by device sign-in or a key from dev.meta.ai.)
2. Create an idea in the Idea Workshop and run the advisory team. Expand an advisor to see its cited sources and the request's cost.
3. Create a project from the idea, let Muse draft the backlog, link or create a GitHub repository, connect Vercel or Modal, and run a ticket. Watch the work log and open the pull request it produces.
4. In Agent Studio, create a standing agent with a schedule and a cap, and read its usage ledger after it runs.
5. In WePledge, pledge tokens to any idea with a cap, or run the one-line installer to link a computer and watch it pick up a job.
6. Clone the repository and follow [Getting Started](README.md#getting-started); `bun test` runs the unit tests.

---

## Appendix: submission form answers

The answers entered on the Cerebral Valley submission platform.

### Project description

WeStride.org takes an idea from a hunch to a shipped product with AI agents of its own, and lets anyone back it with tokens or compute instead of money. Most ideas die between "this could work" and a first pull request because the person who has them lacks a team to pressure-test it, a plan to turn it into tickets, engineers to work those tickets, and money to pay for any of it. WeStride fills each of those gaps with agents running on Meta's models.

An idea moves through three studios. In Idea Workshop, a team of Muse advisors with specialist briefs researches it with live web search and cited sources, evaluates it in parallel, and synthesizes where they agree and disagree. In Project Factory, Muse drafts the backlog and roadmap, then Muse Code takes a ticket, works it in an isolated sandbox, streams the log live, and opens a pull request. In Agent Studio, standing Muse agents with their own instructions, schedule, and usage ledger keep the product moving after launch.

WePledge solves the funding problem without touching money: supporters pledge their Meta API key to pay for a team's agents up to a cap they set, pledge their own computer to run the team's jobs in an isolated container, or follow the team's capital links. WeStride never holds funds. Around the studios are free Mentorship, an AI Academy, a public REST API, an MCP server, Slack/Discord/WhatsApp bots, and iOS and Android apps. Every line was written by one person during the hackathon, from an empty repository at kickoff, and is open source under Apache 2.0.

### Describe your use of Meta products to build the submitted project

Every AI job in WeStride is a call to the Meta Model API. Advisors, evaluations, synthesis, planning, ticket ranking, and agent reports all go through the Responses API on Muse Spark 1.3, with Muse Wonder 1.0 as the deeper evaluation pass a member can opt into. We use the web_search tool for research with cited sources, json_schema structured output so every advisor and plan returns validated JSON, configurable reasoning effort, and the usage block on each response to meter tokens and web-search calls and show members the estimated cost of every request.

Muse Code is our coding agent. We run it headless with muse exec --json inside Vercel Sandbox microVMs on the member's own account and inside supporters' Docker containers, stream every event back as a live work log, and open the pull request on GitHub when the ticket is done. Muse Image 1.0 renders a picture for every idea, project, and agent from a prompt Spark writes, and Muse Voice Transcribe 1.0 powers dictation on every long-text field across web and mobile.

Members connect their Meta account with the same device sign-in Muse Code uses or by pasting a key; the key is used only for the call it arrives with and never persisted in logs. Token pledges in WePledge are a supporter's Meta key spent on a team's jobs up to a cap. Supporter runners can also point Muse Code at open-weight models through Ollama so a job runs with no API key at all.

### Why are Meta's models important to your solution?

WeStride is an agent workflow, not a chat wrapper, and it needs several capabilities to hold together: grounded research, strict structured output, a coding agent that can finish a ticket unattended, and per-request billing. Meta's lineup covers all of them through one API. Spark's web search with citations turns Idea Workshop from "an AI said so" into claims a founder can check, and json_schema output lets a dozen advisors, a planner, and a ranker share a single thin client.

Muse Code is the reason the platform ships code rather than suggesting it. Project Factory and Agent Studio depend on a model that can run headless in a sandbox, work a branch, and open a reviewable pull request with no human in the loop. The Spark-to-Wonder ladder lets members match spend to stakes, running a full advisory team cheaply on every idea and paying for a deeper pass only when it is worth it.

Because every Meta API call is billed to the key that made it, a supporter can pledge their key to a team and know exactly what it will cost. That bring-your-own-key model is what makes WePledge possible, and open weights through Ollama extend it to supporters with a GPU and no API budget. Meta's models are the engine of each studio, the unit of account for backing an idea, and the reason one person could build the whole platform in nine days.
