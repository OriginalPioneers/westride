import { lessonVideo, type AcademyTrackLessons } from "./types";

export const meetMetaAiAndLlama: AcademyTrackLessons = {
  trackSlug: "meet-meta-ai-and-llama",
  lessons: [
    {
      slug: "what-is-meta-ai",
      title: "What Is Meta AI?",
      summary:
        "The assistant, the research lab, and the open models, and how the three fit together.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## Three things with one name

"Meta AI" refers to a few related things:

- **The assistant**: a conversational AI you can chat with inside WhatsApp, Instagram, Messenger, Facebook, on the web, and through Ray-Ban Meta glasses.
- **The research organization**: the team at Meta that publishes AI research and releases models and tools.
- **The open ecosystem**: the Llama family of models and the surrounding tools that anyone can download, run, and build on.

[artifact:meta-ai-map]

## What the assistant can do

Ask questions, draft messages, plan a trip, summarize a long thread, brainstorm ideas, generate and edit images, and search the web for current information. Because it lives inside apps you already use, it is often the quickest way to try a capable model.

## Why the open part matters

Most leading assistants run on closed models you can only access through the provider. Meta also releases Llama openly, so the same family of models powering the assistant can be run by students, startups, and researchers on their own terms. This track covers both the assistant you use and the models you can build with.

### Try it

Open Meta AI in any Meta app or on the web and ask it to explain Llama in two sentences. Compare its answer with this lesson.`,
      keyTakeaways: [
        "Meta AI is an assistant, a research organization, and an open model ecosystem.",
        "The assistant is available inside Meta's apps, on the web, and on Ray-Ban Meta glasses.",
        "Open Llama releases let anyone build with the same model family.",
      ],
      artifacts: [
        lessonVideo(
          "What Is Meta AI?",
          "Overview, 3 minutes. Three panels slide in: the assistant inside a chat app, a research lab, and a downloadable model file. Narrator connects them. Clean, product-tour feel without real UI screenshots.",
          180,
        ),
        {
          key: "meta-ai-map",
          kind: "DIAGRAM",
          title: "Meta AI: assistant, research, open models",
          brief:
            "Three connected circles labelled Assistant (chat bubble icon), Research (flask icon), Open models / Llama (llama icon). Short captions beneath each. Brand-neutral colours.",
        },
      ],
    },
    {
      slug: "the-llama-family",
      title: "The Llama Family",
      summary:
        "From the first research release to today's multimodal models: what each generation added.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## A short lineage

- **Llama (2023)** was released to researchers and showed that smaller, well-trained models could rival far larger ones.
- **Llama 2** opened the weights for commercial use and shipped chat-tuned variants.
- **Llama 3** improved reasoning and instruction following, and introduced larger context windows.
- **Llama 3.1** added a 405B flagship, tool-calling support, and multilingual strength.
- **Llama 3.2** brought vision-capable models and small models for phones and edge devices.
- **Llama 4** introduced natively multimodal models with very long context, built with a mixture-of-experts design.

Check the official Llama site for the current lineup; releases are frequent.

[artifact:lineage]

## What stays constant

Every generation ships in multiple sizes, with base and instruction-tuned variants, under a community license that permits most commercial use. Each release comes with a model card describing training, evaluation, and limitations, plus safety tooling.

## Reading a model name

"Llama 3.1 70B Instruct" means generation 3.1, about seventy billion parameters, tuned to follow instructions. Names tell you most of what you need to know before you download.

### Try it

Visit the Llama website and find the newest release. Write down its sizes and one new capability it added.`,
      keyTakeaways: [
        "Each Llama generation added capability: commercial use, reasoning, tool calling, vision, long context.",
        "Releases include several sizes, base and instruct variants, model cards, and safety tools.",
        "Model names encode generation, size, and tuning.",
      ],
      artifacts: [
        lessonVideo(
          "The Llama Family",
          "Timeline explainer, 3 minutes. A family tree grows generation by generation with a one-line caption for each. Ends by decoding a model name on screen.",
          180,
        ),
        {
          key: "lineage",
          kind: "DIAGRAM",
          title: "Llama generations and what they added",
          brief:
            "Vertical timeline: Llama (research release), Llama 2 (commercial use, chat), Llama 3 (reasoning, longer context), Llama 3.1 (405B, tool calling), Llama 3.2 (vision, small models), Llama 4 (native multimodal, very long context). One short caption each; leave room for future entries.",
        },
      ],
    },
    {
      slug: "open-vs-closed-models",
      title: "Open versus Closed Models",
      summary:
        "What 'open weights' really means, and the trade-offs for builders, researchers, and society.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## Definitions first

- A **closed** model is available only through its provider's service. You send inputs and receive outputs; you never see the weights.
- An **open-weights** model publishes its trained parameters so anyone can download and run it. Llama is open-weights under a community license.
- **Open source** in the strict sense would also publish training data and code. Few large models meet that bar; "open" in AI usually means open weights.

## Why builders like open models

- **Control**: run it where you want, pin a version forever, fine-tune it for your task.
- **Privacy**: data never leaves your environment.
- **Cost**: no per-token fee beyond your own hardware.
- **Transparency**: researchers can inspect behaviour and find problems.

[artifact:open-closed]

## Why closed models persist

They are easy to use, often lead on the hardest benchmarks, and come with the provider's safety systems and support. Many teams start closed and move to open as their needs become specific.

## The bigger debate

Supporters of open release argue it spreads benefits, enables scrutiny, and prevents a few companies from controlling a key technology. Critics worry about misuse once weights are public. Meta's position is that openness, combined with safety tools and responsible-use guidance, produces better outcomes. You should form your own view.

### Try it

Write two sentences: one making the strongest case for open models, one making the strongest case for closed. Which do you find more convincing today?`,
      keyTakeaways: [
        "Open-weights models can be downloaded and run by anyone; closed models are accessed only through a service.",
        "Open models offer control, privacy, cost advantages, and transparency.",
        "The open-versus-closed debate is about safety, scrutiny, and who controls the technology.",
      ],
      artifacts: [
        lessonVideo(
          "Open versus Closed Models",
          "Balanced explainer, 3 minutes. Two doors: one leads to a service counter (closed), the other to a workshop where you take the model home (open). Pros and cons appear as cards. Ends inviting the viewer to form a view.",
          180,
        ),
        {
          key: "open-closed",
          kind: "DIAGRAM",
          title: "Open-weights versus closed models",
          brief:
            "Two-column comparison table: Control, Privacy, Cost, Transparency, Ease of use, Frontier performance, Provider safety systems. Checkmarks and dashes per column. Neutral, factual tone.",
        },
      ],
    },
    {
      slug: "llama-sizes-and-capabilities",
      title: "Llama Sizes and Capabilities",
      summary:
        "Matching model size and variant to the device, task, and budget in front of you.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## The size ladder

Llama releases typically span from small models with a few billion parameters to very large flagships. Roughly:

- **1B–3B**: runs on phones and laptops. Good for on-device assistants, summarizing notes, simple classification.
- **8B–11B**: runs on a single consumer graphics card. Strong general assistant for many products.
- **70B–90B**: needs server-class hardware or a hosted provider. Handles complex reasoning and nuanced writing.
- **Flagship (400B+)**: the most capable; usually accessed through hosted services. Used for the hardest tasks and for generating training data for smaller models.

[artifact:size-ladder]

## Variants

- **Base** models complete text and are the starting point for custom fine-tuning.
- **Instruct** models follow directions and hold conversations.
- **Vision** models accept images alongside text.
- **Guard** models classify inputs and outputs for safety, used around another model.

## Context length

Newer releases accept very long inputs, from hundreds of thousands of tokens upward. That means whole books or large codebases can fit in a single prompt, though cost and speed scale with input size.

### Try it

For a study-notes summarizer that must work offline on a laptop, choose a size and variant. Then choose for a legal-research assistant with a cloud budget. Compare your picks.`,
      keyTakeaways: [
        "Small Llama models run on phones and laptops; large ones need servers or hosted providers.",
        "Base, instruct, vision, and guard variants serve different roles.",
        "Long context windows let whole documents fit in one prompt, at a cost.",
      ],
      artifacts: [
        lessonVideo(
          "Llama Sizes and Capabilities",
          "Explainer, 3 minutes. A ladder with devices on each rung (phone, laptop, GPU workstation, data centre) and the model size that fits. Variants shown as badges clipped onto a model.",
          180,
        ),
        {
          key: "size-ladder",
          kind: "DIAGRAM",
          title: "Which Llama fits which device",
          brief:
            "Four rungs: 1B–3B with a phone icon; 8B–11B with a laptop/GPU icon; 70B–90B with a server icon; 400B+ with a cloud icon. One example task per rung. Simple, legible.",
        },
      ],
    },
    {
      slug: "meta-ai-in-your-apps",
      title: "Meta AI in Your Apps",
      summary:
        "Where the assistant shows up across WhatsApp, Instagram, Messenger, Facebook, and Ray-Ban Meta glasses.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## One assistant, many doors

Meta AI appears wherever you already are:

- **WhatsApp**: chat with it directly or mention it in a group to settle a debate or plan an outing.
- **Instagram**: ask about posts, get caption ideas, or search with natural language.
- **Messenger and Facebook**: draft replies, summarize threads, and ask questions from the search bar.
- **Web**: a full-screen assistant for longer work, with image generation.
- **Ray-Ban Meta glasses**: ask what you are looking at, translate a sign, or send a message hands-free.

[artifact:app-surfaces]

## What is the same everywhere

The underlying model family, the ability to generate images, and web search for current information. Your conversations are tied to your account, so you can continue on another surface.

## What differs

Each surface adds context. In a group chat the assistant can help the group; with glasses it can see what you see. Features roll out by region, so availability varies.

## Privacy basics

Messages you send directly to Meta AI are processed to produce a reply. End-to-end encrypted personal chats stay private; the assistant only sees what you explicitly send it. Check the privacy settings in each app for controls.

### Try it

Use Meta AI on two different surfaces for the same small task, such as planning a weekend. Note one way the experience differed.`,
      keyTakeaways: [
        "Meta AI is available in WhatsApp, Instagram, Messenger, Facebook, on the web, and in Ray-Ban Meta glasses.",
        "The model and core features are shared; each surface adds its own context.",
        "The assistant only sees what you send it; encrypted personal chats stay private.",
      ],
      artifacts: [
        lessonVideo(
          "Meta AI in Your Apps",
          "Product tour, 3 minutes. Stylized (not real) phone screens for each app show a short task completed; a pair of glasses translates a street sign. Upbeat, no spoken dialogue from actors.",
          180,
        ),
        {
          key: "app-surfaces",
          kind: "IMAGE",
          title: "Where Meta AI lives",
          brief:
            "Hub-and-spoke illustration: Meta AI at the centre; spokes to stylized icons for WhatsApp, Instagram, Messenger, Facebook, Web, and Ray-Ban Meta glasses. No trademarked logos; use simple abstract glyphs with labels.",
        },
      ],
    },
    {
      slug: "hands-on-with-meta-ai",
      title: "Hands-On with Meta AI",
      summary:
        "A guided session: ask, refine, generate an image, and search the web for something current.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## Session plan

Open Meta AI on the web or in a Meta app and work through these in order. Each step builds a habit you will use in the prompt engineering track.

## Step 1: ask and refine

Ask for a three-day itinerary for a city you want to visit. Then refine: "Make day two outdoors-only and under $50." Notice how the assistant keeps the earlier context.

## Step 2: change the format

Ask for the same itinerary as a table, then as a packing list. Format instructions are among the most reliable prompts you can write.

## Step 3: generate an image

Type "Imagine" followed by a description: "Imagine a cozy reading nook with a window seat, morning light, watercolor style." Try two more variations changing only the style word.

[artifact:imagine-example]

## Step 4: ask something current

Ask about an event from this week. The assistant will search the web and cite sources. Open one source and confirm the claim.

## Step 5: summarize

Paste a long article or thread and ask for a five-bullet summary plus one question the article leaves unanswered.

### Try it

Write down which of the five steps gave the most useful result and which needed the most refining. That pattern will guide your prompting.`,
      keyTakeaways: [
        "Refining in follow-ups is more effective than writing one perfect prompt.",
        "Format instructions (table, list, bullets) are highly reliable.",
        "For current events, use web search and verify a cited source.",
      ],
      artifacts: [
        lessonVideo(
          "Hands-On with Meta AI",
          "Screen-recording-style walkthrough (recreated UI), 4 minutes. Follows the five steps with the host narrating what to notice at each step.",
          240,
        ),
        {
          key: "imagine-example",
          kind: "IMAGE",
          title: "Three styles from one prompt",
          brief:
            "Triptych of the same reading nook with a window seat and morning light rendered in watercolor, flat vector, and photoreal styles. Labels beneath each panel naming the style word used.",
        },
      ],
    },
    {
      slug: "responsible-open-ai",
      title: "Responsible Open AI",
      summary:
        "Llama Guard, the Responsible Use Guide, and how safety works when weights are public.",
      estimatedDurationMinutes: 12,
      content: `[artifact:lesson-video]

## Safety in layers

With a closed model, safety lives inside the provider's service. With open weights, safety has to be portable. Meta's approach ships safety as separate tools that travel with the model:

- **Llama Guard**: a classifier model that checks prompts and responses against a safety policy you can customize.
- **Prompt Guard**: detects prompt injection and jailbreak attempts.
- **Code Shield**: filters insecure code suggestions.
- **The Responsible Use Guide**: practical guidance for deploying Llama responsibly.

Together these are published as Purple Llama, Meta's umbrella for open trust-and-safety tools.

[artifact:safety-layers]

## The license and acceptable use

The Llama community license permits broad commercial use with an acceptable use policy that prohibits things like illegal activity, harassment, and deceptive impersonation. Very large deployments have additional terms. Read it before you ship.

## Model cards

Every release includes a model card: how it was trained, how it was evaluated, known limitations, and intended uses. It is the first document to read when deciding whether a model fits your product.

## Your responsibility

Open tools make safety possible, not automatic. You decide which checks run, what policy they enforce, and how failures are handled. Later tracks show how to wire these into an application.

### Try it

Find the Responsible Use Guide and read its section on evaluation. Write down one practice you would adopt in your first project.`,
      keyTakeaways: [
        "Open models ship safety as portable tools: Llama Guard, Prompt Guard, Code Shield.",
        "The community license allows broad use with an acceptable use policy.",
        "Model cards and the Responsible Use Guide are your first reading before deploying.",
      ],
      artifacts: [
        lessonVideo(
          "Responsible Open AI",
          "Explainer, 3 minutes. Concentric shields drawn around a model: input guard, model, output guard, human oversight. Narrator names each Purple Llama tool and ends on 'possible, not automatic'.",
          180,
        ),
        {
          key: "safety-layers",
          kind: "DIAGRAM",
          title: "Safety layers around an open model",
          brief:
            "User prompt → Prompt Guard → Llama Guard (input) → Llama model → Llama Guard (output) / Code Shield → response → human review loop. Boxes in a row with a dashed 'your policy' bracket over the guards.",
        },
      ],
    },
    {
      slug: "the-llama-community",
      title: "The Llama Community",
      summary:
        "Where to find models, tools, and people, and how to take your first step as a contributor.",
      estimatedDurationMinutes: 11,
      content: `[artifact:lesson-video]

## Where things live

- **The Llama website** hosts downloads, documentation, model cards, and the license.
- **Model hubs** such as Hugging Face host official weights plus thousands of community fine-tunes.
- **Runtimes** like llama.cpp, Ollama, vLLM, and PyTorch make models run on laptops and servers.
- **Llama Stack** and related SDKs standardize how applications talk to models and tools.
- **Forums and chats**: GitHub discussions, Discord servers, and local meetups.

[artifact:community-map]

## What the community produces

Fine-tunes for medicine, law, and specific languages. Quantized versions that fit on smaller devices. Evaluation suites, prompt libraries, and teaching material like this Academy. Much of the practical knowledge about running Llama well comes from community members sharing notes.

## Taking part

You do not need to train a model to contribute. Report a bug, improve documentation, share a benchmark on your hardware, translate a guide, or help a newcomer in a forum. Small, specific contributions are the most welcome.

## Your next step

You now know what Meta AI is, how the Llama family is organized, and how to use it responsibly. The prompt engineering track turns that knowledge into skill.

### Try it

Join one community space from the list and introduce yourself with one sentence about what you want to build.`,
      keyTakeaways: [
        "Models, runtimes, SDKs, and discussion all have well-known homes.",
        "The community produces fine-tunes, quantizations, evaluations, and shared know-how.",
        "Small, specific contributions are the best way to start.",
      ],
      artifacts: [
        lessonVideo(
          "The Llama Community",
          "Warm montage, 3 minutes. Illustrated people around the world running models on laptops, sharing notes, and meeting up. Narrator lists where to find things and how to contribute. Closes the track and points to prompt engineering.",
          180,
        ),
        {
          key: "community-map",
          kind: "DIAGRAM",
          title: "The Llama ecosystem at a glance",
          brief:
            "Map-style diagram with five regions: Official site (downloads, docs, license), Model hubs (weights, fine-tunes), Runtimes (laptop and server), SDKs and Llama Stack, Community spaces (forums, chats, meetups). Generic icons, no logos.",
        },
      ],
    },
  ],
};
