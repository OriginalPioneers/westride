import { lessonVideo, type AcademyTrackLessons } from "./types";

export const promptEngineeringMastery: AcademyTrackLessons = {
  trackSlug: "prompt-engineering-mastery",
  lessons: [
    {
      slug: "why-prompts-matter",
      title: "Why Prompts Matter",
      summary:
        "The same model, two prompts, wildly different results. What is actually going on.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The prompt is the program

A language model has no idea what you want until you tell it. The prompt is the only lever you have at inference time: it sets the task, the audience, the format, and the constraints. Two people with the same model and different prompts are, in effect, running two different programs.

## A quick demonstration

Prompt A: "Write about dogs."

Prompt B: "Write a 120-word paragraph for a shelter's adoption page, warm but not sentimental, about why senior dogs make great companions for first-time owners. End with one call to action."

Prompt B will produce something usable on the first try almost every time. Prompt A produces something generic that needs rewriting. The model did not change; the instructions did.

[artifact:prompt-a-vs-b]

## Why it works this way

The model predicts text that plausibly follows your prompt. A vague prompt is followed by many plausible continuations, so you get the average of all of them. A specific prompt narrows the space to continuations that fit your need.

## What this track teaches

Structure, clarity, context, examples, reasoning techniques, system prompts, debugging, and templates. By the end you will write prompts that work reliably and know how to fix the ones that do not.

### Try it

Take a prompt you used recently and rewrite it with audience, length, tone, and format specified. Run both and compare.`,
      keyTakeaways: [
        "The prompt is the only control you have at inference time; treat it like a program.",
        "Vague prompts return the average of many possible answers; specific prompts narrow the space.",
        "Specify task, audience, format, and constraints to get usable output on the first try.",
      ],
      artifacts: [
        lessonVideo({
          title: "Lesson 6: A closer look at Description | AI Fluency: Framework & Foundations Course",
          channel: "Anthropic",
          url: "https://www.youtube.com/watch?v=DmgujoZ1mmk",
          durationSeconds: 261,
          brief:
            "Anthropic's short lesson on 'Description' explains that the model only knows what you tell it, breaking a prompt into product (what you want: format, audience, length), process (how to approach it) and performance (how to behave) descriptions, which is exactly the 'prompt is the program' idea of this lesson.",
        }),
        {
          key: "prompt-a-vs-b",
          kind: "IMAGE",
          title: "Vague versus specific prompt",
          brief:
            "Two stacked cards. Top: 'Write about dogs.' with a greyed generic paragraph. Bottom: the detailed shelter prompt with a vivid, formatted paragraph. Highlights on audience, length, tone, and format words.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/why-prompts-matter/prompt-a-vs-b.webp",
        },
      ],
    },
    {
      slug: "anatomy-of-a-great-prompt",
      title: "Anatomy of a Great Prompt",
      summary:
        "The six parts most strong prompts share, and a template you can reuse.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The six parts

1. **Role**: who the model should be. "You are an experienced science teacher."
2. **Task**: what to do, as a verb. "Explain photosynthesis."
3. **Audience**: who it is for. "To a curious ten-year-old."
4. **Context**: what the model needs to know. "They already understand that plants need sunlight."
5. **Format**: shape of the answer. "Three short paragraphs, then one question to check understanding."
6. **Constraints**: limits and must-nots. "Under 150 words. No chemical formulas."

Not every prompt needs all six, but when a result disappoints, one of these is usually missing.

[artifact:six-parts]

## A reusable template

\`\`\`
You are {role}.
Task: {task} for {audience}.
Context: {context}.
Format: {format}.
Constraints: {constraints}.
\`\`\`

Fill in what matters, delete what does not. Labels help the model and help you see gaps.

## Order and emphasis

Put the most important instruction first and repeat critical constraints at the end. Models pay extra attention to the beginning and end of a prompt.

### Try it

Write a prompt using all six parts for something you actually need this week. Then remove one part at a time and observe which removal hurts most.`,
      keyTakeaways: [
        "Strong prompts specify role, task, audience, context, format, and constraints.",
        "A labelled template exposes gaps and makes prompts reusable.",
        "Lead with the most important instruction and restate critical constraints at the end.",
      ],
      artifacts: [
        lessonVideo({
          title: "Master the Perfect ChatGPT Prompt Formula (in just 8 minutes)!",
          channel: "Jeff Su",
          url: "https://www.youtube.com/watch?v=jC4v5AS4RIM",
          durationSeconds: 510,
          brief:
            "Jeff Su builds a prompt block by block from six components (task, context, exemplars, persona, format, tone), explains their order of importance and shows the output improving as each is added, mirroring this lesson's six-part template.",
        }),
        {
          key: "six-parts",
          kind: "DIAGRAM",
          title: "Six parts of a prompt",
          brief:
            "Six stacked, colour-coded blocks labelled Role, Task, Audience, Context, Format, Constraints, each with a one-line example from the photosynthesis prompt. Clean, printable.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/anatomy-of-a-great-prompt/six-parts.webp",
        },
      ],
    },
    {
      slug: "clear-instructions",
      title: "Writing Clear Instructions",
      summary:
        "Concrete verbs, measurable outcomes, and the words that quietly sabotage prompts.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Say what you mean

Models follow instructions literally. "Make it better" gives the model nothing to aim at. "Shorten to under 100 words and replace jargon with everyday language" does.

## Use concrete verbs

Prefer *list, summarize, compare, rewrite, extract, classify, translate, rank* over *handle, deal with, look at, help with*. A concrete verb implies a shape for the answer.

## Make outcomes measurable

- "Brief" → "under 80 words"
- "A few examples" → "exactly three examples"
- "Simple language" → "readable by a twelve-year-old"
- "Soon" → "within the next 30 days"

[artifact:vague-to-concrete]

## Words that sabotage

- **Negations without alternatives.** "Don't be formal" leaves the model guessing. Say "use a friendly, conversational tone".
- **Ambiguous pronouns.** "Summarize it and send it to them" fails if *it* and *them* are unclear.
- **Multiple questions in one sentence.** Split them or number them.
- **Hidden assumptions.** If you expect US spelling, metric units, or a particular date format, say so.

## One task per prompt, or number them

If you need several things, number them. The model will address each in order and you can check that none was skipped.

### Try it

Find three vague words in a prompt you have written and replace each with something measurable.`,
      keyTakeaways: [
        "Models read literally; concrete verbs and measurable outcomes remove guesswork.",
        "Replace negations with the behaviour you want.",
        "Number multiple requests so nothing gets skipped.",
      ],
      artifacts: [
        lessonVideo({
          title: "Lesson 7: Effective prompting techniques (Deep Dive) | AI Fluency: Framework & Foundations Course",
          channel: "Anthropic",
          url: "https://www.youtube.com/watch?v=2YCaBqP8muw",
          durationSeconds: 714,
          brief:
            "Anthropic's deep dive on effective prompting covers giving clear, specific instructions, stating output constraints explicitly, numbering multi-step requests and avoiding ambiguity, with before/after prompt examples.",
        }),
        {
          key: "vague-to-concrete",
          kind: "IMAGE",
          title: "Vague to concrete",
          brief:
            "Two-column table graphic. Left 'Vague': brief, a few, simple, soon, better. Right 'Concrete': under 80 words, exactly three, readable by a twelve-year-old, within 30 days, shorter and jargon-free. Arrow between columns.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/clear-instructions/vague-to-concrete.webp",
        },
      ],
    },
    {
      slug: "context-and-constraints",
      title: "Context and Constraints",
      summary:
        "Give the model what it needs to know, fence off what it must not do, and handle long inputs well.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Context: what the model cannot guess

The model knows nothing about your company, your reader, or your earlier decisions unless you tell it. Include:

- Background facts the answer depends on.
- Definitions of any internal terms.
- What has already been tried or decided.
- Relevant documents, pasted in or attached.

## Separate instructions from data

When you paste a document, mark where it begins and ends so the model does not confuse content with commands:

\`\`\`
Summarize the article between the markers.
<article>
...pasted text...
</article>
\`\`\`

This also protects against text inside the document that tries to issue its own instructions.

[artifact:context-layout]

## Constraints: the fence

Tell the model what it must and must not do: length, reading level, forbidden topics, required sections, output language, and what to do when information is missing ("say 'unknown' rather than guessing"). Constraints turn a creative generator into a dependable tool.

## Long inputs

Put instructions at the top *and* repeat the key ones at the bottom. State which parts of a long document matter most. If the input will not fit the context window, split it and summarize in stages.

### Try it

Paste a long email thread into an assistant with markers around it, and ask for a summary with the constraint "if the sender's decision is unclear, say so explicitly".`,
      keyTakeaways: [
        "Supply background, definitions, prior decisions, and documents; the model cannot guess them.",
        "Mark where pasted data begins and ends to keep instructions and content separate.",
        "Constraints, including what to do when information is missing, make output dependable.",
      ],
      artifacts: [
        lessonVideo({
          title: "Prompting 101 | Code w/ Claude",
          channel: "Anthropic",
          url: "https://www.youtube.com/watch?v=ysPbXH0LpIE",
          durationSeconds: 1492,
          brief:
            "Anthropic engineers walk through a real prompt layout: task up front, pasted content fenced with XML tags, background context, explicit constraints and a repeated key instruction at the end, which is the exact page structure this lesson teaches.",
        }),
        {
          key: "context-layout",
          kind: "DIAGRAM",
          title: "Layout of a prompt with pasted data",
          brief:
            "Vertical page diagram: Instructions (top), fenced Document block with clear start/end markers (middle), Constraints and repeated key instruction (bottom). Annotate why each zone sits where it does.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/context-and-constraints/context-layout.webp",
        },
      ],
    },
    {
      slug: "role-based-prompting",
      title: "Role-Based Prompting",
      summary:
        "When assigning a persona helps, when it does not, and how to do it without the clichés.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## What a role does

Telling the model "you are a pediatric nurse" shifts its vocabulary, priorities, and level of caution toward what a pediatric nurse would say. It is a shortcut for a bundle of context: expertise, tone, and typical concerns.

## When roles help

- Specialist vocabulary and judgement: "you are a tax accountant reviewing a freelancer's expenses".
- Consistent voice: "you are the friendly, plain-spoken support assistant for a bike shop".
- Perspective taking: "you are a skeptical investor hearing this pitch for the first time".

## When roles do not help

Roles do not add knowledge the model lacks. "You are a world-class expert" does not make the answer more accurate; it mostly makes it more confident. Pair a role with concrete instructions and, where accuracy matters, with source material.

[artifact:role-examples]

## Writing a good role

State the expertise, the audience relationship, and the priorities:

"You are a career counsellor working with recent graduates. You prioritize practical next steps over abstract advice and you ask one clarifying question before giving recommendations."

## Multiple perspectives

Ask the model to answer as two or three different roles in turn, then reconcile them. This surfaces trade-offs a single answer would hide.

### Try it

Rewrite a recent prompt with a role that names expertise, audience, and priorities. Compare the two answers.`,
      keyTakeaways: [
        "A role bundles vocabulary, priorities, and tone into one instruction.",
        "Roles shape style and judgement; they do not add knowledge or guarantee accuracy.",
        "Define expertise, audience relationship, and priorities; try multiple roles to surface trade-offs.",
      ],
      artifacts: [
        lessonVideo({
          title: "Does Persona Prompting Actually Work?",
          channel: "Dan Cleary",
          url: "https://www.youtube.com/watch?v=Lc4Xn0WqCvY",
          durationSeconds: 863,
          brief:
            "PromptHub's Dan Cleary reviews the research on role/persona prompting, showing it reliably shapes tone and perspective but does not add knowledge or accuracy, and gives guidance on writing specific, useful roles, matching this lesson's 'expert does not equal accurate' caution.",
        }),
        {
          key: "role-examples",
          kind: "IMAGE",
          title: "Weak role versus strong role",
          brief:
            "Two cards. 'Weak: You are a world-class expert.' crossed with a caution icon. 'Strong: You are a career counsellor working with recent graduates; you prioritize practical next steps and ask one clarifying question first.' with a check icon.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/role-based-prompting/role-examples.webp",
        },
      ],
    },
    {
      slug: "few-shot-examples",
      title: "Few-Shot Examples",
      summary:
        "Show, don't tell: using examples to lock in format, tone, and edge-case behaviour.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Why examples beat descriptions

Describing a format takes many words and still leaves room for interpretation. One or two examples show exactly what you mean. This is **few-shot prompting**: include input-output pairs before the real input.

\`\`\`
Classify each review as POSITIVE, NEGATIVE, or MIXED.

Review: "Great battery, terrible screen." → MIXED
Review: "Does exactly what it says." → POSITIVE
Review: "Broke in a week." → NEGATIVE
Review: "{new review}" →
\`\`\`

## How many examples

Two to five is usually enough. More helps with tricky categories but costs tokens. Cover the edge cases: the ambiguous review, the sarcastic one, the empty one.

[artifact:few-shot-layout]

## Keep examples consistent

Use the same labels, punctuation, and spacing in every example. The model will copy whatever pattern it sees, including your inconsistencies.

## Examples for tone

Few-shot also works for voice. Paste two paragraphs you have written and ask the model to write the third in the same voice. It is far more reliable than describing your style.

## A caution

Examples can bias the model toward their content as well as their format. If every example is about electronics, it may struggle with a review of a restaurant. Vary the subject matter.

### Try it

Build a three-example prompt for a classification you actually need, including one deliberately ambiguous case. Test it on five new inputs.`,
      keyTakeaways: [
        "Input-output examples communicate format and tone more precisely than descriptions.",
        "Two to five consistent examples, including edge cases, usually suffice.",
        "Vary example subject matter so the model learns the pattern, not the topic.",
      ],
      artifacts: [
        lessonVideo({
          title: "Discover Few-Shot Prompting | Google AI Essentials",
          channel: "Grow with Google",
          url: "https://www.youtube.com/watch?v=9qdgEBVkWR4",
          durationSeconds: 271,
          brief:
            "Google's AI Essentials clip defines zero-, one- and few-shot prompting, builds a few-shot prompt with consistently formatted examples and a blank final input, and discusses how many examples to use and the risk of over-copying them.",
        }),
        {
          key: "few-shot-layout",
          kind: "DIAGRAM",
          title: "Structure of a few-shot prompt",
          brief:
            "Vertical layout: Instruction line; three example blocks each with Input → Output in identical formatting; final block with Input → blank. Annotations: 'consistent labels', 'include an edge case', 'leave the answer blank'.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/few-shot-examples/few-shot-layout.webp",
        },
      ],
    },
    {
      slug: "chain-of-thought",
      title: "Chain-of-Thought and Step-by-Step Reasoning",
      summary:
        "Getting better answers on hard problems by asking the model to work through them.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The idea

Models are better at hard problems when they write out intermediate steps instead of jumping to an answer. Each step becomes context for the next, so errors have fewer places to hide. Asking "think step by step" or "show your reasoning before the final answer" is called **chain-of-thought** prompting.

## When it helps

- Multi-step arithmetic and logic.
- Planning: "work out the dependencies before proposing an order".
- Analysis with several factors: "weigh each criterion, then decide".
- Anything where you want to inspect *why*, not just *what*.

## When it does not

Simple lookups, formatting tasks, and creative writing rarely benefit, and the extra tokens cost time and money. Some newer models reason internally by default; for those, explicit chain-of-thought matters less.

[artifact:reasoning-example]

## Structure the reasoning

Rather than a loose "think step by step", give a scaffold:

\`\`\`
1. Restate the problem in your own words.
2. List the facts given and the facts missing.
3. Work the solution, showing each step.
4. Check the answer against the original question.
5. Give the final answer on its own line, prefixed "Answer:".
\`\`\`

The last line makes the answer easy to extract programmatically.

## Self-checking

Ask the model to verify its own answer, or to produce two independent solutions and compare. It catches a surprising share of slips.

### Try it

Give an assistant a word problem twice: once plain, once with the five-step scaffold. Compare both the answer and how easy it is to spot a mistake.`,
      keyTakeaways: [
        "Writing out steps improves accuracy on multi-step problems and makes errors visible.",
        "Skip it for simple lookups and creative tasks; it costs tokens.",
        "A numbered scaffold with a clearly marked final answer beats a loose 'think step by step'.",
      ],
      artifacts: [
        lessonVideo({
          title: "Chain-of-thought prompting - Explained!",
          channel: "CodeEmporium",
          url: "https://www.youtube.com/watch?v=AFE6x81AP4k",
          durationSeconds: 513,
          brief:
            "CodeEmporium explains chain-of-thought prompting with worked examples of a direct wrong answer versus step-by-step reasoning, why intermediate steps improve multi-step problems, and the original research behind it.",
        }),
        {
          key: "reasoning-example",
          kind: "IMAGE",
          title: "Direct answer versus scaffolded reasoning",
          brief:
            "Two columns. Left: question and a single wrong numeric answer. Right: the five-step scaffold filled in, with the check step highlighted where the error is caught, ending in 'Answer: …'.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/chain-of-thought/reasoning-example.webp",
        },
      ],
    },
    {
      slug: "system-prompts",
      title: "System Prompts",
      summary:
        "Setting persistent behaviour for an assistant: rules, persona, scope, and refusals.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Three kinds of message

Chat models receive messages with roles:

- **System**: standing instructions from the builder. Sets who the assistant is and how it behaves for the whole conversation.
- **User**: what the person types.
- **Assistant**: the model's previous replies.

The system prompt is where product behaviour lives. Users rarely see it.

## What goes in a system prompt

- Identity and tone: "You are Muse, WeStride's learning companion. Warm, concise, never condescending."
- Scope: what it helps with, and what it politely declines.
- Rules: formatting, language, length, safety boundaries.
- Knowledge: key facts about the product, with a note on what it does not know.
- Failure behaviour: "If you are unsure, say so and suggest where to find the answer."

[artifact:system-prompt-anatomy]

## Writing one well

Be explicit and ordered. Put safety rules and scope first. Use short declarative sentences. Give an example exchange if the desired behaviour is subtle. Keep it as short as it can be while still working; every token is paid on every turn.

## Testing a system prompt

Write ten test conversations: five normal, three edge cases, two attempts to pull the assistant off task. Run them after every change. A system prompt is code; treat it like code.

### Try it

Draft a system prompt for an assistant that helps people plan community events. Include scope, two rules, and failure behaviour. Test it with one off-topic request.`,
      keyTakeaways: [
        "System prompts set persistent identity, scope, rules, and failure behaviour.",
        "Put safety and scope first; keep it short because it costs tokens every turn.",
        "Test system prompts with a fixed set of conversations after every change.",
      ],
      artifacts: [
        lessonVideo({
          title: "System Prompts Explained: The Hidden AI Instructions You Never See",
          channel: "Thoughts Brewing, LLC",
          url: "https://www.youtube.com/watch?v=kaBXp4JiESQ",
          durationSeconds: 310,
          brief:
            "A concise explainer of what a system prompt is, how it sits 'backstage' before every user message, and a walk-through of Anthropic's published Claude system prompts to show the identity, tone, scope and behaviour rules that go into one.",
        }),
        {
          key: "system-prompt-anatomy",
          kind: "DIAGRAM",
          title: "Anatomy of a system prompt",
          brief:
            "Document outline with sections in order: Identity & tone, Scope, Rules, Knowledge, Failure behaviour, Example exchange. Each section has one sample line. Small 'hidden from users' tag at the top.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/system-prompts/system-prompt-anatomy.webp",
        },
      ],
    },
    {
      slug: "iterating-and-debugging-prompts",
      title: "Iterating and Debugging Prompts",
      summary:
        "A method for fixing bad output: diagnose the failure, change one thing, measure again.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Diagnose before you edit

Bad output usually fails in one of five ways. Name the failure first:

1. **Wrong task**: it did something other than what you asked. Check the task verb and ordering.
2. **Wrong audience or tone**: right content, wrong voice. Add or sharpen role and audience.
3. **Wrong format**: good content, unusable shape. Add an example.
4. **Wrong facts**: hallucination or missing context. Add source material and a "say unknown" rule.
5. **Ignored constraint**: too long, wrong language. Move the constraint to the end and make it measurable.

[artifact:failure-map]

## Change one thing at a time

If you change three things and the output improves, you do not know which one mattered. Edit, run, compare, repeat. Keep a copy of each version.

## Build a tiny test set

Collect five to ten representative inputs, including awkward ones. Run every prompt version against all of them. A prompt that fixes one case and breaks two others is not an improvement.

## Ask the model for help

Paste the prompt and the bad output and ask: "What in this prompt could have led to this result, and how would you rewrite it?" Models are good at spotting ambiguity in instructions.

## Know when to stop

If a prompt needs ten rules to behave, the task may need a different approach: splitting into steps, adding retrieval, or fine-tuning. The building track covers those.

### Try it

Take a prompt that disappoints you. Name its failure type, make one change, and run it on three inputs.`,
      keyTakeaways: [
        "Name the failure type (task, tone, format, facts, constraint) before editing.",
        "Change one thing at a time and test against a small fixed set of inputs.",
        "Ask the model to critique your prompt; if rules pile up, change approach.",
      ],
      artifacts: [
        lessonVideo({
          title: "Evaluate prompts in the Anthropic Console",
          channel: "Anthropic",
          url: "https://www.youtube.com/watch?v=KIGBsQqZcNA",
          durationSeconds: 200,
          brief:
            "Anthropic's official demo builds a small test set of representative inputs, grades the outputs, changes one line of the prompt, re-runs the same test set and compares versions side by side, which is precisely the diagnose-change-one-thing-measure loop of this lesson.",
        }),
        {
          key: "failure-map",
          kind: "DIAGRAM",
          title: "Five prompt failures and their fixes",
          brief:
            "Two-column mapping: Wrong task → check verb and order; Wrong tone → sharpen role/audience; Wrong format → add example; Wrong facts → add sources and 'say unknown'; Ignored constraint → make measurable, restate at end.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/iterating-and-debugging-prompts/failure-map.webp",
        },
      ],
    },
    {
      slug: "prompting-for-writing-and-communication",
      title: "Prompting for Writing and Communication",
      summary:
        "Emails, summaries, outlines, and rewrites: patterns that produce drafts you can actually send.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Start with the outcome

Before drafting anything, tell the model what the reader should think, feel, or do afterward. "After reading, the landlord should agree to the repair date and feel respected" guides every sentence.

## Patterns that work

**Email**: "Write a reply to the message below. Goal: {outcome}. Tone: {tone}. Keep it under {n} words. Include {specific point}. Do not apologize more than once."

**Summary**: "Summarize for {audience} who has {time} to read. Lead with the decision needed. Then three bullets of context. Then open questions."

**Outline**: "Propose an outline for {piece}. Target reader: {who}. Give section titles and one sentence on what each must accomplish. Flag where evidence is needed."

**Rewrite**: "Rewrite the text between the markers to be {change}. Preserve meaning and all facts. Do not add new claims."

[artifact:writing-patterns]

## Voice matching

Paste two or three samples of your own writing and ask the model to match their voice. Point out specific traits: sentence length, directness, favourite transitions.

## Edit, then own it

Treat the draft as a starting point. Cut what you would not say. Check every fact. A good rule: if you would be uncomfortable being asked "did you write this?", edit until you would not be.

### Try it

Use the email pattern on a real message you need to send. Edit the draft, then note what you changed; those edits tell you what to add to the prompt next time.`,
      keyTakeaways: [
        "State the reader's desired reaction before drafting.",
        "Reusable patterns for email, summary, outline, and rewrite remove most friction.",
        "Match your voice with samples, then edit until you would stand behind every line.",
      ],
      artifacts: [
        lessonVideo({
          title: "Google's 9 Hour AI Prompt Engineering Course In 20 Minutes",
          channel: "Tina Huang",
          url: "https://www.youtube.com/watch?v=p09yRj47kNM",
          durationSeconds: 1217,
          brief:
            "Tina Huang condenses Google's prompting course with practical demos of drafting emails, summaries and other workplace writing, specifying tone and audience, supplying reference samples to match your voice, and iterating on drafts.",
        }),
        {
          key: "writing-patterns",
          kind: "IMAGE",
          title: "Four writing prompt patterns",
          brief:
            "Four cards in a 2×2 grid: Email, Summary, Outline, Rewrite. Each shows its fill-in-the-blank pattern with placeholders highlighted. Clean, copyable look.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/prompting-for-writing-and-communication/writing-patterns.webp",
        },
      ],
    },
    {
      slug: "prompting-for-code-and-analysis",
      title: "Prompting for Code and Analysis",
      summary:
        "Getting reliable help with code, data, and structured reasoning, including how to verify it.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Code: give the model what a colleague would need

- Language and version, framework, and runtime.
- The relevant snippet, with the error message verbatim.
- What you expected versus what happened.
- Constraints: no new dependencies, must stay under a size limit, must keep the public interface.

Ask for an explanation alongside the fix; it helps you verify and learn.

## Ask for tests

"Write the function and three unit tests, including one edge case." Tests give you a way to check the answer and a safety net for later changes. Run them; do not trust them on sight.

[artifact:code-prompt]

## Analysis: structure the thinking

For data or decisions, ask for a scaffold:

\`\`\`
1. Restate the question and the decision it informs.
2. List assumptions explicitly.
3. Show the calculation or comparison.
4. State the conclusion and its confidence.
5. List what would change the conclusion.
\`\`\`

Step 5 is the most valuable: it tells you what to check.

## Structured output

When another program will consume the answer, request a specific format: "Return JSON with keys name, amount, due_date. Use null for unknown values. No prose." Give an example object. The building track shows how to enforce this with the API.

## Verify

Models write plausible code that may not run and plausible analysis that may be wrong. Run the code. Check the numbers. Ask "what could make this wrong?"

### Try it

Paste a small function you wrote and ask for three unit tests plus one bug you may have missed. Run the tests.`,
      keyTakeaways: [
        "For code, supply language, version, error text, expected behaviour, and constraints; ask for tests.",
        "For analysis, request a scaffold that ends with 'what would change this conclusion'.",
        "Specify exact output formats for machine consumption, and always verify by running or checking.",
      ],
      artifacts: [
        lessonVideo({
          title: "How to Write Better AI Prompts as a Software Developer in 2026",
          channel: "JetBrains",
          url: "https://www.youtube.com/watch?v=--XpNP6NsqE",
          durationSeconds: 260,
          brief:
            "JetBrains covers prompting for code: assign a role, paste logs, errors and API signatures as context, define the output and constraints, ask for a plan, iterate, and review AI output like a teammate's pull request rather than trusting it.",
        }),
        {
          key: "code-prompt",
          kind: "IMAGE",
          title: "A complete code prompt",
          brief:
            "Annotated prompt card: language/version, framework, pasted snippet, verbatim error, expected vs actual, constraints, 'include three tests'. Callouts explain why each part matters.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/prompting-for-code-and-analysis/code-prompt.webp",
        },
      ],
    },
    {
      slug: "building-a-prompt-library",
      title: "Building a Prompt Library",
      summary:
        "Turning what works into reusable templates with variables, versions, and notes.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## From one-off to asset

Every prompt you have refined is worth keeping. A prompt library turns scattered wins into a toolkit you and your team can reuse, improve, and trust.

## What to store for each prompt

- **Name and purpose**: "Support ticket one-liner".
- **The template** with variables in braces: \`{ticket_text}\`, \`{product}\`.
- **Example inputs and expected outputs**: your tiny test set.
- **Model and settings** it was tested with: model name, temperature.
- **Version and change notes**: what changed and why.
- **Known weaknesses**: where it fails and what to watch for.

[artifact:library-card]

## Organize by job

Group templates by what they do (summarize, classify, draft, extract, plan) rather than by project. You will reach for them across projects.

## Keep them alive

Models change. Re-run your test set when you switch models or versions, and update notes. A template that worked a year ago may need a tweak today.

## Share carefully

Prompts can contain sensitive context. Strip private data before sharing, and store production system prompts with the same care as code.

## What you have built

Across this track you learned structure, clarity, context, roles, examples, reasoning, system prompts, debugging, and domain patterns. The library is where that skill compounds. Next, the building track puts prompts inside real applications.

### Try it

Create your library with three entries from this track's exercises. Give each a name, template, two examples, and one known weakness.`,
      keyTakeaways: [
        "Store templates with variables, test examples, model settings, versions, and known weaknesses.",
        "Organize by job, not project, and re-test when models change.",
        "Treat production prompts like code: versioned, reviewed, and free of private data.",
      ],
      artifacts: [
        lessonVideo({
          title: "3 AI Habits So Powerful It Feels Like Cheating",
          channel: "Jeff Su",
          url: "https://www.youtube.com/watch?v=31cp_OXKzkI",
          durationSeconds: 650,
          brief:
            "Jeff Su shows how he keeps a reusable prompt library (a Notion database with one page per refined prompt, embedded where the work happens, plus text-expander shortcuts) and how to upgrade templates over time, which maps to this lesson's from-one-off-to-asset theme.",
        }),
        {
          key: "library-card",
          kind: "IMAGE",
          title: "A prompt library entry",
          brief:
            "Index-card style template: Name, Purpose, Template (with {variables} highlighted), Examples (input → output), Model & settings, Version & notes, Known weaknesses. Tidy, monospace for the template.",
          url: "https://ptazldkjmeuojele.public.blob.vercel-storage.com/academy/prompt-engineering-mastery/building-a-prompt-library/library-card.webp",
        },
      ],
    },
  ],
};
