import { lessonVideo, type AcademyTrackLessons } from "./types";

export const aiFoundations: AcademyTrackLessons = {
  trackSlug: "ai-foundations",
  lessons: [
    {
      slug: "what-is-ai",
      title: "What Is Artificial Intelligence?",
      summary:
        "A plain-language definition of AI, and a simple test for spotting it in the wild.",
      estimatedDurationMinutes: 10,
      content: `[artifact:lesson-video]

## A working definition

Artificial intelligence is software that performs tasks we normally associate with human thinking: recognizing what is in a photo, understanding a sentence, making a recommendation, or deciding the next move in a game. The key word is *performs*. AI does not need to think the way people do to be useful; it needs to produce results that are good enough, fast enough, and often enough.

A helpful test: if a program improves at a task by looking at examples rather than by a programmer writing more rules, you are probably looking at AI.

## Rules versus patterns

Traditional software follows rules written by people. A spreadsheet adds numbers exactly the way it was told to. AI systems are different. Instead of being handed the rules, they are shown many examples and learn patterns from them. That is why the same kind of system can learn to spot spam, translate languages, or describe a picture.

[artifact:rules-vs-patterns]

## Why this matters now

AI has existed as a field since the 1950s. What changed recently is scale: far more data, far more computing power, and a model design (the transformer) that uses both well. That combination moved AI from research labs into the phone in your pocket.

### Try it

Write down three things you did today that involved software. For each one, ask: did this follow fixed rules, or did it seem to adapt to me? Keep the list; you will revisit it at the end of this track.`,
      keyTakeaways: [
        "AI is software that performs tasks we associate with human thinking, learned from examples rather than hand-written rules.",
        "The same learning approach powers very different products, from spam filters to translation.",
        "Recent progress comes from scale: more data, more compute, and better model designs.",
      ],
      artifacts: [
        lessonVideo(
          "What Is Artificial Intelligence?",
          "Friendly explainer, 3 minutes. A host at a kitchen table sorts photos into piles by hand, then a laptop does it instantly. Narration contrasts rules written by people with patterns learned from examples. End on the line: if it learns from examples, it is probably AI.",
          180,
        ),
        {
          key: "rules-vs-patterns",
          kind: "DIAGRAM",
          title: "Rules versus patterns",
          brief:
            "Two-column diagram. Left: 'Traditional software' with a flowchart of if/then rules written by a programmer. Right: 'AI' with many example photos flowing into a model that outputs labels. Clean, flat, high contrast, no more than 12 words of text.",
        },
      ],
    },
    {
      slug: "ai-ml-deep-learning",
      title: "AI, Machine Learning, and Deep Learning",
      summary:
        "Three terms people use interchangeably, and how they actually nest inside each other.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## Three nested circles

Think of three circles, one inside the next.

- **Artificial intelligence** is the largest circle: any technique that makes software behave intelligently, including old-fashioned rule systems.
- **Machine learning** is inside it: systems that learn patterns from data instead of following explicit rules.
- **Deep learning** is inside that: machine learning that uses neural networks with many layers. Nearly every AI headline today is about deep learning.

[artifact:nested-circles]

## Why the distinction helps

When someone says "the AI decided", ask which circle they mean. A bank's fraud alert might be a simple rule ("flag any purchase over $5,000 abroad"). A photo app that recognizes your dog is deep learning. The first is predictable and easy to explain; the second is powerful but harder to inspect. Knowing which one you are dealing with tells you how much to trust it and what questions to ask.

## A quick vocabulary

- **Model**: the thing that was trained; the file that makes predictions.
- **Training**: showing the model examples so it adjusts itself.
- **Prediction** (or inference): using the trained model on something new.

### Try it

Pick a product you use that advertises "AI". Decide which circle it most likely belongs to, and write one sentence explaining why.`,
      keyTakeaways: [
        "Deep learning sits inside machine learning, which sits inside AI.",
        "Rule-based AI is predictable and explainable; deep learning is powerful but harder to inspect.",
        "Model, training, and prediction are the three words you need for the rest of this track.",
      ],
      artifacts: [
        lessonVideo(
          "AI, Machine Learning, and Deep Learning",
          "Animated explainer, 3 minutes. Three concentric circles draw themselves on screen while the narrator places real products inside each: a thermostat rule, a spam filter, a photo recognizer. Calm pace, large labels.",
          180,
        ),
        {
          key: "nested-circles",
          kind: "DIAGRAM",
          title: "AI, machine learning, and deep learning as nested circles",
          brief:
            "Three concentric circles labelled Artificial intelligence (outer), Machine learning (middle), Deep learning (inner). One small example icon in each ring. Flat style, brand colours, readable at 320px wide.",
        },
      ],
    },
    {
      slug: "a-short-history-of-ai",
      title: "A Short History of AI",
      summary:
        "Seventy years in ten minutes: the booms, the winters, and the breakthrough that led to today.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## 1950s–1970s: big promises

The field got its name at a 1956 workshop at Dartmouth College. Early researchers built programs that proved theorems and played checkers, and predicted human-level machines within a generation. Computers of the time could not deliver, funding dried up, and the first "AI winter" began.

## 1980s–1990s: expert systems and a second winter

Companies built "expert systems": large collections of hand-written rules capturing how a specialist thinks. They worked in narrow domains but were costly to maintain. Interest faded again, though quieter research into learning from data continued.

## 2010s: deep learning arrives

Three things lined up: huge datasets from the internet, graphics processors that could do the math quickly, and better training techniques. In 2012 a deep neural network crushed the competition at recognizing objects in photos. Speech recognition, translation, and game-playing followed in quick succession.

[artifact:timeline]

## 2017 onward: transformers and large language models

A 2017 paper introduced the transformer, a model design that handles language unusually well and scales smoothly with more data and compute. Large language models built on it, including Meta's Llama family, can write, summarize, translate, and reason about text. That is the era you are learning in.

### Try it

Which of the three ingredients (data, compute, technique) do you think mattered most? Write two sentences defending your pick.`,
      keyTakeaways: [
        "AI has gone through cycles of excitement and disappointment since the 1950s.",
        "Deep learning took off in the 2010s when data, compute, and technique lined up.",
        "The transformer (2017) is the design behind today's large language models.",
      ],
      artifacts: [
        lessonVideo(
          "A Short History of AI",
          "Documentary-style montage, 4 minutes. Archival-feel stills from each era (period-appropriate illustration, not real photos) with a horizontal timeline that advances as the narrator speaks. Ends on a modern phone screen running an AI assistant.",
          240,
        ),
        {
          key: "timeline",
          kind: "DIAGRAM",
          title: "Milestones in AI, 1956 to today",
          brief:
            "Horizontal timeline with 7 markers: 1956 Dartmouth workshop, 1970s first AI winter, 1980s expert systems, 1997 computer beats chess champion, 2012 deep learning wins image recognition, 2017 transformer paper, 2023+ open large language models including Llama. One short caption per marker.",
        },
      ],
    },
    {
      slug: "ai-in-everyday-life",
      title: "AI in Your Everyday Life",
      summary:
        "The AI you already use without noticing, from your camera to your commute.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## A day with AI

You probably interacted with a dozen AI systems before lunch. Your phone unlocked by recognizing your face. Your camera sharpened a photo and blurred the background. Your email hid spam and suggested a reply. Your map predicted traffic. Your music app queued a song you had never heard but liked anyway.

None of these announce themselves as AI. That is the point: when AI works well, it disappears into the product.

[artifact:day-in-the-life]

## The common pattern

Most everyday AI does one of four jobs:

1. **Recognize**: what is in this image, who is speaking, what did they say?
2. **Predict**: how long will this trip take, which show will you finish?
3. **Rank**: which posts, products, or results should appear first?
4. **Generate**: write this reply, finish this sentence, create this image.

Generation is the newest of the four, and the one that gets the most attention today.

## Why noticing matters

Once you can spot these jobs, you can ask better questions: what data is this using, what is it optimizing for, and what happens when it gets it wrong? Those questions are the start of using AI thoughtfully rather than passively.

### Try it

Keep a note on your phone for one day. Each time you suspect AI is involved, jot the product and which of the four jobs it is doing. Aim for ten.`,
      keyTakeaways: [
        "Everyday AI is mostly invisible: face unlock, photo enhancement, spam filtering, traffic prediction.",
        "Most AI does one of four jobs: recognize, predict, rank, or generate.",
        "Spotting the job helps you ask what the system is optimizing for and how it can fail.",
      ],
      artifacts: [
        lessonVideo(
          "AI in Your Everyday Life",
          "Follow-along day, 3 minutes. A person wakes up, commutes, works, and relaxes; each time AI is used a small label pops in naming the job (recognize, predict, rank, generate). Upbeat, no dialogue, narration only.",
          180,
        ),
        {
          key: "day-in-the-life",
          kind: "IMAGE",
          title: "Twelve AI moments before lunch",
          brief:
            "Illustrated grid of 12 small scenes from a morning: face unlock, photo portrait mode, spam folder, smart reply, traffic map, playlist, voice assistant, autocorrect, translation, fitness tracker, news feed, thermostat. Consistent flat illustration style, warm palette.",
        },
      ],
    },
    {
      slug: "what-ai-cant-do",
      title: "What AI Can't Do (Yet)",
      summary:
        "Where today's systems fall short, and why 'confident' and 'correct' are different things.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## Confident is not the same as correct

Language models produce text that sounds fluent and sure of itself, even when it is wrong. People call these errors **hallucinations**: invented facts, citations, or details that were never in the training data. The model is not lying; it is predicting plausible text, and plausible is not the same as true.

## Common blind spots

- **Recent events**: a model knows only what it saw during training unless it is connected to live information.
- **Precise arithmetic and counting**: models reason in language, so long calculations are a weak spot without a calculator tool.
- **Understanding its own limits**: a model rarely knows when it does not know.
- **Common sense about the physical world**: it has read about the world but has not lived in it.
- **Consistency**: ask the same question twice and you may get two different answers.

[artifact:hallucination-example]

## What this means for you

Treat AI output as a strong first draft from a well-read colleague who sometimes bluffs. Verify facts that matter, give it tools for math and lookup, and keep a person responsible for the final decision. Later tracks show how builders reduce these failures with retrieval, tools, and evaluation.

### Try it

Ask any AI assistant for the population of your hometown and the source. Then check the source. Did the number and the source both hold up?`,
      keyTakeaways: [
        "Models predict plausible text; fluent output can still be wrong.",
        "Known weak spots: recent events, precise math, self-awareness, physical common sense, consistency.",
        "Treat output as a strong first draft and verify anything that matters.",
      ],
      artifacts: [
        lessonVideo(
          "What AI Can't Do (Yet)",
          "Explainer, 3 minutes. Split screen: an AI assistant answers confidently on the left while a fact-checker on the right finds the errors. Tone is fair, not alarmist. Ends with the 'well-read colleague who sometimes bluffs' metaphor.",
          180,
        ),
        {
          key: "hallucination-example",
          kind: "IMAGE",
          title: "A confident but wrong answer",
          brief:
            "Mock chat screenshot (not from any real product). The assistant gives a crisp, well-formatted answer citing a book that does not exist. A red annotation circles the invented citation with the caption 'fluent, formatted, false'.",
        },
      ],
    },
    {
      slug: "risks-bias-and-ethics",
      title: "Risks, Bias, and Ethics",
      summary:
        "How AI can go wrong for people, and the questions every responsible user should ask.",
      estimatedDurationMinutes: 10,
      content: `[artifact:lesson-video]

## Where bias comes from

A model learns from data, and data reflects the world that produced it, including its unfairness. If a hiring dataset contains decades of biased decisions, a model trained on it will learn to repeat them. Bias is rarely added on purpose; it is inherited and then amplified by scale.

## Four questions to ask

1. **Who is affected?** A music recommendation getting it wrong is annoying. A loan or medical decision getting it wrong changes lives.
2. **Who is accountable?** There should always be a person who can explain and reverse a decision.
3. **What data was used?** Was it collected with consent? Does it represent the people the system serves?
4. **What happens when it fails?** Good systems make failure visible and easy to appeal.

[artifact:four-questions]

## Privacy and misuse

AI also raises concerns beyond bias: systems that memorize personal data, deepfakes that impersonate real people, and tools that make scams cheaper to run. Responsible development means thinking about misuse before launch, not after. Meta publishes a Responsible Use Guide for Llama for exactly this reason, and you will see it again in the Meta AI track.

### Try it

Choose one AI product you rely on. Answer the four questions for it in a few words each. Which answer were you least sure about?`,
      keyTakeaways: [
        "Bias is inherited from data and amplified by scale, not usually added on purpose.",
        "Ask who is affected, who is accountable, what data was used, and what happens on failure.",
        "Privacy and misuse deserve attention before launch, not after.",
      ],
      artifacts: [
        lessonVideo(
          "Risks, Bias, and Ethics",
          "Thoughtful explainer, 3 minutes. Illustrated scenarios: a résumé screener, a photo filter, a voice clone. For each, the narrator asks the four questions. Neutral, respectful tone; diverse illustrated people.",
          180,
        ),
        {
          key: "four-questions",
          kind: "DIAGRAM",
          title: "Four questions for any AI system",
          brief:
            "Four cards in a row: Who is affected? Who is accountable? What data was used? What happens when it fails? Each with a simple line icon. Flat, high contrast.",
        },
      ],
    },
    {
      slug: "reading-ai-news-like-a-pro",
      title: "Reading AI News Like a Pro",
      summary:
        "A checklist for separating real progress from hype in AI headlines.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## Why the headlines mislead

AI news swings between "this changes everything" and "it is all a bubble". Both make for good clicks. The truth usually sits in the details: what exactly was tested, against what, and by whom.

## A five-point checklist

1. **Demo or product?** A demo shows the best case once. A product has to work for everyone, every day.
2. **Benchmark or real task?** Scoring well on a test is not the same as being useful in your workflow.
3. **Who ran the evaluation?** Independent results carry more weight than a company grading its own work.
4. **Open or closed?** Can anyone download and inspect the model, or must you take the claims on trust? Open models like Llama let researchers verify.
5. **What is the failure rate?** "Works 90% of the time" means one in ten users hits a problem.

[artifact:hype-checklist]

## Words to watch

"Understands", "thinks", and "knows" are metaphors when applied to software. They are fine shorthand, but notice when a headline leans on them to imply more than the evidence supports.

### Try it

Find one AI headline from this week. Run it through the checklist. Did your opinion of the story change?`,
      keyTakeaways: [
        "Ask whether a claim rests on a demo or a shipped product, a benchmark or a real task.",
        "Independent evaluations and open models make claims verifiable.",
        "Words like 'understands' and 'knows' are metaphors; check what the evidence actually shows.",
      ],
      artifacts: [
        lessonVideo(
          "Reading AI News Like a Pro",
          "Fast-paced explainer, 3 minutes. A newsroom-style desk; headlines fly in and the host stamps each one with a checklist item. Light humour, respectful of journalists.",
          180,
        ),
        {
          key: "hype-checklist",
          kind: "IMAGE",
          title: "The AI headline checklist",
          brief:
            "Printable-style checklist card with five tick boxes: Demo or product? Benchmark or real task? Who evaluated it? Open or closed? What is the failure rate? Clean typography, brand accent colour.",
        },
      ],
    },
    {
      slug: "your-ai-journey",
      title: "Your AI Journey Starts Here",
      summary:
        "What you have learned, how the rest of the Academy fits together, and how to pick your path.",
      estimatedDurationMinutes: 10,
      content: `[artifact:lesson-video]

## What you can do now

You can define AI, machine learning, and deep learning. You can spot the four jobs AI does in everyday products. You know where models fall short and the questions to ask about fairness and accountability. That is a stronger footing than most people who talk about AI every day.

## The road ahead

The Academy is built as a path:

- **How AI Models Learn** opens the box: data, neural networks, tokens, and transformers.
- **Generative AI Explained** covers how text, images, audio, and video get created.
- **Meet Meta AI & Llama** introduces the open models you will build with.
- **Prompt Engineering Mastery** turns you into a confident, precise AI user.
- From there you branch into **building**, **agents**, **creative work**, or **real-world applications**, and finish with the **capstone**: shipping your own AI product.

[artifact:academy-map]

## Pick your pace

Each lesson is designed to stand alone, so you can take one on a lunch break. Mark lessons complete as you go; your progress shows on every track page, and finishing a track earns its badge.

### Try it

Go back to the list you made in lesson one. Re-label each item with what you know now. Then open the next track.`,
      keyTakeaways: [
        "You now have the vocabulary and the skepticism to engage with AI thoughtfully.",
        "The Academy moves from understanding, to using, to building, to launching.",
        "Lessons stand alone; mark them complete to track progress and earn track badges.",
      ],
      artifacts: [
        lessonVideo(
          "Your AI Journey Starts Here",
          "Warm wrap-up, 2 minutes. Host recaps the track on a whiteboard, then reveals the full Academy path as a winding road with ten stops. Encouraging close inviting the learner to the next track.",
          120,
        ),
        {
          key: "academy-map",
          kind: "DIAGRAM",
          title: "The WeStride Academy path",
          brief:
            "Illustrated road map with ten stops in order: AI Foundations, How AI Models Learn, Generative AI Explained, Meet Meta AI & Llama, Prompt Engineering Mastery, Build with Llama, AI Agents & Automation, Multimodal & Creative AI, AI in Action, From Idea to Launch. Branches shown after Prompt Engineering. Friendly, flat style.",
        },
      ],
    },
  ],
};
