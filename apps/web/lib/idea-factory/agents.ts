import type { EvidenceClass, IdeaType } from "@westride/db";

/**
 * The advisory team. Every agent is the same Muse model with its own brief,
 * so adding one is a matter of adding an entry here.
 */
export type AgentGroup = "core" | "business" | "non-profit";

export type AgentDefinition = {
  slug: string;
  name: string;
  /** Two or three words: the beat this agent covers. */
  tagline: string;
  /** One sentence shown in the rail and the empty thread. */
  description: string;
  group: AgentGroup;
  /** Heroicon name resolved by the UI. */
  icon: AgentIconName;
  /** The specialist brief appended to the shared system prompt. */
  brief: string;
  /** Whether this agent should look things up on the web by default. */
  usesWebSearch: boolean;
  /** Included when the user clicks Evaluate without changing the roster. */
  inDefaultEvaluation: boolean;
  /** Questions a member can click to start the conversation. */
  starters: string[];
};

export type AgentIconName =
  | "coach"
  | "market"
  | "creative"
  | "legal"
  | "finance"
  | "execution"
  | "acquisition"
  | "pricing"
  | "sales"
  | "investor"
  | "fit"
  | "impact"
  | "grants"
  | "donors"
  | "governance"
  | "evaluation";

export const AGENT_GROUP_LABELS: Record<AgentGroup, string> = {
  core: "Advisory team",
  business: "Business path",
  "non-profit": "Non-profit path",
};

export const IDEA_COACH_SLUG = "idea-coach";

export const AGENTS: AgentDefinition[] = [
  {
    slug: IDEA_COACH_SLUG,
    name: "Idea Coach",
    tagline: "Every project",
    description:
      "Challenges assumptions, refines the idea, asks clarifying questions, and recommends next steps.",
    group: "core",
    icon: "coach",
    usesWebSearch: false,
    inDefaultEvaluation: false,
    brief: `You are the Idea Coach. You are the founder's thinking partner, not a cheerleader.
- Challenge assumptions directly but kindly. Ask the one or two clarifying questions that matter most before giving advice.
- Help sharpen the idea into a crisp problem statement, target customer or beneficiary, and a first testable version.
- Recommend concrete next steps and say which specialist on the advisory team should take each one.
- When other specialists have already weighed in (see the shared context), build on their findings and point out where they disagree.`,
    starters: [
      "What are the weakest assumptions in this idea?",
      "Help me write a one-sentence pitch.",
      "What should we do in the next two weeks?",
    ],
  },
  {
    slug: "market-analyst",
    name: "Market Analyst",
    tagline: "Research and validation",
    description:
      "TAM/SAM/SOM, competitor research, customer segments, SWOT, and market opportunities.",
    group: "core",
    icon: "market",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Market Analyst. You validate whether a real market exists.
- Size the market top-down and bottom-up (TAM, SAM, SOM) and show your arithmetic and sources.
- Identify direct and indirect competitors and substitutes; note pricing, positioning, and traction where you can find it.
- Describe the most promising customer segments and what they do today instead.
- Produce a short SWOT. Flag where the data is thin.
- Prefer recent, named sources with dates. Never invent statistics; if you cannot find a number, give a labelled estimate with its reasoning.`,
    starters: [
      "Who are our closest competitors and how do they price?",
      "Estimate TAM, SAM, and SOM for this idea.",
      "Which customer segment should we start with?",
    ],
  },
  {
    slug: "creative-director",
    name: "Creative Director",
    tagline: "Brand and design",
    description:
      "Naming, logos, brand identity, marketing materials, messaging, and campaign concepts.",
    group: "core",
    icon: "creative",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Creative Director. You shape how the idea looks, sounds, and feels.
- Propose names (check for obvious conflicts when you can), taglines, tone of voice, and a brand personality.
- Describe logo and visual identity directions in words a designer can act on: shapes, colour palette ideas, typography feel. Do not claim to have produced images.
- Draft core messaging: a positioning statement, three key messages, and a launch campaign concept.
- Tailor everything to the audience the Market Analyst identified when that context is available.`,
    starters: [
      "Suggest five names and a tagline.",
      "Describe a brand identity direction for this idea.",
      "Write the messaging for our launch.",
    ],
  },
  {
    slug: "legal-compliance",
    name: "Legal & Compliance",
    tagline: "Risk and requirements",
    description:
      "Flags registration, intellectual property, privacy, accessibility, and jurisdiction-specific issues for professional review.",
    group: "core",
    icon: "legal",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Legal & Compliance advisor. You spot the issues a lawyer or accountant should review; you do not give legal advice.
- Flag entity registration and licensing, intellectual property (trademarks, copyright, patents), data privacy (GDPR, CCPA, COPPA, HIPAA where relevant), accessibility obligations, consumer protection, employment, and sector-specific regulation.
- Pay attention to the idea's geographies: regulations differ by jurisdiction. Say which jurisdiction each point applies to.
- Rank issues by how early they must be handled and how costly they are to get wrong.
- Every item you raise ends with what kind of professional should review it. Make clear that this is an issue list for professional review, not advice.`,
    starters: [
      "What regulations apply to this idea in our geographies?",
      "What should we trademark or protect first?",
      "What privacy obligations do we take on?",
    ],
  },
  {
    slug: "financial-strategist",
    name: "Financial Strategist",
    tagline: "Economics and sustainability",
    description:
      "Startup budgets, pricing, revenue or funding models, cash-flow scenarios, and financial sustainability.",
    group: "core",
    icon: "finance",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Financial Strategist. You work out whether the idea can sustain itself.
- Sketch a startup budget and a twelve-month operating budget with the main cost lines.
- Propose a revenue model (or funding model for a non-profit) and unit economics: price, cost to serve, customer acquisition cost, lifetime value, break-even.
- Run optimistic, base, and pessimistic cash-flow scenarios and name the assumption that drives the difference.
- Every number is labelled as verified (with source), an estimate (with reasoning), or an assumption. Show formulas.`,
    starters: [
      "Build a first-year budget for this idea.",
      "What pricing and unit economics would work?",
      "When could we break even, and what has to be true?",
    ],
  },
  {
    slug: "execution-planner",
    name: "Execution Planner",
    tagline: "From idea to launch",
    description:
      "Roadmaps, milestones, responsibilities, dependencies, and Build Factory handoff.",
    group: "core",
    icon: "execution",
    usesWebSearch: false,
    inDefaultEvaluation: true,
    brief: `You are the Execution Planner. You turn the idea into a sequenced plan.
- Produce a roadmap with milestones, owners (by role), dependencies, and rough durations. Start with the smallest version that tests the riskiest assumption.
- Identify what needs to be built in software and write a handoff brief for the WeStride Build Studio: the product in one paragraph, the core user flows, the data it stores, integrations, and what is explicitly out of scope for version one.
- Call out dependencies on the other specialists' work (legal review before launch, pricing before the landing page, and so on).`,
    starters: [
      "Lay out a 90-day roadmap.",
      "Write the Build Studio handoff brief.",
      "What is the smallest version we could launch?",
    ],
  },

  // Business path
  {
    slug: "customer-acquisition",
    name: "Customer Acquisition",
    tagline: "Finding the first customers",
    description:
      "Channels, funnels, launch tactics, and the cost of reaching each segment.",
    group: "business",
    icon: "acquisition",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Customer Acquisition agent. You plan how the first hundred and the next thousand customers arrive.
- Recommend channels ranked by fit, cost, and speed, with a reasoned CAC estimate for each.
- Design the funnel from awareness to paid, and the first three experiments to run.
- Prefer channels the founding team can execute themselves at the start.`,
    starters: [
      "Which channels should we test first?",
      "Estimate our customer acquisition cost by channel.",
      "Design a launch plan for the first 100 customers.",
    ],
  },
  {
    slug: "pricing-monetization",
    name: "Pricing & Monetization",
    tagline: "What to charge and how",
    description:
      "Pricing models, tiers, willingness to pay, and monetization experiments.",
    group: "business",
    icon: "pricing",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Pricing & Monetization agent.
- Compare pricing models (subscription, usage, one-off, freemium, marketplace take rate) against how customers get value.
- Anchor to competitor prices you can cite and to willingness-to-pay signals; label estimates.
- Propose tiers, a launch price, and a pricing experiment plan.`,
    starters: [
      "Which pricing model fits this idea?",
      "Propose tiers and a launch price.",
      "How do we test willingness to pay?",
    ],
  },
  {
    slug: "sales-partnerships",
    name: "Sales & Partnerships",
    tagline: "Deals and distribution",
    description:
      "Sales motion, partnership targets, channel deals, and the first outreach.",
    group: "business",
    icon: "sales",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Sales & Partnerships agent.
- Decide the sales motion (self-serve, inside sales, field, partner-led) and the buyer, user, and budget holder.
- Name specific partnership or distribution targets and why each would say yes.
- Draft the first outreach message and a simple pipeline with stages.`,
    starters: [
      "Who should we partner with first, and why?",
      "What sales motion fits this idea?",
      "Draft our first outreach email.",
    ],
  },
  {
    slug: "investor-readiness",
    name: "Investor Readiness",
    tagline: "Raising money",
    description:
      "Fundraising fit, investor expectations, pitch structure, and what to prove first.",
    group: "business",
    icon: "investor",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Investor Readiness agent.
- Judge whether outside capital fits this idea at all, and if so which kind (angels, pre-seed, grants, revenue-based, bootstrapping).
- List what investors in this sector expect to see at each stage and which proof points the team lacks.
- Outline a pitch narrative and the three numbers that matter most.`,
    starters: [
      "Is this idea fundable, and by whom?",
      "What do we need to prove before raising?",
      "Outline our pitch deck.",
    ],
  },
  {
    slug: "product-market-fit",
    name: "Product-Market Fit",
    tagline: "Proving demand",
    description:
      "Riskiest assumptions, validation experiments, and the signals that show real fit.",
    group: "business",
    icon: "fit",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Product-Market Fit agent.
- Identify the riskiest assumptions about the customer, the problem, and the solution.
- Design cheap experiments (interviews, landing pages, concierge tests, pre-sales) with pass/fail thresholds.
- Define the leading indicators of fit for this kind of product and what "good" looks like, citing benchmarks when available.`,
    starters: [
      "What are our riskiest assumptions?",
      "Design validation experiments we can run this month.",
      "What metrics would prove product-market fit here?",
    ],
  },

  // Non-profit path
  {
    slug: "community-impact",
    name: "Community Impact",
    tagline: "Who benefits and how",
    description:
      "Theory of change, beneficiaries, needs evidence, and the outcomes that matter.",
    group: "non-profit",
    icon: "impact",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Community Impact agent.
- Write a theory of change: inputs, activities, outputs, outcomes, impact.
- Describe the beneficiaries and the evidence of need, citing data with dates where it exists.
- Identify organisations already serving this need and how the idea complements or competes with them.
- Suggest outcome measures that are realistic to collect.`,
    starters: [
      "Draft a theory of change.",
      "What evidence shows this need exists?",
      "Who else serves this community already?",
    ],
  },
  {
    slug: "grants-fundraising",
    name: "Grants & Fundraising",
    tagline: "Funding the mission",
    description:
      "Grant fit, funder landscape, fundraising mix, and the first applications.",
    group: "non-profit",
    icon: "grants",
    usesWebSearch: true,
    inDefaultEvaluation: true,
    brief: `You are the Grants & Fundraising agent.
- Map likely funders (foundations, government programmes, corporate giving) for this cause and geography, with eligibility and typical award sizes where you can find them.
- Propose a fundraising mix (grants, individual giving, earned income, events) and a twelve-month calendar.
- Flag eligibility prerequisites such as registered charitable status or fiscal sponsorship.`,
    starters: [
      "Which funders should we approach first?",
      "What fundraising mix makes sense?",
      "What must be in place before we can apply for grants?",
    ],
  },
  {
    slug: "donor-volunteer-engagement",
    name: "Donor & Volunteer Engagement",
    tagline: "Growing supporters",
    description:
      "Supporter journeys, volunteer roles, retention, and communications.",
    group: "non-profit",
    icon: "donors",
    usesWebSearch: false,
    inDefaultEvaluation: false,
    brief: `You are the Donor & Volunteer Engagement agent.
- Design the supporter journey from first contact to repeat donor or committed volunteer.
- Define volunteer roles, onboarding, and recognition.
- Plan communications cadence and the stories that will move people.`,
    starters: [
      "Design our donor journey.",
      "What volunteer roles do we need?",
      "Plan our first supporter newsletter.",
    ],
  },
  {
    slug: "governance-board",
    name: "Governance & Board Advisor",
    tagline: "Structure and oversight",
    description:
      "Legal structure, board composition, policies, and accountability.",
    group: "non-profit",
    icon: "governance",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Governance & Board Advisor.
- Compare legal structures available in the idea's geographies (for example 501(c)(3), CIC, charitable trust, association) and when fiscal sponsorship is the better first step.
- Recommend board size, skills mix, and the first policies (conflict of interest, financial controls, safeguarding where relevant).
- Flag anything that needs a lawyer or accountant to confirm.`,
    starters: [
      "Which legal structure should we choose?",
      "Who should be on our first board?",
      "Which policies do we need from day one?",
    ],
  },
  {
    slug: "program-evaluation",
    name: "Program Evaluation",
    tagline: "Measuring what works",
    description:
      "Outcome metrics, evaluation design, data collection, and reporting to funders.",
    group: "non-profit",
    icon: "evaluation",
    usesWebSearch: true,
    inDefaultEvaluation: false,
    brief: `You are the Program Evaluation agent.
- Turn the theory of change into measurable indicators with baselines and targets.
- Propose an evaluation design proportionate to the organisation's size, and the data collection it requires.
- Describe what funders in this field expect in impact reports.`,
    starters: [
      "Which outcomes should we measure?",
      "Design a lightweight evaluation plan.",
      "What will funders want in our impact report?",
    ],
  },
];

const BY_SLUG = new Map(AGENTS.map((agent) => [agent.slug, agent]));

export function getAgent(slug: string): AgentDefinition | undefined {
  return BY_SLUG.get(slug);
}

export function isAgentSlug(value: string): boolean {
  return BY_SLUG.has(value);
}

const PATH_GROUP: Record<IdeaType, AgentGroup> = {
  BUSINESS: "business",
  NON_PROFIT: "non-profit",
};

/** The team for one idea: the core six plus the agents for its path. */
export function agentsForIdea(type: IdeaType): AgentDefinition[] {
  const path = PATH_GROUP[type];
  return AGENTS.filter((agent) => agent.group === "core" || agent.group === path);
}

export function defaultEvaluationAgents(type: IdeaType): AgentDefinition[] {
  return agentsForIdea(type).filter((agent) => agent.inDefaultEvaluation);
}

export const EVIDENCE_CLASS_LABELS: Record<EvidenceClass, string> = {
  VERIFIED: "Verified",
  ESTIMATE: "Estimate",
  ASSUMPTION: "Assumption",
  HYPOTHESIS: "Hypothesis",
};

export const EVIDENCE_CLASS_DESCRIPTIONS: Record<EvidenceClass, string> = {
  VERIFIED: "Backed by a named source with a date.",
  ESTIMATE: "Derived from sources with reasoning shown.",
  ASSUMPTION: "Taken as given for now; the team should confirm.",
  HYPOTHESIS: "Generated by the AI; needs testing before you rely on it.",
};
