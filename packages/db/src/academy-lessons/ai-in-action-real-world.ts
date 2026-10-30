import { lessonVideo, type AcademyTrackLessons } from "./types";

export const aiInActionRealWorld: AcademyTrackLessons = {
  trackSlug: "ai-in-action-real-world",
  lessons: [
    {
      slug: "where-ai-creates-value",
      title: "Where AI Creates Value",
      summary:
        "A simple framework for spotting tasks where AI helps a lot, a little, or not at all.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Look for the shape of the task

AI creates the most value where a task is:

- **Frequent**: done many times, so small savings add up.
- **Language- or pattern-heavy**: reading, writing, summarizing, classifying, extracting, matching.
- **Tolerant of review**: a person can check the output faster than producing it.
- **Data-rich**: examples exist to learn from or documents exist to retrieve.

Tasks that are rare, physical, high-stakes without review, or data-poor are weaker candidates.

[artifact:value-matrix]

## Three kinds of win

1. **Speed**: the same work in less time. Drafting, summarizing, first-pass research.
2. **Reach**: work that was not happening at all because it was too expensive. Personalized follow-ups to every customer, translations into ten languages.
3. **Quality**: fewer mistakes, more consistency. Checklists applied every time, every document checked against policy.

Reach is the most overlooked and often the most valuable.

## Start with the pain

Ask people what they dread doing every week. Those tasks are frequent, tolerated, and usually language-heavy. They are also where adoption is easiest, because the person wants the help.

## This track

Case studies across personal productivity, business and marketing, education, healthcare and science, and customer support, followed by how to judge ROI and what AI means for careers.

### Try it

List five tasks from your week. Score each on frequent, language-heavy, reviewable, and data-rich. The highest scorer is your first AI project.`,
      keyTakeaways: [
        "AI helps most with frequent, language-heavy, reviewable, data-rich tasks.",
        "Wins come as speed, reach, or quality; reach is the most overlooked.",
        "Start with tasks people dread; adoption follows motivation.",
      ],
      artifacts: [
        lessonVideo(
          "Where AI Creates Value",
          "Framework explainer, 4 minutes. Tasks fall onto a matrix as the narrator scores them; three kinds of win illustrated with mini-scenarios; ends on 'start with the pain'.",
          240,
        ),
        {
          key: "value-matrix",
          kind: "DIAGRAM",
          title: "Where AI helps most",
          brief:
            "2×2 matrix. X axis: rare → frequent. Y axis: physical/judgement-only → language/pattern heavy. Top-right quadrant highlighted 'start here' with examples (summaries, classification, drafts); bottom-left labelled 'weak fit'.",
        },
      ],
    },
    {
      slug: "ai-for-personal-productivity",
      title: "AI for Personal Productivity",
      summary:
        "Practical routines for email, notes, research, planning, and learning that save hours each week.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Routines, not tricks

The productivity gain comes from a few routines used daily, not from clever one-off prompts. Pick two from below, use them for two weeks, then add more.

## Email and messages

Paste a thread and ask for: the decision needed, the deadline, and a two-line reply draft in your voice. Review, edit, send. For outgoing requests, give the goal and let the model draft; you shape the tone.

## Notes and meetings

Transcribe or paste notes and ask for decisions, action items with owners, and open questions. File the structured version; keep the raw notes for reference.

[artifact:daily-routines]

## Research

Ask for an overview with the main viewpoints and the key terms to search. Then verify with primary sources. Use web-connected assistants for anything current and check the citations.

## Planning

Give constraints (time available, energy, deadlines) and ask for a realistic plan with buffers. Ask it to flag what will not fit. Replan daily in two minutes.

## Learning

Ask for an explanation at your level, then for a harder one, then for three questions to test yourself. Teach the concept back and ask for corrections. This loop works for almost any subject.

## Guardrails

Do not paste confidential or personal data into tools that are not approved for it. Check facts before acting. Keep your own judgement in the loop for anything involving people.

### Try it

Choose two routines and set a reminder to use them every day for two weeks. Note the time saved at the end.`,
      keyTakeaways: [
        "A few daily routines beat many clever prompts.",
        "Email triage, meeting notes, research overviews, realistic planning, and self-testing are the highest-yield uses.",
        "Keep confidential data out of unapproved tools and verify before acting.",
      ],
      artifacts: [
        lessonVideo(
          "AI for Personal Productivity",
          "Day-in-the-life, 4 minutes. A person applies five routines across a workday with before/after time estimates; the guardrails appear as brief on-screen reminders.",
          240,
        ),
        {
          key: "daily-routines",
          kind: "IMAGE",
          title: "Five daily AI routines",
          brief:
            "Checklist card: Email triage (decision, deadline, draft), Meeting notes (decisions, actions, questions), Research overview (viewpoints, terms, verify), Realistic plan (constraints, buffers), Learn and self-test (explain, harder, quiz). Minimal icons.",
        },
      ],
    },
    {
      slug: "ai-in-business-and-marketing",
      title: "AI in Business and Marketing",
      summary:
        "Case studies in operations, sales, and marketing, with the patterns that made them work.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Operations: documents at scale

A logistics company receives thousands of supplier invoices in varied formats. An extraction pipeline (multimodal model reads the PDF, LLM outputs structured JSON, rules validate totals) cuts processing time by most of a day per week and catches duplicate billing. Pattern: **extract, validate, route exceptions to people**.

## Sales: research and follow-up

A small B2B team uses an assistant to summarize each prospect's public information before calls and to draft tailored follow-ups afterward from call notes. Win rate is unchanged; the number of quality follow-ups triples. Pattern: **reach, not speed**.

[artifact:marketing-pipeline]

## Marketing: content with a human editor

A regional retailer generates first drafts of product descriptions, social posts, and email variants from a brand style guide and product data, then a copywriter edits and approves. Output volume rises; the editor's role shifts to quality and voice. Pattern: **template plus style guide plus human approval**.

## Analysis: questions in plain language

A finance team connects an LLM to their reporting data so managers can ask "which regions missed target last quarter and why?" and get a table plus a short explanation with the underlying query shown. Pattern: **show the work so answers can be checked**.

## What the successes share

- A narrow, frequent task with a clear measure.
- Humans reviewing where mistakes are costly.
- Structured outputs that fit existing systems.
- A pilot with a few users before a rollout.

## What failed

Projects that tried to "add AI" everywhere at once, that replaced reviewers before accuracy was proven, or that could not say what success looked like.

### Try it

Pick one business function you know. Write the narrow task, the measure, and where a human must stay in the loop.`,
      keyTakeaways: [
        "Extract-validate-route, reach-over-speed, template-plus-editor, and show-the-work are repeatable patterns.",
        "Successful projects are narrow, measured, human-reviewed, and piloted first.",
        "Failures come from vague goals and removing review before accuracy is proven.",
      ],
      artifacts: [
        lessonVideo(
          "AI in Business and Marketing",
          "Case-study montage, 4 minutes. Four illustrated vignettes (invoices, sales follow-ups, marketing drafts, plain-language analytics) each ending with its pattern as a title card.",
          240,
        ),
        {
          key: "marketing-pipeline",
          kind: "DIAGRAM",
          title: "Content pipeline with a human editor",
          brief:
            "Brand style guide + product data → LLM draft → Copywriter edits and approves (highlighted) → Publish to channels. Side metric: 'volume up, editor focused on voice'.",
        },
      ],
    },
    {
      slug: "ai-in-education",
      title: "AI in Education",
      summary:
        "Tutoring, feedback, accessibility, and teacher workload, with the pitfalls to avoid.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## For learners

- **Patient tutoring**: explanations at any level, as many times as needed, in any language. Best when the tutor asks questions rather than giving answers, which a system prompt can enforce.
- **Practice and feedback**: generate exercises, check work, explain mistakes. WeStride's own challenges use this pattern: Muse gives one observation and one suggestion, never a grade.
- **Accessibility**: text to speech, live captions, simplified explanations, translation.

## For teachers

Drafting lesson plans, differentiating materials for different levels, writing rubric-aligned feedback faster, and summarizing research. The time saved goes back to students.

[artifact:tutor-prompt]

## Pitfalls

- **Answer machines**: if the tool just gives answers, learning stops. Design for questions, hints, and explanations.
- **Hallucinated facts**: tutors must be grounded in trusted material, especially for history, science, and health.
- **Equity**: access to devices and connectivity varies. Pair tools with offline and low-bandwidth options; small open models can run locally.
- **Privacy**: student data is sensitive. Use tools with clear data policies and avoid entering identifying information.
- **Over-trust**: teach students to verify and to recognize when the tutor is unsure.

## A tutor system prompt pattern

"You are a patient tutor for {subject} at {level}. Never give the final answer directly. Ask one guiding question at a time. When the learner is stuck twice, give a hint. Use only the provided materials for facts. Encourage, do not grade."

## Teaching about AI

The most durable skill is understanding how these tools work and where they fail, which is exactly what this Academy aims to provide.

### Try it

Write a tutor system prompt for a subject you know and test it by pretending to be a stuck learner. Does it ask or tell?`,
      keyTakeaways: [
        "Design tutors to ask and hint, not to answer; ground them in trusted material.",
        "Teachers gain time through planning, differentiation, and feedback drafting.",
        "Watch equity, privacy, and over-trust; small open models help with access.",
      ],
      artifacts: [
        lessonVideo(
          "AI in Education",
          "Classroom-and-home montage, 4 minutes. A tutor asks guiding questions; a teacher differentiates a worksheet in minutes; captions help a learner; the narrator names each pitfall with a clear fix.",
          240,
        ),
        {
          key: "tutor-prompt",
          kind: "IMAGE",
          title: "A tutor system prompt",
          brief:
            "Card with the tutor system prompt text, highlighting 'never give the final answer', 'one guiding question', 'hint after stuck twice', 'only provided materials', 'encourage, do not grade'. Beside it, a short mock dialogue showing the pattern.",
        },
      ],
    },
    {
      slug: "ai-in-healthcare-and-science",
      title: "AI in Healthcare and Science",
      summary:
        "Where AI assists clinicians and researchers today, and why human accountability stays central.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Healthcare: assistance, not replacement

- **Documentation**: ambient transcription drafts visit notes for the clinician to review, giving back hours per week.
- **Imaging support**: models flag areas of concern in scans for a radiologist's attention. The decision stays with the clinician.
- **Triage and information**: assistants help patients understand instructions and route questions, with clear escalation to humans.
- **Administration**: prior authorizations, coding suggestions, and scheduling.

Every clinical use is regulated, validated on real populations, and monitored. "The AI said so" is never an acceptable clinical rationale.

[artifact:clinical-loop]

## Science: faster hypotheses, same rigor

- **Literature**: summarizing thousands of papers and finding connections across fields.
- **Protein structure and materials**: models predict structures and properties that guide which experiments to run.
- **Data analysis**: writing and explaining analysis code, spotting anomalies.
- **Open models**: researchers fine-tune open models like Llama on domain literature and share the results, speeding up whole fields.

Experiments still decide. AI narrows the search; it does not replace the lab.

## Risks specific to these fields

- Training data that under-represents some populations produces models that work worse for them.
- Confident errors in medical information can cause harm; grounding and review are non-negotiable.
- Privacy regulations are strict; many deployments run models locally for this reason.

## What to take from this

High-stakes fields show the pattern at its clearest: AI drafts, flags, and narrows; accountable humans decide.

### Try it

Choose one healthcare or science task above and write where the human decision point sits and what information the person needs at that moment.`,
      keyTakeaways: [
        "In healthcare, AI drafts notes, flags findings, and handles admin; clinicians decide.",
        "In science, AI accelerates literature review and hypothesis generation; experiments still decide.",
        "Representation in data, grounding, and privacy are non-negotiable in high-stakes fields.",
      ],
      artifacts: [
        lessonVideo(
          "AI in Healthcare and Science",
          "Documentary-style explainer, 4 minutes. A clinician reviews an AI-drafted note; a radiologist examines a flagged region; a researcher screens candidates before lab work. Measured tone, emphasis on accountability.",
          240,
        ),
        {
          key: "clinical-loop",
          kind: "DIAGRAM",
          title: "AI assists, the clinician decides",
          brief:
            "Flow: Patient encounter → AI drafts/flags → Clinician reviews and decides (large highlighted box) → Action → Monitoring feeds back to the AI system. A regulation/validation band across the top.",
        },
      ],
    },
    {
      slug: "ai-in-customer-support",
      title: "AI in Customer Support",
      summary:
        "Deflection, agent assist, and quality, and how to design support AI people do not hate.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Three places AI fits

1. **Self-service**: a grounded assistant answers common questions from your help content with citations, and hands off cleanly when it cannot. This is RAG applied to support.
2. **Agent assist**: while a human handles a conversation, AI suggests replies, pulls up relevant articles, and summarizes the history. The human stays in control and gets faster.
3. **Quality and insight**: classify every conversation by topic and sentiment, flag policy misses, and surface the top emerging issues each week.

[artifact:support-architecture]

## Designing support people do not hate

- **Make escape easy**: a visible "talk to a person" option at every step. Forced loops destroy trust.
- **Be honest**: say it is an assistant. Do not pretend to be human.
- **Ground every answer**: only answer from your actual policies and documentation, with links.
- **Hand off with context**: when a human takes over, they should see the summary, not start from zero.
- **Measure what matters**: resolution and satisfaction, not just deflection. A deflected customer who gives up is a loss.

## A realistic rollout

Start with agent assist; it is low-risk and agents will tell you quickly what is wrong. Build the golden set from real tickets. Move to self-service for the top ten intents only, with strong handoff. Expand as accuracy proves out.

## Watch for

Hallucinated policies (never let the model invent a refund rule), tone drift under frustration, and injection attempts in customer messages. Guards and grounding address all three.

### Try it

Write the handoff summary format your assistant would pass to a human agent. Include what the customer asked, what was tried, and the customer's mood.`,
      keyTakeaways: [
        "Self-service, agent assist, and quality analysis are the three fits.",
        "Easy escape, honesty, grounding, and context-rich handoff keep trust.",
        "Start with agent assist, measure resolution and satisfaction, and expand carefully.",
      ],
      artifacts: [
        lessonVideo(
          "AI in Customer Support",
          "Explainer, 4 minutes. A customer gets a grounded self-service answer, then escalates; the human agent sees a summary and suggested replies; a weekly insight dashboard closes. Clear 'talk to a person' button throughout.",
          240,
        ),
        {
          key: "support-architecture",
          kind: "DIAGRAM",
          title: "Support AI architecture",
          brief:
            "Customer → Self-service assistant (RAG over help content) → either Resolved or Handoff with summary → Human agent with Agent assist panel → Resolved. All conversations flow to a Quality & insight classifier.",
        },
      ],
    },
    {
      slug: "roi-and-feasibility",
      title: "Judging ROI and Feasibility",
      summary:
        "A one-page method for deciding whether an AI opportunity is worth pursuing.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The one-page assessment

Answer these before building anything:

**Value**
- How many times per month does this task happen?
- How long does it take now, and what does that time cost?
- What is the value of doing it better, faster, or more often (reach)?

**Feasibility**
- Is the task language- or pattern-heavy?
- Do we have examples or documents to ground it?
- Can a person check the output faster than doing the task?
- What is the cost of a mistake, and can we catch it?

**Cost**
- Tokens per task × tasks per month × price.
- Build time and the people needed.
- Ongoing evaluation, monitoring, and maintenance.

[artifact:roi-sheet]

## A quick score

Rate value, feasibility, and cost each from 1 to 5. Pursue opportunities scoring high on value and feasibility with acceptable cost. Park the rest; revisit quarterly as models improve and prices fall.

## Pilot before you commit

Spend two weeks and a small budget on a pilot with five real users and a golden set. Measure time saved, accuracy, and satisfaction. Decide with data.

## Hidden costs to include

Change management and training, data cleanup, legal and privacy review, and the attention of your best people. These often exceed the model costs.

## Hidden value to include

Consistency, fewer errors, happier staff doing less drudgery, and capabilities (reach) that were impossible before.

### Try it

Fill in the one-page assessment for the top task from lesson one. Would you pilot it?`,
      keyTakeaways: [
        "Assess value, feasibility, and cost on one page before building.",
        "Score 1–5 on each, pursue high value and feasibility, and revisit parked ideas quarterly.",
        "Pilot with real users and a golden set; include change management and privacy review in costs.",
      ],
      artifacts: [
        lessonVideo(
          "Judging ROI and Feasibility",
          "Worksheet walkthrough, 4 minutes. The one-page assessment is filled in for a real-sounding example; scores are assigned; a two-week pilot plan is sketched. Practical, numbers on screen.",
          240,
        ),
        {
          key: "roi-sheet",
          kind: "IMAGE",
          title: "One-page AI opportunity assessment",
          brief:
            "Printable worksheet with three sections (Value, Feasibility, Cost) each with its questions and a 1–5 score box, plus a 'Pilot?' decision box at the bottom. Clean form design.",
        },
      ],
    },
    {
      slug: "careers-in-the-age-of-ai",
      title: "Careers in the Age of AI",
      summary:
        "How work is changing, the skills that gain value, and a plan for staying ahead.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Tasks change faster than jobs

AI automates tasks, not whole jobs. Most roles are bundles of tasks; some get faster, some disappear, and new ones appear around supervising, directing, and checking AI. The people who thrive learn to re-bundle their role around what AI cannot do well.

## Skills gaining value

- **Judgement**: knowing what good looks like and when the output is wrong.
- **Framing**: turning fuzzy problems into clear tasks, which is also what good prompting is.
- **Domain depth**: AI is general; people with deep knowledge of a field get the most from it.
- **Communication and trust**: working with people, understanding needs, handling what is sensitive.
- **AI fluency**: using, evaluating, and directing these tools well, which this Academy builds.

[artifact:skills-shift]

## Skills losing relative value

Routine drafting, basic summarization, boilerplate code, and first-pass research are increasingly commoditized. Do not build a career on them alone; build on directing them.

## New and growing roles

Prompt and workflow designers, AI product managers, evaluation and safety specialists, data curators, and in every field, the person who knows both the domain and the tools.

## A personal plan

1. Use AI daily in your actual work (lesson two's routines).
2. Build one small thing (the building track).
3. Go deep in a domain you care about.
4. Teach someone else; it compounds your understanding and your network.
5. Revisit this plan every six months; the tools will have changed.

## WeStride's role

The Academy for skills, Mentorship for guidance, and Idea Studio for turning what you learn into something real.

### Try it

List your main tasks. Mark which AI could speed up, which it cannot touch, and which new tasks you could take on. That is your re-bundled role.`,
      keyTakeaways: [
        "AI changes tasks, not whole jobs; re-bundle your role around judgement, framing, and domain depth.",
        "Routine drafting and first-pass work are commoditizing; directing and checking them is the growth area.",
        "Use AI daily, build one thing, go deep, teach someone, and revisit the plan every six months.",
      ],
      artifacts: [
        lessonVideo(
          "Careers in the Age of AI",
          "Encouraging wrap-up, 4 minutes. A role is shown as a bundle of task cards; some speed up, some vanish, new ones appear; the five-step plan is laid out. Closes the track and points to the capstone.",
          240,
        ),
        {
          key: "skills-shift",
          kind: "DIAGRAM",
          title: "Skills gaining and losing relative value",
          brief:
            "Two columns with arrows. Gaining ↑: judgement, framing, domain depth, communication and trust, AI fluency. Losing ↓: routine drafting, basic summarization, boilerplate code, first-pass research. Neutral, encouraging design.",
        },
      ],
    },
  ],
};
