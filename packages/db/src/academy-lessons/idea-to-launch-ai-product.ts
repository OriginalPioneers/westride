import { lessonVideo, type AcademyTrackLessons } from "./types";

export const ideaToLaunchAiProduct: AcademyTrackLessons = {
  trackSlug: "idea-to-launch-ai-product",
  lessons: [
    {
      slug: "the-capstone-journey",
      title: "The Capstone Journey",
      summary:
        "What you will build over this track, how the stages fit together, and how to set yourself up to finish.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## The goal

By the end of this track you will have a working AI product in the hands of real users, with evidence of whether it helps them and a plan for what comes next. Not a demo. A small thing that someone uses more than once.

## The stages

1. **Find a problem worth solving** and write it down precisely.
2. **Know your audience**: who has the problem, how they cope today.
3. **Value proposition and positioning**: why yours, why now.
4. **Design a trustworthy AI experience** with oversight built in.
5. **Prototype with Llama**: the smallest thing that delivers the value.
6. **Test with real users** and learn what you got wrong.
7. **Safety, privacy, and oversight** before anyone outside your circle uses it.
8. **Launch planning**: channel, message, and the first hundred users.
9. **Feedback, iteration, and what's next.**

[artifact:capstone-map]

## Setting yourself up

- **Pick a scope you can finish in weeks, not months.** A narrow product that works beats a broad one that does not.
- **Create your idea in Idea Studio.** You will use its advisory team at several points, and it keeps your notes in one place.
- **Find a mentor** through WeStride Mentorship. One conversation at the right moment saves weeks.
- **Timebox each stage.** A week each is a reasonable default.

## What you already have

Fundamentals, prompting, building, agents, creative tools, and real-world patterns. This track is where you apply them together.

### Try it

Write one sentence: "I will build ___ for ___ so they can ___." Save it in Idea Studio. You will revise it, and that is the point.`,
      keyTakeaways: [
        "The deliverable is a small product real people use, with evidence and a next plan.",
        "Nine stages, timeboxed, from problem to iteration.",
        "Use Idea Studio and Mentorship as you go; narrow scope wins.",
      ],
      artifacts: [
        lessonVideo(
          "The Capstone Journey",
          "Motivating kickoff, 4 minutes. The nine stages appear as a path; a founder's one-sentence idea is written and revised across the stages in a quick montage; Idea Studio and Mentorship are introduced as supports.",
          240,
        ),
        {
          key: "capstone-map",
          kind: "DIAGRAM",
          title: "The nine capstone stages",
          brief:
            "Numbered path with nine stops: Problem, Audience, Value & positioning, Trustworthy design, Prototype, User testing, Safety & oversight, Launch, Iterate. Small checkpoint flags where Idea Studio and a mentor are suggested.",
        },
      ],
    },
    {
      slug: "finding-a-problem-worth-solving",
      title: "Finding a Problem Worth Solving",
      summary:
        "Choosing a problem that is real, frequent, and painful, and writing a problem statement you can test.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Start with problems, not features

"An AI that writes grant applications" is a feature. "Small non-profits lose funding because grant applications take forty hours they do not have" is a problem. Problems lead to products people want; features lead to products looking for a purpose.

## Signs of a good problem

- **Frequent**: happens weekly or more.
- **Painful**: people complain, pay, or build workarounds.
- **Specific**: you can name who has it and when.
- **Reachable**: you can talk to those people this month.
- **AI-shaped**: language- or pattern-heavy, reviewable (from the AI in Action track).

## Where to look

Your own frustrations. Communities you belong to. Jobs you or friends have held. Public forums where people describe the same struggle repeatedly. Local organizations with more mission than staff.

[artifact:problem-statement]

## The problem statement

Write it in this form:

"{Specific people} struggle to {task} because {root cause}. Today they {current workaround}, which costs them {time, money, or outcome}."

Every blank must be filled with something you could check by talking to five people.

## Test it

Talk to five people who should have the problem. Ask how they handle it today and what it costs them. Do not pitch. If three of five describe the pain unprompted, proceed. If not, revise or pick another problem. Idea Studio's advisory agents can help you stress-test the statement, but real conversations are the evidence.

### Try it

Write your problem statement and schedule five conversations this week.`,
      keyTakeaways: [
        "Lead with a problem, not a feature.",
        "Good problems are frequent, painful, specific, reachable, and AI-shaped.",
        "Write a fill-in-the-blanks statement and validate it with five unprompted conversations.",
      ],
      artifacts: [
        lessonVideo(
          "Finding a Problem Worth Solving",
          "Explainer, 4 minutes. A feature idea is reframed into a problem statement on a whiteboard; the five signs are checked off; a quick role-play shows a non-pitching customer conversation.",
          240,
        ),
        {
          key: "problem-statement",
          kind: "IMAGE",
          title: "Problem statement template",
          brief:
            "Fill-in-the-blanks card: '{Specific people} struggle to {task} because {root cause}. Today they {workaround}, which costs them {cost}.' with one completed example beneath about small non-profits and grant applications.",
        },
      ],
    },
    {
      slug: "know-your-audience",
      title: "Know Your Audience",
      summary:
        "Interviewing, observing, and mapping how people cope today so your product fits their reality.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Who, exactly

"Everyone" is not an audience. Narrow to a group you can describe in a sentence: "volunteer coordinators at community gardens with fewer than fifty members". You can widen later; you cannot build for a blur.

## Interviewing well

- Ask about the last time they did the task, step by step. Specific memories beat general opinions.
- Ask what they tried and what went wrong.
- Ask what they would do if your product did not exist. The honest answer tells you the real competition.
- Listen more than you talk. Record with permission; summarize with an LLM afterward.

## Observe if you can

Watch someone do the task. You will see steps, tools, and frustrations they forgot to mention.

[artifact:journey-map]

## Map the journey

Draw the task from trigger to outcome: steps, tools used, time spent, emotions, pain points. Mark where AI could remove a step or catch a mistake. The biggest pain point with the clearest AI fit is your starting feature.

## Watch for

- **Enthusiasm without behaviour**: "I'd definitely use that" means little. Current workarounds and money spent mean a lot.
- **Your own bias**: you are not the user, even when you share the problem.
- **Gatekeepers**: the person with the pain may not be the person who decides. Learn both.

## Capture it

Write a one-page audience profile: who, context, current process, pain points, what they value, how they decide. Put it in Idea Studio; your advisory agents and mentor will use it.

### Try it

Run three interviews using the questions above and draw the journey map. Circle the step your first feature will change.`,
      keyTakeaways: [
        "Narrow to a group you can describe in one sentence.",
        "Ask about specific recent instances, not opinions; observe when possible.",
        "Map the journey and pick the biggest pain point with the clearest AI fit.",
      ],
      artifacts: [
        lessonVideo(
          "Know Your Audience",
          "Explainer, 4 minutes. An interview role-play with good and bad questions annotated; the narrator then draws a journey map and circles the first feature. Emphasizes behaviour over enthusiasm.",
          240,
        ),
        {
          key: "journey-map",
          kind: "DIAGRAM",
          title: "A user journey map",
          brief:
            "Horizontal journey with six steps from trigger to outcome; rows beneath for tools, time, emotion (simple face icons), and pain points; one step circled 'first feature here' with an AI icon.",
        },
      ],
    },
    {
      slug: "value-proposition-and-positioning",
      title: "Value Proposition and Positioning",
      summary:
        "Saying clearly what your product does, for whom, and why it beats the alternative, including doing nothing.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## The value proposition

One sentence a user could repeat to a friend:

"For {audience} who {situation}, {product} {does what} so they {outcome}, unlike {alternative}."

Example: "For volunteer coordinators drowning in messages, PlotPal answers members' common questions from your garden's own rules so you get your evenings back, unlike a generic chatbot that makes things up."

## Why "unlike" matters

Your real competitor is usually the current workaround: a spreadsheet, a group chat, doing nothing. Name it. If you cannot explain why yours is better than the workaround, you do not have a product yet.

[artifact:value-prop]

## Positioning choices

- **Who first**: the narrowest audience that will love it.
- **What category**: what shelf people put you on. "A support assistant for community groups" sets expectations differently from "an AI platform".
- **Which benefit leads**: time, money, peace of mind, quality. Pick one.
- **What you are not**: saying no clarifies yes.

## AI in the message

Lead with the outcome, not the technology. "Answers members' questions from your rules" beats "powered by Llama". Mention AI where it builds trust (privacy, grounding, open models) and where honesty requires it.

## Test the message

Show the sentence to five people from your audience. Ask them to say it back in their own words. If they cannot, simplify. Idea Studio's marketing advisor can help you draft variants; your audience picks the winner.

### Try it

Write three versions of your value proposition with different leading benefits. Test them with three people each.`,
      keyTakeaways: [
        "State audience, situation, what it does, the outcome, and the alternative in one sentence.",
        "Your real competitor is the current workaround; explain why you beat it.",
        "Lead with outcomes, mention AI where it builds trust, and test the message with real people.",
      ],
      artifacts: [
        lessonVideo(
          "Value Proposition and Positioning",
          "Explainer, 4 minutes. The template fills in live for the garden example; three variants are read aloud and a small audience panel repeats them back; the clearest wins.",
          240,
        ),
        {
          key: "value-prop",
          kind: "IMAGE",
          title: "Value proposition template",
          brief:
            "Card: 'For {audience} who {situation}, {product} {does what} so they {outcome}, unlike {alternative}.' with the PlotPal example filled in beneath. Each blank colour-coded.",
        },
      ],
    },
    {
      slug: "designing-trustworthy-ai-experiences",
      title: "Designing Trustworthy AI Experiences",
      summary:
        "Interaction patterns that set expectations, show uncertainty, enable correction, and keep people in control.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Trust is designed, not declared

Users trust AI products that behave predictably, admit uncertainty, and let them fix mistakes easily. These are design decisions you make before writing a prompt.

## Patterns that build trust

- **Set expectations up front**: what it can do, what it cannot, and that it is an AI.
- **Show sources**: citations and links for factual answers. Grounding made visible.
- **Express uncertainty**: "I'm not sure, here is what I found" beats a confident guess.
- **Preview before acting**: show what will happen and let the user confirm.
- **Easy correction**: edit the output, regenerate with a note, or report a problem in one tap.
- **Graceful handoff**: a clear path to a human or a manual option.
- **Memory the user can see**: what the product remembers, with edit and delete.

[artifact:trust-patterns]

## Patterns that erode trust

Pretending to be human. Hiding that an answer was generated. Forcing users through the AI with no alternative. Silent actions. Over-confident tone. Dark patterns that discourage opting out.

## Designing the first-run

The first minute decides whether people come back. Show a real example output immediately, make the first action tiny, and let users see value before asking for anything.

## Accessibility

Captions for audio, alt text for images, keyboard navigation, readable contrast, plain language. AI makes some of these easier to provide; there is no excuse to skip them.

## Prototype the conversation first

Before building, write out ten example exchanges by hand: the happy path, confusion, an error, a refusal, a handoff. This script becomes your system prompt, your golden set, and your demo.

### Try it

Write the ten exchanges for your product. Mark where each trust pattern appears.`,
      keyTakeaways: [
        "Expectation setting, visible sources, expressed uncertainty, previews, easy correction, and handoffs build trust.",
        "Avoid pretending to be human, hiding generation, forced AI paths, and silent actions.",
        "Script ten exchanges by hand before building; they become your prompt, tests, and demo.",
      ],
      artifacts: [
        lessonVideo(
          "Designing Trustworthy AI Experiences",
          "Design walkthrough, 4 minutes. A mock interface is annotated with each trust pattern; an anti-pattern version is shown briefly for contrast; the host scripts a few exchanges on paper.",
          240,
        ),
        {
          key: "trust-patterns",
          kind: "IMAGE",
          title: "Trust patterns in an AI interface",
          brief:
            "Annotated mock chat interface: 'AI assistant' label, answer with [1][2] source chips, an 'I'm not sure' phrase highlighted, a preview card with Confirm/Cancel, edit and report icons, a 'Talk to a person' link, and a 'What I remember' panel. Numbered callouts.",
        },
      ],
    },
    {
      slug: "prototyping-with-llama",
      title: "Prototyping with Llama",
      summary:
        "Build the smallest version that delivers the value, using what you learned in the building and agents tracks.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Smallest thing that delivers the value

Your prototype should do one job for one audience well enough to tell whether the value is real. Everything else is a distraction. Write down what you are deliberately leaving out.

## Choose your building blocks

From earlier tracks, you have:

- **Prompting** for the core behaviour and the system prompt (from your ten scripted exchanges).
- **RAG** if the product must answer from specific documents.
- **Structured outputs and tools** if it must take actions or feed other systems.
- **A bounded agent** only if the task genuinely needs exploration.
- **Multimodal** inputs if users will share images or voice.

Pick the fewest that deliver the value. Most first prototypes are a system prompt plus RAG.

[artifact:prototype-stack]

## Choose where Llama runs

Hosted API for speed of iteration. A small local model if privacy is central to your value proposition, which is a real differentiator for community and health-adjacent products. You can switch later; keep the model call behind one function.

## Build in this order

1. The core exchange working in a playground.
2. The same exchange from code with your system prompt.
3. Add grounding or tools, one at a time, testing each.
4. The thinnest interface that a real user can operate without you present.
5. Logging and a feedback button.

## Use the ecosystem

Open runtimes, Llama Stack, and community examples save days. WeStride's Build Studio and your mentor can unblock you when stuck.

## Timebox

Two weeks. If it is not usable by then, cut scope rather than extend time.

### Try it

Build the core exchange in a playground today and from code tomorrow. Share a screenshot with your mentor or in the community.`,
      keyTakeaways: [
        "Build the smallest version that tests the value; write down what you are leaving out.",
        "Most first prototypes are a system prompt plus RAG; add tools or agents only if needed.",
        "Keep the model call behind one function so you can switch hosting; timebox to two weeks.",
      ],
      artifacts: [
        lessonVideo(
          "Prototyping with Llama",
          "Build-along, 5 minutes. The garden assistant prototype is assembled in the five-step order with a recreated UI; the narrator cuts a tempting feature to stay in the timebox.",
          300,
        ),
        {
          key: "prototype-stack",
          kind: "DIAGRAM",
          title: "Choosing prototype building blocks",
          brief:
            "Stack of optional layers: System prompt (always), RAG (if documents), Structured outputs & tools (if actions), Bounded agent (if exploration), Multimodal input (if images/voice). Left side: 'hosted or local Llama' switch behind one function.",
        },
      ],
    },
    {
      slug: "testing-with-real-users",
      title: "Testing with Real Users",
      summary:
        "Running useful sessions, measuring what matters, and turning observations into decisions.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Five users teach you most of it

Recruit five people from your audience. Sessions of thirty minutes each. You will see the same big problems repeatedly by the third or fourth person.

## Running a session

- Give a realistic task, not a tour: "Find out whether you can plant tomatoes this month."
- Ask them to think aloud. Stay quiet. Do not help unless they are truly stuck.
- Watch where they hesitate, misread, or distrust the answer.
- Afterward ask: What did you expect? What surprised you? Would you use this next week? Why or why not?
- Record with permission; summarize with an LLM; keep the quotes.

[artifact:session-plan]

## Measure

- **Task success**: did they get the outcome?
- **Time to value**: how long until something useful appeared?
- **Trust signals**: did they check sources, re-ask, or give up?
- **Return intent**: a concrete next use they describe, not a polite yes.
- **Quality**: score the AI's answers against your golden set during the sessions.

## Turn observations into decisions

List every problem observed. Group them. Rank by how many users hit it and how badly. Fix the top three, then test again. Resist fixing everything; each round should have a clear goal.

## When the value is not there

If users complete tasks but do not care, the problem or the audience is wrong, not the interface. Go back two stages. This is normal and far cheaper to learn now than after launch.

## Share the learning

Update Idea Studio with what you learned and ask the advisory team what they would change. Discuss with your mentor. Outside eyes catch what you have grown blind to.

### Try it

Schedule five sessions this week. Write the task script and the five follow-up questions before the first one.`,
      keyTakeaways: [
        "Five realistic, think-aloud sessions reveal most major problems.",
        "Measure task success, time to value, trust signals, return intent, and answer quality.",
        "Fix the top three problems per round; if users succeed but do not care, revisit the problem and audience.",
      ],
      artifacts: [
        lessonVideo(
          "Testing with Real Users",
          "Explainer, 4 minutes. A test session is shown with the tester thinking aloud; the observer takes notes; problems are grouped on sticky notes and the top three chosen. Honest moment where a tester shrugs at the value.",
          240,
        ),
        {
          key: "session-plan",
          kind: "IMAGE",
          title: "User test session plan",
          brief:
            "One-page plan: Intro (2 min), Task 1, Task 2, Task 3 (20 min, think aloud), Five follow-up questions (8 min), Observer notes columns: hesitations, misreads, trust checks, quotes. Clean form layout.",
        },
      ],
    },
    {
      slug: "safety-privacy-and-oversight",
      title: "Safety, Privacy, and Oversight",
      summary:
        "The checklist to complete before anyone outside your circle uses your product.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Why now

Before launch is the last point where fixing a safety or privacy problem is cheap. After launch it is a crisis.

## Safety

- Input and output guards (Llama Guard or equivalent) tuned to your audience.
- Grounding so the product does not invent policies, prices, medical or legal facts.
- Refusal behaviour for out-of-scope and harmful requests, tested with adversarial prompts.
- Human approval for any irreversible action.
- Rate limits per user and a kill switch.

## Privacy

- Collect the minimum. If you do not need a name, do not ask.
- Tell users what is stored, for how long, and why, in plain language.
- Let users see and delete their data and any AI memory.
- Do not train on user data without explicit consent.
- Encrypt in transit and at rest; scope credentials; keep logs free of personal data.
- Check which laws apply to your audience and data (consumer, health, children, regional).

[artifact:launch-safety-checklist]

## Oversight

- Decide the oversight level (from the agents track) and write it down.
- Set up monitoring: error rates, flagged content, cost, and sampled quality review.
- Define an incident process: who gets alerted, how you pause, how you tell users.
- Schedule a regular review of logs and feedback.

## Licensing and terms

Read the Llama community license and acceptable use policy, and the terms of any hosted service. Write your own terms of use and privacy notice. Templates exist; adapt them, do not skip them.

## Accessibility and inclusion

Test with a screen reader, with keyboard only, and with users whose first language differs from your interface. Check that the model's answers serve all of your audience, not just the majority.

### Try it

Complete the checklist for your prototype. Anything unchecked is a blocker for inviting strangers.`,
      keyTakeaways: [
        "Fix safety and privacy before launch, when it is cheap.",
        "Guards, grounding, refusals, approvals, and rate limits for safety; minimal data, transparency, and user control for privacy.",
        "Write down oversight level, monitoring, incident process, and terms before inviting strangers.",
      ],
      artifacts: [
        lessonVideo(
          "Safety, Privacy, and Oversight",
          "Checklist walkthrough, 4 minutes. Each section is ticked off against the garden assistant; an adversarial prompt is blocked; a user deletes their memory; the incident process is sketched on a whiteboard.",
          240,
        ),
        {
          key: "launch-safety-checklist",
          kind: "IMAGE",
          title: "Pre-launch safety and privacy checklist",
          brief:
            "Printable checklist in three columns: Safety (guards, grounding, refusals, approvals, rate limits, kill switch), Privacy (minimum data, plain notice, view/delete, no training without consent, encryption, legal check), Oversight (level, monitoring, incident process, review cadence). Tidy tick boxes.",
        },
      ],
    },
    {
      slug: "launch-planning",
      title: "Launch Planning",
      summary:
        "Choosing a channel, crafting the message, and getting your first hundred users without a budget.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Launch is a series, not an event

Plan three waves: your circle (ten people), your community (a hundred), then the public. Each wave teaches you what to fix before the next. Big-bang launches waste your one chance at attention on an unready product.

## Pick one channel

Where does your audience already gather? A forum, a newsletter, a local meetup, a professional group, a specific social platform. Choose one and do it well. Spreading across five channels dilutes effort and learning.

## The message

Use your tested value proposition. Lead with the outcome and a concrete example (a screenshot or a 30-second clip). Mention AI where it builds trust: grounding in their own documents, privacy, open models. Invite feedback explicitly; early users love to shape things.

[artifact:launch-waves]

## Assets to prepare

- A one-page landing page: value proposition, example, who it is for, how to start, privacy summary.
- A 30–60 second demo video (the creative track's workflow).
- A short FAQ, including what it cannot do.
- A feedback channel: a form, an email, or a community thread.
- Onboarding that gets to value in under two minutes.

## First hundred users

Personal invitations beat broadcasts. Ask each of your ten circle users to introduce two people. Offer to onboard the first twenty personally; you will learn more than any analytics can show. Thank people publicly for feedback.

## Metrics for the first month

Activation (did they complete one real task?), retention (did they come back in week two?), and qualitative feedback. Ignore vanity numbers.

## Prepare for problems

Have the kill switch, the incident process, and a status message ready. Respond to problems fast and honestly; it builds more trust than a flawless launch would.

### Try it

Write your three-wave plan with dates, your single channel, and the names of your first ten users.`,
      keyTakeaways: [
        "Launch in waves: circle, community, public; each wave informs the next.",
        "One channel, a tested message with a concrete example, and a two-minute path to value.",
        "Personal invitations and hands-on onboarding win the first hundred; track activation and retention.",
      ],
      artifacts: [
        lessonVideo(
          "Launch Planning",
          "Explainer, 4 minutes. Three waves on a calendar; a landing page and demo clip assembled; personal invitations sent; an activation/retention chart for month one. Practical, calm.",
          240,
        ),
        {
          key: "launch-waves",
          kind: "DIAGRAM",
          title: "Three-wave launch plan",
          brief:
            "Three expanding circles labelled Circle (10), Community (100), Public, each with a date slot and a 'learn and fix' arrow to the next. Side list of assets: landing page, demo video, FAQ, feedback channel, onboarding.",
        },
      ],
    },
    {
      slug: "feedback-iteration-and-whats-next",
      title: "Feedback, Iteration, and What's Next",
      summary:
        "Turning real usage into a product roadmap, sustaining the work, and your path beyond the Academy.",
      estimatedDurationMinutes: 30,
      content: `[artifact:lesson-video]

## Listen in three ways

- **Watch behaviour**: logs and metrics show what people do.
- **Ask**: short in-product prompts and conversations show why.
- **Read the AI's failures**: sampled transcripts show where the model let users down. These are your highest-value bugs.

## The weekly loop

1. Review metrics, feedback, and sampled transcripts.
2. List problems and opportunities. Group and rank.
3. Pick the top one to three. Write what success looks like.
4. Ship. Update the golden set and the ten scripted exchanges.
5. Tell users what changed and thank the people who reported it.

[artifact:iteration-loop]

## Deciding what to build next

Prefer changes that help existing users do their core task better over features for hypothetical users. Say no to most requests; note them. When three users independently ask for the same thing, it earns a place on the roadmap.

## Sustaining it

- **Costs**: watch token spend; smaller models and caching keep it affordable.
- **Model changes**: re-run your evaluation when you upgrade; the Llama ecosystem moves quickly.
- **Your energy**: pick a cadence you can keep. A reliable monthly update beats a frantic month and silence.
- **Money**: if the product should pay for itself, test willingness to pay early with a small group. Grants and community support suit non-profit ideas.

## When to stop or pivot

If retention is flat after three honest iteration rounds, the problem or audience is wrong. Stopping with clear learnings is a success; you will carry them to the next idea.

## What you have done

You moved from understanding AI to using it, building with it, and shipping something real with people who benefit. That is the whole arc of WeStride Academy.

## What's next

Share your story in the Community. Become a mentor for the next builder. Start the next idea in Idea Studio. The Academy will keep growing, and so will you.

### Try it

Run your first weekly loop. Write the three things you shipped or decided, and post them to the Community.`,
      keyTakeaways: [
        "Combine behaviour data, direct asks, and sampled AI failures to decide what to change.",
        "Run a weekly loop: review, rank, pick one to three, ship, update tests, tell users.",
        "Sustain costs, re-evaluate on model changes, keep a steady cadence, and know when to stop or pivot.",
      ],
      artifacts: [
        lessonVideo(
          "Feedback, Iteration, and What's Next",
          "Celebratory wrap-up, 5 minutes. The weekly loop runs on screen with real-feeling feedback; the roadmap gains one item from three matching requests; the founder posts a launch story to the Community and offers to mentor. Warm close for the whole Academy.",
          300,
        ),
        {
          key: "iteration-loop",
          kind: "DIAGRAM",
          title: "The weekly iteration loop",
          brief:
            "Five-step cycle: Review (metrics, feedback, transcripts) → Rank → Pick 1–3 → Ship (update golden set) → Tell users → back to Review. A small roadmap sidebar showing a request promoted after three independent asks.",
        },
      ],
    },
  ],
};
