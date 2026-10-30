import { lessonVideo, type AcademyTrackLessons } from "./types";

export const generativeAiExplained: AcademyTrackLessons = {
  trackSlug: "generative-ai-explained",
  lessons: [
    {
      slug: "generative-vs-traditional-ai",
      title: "Generative versus Traditional AI",
      summary:
        "The shift from AI that labels the world to AI that makes new things.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## Labelling versus creating

For most of its history, AI answered narrow questions: is this spam, which face is this, how much will this cost? These are **discriminative** tasks: the system draws lines between categories. **Generative** AI does something different. It produces new content that did not exist before: a paragraph, a picture, a melody, a video clip.

## The same learning, a different output

Generative models are still trained by prediction. A language model predicts the next token; an image model predicts how to remove noise from a picture. The difference is that the output is itself the product, not a label about something else.

[artifact:discriminative-generative]

## Why it feels like a leap

Three reasons generative AI captured attention:

1. **It is visible.** A label is invisible to most users; a generated poem or image is not.
2. **It is general.** One text model can write, translate, summarize, and code.
3. **It is conversational.** Chat interfaces let anyone use it without training.

## Where the two meet

Most real products combine both. A photo editor uses a discriminative model to find the sky, then a generative model to replace it. Knowing which part is which helps you judge what can go wrong where.

### Try it

List three AI features you have used. Mark each as discriminative, generative, or both.`,
      keyTakeaways: [
        "Discriminative AI labels and sorts; generative AI creates new content.",
        "Both are trained by prediction; generative models make the output the product.",
        "Real products mix the two, so learn to tell which part is which.",
      ],
      artifacts: [
        lessonVideo(
          "Generative versus Traditional AI",
          "Explainer, 3 minutes. Split screen: a sorting machine stamps labels on photos (discriminative) while an easel paints a new picture from a sentence (generative). Narration explains why the second feels like a leap.",
          180,
        ),
        {
          key: "discriminative-generative",
          kind: "DIAGRAM",
          title: "Discriminative versus generative",
          brief:
            "Two panels. Left 'Discriminative': many photos → model → labels (cat, dog). Right 'Generative': short prompt → model → brand-new picture. Arrow styles differ to emphasize input/output direction.",
        },
      ],
    },
    {
      slug: "how-text-generation-works",
      title: "How Text Generation Works",
      summary:
        "From next-token prediction to coherent essays: sampling, temperature, and context.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## One token at a time

A language model writes by repeatedly asking "given everything so far, what comes next?" Each step produces probabilities for every token in its vocabulary. One is chosen, appended, and the loop repeats until a stop token or a length limit.

## Choosing the next token

- **Greedy**: always pick the most likely token. Safe but repetitive.
- **Temperature**: flatten or sharpen the probabilities. Low temperature is focused and predictable; high temperature is varied and sometimes strange.
- **Top-p**: only consider the smallest set of tokens whose probabilities add up to p. Cuts off the long tail of unlikely picks.

[artifact:sampling]

## Context is everything

The model's only knowledge of your request is the text in its context window: the system prompt, the conversation so far, and any documents you included. Everything you want it to consider must be there. This is why clear prompts and relevant documents matter so much, and why the prompt engineering track is next.

## Why outputs vary

Run the same prompt twice with temperature above zero and you get different answers. That is a feature for brainstorming and a bug for extraction. Builders set temperature to zero when they need consistency.

### Try it

Ask an assistant to name a colour three times in separate chats. Then ask it to name a colour "at temperature zero". Notice what varies and what does not.`,
      keyTakeaways: [
        "Text is generated token by token from probabilities over the vocabulary.",
        "Temperature and top-p trade predictability for variety.",
        "Everything the model considers must be in its context window.",
      ],
      artifacts: [
        lessonVideo(
          "How Text Generation Works",
          "Explainer, 3 minutes. A sentence grows one token at a time; each step shows a bar chart of the top candidates. A temperature dial is turned and the bars flatten; the output gets more surprising.",
          180,
        ),
        {
          key: "sampling",
          kind: "DIAGRAM",
          title: "Temperature and top-p",
          brief:
            "Two small bar charts of next-token probabilities. Left labelled 'low temperature' with one tall bar; right 'high temperature' with flatter bars. A bracket on each shows the top-p cutoff.",
        },
      ],
    },
    {
      slug: "how-image-generation-works",
      title: "How Image Generation Works",
      summary:
        "Diffusion explained: teaching a model to see pictures hiding in noise.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## Starting from static

Most modern image generators use **diffusion**. During training, the model is shown real images with increasing amounts of noise added, and learns to predict the noise so it can be removed. At generation time the process runs in reverse: start with pure random static and remove noise step by step until a picture appears.

## Where the words come in

Your prompt is turned into numbers by a text encoder and fed into every denoising step. The model learns during training that certain words go with certain visual features, so "a red bicycle on a beach at sunset" steers each step toward those features.

[artifact:diffusion-steps]

## Why results look the way they do

- **Hands and text** are hard because they need precise structure, and diffusion works globally first, details last.
- **Style words** work because the training data included captions with those words.
- **Seeds** let you reproduce a result: same prompt, same seed, same image.

## Beyond generation

The same machinery powers inpainting (replace part of an image), outpainting (extend the edges), and image-to-image (restyle an existing picture). You will use these in the multimodal track.

### Try it

Write a prompt for an image with five concrete details: subject, setting, lighting, style, and mood. Keep it; you will test it later in the Academy.`,
      keyTakeaways: [
        "Diffusion models learn to remove noise, then generate by denoising random static.",
        "The prompt steers every denoising step toward matching visual features.",
        "Inpainting, outpainting, and restyling reuse the same process.",
      ],
      artifacts: [
        lessonVideo(
          "How Image Generation Works",
          "Visual explainer, 3 minutes. A square of static slowly resolves into a red bicycle on a beach over about 30 steps while the prompt's words light up as they take effect. Calm electronic score.",
          180,
        ),
        {
          key: "diffusion-steps",
          kind: "IMAGE",
          title: "From noise to picture",
          brief:
            "Filmstrip of six frames showing pure noise gradually becoming a red bicycle on a beach at sunset. Frames evenly spaced; last frame fully clear. Caption under each: step 0, 10, 20, 30, 40, 50.",
        },
      ],
    },
    {
      slug: "audio-music-and-voice",
      title: "Audio, Music, and Voice",
      summary:
        "Speech synthesis, voice cloning, and music generation, and what makes audio different.",
      estimatedDurationMinutes: 14,
      content: `[artifact:lesson-video]

## Sound as data

Audio is a long sequence of numbers describing air pressure thousands of times per second. Models rarely work on that raw stream. Instead they compress it into audio tokens or a spectrogram (a picture of frequencies over time), generate in that compressed space, and decode back to sound.

## Three kinds of audio generation

- **Text to speech** reads text aloud in a chosen voice. Modern systems handle emphasis, pauses, and emotion well enough to narrate audiobooks.
- **Voice conversion and cloning** makes speech sound like a particular person from a short sample. Powerful for accessibility and dubbing; serious risk for impersonation.
- **Music generation** produces instrumental or vocal tracks from a description such as "upbeat acoustic folk, 90 bpm".

[artifact:audio-pipeline]

## What makes audio hard

Timing matters: a syllable a tenth of a second late sounds wrong. Long pieces must stay coherent for minutes. And listeners are extremely sensitive to artifacts, so quality bars are high.

## Responsibility

Because voices identify people, consent is essential. Reputable tools require permission to clone a voice and watermark output. Treat any unexpected voice message asking for money or codes as suspicious, however familiar it sounds.

### Try it

Listen to an AI-narrated clip and a human one. Note two things that gave the AI away, if anything did.`,
      keyTakeaways: [
        "Audio models work on compressed tokens or spectrograms, then decode to sound.",
        "Text to speech, voice cloning, and music generation are the main categories.",
        "Voice cloning requires consent; be skeptical of unexpected voice requests.",
      ],
      artifacts: [
        lessonVideo(
          "Audio, Music, and Voice",
          "Explainer, 3 minutes. Waveform becomes a spectrogram becomes tokens; a narrator demonstrates text to speech and a short generated music loop. Closes with a consent and safety message.",
          180,
        ),
        {
          key: "audio-pipeline",
          kind: "DIAGRAM",
          title: "How audio generation flows",
          brief:
            "Pipeline: text or description → audio tokens / spectrogram generated by the model → decoder → waveform → speaker icon. Small waveform and spectrogram thumbnails inline.",
        },
      ],
    },
    {
      slug: "video-generation",
      title: "Video Generation",
      summary:
        "Why video is the hardest medium, what today's tools can do, and how to spot a fake.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## Images plus time

A video is a stack of images that must agree with each other. Objects need to keep their shape, lighting must stay consistent, and motion has to obey physics well enough to look right. Video models extend diffusion across time so every frame is generated with its neighbours in view.

## What works today

- Short clips (seconds, not minutes) from a text prompt or a starting image.
- Camera moves, simple character motion, atmospheric scenes.
- Extending or looping existing footage, and changing style.

## What still struggles

- Long, coherent stories with the same characters throughout.
- Complex physical interactions: hands, pouring liquids, crowds.
- Legible text and precise logos.

[artifact:video-timeline]

## Spotting generated video

Look for shifting details between frames, fingers that merge, backgrounds that drift, and text that changes letter by letter. Also check provenance: credible publishers increasingly attach content credentials that record how a clip was made.

### Try it

Watch a short AI-generated clip and pause it at three points. Write down one inconsistency you find at each pause.`,
      keyTakeaways: [
        "Video generation is diffusion extended across time; consistency between frames is the hard part.",
        "Today's tools excel at short, atmospheric clips and struggle with long stories and fine physical detail.",
        "Check frames for drifting details and look for content credentials.",
      ],
      artifacts: [
        lessonVideo(
          "Video Generation",
          "Explainer, 3 minutes. A stack of frames fans out to show how each is generated with its neighbours. Side-by-side: a convincing landscape clip and a clip with telltale glitches, with annotations.",
          180,
        ),
        {
          key: "video-timeline",
          kind: "IMAGE",
          title: "Where video generation stands",
          brief:
            "Two-row chart. Top row 'Works well': short clips, camera moves, atmosphere, restyling. Bottom row 'Still hard': long stories, hands and liquids, legible text. Simple icons, muted palette.",
        },
      ],
    },
    {
      slug: "the-generative-ai-toolbox",
      title: "The Generative AI Toolbox",
      summary:
        "A map of today's tools by job, with a bias toward open and accessible options.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## Tools by job, not by brand

Brands change monthly; jobs do not. Organize your toolbox by what you need to do.

- **Writing and thinking**: chat assistants built on large language models. Meta AI (powered by Llama) is free inside WhatsApp, Instagram, Messenger, and on the web.
- **Images**: text-to-image generators and editors with inpainting and upscaling.
- **Audio**: text to speech, transcription, and music generation.
- **Video**: clip generators, avatar presenters, and AI-assisted editing.
- **Code**: assistants that complete, explain, and refactor code.
- **Building blocks**: APIs and open models you can run yourself, which the building track covers.

[artifact:toolbox]

## Open versus hosted

Hosted tools are convenient and need no setup. Open models such as Llama give you control, privacy, and the freedom to run them anywhere, at the cost of some setup. Many builders use both: hosted for exploring, open for shipping.

## How to evaluate a tool

Give three tools the same task and compare on quality, speed, cost, data handling, and whether you can export your work. Write the result down. Your notes will be more useful than any review.

### Try it

Pick one job from the list and try two tools on the same task today. Which would you use again, and why?`,
      keyTakeaways: [
        "Organize tools by job (writing, images, audio, video, code, building blocks), not by brand.",
        "Hosted tools are convenient; open models like Llama give control and privacy.",
        "Compare tools on the same task and record what you find.",
      ],
      artifacts: [
        lessonVideo(
          "The Generative AI Toolbox",
          "Tour, 3 minutes. A physical toolbox opens; each drawer is a job with illustrated tools inside. The host explains open versus hosted using two drawers side by side.",
          180,
        ),
        {
          key: "toolbox",
          kind: "DIAGRAM",
          title: "The generative AI toolbox by job",
          brief:
            "Toolbox illustration with six labelled drawers: Writing, Images, Audio, Video, Code, Building blocks. Each drawer shows two or three generic tool icons, no brand logos.",
        },
      ],
    },
    {
      slug: "judging-ai-output",
      title: "Judging AI Output",
      summary:
        "A repeatable way to assess quality, catch hallucinations, and know when to trust a result.",
      estimatedDurationMinutes: 14,
      content: `[artifact:lesson-video]

## Good enough for what?

Quality depends on purpose. A brainstorm needs range; a contract summary needs accuracy; a greeting card needs charm. Decide the purpose before judging the output, or you will grade the wrong thing.

## The four-part check

1. **Accuracy**: are the facts, numbers, names, and quotes correct? Verify anything you would be embarrassed to get wrong.
2. **Completeness**: did it answer the whole question, or quietly drop the hard part?
3. **Fit**: is the tone, length, and format right for the audience?
4. **Safety**: does it contain anything harmful, private, or inappropriate?

[artifact:four-part-check]

## Hallucination tells

- Suspiciously specific details with no source.
- Citations you cannot find.
- Confident answers to questions that have no settled answer.
- Perfect formatting around shaky content.

## Use the model to check the model

Ask for sources, then verify them. Ask the model to list what it is unsure about. Ask the same question a different way and compare. None of these replaces human judgement, but they surface problems fast.

### Try it

Take any AI answer you received this week and score it on the four parts, one to five each. Where did it lose points?`,
      keyTakeaways: [
        "Decide the purpose before judging quality.",
        "Check accuracy, completeness, fit, and safety every time.",
        "Ask for sources and uncertainties, then verify; formatting is not evidence.",
      ],
      artifacts: [
        lessonVideo(
          "Judging AI Output",
          "Practical explainer, 3 minutes. The host grades three AI answers live on a four-part scorecard, catching an invented citation along the way. Clear, methodical.",
          180,
        ),
        {
          key: "four-part-check",
          kind: "DIAGRAM",
          title: "The four-part output check",
          brief:
            "Scorecard graphic with four rows: Accuracy, Completeness, Fit, Safety. Each row has five empty circles for scoring and a one-line prompt question. Brand accent colour.",
        },
      ],
    },
    {
      slug: "originality-copyright-and-credit",
      title: "Originality, Copyright, and Credit",
      summary:
        "Who made it, who owns it, and how to be fair when AI helps you create.",
      estimatedDurationMinutes: 14,
      content: `[artifact:lesson-video]

## Is it original?

Generative models do not paste together stored copies; they produce new outputs from learned patterns. But they can reproduce memorized passages or closely imitate a distinctive style. "New" and "original" are not quite the same thing, and the line is still being drawn.

## Who owns the output?

Rules differ by country and are changing. In several places, work created entirely by a machine cannot be copyrighted, while work with substantial human creative input can. Read the terms of any tool you use: some grant you full rights to outputs, others do not.

[artifact:rights-map]

## Training data questions

Whether training on publicly available content is lawful is being tested in courts. Reputable providers now publish more about their data sources and offer ways for creators to opt out. Follow this; it affects what you can safely build on.

## Being fair in practice

- Disclose AI assistance where your audience would want to know.
- Do not imitate a living artist's style to pass work off as theirs.
- Keep your own creative contribution central; AI is a collaborator, not a ghostwriter you hide.
- Keep records of prompts and edits in case you need to show your process.

### Try it

Write the one-line disclosure you would put on a blog post where AI drafted the outline and you wrote the text.`,
      keyTakeaways: [
        "Outputs are new but can imitate or memorize; originality is a spectrum.",
        "Ownership rules vary and depend on human creative input; read each tool's terms.",
        "Disclose AI help, avoid passing off imitation, and keep records of your process.",
      ],
      artifacts: [
        lessonVideo(
          "Originality, Copyright, and Credit",
          "Explainer, 3 minutes. An artist's studio where an AI collaborator sketches ideas; the artist chooses, edits, and signs. Neutral treatment of unsettled legal questions; practical fairness tips at the end.",
          180,
        ),
        {
          key: "rights-map",
          kind: "DIAGRAM",
          title: "Who can own AI-assisted work?",
          brief:
            "Spectrum bar from 'Fully machine-made' (left) to 'Substantial human creativity' (right), with a note that protection generally increases to the right and varies by country. No specific legal claims.",
        },
      ],
    },
    {
      slug: "creating-responsibly",
      title: "Creating Responsibly",
      summary:
        "Practical habits for making things with generative AI that you would be proud to sign.",
      estimatedDurationMinutes: 13,
      content: `[artifact:lesson-video]

## The habits

1. **Know your purpose.** Decide what the piece is for before you generate anything. It sharpens prompts and makes judging easier.
2. **Draft with AI, decide as a human.** Let the model widen your options; you choose and shape.
3. **Verify before you publish.** Facts, quotes, names, and numbers get checked. Every time.
4. **Protect people.** No real person's face, voice, or private information without consent.
5. **Disclose honestly.** A short note about AI involvement builds trust and costs nothing.
6. **Keep the receipts.** Save prompts, seeds, and edit history.

[artifact:habits]

## Watermarks and credentials

Many generators now embed invisible watermarks or attach content credentials describing how a file was made. Leave them intact. As detection tools improve, intact credentials will protect your work's reputation.

## When not to use it

Some moments call for a wholly human voice: a condolence note, an apology, a personal recommendation. Knowing when not to reach for the tool is part of using it well.

### Try it

Choose one habit you do not yet follow and apply it to your next AI-assisted piece. Note what changed.`,
      keyTakeaways: [
        "Purpose first, human decisions, verification, consent, disclosure, and records.",
        "Leave watermarks and content credentials intact.",
        "Some moments deserve a wholly human voice; know when to put the tool down.",
      ],
      artifacts: [
        lessonVideo(
          "Creating Responsibly",
          "Reflective wrap-up, 3 minutes. The host finishes a small project (a newsletter) applying each habit in turn, then shows the published piece with its disclosure line. Encouraging close into the next track.",
          180,
        ),
        {
          key: "habits",
          kind: "IMAGE",
          title: "Six habits for responsible creation",
          brief:
            "Poster-style card with six numbered habits: Know your purpose; Draft with AI, decide as a human; Verify before you publish; Protect people; Disclose honestly; Keep the receipts. Minimal icons, generous whitespace.",
        },
      ],
    },
  ],
};
