import { lessonVideo, type AcademyTrackLessons } from "./types";

export const howAiModelsLearn: AcademyTrackLessons = {
  trackSlug: "how-ai-models-learn",
  lessons: [
    {
      slug: "learning-from-data",
      title: "Learning from Data",
      summary:
        "What it means for a machine to learn, using a weather example you can follow without math.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## A guess that improves

Imagine predicting tomorrow's temperature. You start with a rough guess: tomorrow will be like today. Each day you compare your guess to the real temperature and nudge your method a little. After a year you have a decent forecaster. That loop, guess, compare, adjust, is machine learning in one sentence.

## The three ingredients

1. **Data**: examples with the answer attached. Yesterday's weather paired with today's temperature.
2. **A model**: a flexible formula with knobs that can be turned. At first the knobs are random.
3. **A loss**: a number measuring how wrong the model was. Training turns the knobs to make the loss smaller.

[artifact:learning-loop]

## Kinds of learning

- **Supervised** learning uses labelled examples: this photo is a cat, this email is spam.
- **Unsupervised** learning finds structure in unlabelled data: these customers behave alike.
- **Self-supervised** learning makes its own labels from the data, for example hiding a word and predicting it. This is how large language models learn from raw text.
- **Reinforcement** learning learns from rewards, like a game score.

### Try it

Describe something you learned by trial and error. What was your "data", what was your "loss", and how did you adjust?`,
      keyTakeaways: [
        "Learning is a loop: guess, compare to the answer, adjust, repeat.",
        "Training needs data, a model with adjustable knobs, and a loss that measures error.",
        "Large language models learn with self-supervision: predicting hidden parts of raw text.",
      ],
      artifacts: [
        lessonVideo(
          "Learning from Data",
          "Explainer, 4 minutes. A hand-drawn weather forecaster improves day by day; a loop diagram (guess, compare, adjust) animates alongside. Gentle pace, no equations.",
          240,
        ),
        {
          key: "learning-loop",
          kind: "DIAGRAM",
          title: "The learning loop",
          brief:
            "Circular diagram with three arrows: Guess (model makes a prediction) → Compare (loss measures the error) → Adjust (knobs turn slightly) → back to Guess. Small weather icons for flavour.",
        },
      ],
    },
    {
      slug: "training-vs-inference",
      title: "Training versus Inference",
      summary:
        "Why building a model costs millions and using it costs fractions of a cent.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Two very different phases

**Training** is school. The model sees enormous amounts of data, makes predictions, gets corrected, and adjusts, billions of times. For a large language model this takes thousands of specialized chips running for weeks and costs a great deal of money and energy.

**Inference** is the job after school. The trained model receives a new input and produces an output. No learning happens; the knobs are frozen. Each request takes a fraction of a second on far less hardware.

[artifact:training-inference]

## Why it matters for you

- When you chat with an assistant, you are doing inference. The model does not learn from your conversation unless the provider deliberately retrains later.
- Training cost explains why there are few organizations building frontier models from scratch, and why open releases like Llama are valuable: the expensive step is done and shared.
- Inference cost is what you pay for as a builder, usually by the token. Smaller models cost less per request; later lessons help you pick the right size.

## A note on "learning" during chat

A model can appear to learn within a conversation because earlier messages are part of its input. Close the chat and that context is gone. Persistent memory, when it exists, is a feature built around the model, not inside it.

### Try it

List one thing you would want an assistant to remember across conversations. Where would that memory need to live?`,
      keyTakeaways: [
        "Training is expensive and happens once; inference is cheap and happens every time you use the model.",
        "A chat assistant is not learning from you in real time; its knobs are frozen.",
        "Open releases like Llama share the expensive training step with everyone.",
      ],
      artifacts: [
        lessonVideo(
          "Training versus Inference",
          "Explainer, 3 minutes. Left half: a vast data centre humming for weeks (training). Right half: a single phone answering in a blink (inference). Narration ties cost and time to each side.",
          180,
        ),
        {
          key: "training-inference",
          kind: "DIAGRAM",
          title: "Training once, inference many times",
          brief:
            "Two-stage diagram. Stage 1 'Training': many documents → large compute cluster → frozen model (padlock icon). Stage 2 'Inference': user question → frozen model → answer, repeated with small arrows showing many users.",
        },
      ],
    },
    {
      slug: "inside-a-neural-network",
      title: "Inside a Neural Network",
      summary:
        "Layers, neurons, and why stacking simple pieces produces surprising abilities.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Simple units, stacked

A neural network is made of **neurons**: tiny functions that take some numbers in, weigh them, add them up, and pass the result on if it crosses a threshold. One neuron is trivial. Arrange thousands in a **layer**, stack dozens of layers, and connect them, and the network can represent extremely complicated patterns.

## What the layers learn

In an image network, early layers respond to edges and colours. Middle layers combine those into textures and shapes. Late layers recognize whole objects: an eye, a wheel, a face. Nobody programs this hierarchy; it emerges from training because it is a useful way to reduce the loss.

[artifact:layers]

## Deep means many layers

"Deep learning" just means networks with many layers. Depth lets the network build abstractions on top of abstractions, which is why it works so well on messy, real-world data like photos and language.

## The honest caveat

Because the knowledge is spread across millions of weighted connections, it is hard to point at any single neuron and say what it "means". This is why interpretability, understanding what is happening inside, is an active research area.

### Try it

Think of a skill you have that you cannot fully explain, such as recognizing a friend's walk from a distance. That intuition, built from many examples, is a good mental model for what a trained network holds.`,
      keyTakeaways: [
        "A neural network stacks many simple neurons into layers.",
        "Layers learn a hierarchy: edges, then shapes, then objects, without being told to.",
        "Depth enables abstraction, but it also makes the network hard to interpret.",
      ],
      artifacts: [
        lessonVideo(
          "Inside a Neural Network",
          "Visual explainer, 4 minutes. Camera flies into a stylized network; each layer lights up with what it responds to (edges, textures, objects) as a photo of a bicycle passes through. Slow, cinematic.",
          240,
        ),
        {
          key: "layers",
          kind: "DIAGRAM",
          title: "What each layer responds to",
          brief:
            "Left-to-right diagram: input photo of a bicycle → Layer group 1 (edge patterns) → Layer group 2 (textures and curves) → Layer group 3 (wheel, frame, saddle) → output label 'bicycle'. Small thumbnail examples under each group.",
        },
      ],
    },
    {
      slug: "parameters-and-weights",
      title: "Parameters and Weights",
      summary:
        "What '8B' and '70B' mean on a model's name, and why bigger is not always better.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The knobs have a name

The adjustable values inside a model are its **parameters**, mostly the **weights** on connections between neurons. Training sets them; inference uses them. When you see "Llama 3.1 8B", the 8B means roughly eight billion parameters. "70B" means seventy billion. "405B" means four hundred and five billion.

## What more parameters buy

More parameters give a model more capacity to store patterns and nuance. Larger models tend to follow complex instructions better, know more facts, and reason more reliably. But they also:

- need more memory and more powerful hardware to run,
- respond more slowly,
- cost more per request.

[artifact:size-tradeoffs]

## Why smaller models matter

A well-trained small model can beat a poorly trained large one, and for many tasks a small model is simply enough. An 8B model can run on a single consumer graphics card or even a high-end laptop, which makes it practical for private, offline, or low-cost uses. The Llama family deliberately ships several sizes so builders can choose.

## Parameters are not knowledge you can read

You cannot open a model and read its facts like a database. Knowledge is encoded across the weights in a distributed way. That is why updating a model's knowledge means retraining or, more practically, giving it documents at inference time (a technique called retrieval that you will meet in the building track).

### Try it

For each of these, pick small or large: a spelling helper on your phone; a legal research assistant; a customer-support bot for one product. Justify each choice in one sentence.`,
      keyTakeaways: [
        "Parameters (mostly weights) are the values training sets; '8B' means about eight billion of them.",
        "Bigger models are more capable but slower, pricier, and need more hardware.",
        "Small models are often enough and can run privately on modest hardware.",
      ],
      artifacts: [
        lessonVideo(
          "Parameters and Weights",
          "Explainer, 3 minutes. A mixing desk with billions of tiny sliders zooms out to become a model. Three model sizes compared on a balance scale: capability versus cost and speed.",
          180,
        ),
        {
          key: "size-tradeoffs",
          kind: "DIAGRAM",
          title: "Model size trade-offs",
          brief:
            "Three columns for 8B, 70B, 405B. Rows: capability, speed, cost per request, hardware needed. Filled dots (1–5) per cell. Caption: choose the smallest model that does the job well.",
        },
      ],
    },
    {
      slug: "tokens-how-models-read",
      title: "Tokens: How Models Read",
      summary:
        "Models do not see words. They see tokens. Here is what that changes.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Text becomes numbers

A model can only work with numbers. Before text goes in, a **tokenizer** chops it into pieces called **tokens** and maps each to a number. Common words are often one token. Rare words, names, and code get split into several. In English, a token averages about three quarters of a word.

[artifact:tokenization]

## Why tokens matter to you

- **Pricing**: API usage is billed per token, in and out. Shorter prompts cost less.
- **Context window**: every model has a maximum number of tokens it can consider at once. Exceed it and early text falls out of view.
- **Odd behaviours**: counting letters, spelling backwards, and some arithmetic trip models up partly because they see tokens rather than characters.
- **Languages**: some languages tokenize less efficiently than English, so the same meaning costs more tokens.

## Generation is one token at a time

When a model writes, it predicts the next token, appends it, and predicts again. Each prediction is a probability distribution over the whole vocabulary. Settings like **temperature** control whether the model always picks the most likely token (precise, repetitive) or sometimes picks less likely ones (varied, creative).

### Try it

Write a sentence with a long made-up word in it. Guess how many tokens it is, then check with any public tokenizer tool. Was the made-up word one token or several?`,
      keyTakeaways: [
        "Text is split into tokens (roughly three quarters of a word each) before a model sees it.",
        "Tokens drive pricing, context limits, and some of the model's odd failures.",
        "Models write one token at a time; temperature controls how adventurous each pick is.",
      ],
      artifacts: [
        lessonVideo(
          "Tokens: How Models Read",
          "Explainer, 4 minutes. A sentence on screen breaks into coloured token tiles, each tile gets a number, then the model generates a reply tile by tile with a probability bar for each pick.",
          240,
        ),
        {
          key: "tokenization",
          kind: "IMAGE",
          title: "A sentence as tokens",
          brief:
            "The sentence 'WeStride helps people build with Llama.' shown twice: as plain text, then split into coloured token blocks with 'WeStride' broken into two or three pieces. Monospace labels, brand palette.",
        },
      ],
    },
    {
      slug: "the-transformer-breakthrough",
      title: "The Transformer Breakthrough",
      summary:
        "Attention, explained with a dinner-party metaphor, and why it changed everything.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The problem before 2017

Earlier language models read text one token at a time, left to right, carrying a summary along. By the end of a long paragraph, the beginning had faded. They were also slow to train because each step waited for the previous one.

## Attention: everyone talks to everyone

The transformer's core idea is **attention**. Instead of reading in a line, every token looks at every other token and decides how much to care about each. In the sentence "The trophy did not fit in the suitcase because it was too big", attention lets "it" lean heavily on "trophy". Picture a dinner party where each guest can hear every conversation and tune in to the relevant ones.

[artifact:attention]

## Why it scaled so well

Because all tokens are processed at once rather than in sequence, transformers use modern chips efficiently. Researchers found that making them bigger and feeding them more data kept improving results in a predictable way. That reliability is what justified the huge training runs behind today's models, including Llama.

## Beyond text

The same design now handles images (split into patches), audio, and video. "Multimodal" models are transformers that accept several kinds of tokens together, which you will explore in later tracks.

### Try it

Write a sentence where a pronoun is ambiguous. Then rewrite it so the reference is clear. You have just done by hand what attention does automatically.`,
      keyTakeaways: [
        "Attention lets every token weigh every other token, solving the fading-memory problem.",
        "Processing tokens in parallel made transformers fast to train and easy to scale.",
        "Transformers now power text, image, audio, and video models alike.",
      ],
      artifacts: [
        lessonVideo(
          "The Transformer Breakthrough",
          "Explainer, 4 minutes. Dinner-party metaphor: guests (tokens) around a table with glowing lines showing who is listening to whom; the lines brighten for 'it' and 'trophy'. Then zoom out to show the same idea at massive scale.",
          240,
        ),
        {
          key: "attention",
          kind: "DIAGRAM",
          title: "Attention links 'it' to 'trophy'",
          brief:
            "The sentence 'The trophy did not fit in the suitcase because it was too big' with arcs above the words from 'it' to every other word; the arc to 'trophy' is thick and bright, others faint. Minimal, elegant.",
        },
      ],
    },
    {
      slug: "what-is-a-large-language-model",
      title: "What Is a Large Language Model?",
      summary:
        "Putting the pieces together: how a next-word predictor becomes a capable assistant.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## The recipe

A large language model (LLM) is a transformer with billions of parameters, trained with self-supervision on a vast amount of text to predict the next token. That is the whole recipe. The surprise of the past few years is how much capability falls out of it: grammar, facts, translation, summarization, code, and a form of reasoning.

## Why next-token prediction teaches so much

To predict the next token well across all human writing, a model must pick up grammar, world knowledge, the structure of arguments, and how code behaves. The objective is simple; the data is rich, so the skills become rich too.

[artifact:llm-recipe]

## From predictor to assistant

A freshly pretrained model completes text; it does not naturally answer questions or follow instructions. Further training stages (covered next lesson) teach it to behave like a helpful assistant: answer, refuse harmful requests, and stay on topic.

## What an LLM is not

It is not a search engine (it has no index of pages), not a database (no exact lookup), and not a calculator. It is a very capable pattern completer. Builders add those other pieces around it to make reliable products.

### Try it

Write three prompts: one the model should handle well from training alone, one that needs live information, and one that needs exact arithmetic. Predict how each will go before you test them.`,
      keyTakeaways: [
        "An LLM is a very large transformer trained to predict the next token on vast text.",
        "Rich data makes a simple objective teach grammar, facts, reasoning, and code.",
        "An LLM is not a search engine, database, or calculator; products add those around it.",
      ],
      artifacts: [
        lessonVideo(
          "What Is a Large Language Model?",
          "Explainer, 3 minutes. The three earlier ideas (transformer, parameters, tokens) click together like puzzle pieces into 'LLM'. Then quick demos of writing, translating, and summarizing from the same model.",
          180,
        ),
        {
          key: "llm-recipe",
          kind: "DIAGRAM",
          title: "The LLM recipe",
          brief:
            "Recipe-card layout. Ingredients: transformer architecture, billions of parameters, a huge text corpus, next-token prediction. Method: pretrain, then align. Result: an assistant that writes, summarizes, translates, codes.",
        },
      ],
    },
    {
      slug: "pretraining-fine-tuning-alignment",
      title: "Pretraining, Fine-Tuning, and Alignment",
      summary:
        "The three stages that turn raw text prediction into a safe, helpful assistant.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Stage 1: pretraining

The model reads trillions of tokens and learns to predict the next one. This is where general knowledge and language ability come from. It is by far the most expensive stage.

## Stage 2: fine-tuning

The pretrained model is trained further on a smaller, curated set of examples: questions paired with good answers, instructions paired with good completions. This teaches the format of being helpful. Fine-tuning is comparatively cheap, which is why open models like Llama are fine-tuned by thousands of teams for specialized uses.

## Stage 3: alignment

People compare pairs of model answers and say which is better. A separate model learns those preferences, and the LLM is tuned to produce answers people prefer: more helpful, more honest, less harmful. This is often called reinforcement learning from human feedback (RLHF), and newer variants simplify the process.

[artifact:three-stages]

## Why the stages matter

- A "base" model is pretrained only; it completes text and can be unpredictable.
- An "instruct" or "chat" model has been fine-tuned and aligned; it behaves like an assistant. Llama releases ship both so builders can choose.
- Safety behaviour comes mostly from stages 2 and 3, which is why it can vary between models built on the same base.

### Try it

Think of a job where you were trained in general skills first, then in company specifics, then coached on judgement. Map each to a stage.`,
      keyTakeaways: [
        "Pretraining builds knowledge; fine-tuning teaches format; alignment shapes behaviour.",
        "Base models complete text; instruct/chat models act as assistants.",
        "Fine-tuning is cheap enough that open models get adapted for countless uses.",
      ],
      artifacts: [
        lessonVideo(
          "Pretraining, Fine-Tuning, and Alignment",
          "Explainer, 4 minutes. A character goes through school (pretraining), job training (fine-tuning), and mentoring (alignment). Side panel shows the model's answers improving at each stage.",
          240,
        ),
        {
          key: "three-stages",
          kind: "DIAGRAM",
          title: "From base model to assistant",
          brief:
            "Three-step horizontal flow: Pretraining (huge text corpus icon) → Fine-tuning (curated Q&A icon) → Alignment (thumbs up/down comparisons icon). Labels 'base model' after step 1 and 'instruct model' after step 3.",
        },
      ],
    },
    {
      slug: "types-of-ai-models",
      title: "Types of AI Models",
      summary:
        "Classifiers, generators, embedding models, and multimodal models, and the jobs each is built for.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Not everything is a chatbot

Language models get the headlines, but most AI in production is something else. Knowing the main types helps you pick the right tool and understand what a product is really doing.

## The main families

- **Classifiers** sort inputs into categories: spam or not, which object is in the photo, positive or negative review. Fast, cheap, and easy to measure.
- **Regressors** predict a number: house price, delivery time, demand next week.
- **Generators** create new content: text (LLMs), images (diffusion models), audio, video.
- **Embedding models** turn text, images, or audio into lists of numbers that capture meaning, so similar things end up close together. They power search, recommendations, and retrieval.
- **Multimodal models** accept more than one kind of input, such as an image plus a question, and often output more than one kind too.

[artifact:model-families]

## Mixing types in one product

A photo app might use a classifier to find faces, an embedding model to group similar photos, and a generator to write captions. Real products are usually pipelines of several models, each doing the job it is best at.

### Try it

Take a product you know well and sketch which model types it probably combines. Two or three is typical.`,
      keyTakeaways: [
        "Classifiers, regressors, generators, embedding models, and multimodal models each suit different jobs.",
        "Embeddings turn meaning into numbers and power search and retrieval.",
        "Real products combine several model types in a pipeline.",
      ],
      artifacts: [
        lessonVideo(
          "Types of AI Models",
          "Explainer, 3 minutes. Five doors labelled with each model family; the host opens each to show a quick demo. Ends with a photo app built from three of them working together.",
          180,
        ),
        {
          key: "model-families",
          kind: "DIAGRAM",
          title: "Five model families and what they output",
          brief:
            "Table-like diagram. Rows: Classifier → category label; Regressor → number; Generator → new text/image/audio; Embedding model → vector of numbers; Multimodal → mixed input and output. One icon per row, consistent style.",
        },
      ],
    },
    {
      slug: "choosing-the-right-model",
      title: "Choosing the Right Model",
      summary:
        "A practical decision guide: size, openness, cost, speed, and where the model runs.",
      estimatedDurationMinutes: 15,
      content: `[artifact:lesson-video]

## Start from the task

Before comparing models, write one sentence describing the task and how you will know it worked. "Summarize support tickets into one line, judged by whether an agent can act on it without opening the ticket" is a task. "Use AI for support" is not.

## Five questions

1. **How hard is the task?** Simple extraction and classification suit small models. Multi-step reasoning and nuanced writing favour larger ones.
2. **How fast must it be?** Interactive features need quick responses; batch jobs can wait.
3. **What is the budget?** Cost scales with tokens and model size.
4. **Where must the data stay?** If data cannot leave your environment, you need a model you can run yourself. Open weights like Llama make that possible.
5. **How much control do you need?** Open models can be fine-tuned, inspected, and pinned to a version forever.

[artifact:decision-guide]

## The Llama family as an example

Llama ships in several sizes, with instruct variants, vision-capable variants, and safety tools. A typical pattern: prototype with a large hosted model to learn what "good" looks like, then test whether a smaller model meets that bar at lower cost.

## Measure, do not guess

Collect twenty to fifty real examples of your task, run each candidate model, and score the results. This small evaluation beats any leaderboard, because it measures your task.

### Try it

Write the one-sentence task description for an idea you have. Then answer the five questions in a few words each.`,
      keyTakeaways: [
        "Define the task and its success measure before choosing a model.",
        "Weigh difficulty, speed, cost, data location, and control.",
        "A small evaluation on your own examples beats any leaderboard.",
      ],
      artifacts: [
        lessonVideo(
          "Choosing the Right Model",
          "Practical walkthrough, 4 minutes. A builder on a whiteboard writes a one-sentence task, answers five questions, and lands on a model size. Shows a tiny spreadsheet evaluation at the end.",
          240,
        ),
        {
          key: "decision-guide",
          kind: "DIAGRAM",
          title: "Model choice decision guide",
          brief:
            "Flowchart. Start: 'Define the task.' Diamonds: Hard reasoning? Needs speed? Tight budget? Data must stay local? Need fine-tuning? Leaves point to 'small open model', 'large open model', 'hosted large model'. Clean, few words.",
        },
      ],
    },
  ],
};
