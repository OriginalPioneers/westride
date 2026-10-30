import { lessonVideo, type AcademyTrackLessons } from "./types";

export const multimodalCreativeAi: AcademyTrackLessons = {
  trackSlug: "multimodal-creative-ai",
  lessons: [
    {
      slug: "what-is-multimodal-ai",
      title: "What Is Multimodal AI?",
      summary:
        "Models that read images, hear audio, and write text in one system, and why that changes what you can build.",
      estimatedDurationMinutes: 16,
      content: `[artifact:lesson-video]

## One model, many senses

A **multimodal** model accepts more than one kind of input, such as an image and a question, and can produce more than one kind of output. Instead of chaining a vision model to a language model, a single model learns the connections between what things look like, sound like, and are called.

## How it works, briefly

Images are split into patches and turned into tokens, audio into audio tokens, text into text tokens. They all flow through the same transformer. Training on paired data (captions with pictures, transcripts with audio) teaches the model to relate them. Llama's vision-capable and natively multimodal releases work this way.

[artifact:modalities]

## What becomes possible

- Describe a photo, read a chart, extract text from a receipt.
- Answer questions about a diagram or a screenshot.
- Turn a sketch into a layout or a whiteboard photo into a document.
- Understand a video clip and summarize what happened.
- Combine a voice note and a picture into a structured task.

## Where it still struggles

Fine detail (small text, exact counts), spatial precision (left of what?), and anything requiring measurement. Verify when it matters.

## This track

You will learn how models see, how to prompt visually, how to edit images, work with voice and music, build video workflows, and chain tools into a creative pipeline, then finish with ethics and finding your own style.

### Try it

Photograph a handwritten list and ask a multimodal assistant to turn it into a checklist. Count what it missed.`,
      keyTakeaways: [
        "Multimodal models process images, audio, and text as tokens in one transformer.",
        "They enable describing, reading, and reasoning about visual and audio content directly.",
        "Fine detail and spatial precision remain weak points; verify when accuracy matters.",
      ],
      artifacts: [
        lessonVideo(
          "What Is Multimodal AI?",
          "Explainer, 4 minutes. A photo, an audio clip, and a sentence each break into tokens and merge into one stream; the model answers a question about the photo. Demos of receipt reading and chart Q&A.",
          240,
        ),
        {
          key: "modalities",
          kind: "DIAGRAM",
          title: "Many inputs, one model",
          brief:
            "Image patches, audio waveform, and text words each become token rows that converge into a single transformer block; output arrows to text, and optionally image or audio. Clean, symmetrical.",
        },
      ],
    },
    {
      slug: "how-models-see-images",
      title: "How Models See Images",
      summary:
        "Patches, captions, and attention: what vision models actually perceive and what they miss.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## Pixels to patches

An image is a grid of pixels. The model divides it into small square patches, say 16 by 16 pixels, and converts each patch into a token. A photo becomes a few hundred to a few thousand visual tokens, arranged with position information so the model knows where each patch sits.

## Learning what things are called

Training pairs millions of images with text: captions, alt text, descriptions. The model learns that certain patch patterns go with the word "bicycle", that "sunset" correlates with warm gradients at the top, and how objects relate in space.

[artifact:patches]

## What this explains

- **Resolution limits**: tiny text and distant objects fall below patch size and blur together.
- **Counting errors**: eight similar objects produce similar patches; the model estimates rather than counts.
- **Confident misreads**: an unusual object gets the label of the most similar familiar one.
- **Strong gist, weak detail**: scene, mood, and main subjects are reliable; exact positions and small features are not.

## Getting better results

Crop to the region that matters. Ask specific questions ("what is the price on the third line?") rather than "describe this". Provide context ("this is a utility bill"). For precise extraction, ask for the text verbatim and then verify.

### Try it

Give the same busy photo to a model twice: once whole, once cropped to one detail. Compare the accuracy of the answers.`,
      keyTakeaways: [
        "Images become patch tokens with position information.",
        "Paired image-text training teaches names and relationships, not measurement.",
        "Crop, ask specific questions, and add context to improve accuracy.",
      ],
      artifacts: [
        lessonVideo(
          "How Models See Images",
          "Visual explainer, 4 minutes. A photo is gridded into patches that become tokens; attention links 'bicycle' to the right patches; a zoom shows why tiny text fails and how cropping helps.",
          240,
        ),
        {
          key: "patches",
          kind: "IMAGE",
          title: "A photo as patches",
          brief:
            "A street photo overlaid with a visible grid of square patches; a handful of patches pulled out to the side as tokens with numbers. Caption notes the grid size.",
        },
      ],
    },
    {
      slug: "visual-prompting-fundamentals",
      title: "Visual Prompting Fundamentals",
      summary:
        "Writing image prompts that work: subject, composition, light, style, and the words that matter most.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## The five ingredients

Most strong image prompts specify:

1. **Subject**: who or what, with one or two defining details. "An elderly baker holding a loaf."
2. **Setting**: where and when. "In a small sunlit bakery, early morning."
3. **Composition**: framing and viewpoint. "Medium shot, eye level, subject slightly off-centre."
4. **Light and mood**: "Soft window light, warm, calm."
5. **Style**: medium and references. "Documentary photograph, 35mm film look."

Order matters a little: put the subject first.

[artifact:prompt-anatomy]

## Words that pull weight

Medium words (photograph, watercolor, 3D render) change everything. Lighting words (golden hour, overcast, neon) are highly reliable. Camera words (wide angle, macro, shallow depth of field) work for photographic styles. Mood words (serene, tense) nudge colour and posture.

## Negative prompts and avoidance

Some tools accept things to avoid. Others respond better to positive phrasing: "clean background" rather than "no clutter". Test which your tool prefers.

## Iterate deliberately

Change one ingredient at a time. Keep the seed fixed when your tool allows it so you can see exactly what the change did. Save prompts that work in your library with the tool and settings noted.

## Writing for text in images

Legible text is still hard. Keep it short, put it in quotes, and expect to fix it in an editor.

### Try it

Write a five-ingredient prompt, generate it, then change only the lighting word three times. Note which version you prefer and why.`,
      keyTakeaways: [
        "Specify subject, setting, composition, light and mood, and style.",
        "Medium, lighting, and camera words have the strongest effect.",
        "Change one ingredient at a time with a fixed seed and save what works.",
      ],
      artifacts: [
        lessonVideo(
          "Visual Prompting Fundamentals",
          "Hands-on explainer, 4 minutes. A prompt is built ingredient by ingredient with the generated image updating each time; then lighting words are swapped with the seed fixed.",
          240,
        ),
        {
          key: "prompt-anatomy",
          kind: "IMAGE",
          title: "Anatomy of an image prompt",
          brief:
            "The baker prompt written out with each of the five ingredients colour-coded, beside the resulting illustrated image with matching colour callouts pointing to subject, setting, composition, light, style.",
        },
      ],
    },
    {
      slug: "editing-images-with-ai",
      title: "Editing Images with AI",
      summary:
        "Inpainting, outpainting, restyling, and upscaling, and a workflow for edits that look intentional.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## The four operations

- **Inpainting**: select a region and describe what should be there instead. Remove a passer-by, change a shirt colour, fix a hand.
- **Outpainting**: extend the canvas and let the model fill the new area consistently. Turn a portrait into a landscape crop.
- **Image-to-image / restyling**: keep the structure of a picture but change its medium or mood. A photo becomes a watercolor; a daytime shot becomes night.
- **Upscaling**: increase resolution while adding plausible detail. Essential before print.

[artifact:edit-operations]

## A workflow that holds up

1. Start from the best source you have; AI cannot rescue a blurry original.
2. Make structural edits first (remove, extend), then style, then upscale last.
3. Work in small regions. Large masks drift; small masks stay faithful.
4. Match the prompt to the surroundings: describe lighting and texture, not just the object.
5. Keep every version. Compare side by side before choosing.

## Blending the result

Edited regions can look pasted. Feather mask edges, match grain, and do a final colour pass in a traditional editor. The best AI edits are finished by hand.

## Honesty

Edits that change what a photo documents (removing a person from a news image, altering a product) cross from retouching into deception. Know which you are doing, and disclose when the context demands it.

### Try it

Take a photo of your own, remove one object with inpainting, then extend the canvas on one side. Note where the result needed hand finishing.`,
      keyTakeaways: [
        "Inpainting, outpainting, restyling, and upscaling cover most editing needs.",
        "Structure first, then style, then upscale; small masks stay faithful.",
        "Finish edits by hand and disclose changes that alter what a photo documents.",
      ],
      artifacts: [
        lessonVideo(
          "Editing Images with AI",
          "Demo, 4 minutes. A single photo goes through inpaint (remove a sign), outpaint (extend sky), restyle (evening light), and upscale, with the narrator pointing out drift and how small masks avoid it.",
          240,
        ),
        {
          key: "edit-operations",
          kind: "IMAGE",
          title: "Four edits on one photo",
          brief:
            "2×2 grid of the same street scene: Inpainting (a sign removed, mask outline shown), Outpainting (canvas extended with dashed original border), Restyling (evening watercolor), Upscaling (zoomed detail inset). Labels under each.",
        },
      ],
    },
    {
      slug: "voice-and-speech-ai",
      title: "Voice and Speech AI",
      summary:
        "Transcription, text to speech, and voice assistants: building with sound responsibly.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## Two directions

**Speech to text** (transcription) turns audio into words, with timestamps and sometimes speaker labels. Modern open models handle accents, background noise, and dozens of languages well. **Text to speech** does the reverse, with control over voice, pace, and emphasis.

## Transcription workflows

- Meeting notes: transcribe, then ask an LLM for decisions, action items, and open questions.
- Accessibility: live captions for events and videos.
- Search: transcribe a podcast archive and embed it for retrieval.

Always keep the audio and timestamps; they let you jump back to verify a quote.

[artifact:voice-pipeline]

## Text to speech workflows

- Narrating articles and lessons for listening on the go.
- Voice interfaces for devices without screens.
- Prototyping dialogue for games and films before recording actors.

Write for the ear: shorter sentences, fewer parentheticals, and explicit pauses. Markup for pronunciation and emphasis helps with names and numbers.

## Building a voice assistant

Chain speech to text → LLM (with the prompting skills you have) → text to speech. Latency adds up across the three; stream each stage. Handle interruptions gracefully and confirm before acting on anything important, since misheard words are common.

## Consent and cloning

Clone only voices you have explicit permission to use, including your own. Label synthetic speech where listeners might assume a human. Watermark if your tool supports it.

### Try it

Record a two-minute voice memo about a project, transcribe it, and ask an assistant for three action items. Check them against the audio.`,
      keyTakeaways: [
        "Transcription plus an LLM turns meetings and recordings into decisions and tasks.",
        "Write for the ear and use pronunciation markup for text to speech.",
        "Voice assistants chain three models; stream each and confirm before acting. Clone voices only with consent.",
      ],
      artifacts: [
        lessonVideo(
          "Voice and Speech AI",
          "Explainer, 4 minutes. A voice memo becomes a transcript becomes action items; a short script is read aloud by a synthetic voice with pacing markup; a voice assistant pipeline is drawn with latency bars.",
          240,
        ),
        {
          key: "voice-pipeline",
          kind: "DIAGRAM",
          title: "Voice assistant pipeline",
          brief:
            "Microphone → Speech to text → LLM (Llama) → Text to speech → Speaker, with a streaming arrow under each stage and a 'confirm before acting' gate before any tool call branch.",
        },
      ],
    },
    {
      slug: "ai-music-and-sound",
      title: "AI Music and Sound Design",
      summary:
        "Generating music, ambience, and effects for projects, and working with musicians rather than around them.",
      estimatedDurationMinutes: 16,
      content: `[artifact:lesson-video]

## What the tools do

- **Music generation** produces full tracks from descriptions: genre, tempo, mood, instrumentation, structure, sometimes lyrics.
- **Sound effects** generation creates footsteps, rain, a door creak, from a short text prompt.
- **Stem separation** splits a mixed track into vocals, drums, bass, and other, useful for remixing and practice.
- **Assistive composition** suggests chord progressions, continues a melody, or harmonizes a vocal line.

[artifact:music-prompt]

## Prompting for music

Name the genre and era, tempo in beats per minute, mood, key instruments, and structure ("30-second intro, builds, ends on a sustained chord"). Reference feelings and scenes rather than specific artists; many tools refuse artist names and the results are better when you describe the sound.

## Practical uses

Background beds for videos and podcasts, placeholder scores for prototypes, custom sound effects for apps and games, practice tracks for learners. For anything commercial, check the tool's licence for the rights you receive.

## Working with musicians

AI is strongest at sketches and placeholders. Many composers use generated ideas as starting points and then write, play, and produce the final piece. Credit collaborators, pay for final work, and be clear about what was generated.

## Rights and ethics

Training data for music is contested. Prefer tools transparent about their sources, avoid imitating living artists' voices or signature styles for commercial work, and label AI-generated tracks.

### Try it

Generate a 30-second background bed for a short video using a prompt with genre, tempo, mood, and instruments. Then write the one-line credit you would add.`,
      keyTakeaways: [
        "Tools generate tracks and effects, separate stems, and assist composition.",
        "Describe genre, tempo, mood, instruments, and structure rather than naming artists.",
        "Use AI for sketches and placeholders, credit and pay musicians for finished work, and label generated audio.",
      ],
      artifacts: [
        lessonVideo(
          "AI Music and Sound Design",
          "Explainer, 4 minutes. A music prompt is written and a short generated bed plays under a sample video; stem separation splits a track; a composer refines a generated sketch at a keyboard.",
          240,
        ),
        {
          key: "music-prompt",
          kind: "IMAGE",
          title: "A complete music prompt",
          brief:
            "Card showing a music prompt with labelled parts: Genre & era, Tempo (BPM), Mood, Instruments, Structure, Use. Example filled in for a warm acoustic 30-second video bed. Small waveform decoration.",
        },
      ],
    },
    {
      slug: "video-workflows",
      title: "Video Workflows",
      summary:
        "Where AI fits in planning, generating, editing, and publishing video, with realistic expectations.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## AI across the video process

- **Planning**: an LLM drafts scripts, shot lists, and storyboards from a brief.
- **Generation**: text-to-video and image-to-video tools create short clips for b-roll, transitions, and concept pieces.
- **Editing**: automatic transcription enables text-based editing (delete the words, delete the footage), silence removal, and rough cuts.
- **Enhancement**: upscaling, stabilizing, noise reduction, and background replacement.
- **Publishing**: captions, translations, dubbed voice tracks, thumbnails, and descriptions.

[artifact:video-pipeline]

## A practical workflow for a short explainer

1. Brief → script and shot list with an LLM.
2. Record the host, or generate an avatar presenter if appropriate and disclosed.
3. Generate b-roll clips for abstract moments; shoot real footage for anything specific.
4. Transcribe, text-edit the rough cut, remove silences.
5. Add captions, a generated music bed, and a thumbnail.
6. Translate captions and optionally dub for other audiences.

## Expectations

Generated clips are best at atmosphere: skies, cities, textures, abstract motion. Keep them short, avoid faces and hands in close-up, and cut before artifacts show. Consistency across clips is the main challenge; use the same style words and reference images.

## Disclosure

Label synthetic presenters and generated footage, especially in anything resembling news or testimony. Attach content credentials when your tools support them.

### Try it

Write a 60-second explainer script with an LLM, then list which shots you would film and which you would generate.`,
      keyTakeaways: [
        "AI assists planning, generation, editing, enhancement, and publishing.",
        "Generate atmosphere; film anything specific; keep generated clips short.",
        "Text-based editing and automatic captions save the most time; disclose synthetic elements.",
      ],
      artifacts: [
        lessonVideo(
          "Video Workflows",
          "Behind-the-scenes, 4 minutes. A short explainer is produced end to end: script, filmed host, generated b-roll skies, text-based editing, captions, and a generated music bed. Honest about where AI falls short.",
          240,
        ),
        {
          key: "video-pipeline",
          kind: "DIAGRAM",
          title: "AI across the video pipeline",
          brief:
            "Five stages left to right: Plan, Generate, Edit, Enhance, Publish. Under each, two or three AI tasks as small chips. A camera icon at Generate labelled 'film what is specific'.",
        },
      ],
    },
    {
      slug: "creative-pipelines",
      title: "Building Creative Pipelines",
      summary:
        "Chaining text, image, audio, and video tools into repeatable workflows for real projects.",
      estimatedDurationMinutes: 17,
      content: `[artifact:lesson-video]

## From tools to pipelines

A pipeline is a sequence of tools where each output feeds the next. Once designed, it turns a day of work into an hour and makes results consistent across a series.

## Example: a weekly community newsletter

1. **Gather**: pull this week's posts and events (structured data).
2. **Draft**: LLM writes the newsletter in your voice from a template and the data.
3. **Illustrate**: for each section, generate a header image from a consistent style prompt plus the section topic.
4. **Narrate**: text to speech produces an audio version.
5. **Review**: a person edits text, swaps any weak image, and approves.
6. **Publish**: export to email and web with alt text generated from each image.

[artifact:newsletter-pipeline]

## Design principles

- **Templates and style guides** keep output consistent: a fixed system prompt for text, a fixed style prefix for images.
- **Human checkpoints** where judgement matters: before publishing, before anything expensive.
- **Idempotent steps** so you can re-run one stage without redoing everything.
- **Asset management**: name and version every generated file with its prompt and seed.
- **Fallbacks**: if image generation fails, use a stock placeholder and flag it.

## Tooling

Many creators start with no-code automation tools connecting hosted AI services. As needs grow, a small script with API calls gives more control. Open models let you run the text stages privately and cheaply.

## Measure the win

Time saved, consistency, and audience response. If a stage is not earning its place, remove it.

### Try it

Design a four-step pipeline for something you make regularly. Mark the human checkpoint and the style elements that must stay fixed.`,
      keyTakeaways: [
        "Pipelines chain tools so outputs feed inputs, saving time and enforcing consistency.",
        "Fixed templates and style prefixes keep results coherent; human checkpoints protect quality.",
        "Make steps re-runnable, version every asset with its prompt, and plan fallbacks.",
      ],
      artifacts: [
        lessonVideo(
          "Building Creative Pipelines",
          "Walkthrough, 4 minutes. The newsletter pipeline runs stage by stage with files appearing in a folder; a human review pause; the final email and audio version. Mentions no-code and scripted options.",
          240,
        ),
        {
          key: "newsletter-pipeline",
          kind: "DIAGRAM",
          title: "Newsletter creative pipeline",
          brief:
            "Six boxes: Gather data → Draft text (LLM) → Illustrate (image model, fixed style) → Narrate (TTS) → Human review (highlighted) → Publish (email/web, alt text). Small file icons flowing between boxes.",
        },
      ],
    },
    {
      slug: "creative-ethics-and-your-style",
      title: "Creative Ethics and Finding Your Style",
      summary:
        "Making work that is yours: originality, consent, credit, and using AI to amplify a voice rather than replace it.",
      estimatedDurationMinutes: 16,
      content: `[artifact:lesson-video]

## Whose work is it?

AI widens what one person can make. The question is whether the result expresses something of yours. Work that is only a prompt and an accept button tends to look like everyone else's. Work where you chose, combined, edited, and pushed back tends to look like you.

## Habits that produce a style

- **Collect references** of your own: colours, compositions, phrases you love. Feed them into prompts and templates.
- **Constrain yourself**: one palette, one typeface family, one tone of voice. Constraints make a style recognizable.
- **Edit hard**: cut the generic, keep the specific.
- **Make series**: ten pieces in one direction teach you more than ten in ten directions.

[artifact:style-loop]

## Ethics in practice

- Do not imitate living artists' distinctive styles or voices for commercial work.
- Use real people's likenesses only with consent.
- Disclose AI involvement where your audience would want to know.
- Respect platform rules and licences for every tool and asset.
- Keep records: prompts, seeds, sources, and your edits.

## Credit and collaboration

Credit human collaborators fully. Describe AI's role honestly: "images generated with an AI tool from the author's prompts and edited by hand". Pay people for finished creative work.

## What you have learned

How models see, how to prompt and edit visually, how to work with voice, music, and video, and how to chain it all into pipelines. The creative tools will keep changing; taste, judgement, and integrity will not.

### Try it

Write three sentences describing your visual or written style. Turn them into a reusable style prefix for your prompts and use it on your next three pieces.`,
      keyTakeaways: [
        "Choice, combination, and editing make AI-assisted work yours.",
        "Constraints, references, and series build a recognizable style.",
        "Consent, disclosure, credit, and records are the ethical baseline.",
      ],
      artifacts: [
        lessonVideo(
          "Creative Ethics and Finding Your Style",
          "Reflective wrap-up, 4 minutes. A creator's board of references becomes a style prefix; a series of pieces grows consistent; a credit line is written. Closes the track with encouragement.",
          240,
        ),
        {
          key: "style-loop",
          kind: "DIAGRAM",
          title: "The style-building loop",
          brief:
            "Cycle: Collect references → Set constraints → Generate → Edit hard → Make a series → Review and refine references. Soft, creative visual treatment; brand palette.",
        },
      ],
    },
  ],
};
