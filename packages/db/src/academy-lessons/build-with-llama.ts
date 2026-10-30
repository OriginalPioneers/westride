import { lessonVideo, type AcademyTrackLessons } from "./types";

export const buildWithLlama: AcademyTrackLessons = {
  trackSlug: "build-with-llama",
  lessons: [
    {
      slug: "from-user-to-builder",
      title: "From User to Builder",
      summary:
        "What changes when the model is inside your product, and the shape of every AI application.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## The mindset shift

As a user, you write a prompt and read the answer. As a builder, you write code that assembles the prompt from your data, sends it to the model, checks the answer, and shows it to someone who never sees the prompt. You are responsible for every input and every output.

## The shape of an AI application

Almost every AI feature has the same five parts:

1. **Input**: what the user provides, plus data your system adds.
2. **Prompt assembly**: system prompt, context, examples, the user's request.
3. **Model call**: send to Llama, hosted or self-run, with settings.
4. **Output handling**: parse, validate, filter for safety, format.
5. **Feedback**: logging, user corrections, evaluation.

[artifact:app-shape]

## What this track covers

Accessing Llama, making your first call, structuring chat, building a chatbot, embeddings and retrieval, structured outputs and tools, fine-tuning basics, evaluation, and getting to production. Each lesson includes a hands-on step. You can follow along with low-code tools or with code in any language.

## What you need

A free account with a Llama hosting provider or a laptop that can run a small model locally, a text editor, and curiosity. No machine learning background is required.

### Try it

Sketch the five parts for a feature you would like to build. One sentence per part is enough.`,
      keyTakeaways: [
        "Builders own the whole loop: input, prompt assembly, model call, output handling, feedback.",
        "Every AI feature shares this five-part shape regardless of language or framework.",
        "You can follow this track with hosted Llama or a small local model.",
      ],
      artifacts: [
        lessonVideo(
          "From User to Builder",
          "Motivating explainer, 4 minutes. A chat window is peeled back to reveal the pipeline behind it; each of the five parts lights up as the narrator explains. Ends with a preview of the track's final chatbot.",
          240,
        ),
        {
          key: "app-shape",
          kind: "DIAGRAM",
          title: "The five parts of an AI application",
          brief:
            "Left-to-right pipeline: Input → Prompt assembly → Model call (Llama) → Output handling → Feedback loop arrow back to Prompt assembly. Each box with a tiny icon and one example.",
        },
      ],
    },
    {
      slug: "ways-to-access-llama",
      title: "Ways to Access Llama",
      summary:
        "Hosted APIs, playgrounds, and running locally: pick the path that fits your stage.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Three paths

**Playgrounds** are web interfaces where you pick a model, type a prompt, and adjust settings. No code. Ideal for exploring behaviour before you build.

**Hosted APIs** let your code call Llama over the internet. Several cloud providers host Llama models; you pay per token and never manage hardware. Most teams start here.

**Local or self-hosted** means downloading weights and running them on your own machine or servers using a runtime such as Ollama, llama.cpp, or vLLM. Full control and privacy, with setup and hardware to manage.

[artifact:access-paths]

## Choosing

- Exploring an idea? Playground.
- Building a prototype quickly? Hosted API.
- Data cannot leave your environment, or you want zero per-token cost at scale? Self-host.
- Shipping to phones or offline devices? Small local models.

Many teams prototype hosted and move to self-hosted once requirements are clear.

## Getting set up

For the hosted path: create an account with a provider, generate an API key, and store it in an environment variable, never in code. For the local path: install a runtime, pull an 8B instruct model, and confirm it answers a prompt. Either way, you are ready for the next lesson.

### Try it

Set up one path today. Confirm you can get a reply to "Say hello in three languages."`,
      keyTakeaways: [
        "Playgrounds for exploring, hosted APIs for building fast, self-hosting for control and privacy.",
        "Store API keys in environment variables, never in source code.",
        "Prototype hosted, then revisit self-hosting once requirements are clear.",
      ],
      artifacts: [
        lessonVideo(
          "Ways to Access Llama",
          "Explainer, 4 minutes. Three paths branch from a signpost; each gets a 45-second mini-demo (playground typing, a curl-style API call, a terminal pulling a local model). Clear recommendations at the end.",
          240,
        ),
        {
          key: "access-paths",
          kind: "DIAGRAM",
          title: "Three ways to reach Llama",
          brief:
            "Three columns: Playground (browser icon; no code; explore), Hosted API (cloud icon; pay per token; build fast), Self-hosted (server/laptop icon; full control; manage hardware). Row of 'best for' notes beneath.",
        },
      ],
    },
    {
      slug: "your-first-api-call",
      title: "Your First API Call",
      summary:
        "Send a prompt to Llama from code, read the response, and understand every field that comes back.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## The request

Most Llama providers expose an OpenAI-compatible chat endpoint. A minimal request looks like this:

\`\`\`json
{
  "model": "llama-3.1-8b-instruct",
  "messages": [
    { "role": "system", "content": "You are a concise assistant." },
    { "role": "user", "content": "Explain embeddings in one sentence." }
  ],
  "temperature": 0.2,
  "max_tokens": 200
}
\`\`\`

Send it as JSON with your API key in the Authorization header. The exact model name and base URL come from your provider's documentation.

## The response

You get back a JSON object with a list of choices. The first choice's \`message.content\` is the text. A \`finish_reason\` tells you whether the model stopped naturally or hit \`max_tokens\`. A \`usage\` object reports prompt and completion tokens, which is what you are billed for.

[artifact:request-response]

## Settings that matter

- **temperature**: 0 to about 1. Low for consistency, higher for variety.
- **max_tokens**: cap on output length. Set it so you are never surprised by cost.
- **stop**: strings that end generation early, useful for structured formats.

## Handling errors

Rate limits, timeouts, and invalid requests all happen. Wrap the call in error handling, retry with backoff on rate limits, and log the request id the provider returns. Never log the API key.

### Try it

Make the call above from your language of choice. Print the content, the finish reason, and the token usage.`,
      keyTakeaways: [
        "A chat request is a model name, a list of role-tagged messages, and a few settings.",
        "Read content, finish_reason, and usage from the response; usage is what you pay for.",
        "Handle rate limits and timeouts with retries; keep keys out of logs and code.",
      ],
      artifacts: [
        lessonVideo(
          "Your First API Call",
          "Code walkthrough, 5 minutes. A request body is built field by field, sent, and the response is unpacked with each field explained. Language-neutral pseudocode shown alongside a real HTTP exchange.",
          300,
        ),
        {
          key: "request-response",
          kind: "DIAGRAM",
          title: "Chat request and response",
          brief:
            "Two annotated JSON blocks side by side: request (model, messages with roles, temperature, max_tokens) and response (choices[0].message.content, finish_reason, usage.prompt_tokens, usage.completion_tokens). Arrows link key fields.",
        },
      ],
    },
    {
      slug: "chat-messages-and-roles",
      title: "Chat Messages and Roles",
      summary:
        "How conversation history works, why the model has no memory, and managing the context window.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## The model remembers nothing

Each API call is independent. If you want the model to know what was said earlier, you send the earlier messages again. "Conversation" is an illusion your code maintains by appending each user message and assistant reply to a list and sending the whole list every turn.

## The message list

\`\`\`
system:    standing instructions
user:      first question
assistant: first answer
user:      follow-up
\`\`\`

Your code adds the new user message, calls the model, appends the reply, and repeats.

[artifact:conversation-loop]

## The context window fills up

Every turn sends more tokens. Eventually you hit the model's limit or your budget. Strategies:

- **Truncate**: drop the oldest turns, keeping the system prompt.
- **Summarize**: replace old turns with a model-written summary.
- **Retrieve**: store turns outside the prompt and pull back only relevant ones (next lessons).

## Roles beyond chat

The system message is yours; users cannot see or edit it. Treat the user message as untrusted input. Never put secrets in any message; everything you send could appear in the model's output.

## Streaming

Most providers can stream tokens as they are generated. It makes the interface feel fast. Your code receives chunks and appends them; handle the final chunk to know when the reply is complete.

### Try it

Write a loop that keeps a message list, sends it each turn, and prints the running token count. Watch how fast it grows.`,
      keyTakeaways: [
        "The model is stateless; your code resends history every turn.",
        "Manage the context window by truncating, summarizing, or retrieving.",
        "Treat user messages as untrusted and never place secrets in any message.",
      ],
      artifacts: [
        lessonVideo(
          "Chat Messages and Roles",
          "Explainer, 4 minutes. A message list grows on screen turn by turn with a token meter rising; the narrator demonstrates truncation and summarization shrinking it back. Brief streaming demo at the end.",
          240,
        ),
        {
          key: "conversation-loop",
          kind: "DIAGRAM",
          title: "The conversation loop",
          brief:
            "Cycle: append user message → send full list to model → append assistant reply → repeat. Side note showing the list length growing and a scissors icon for truncation.",
        },
      ],
    },
    {
      slug: "building-a-simple-chatbot",
      title: "Building a Simple Chatbot",
      summary:
        "Assemble a working assistant for a specific purpose, with a system prompt, history, and basic safety.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## The project

Build an assistant that helps visitors of a community garden: opening hours, how to get a plot, what to plant this month. Narrow scope makes a chatbot useful and testable.

## Step 1: the system prompt

Identity, scope, rules, facts, and failure behaviour. Include the garden's actual details. Tell it to decline unrelated questions politely and to say "I'm not sure, please email the coordinator" when facts are missing.

## Step 2: the loop

Keep a message list per user session. Append, send, append, display. Cap history at the last ten turns to control cost.

## Step 3: input and output checks

Reject empty or absurdly long inputs. Run Llama Guard or a simpler keyword check on inputs and outputs if your audience is public. Strip anything that looks like a prompt-injection attempt from pasted content.

[artifact:chatbot-architecture]

## Step 4: the interface

A text box, a send button, and a scrolling transcript. Streaming makes it feel responsive. Show a clear notice that this is an AI assistant and how to reach a human.

## Step 5: logging

Record each exchange (without personal data) with timestamps and token counts. You will use these logs to evaluate and improve.

## Ship small

Share it with five people, watch what they ask, and fix the top three gaps. Repeat.

### Try it

Build the garden assistant or adapt it to a community you know. Get three real people to use it and note what surprised you.`,
      keyTakeaways: [
        "Narrow scope makes a chatbot useful, safe, and testable.",
        "System prompt, bounded history, input/output checks, a simple interface, and logs are the whole thing.",
        "Ship to a handful of users early and fix what they actually hit.",
      ],
      artifacts: [
        lessonVideo(
          "Building a Simple Chatbot",
          "Build-along, 5 minutes. The garden assistant comes together step by step with a recreated UI; a tester asks an off-topic question and the bot declines gracefully. Logs shown at the end.",
          300,
        ),
        {
          key: "chatbot-architecture",
          kind: "DIAGRAM",
          title: "Simple chatbot architecture",
          brief:
            "Browser UI → input check → message list (system + last 10 turns) → Llama → output check → UI; a side arrow to a log store. Compact boxes, labelled arrows.",
        },
      ],
    },
    {
      slug: "embeddings-explained",
      title: "Embeddings Explained",
      summary:
        "Turning text into numbers that capture meaning, and why that unlocks search and memory.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Meaning as coordinates

An **embedding** is a list of numbers, often hundreds or thousands long, produced by a model from a piece of text. Texts with similar meaning get lists that are close together; unrelated texts end up far apart. "How do I reset my password?" and "I forgot my login" land near each other even though they share no words.

## How you get one

Call an embedding model with your text; receive a vector. Embedding models are small, fast, and cheap compared with chat models. Open embedding models exist alongside Llama and run locally with ease.

[artifact:embedding-space]

## Measuring similarity

Compare two vectors with cosine similarity (the angle between them). Values near 1 mean very similar; near 0 unrelated. This single operation powers semantic search, deduplication, clustering, and recommendations.

## Chunking

Long documents are split into chunks (a few hundred tokens each) and each chunk is embedded separately. Chunk size matters: too small loses context, too large dilutes meaning. Overlapping chunks by a sentence or two helps.

## Things to know

- Use the same embedding model for everything you compare; vectors from different models are not comparable.
- Embeddings capture meaning, not truth. Similar is not the same as correct.
- Re-embed when you change models.

### Try it

Embed five short sentences, two of which mean the same thing in different words. Compute similarities and confirm the pair scores highest.`,
      keyTakeaways: [
        "Embeddings are vectors where similar meanings sit close together.",
        "Cosine similarity between vectors powers search, deduplication, and recommendations.",
        "Chunk long documents, keep one embedding model per index, and re-embed when it changes.",
      ],
      artifacts: [
        lessonVideo(
          "Embeddings Explained",
          "Visual explainer, 4 minutes. Sentences float into a 2D map and cluster by meaning; the narrator draws the angle between two points to explain cosine similarity, then shows a document being chunked.",
          240,
        ),
        {
          key: "embedding-space",
          kind: "DIAGRAM",
          title: "Sentences in embedding space",
          brief:
            "2D scatter plot with labelled points: 'reset my password' and 'forgot my login' close together; 'best pizza nearby' and 'Italian restaurants' close together; the two clusters far apart. Axes unlabelled; a small angle drawn between two points.",
        },
      ],
    },
    {
      slug: "vector-search",
      title: "Vector Search",
      summary:
        "Storing embeddings, finding the nearest neighbours fast, and combining with keyword search.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## From a list to an index

With a few hundred vectors you can compare a query against every one. With millions you need a **vector index**: a data structure that finds approximate nearest neighbours in milliseconds. Postgres with the pgvector extension, dedicated vector databases, and in-memory libraries all provide this.

## The search flow

1. Embed the user's query with the same model used for the documents.
2. Ask the index for the top k nearest chunks (k is often 3 to 10).
3. Return the chunks with their source metadata.

[artifact:vector-search-flow]

## Metadata filters

Store fields alongside each vector: source, date, author, access level. Filter before or after the similarity search so a user only sees documents they are allowed to see and that are relevant to their context.

## Hybrid search

Vectors miss exact matches on names, codes, and rare terms. Keyword search misses paraphrases. Combining both, then merging the ranked lists, usually beats either alone. Many databases support this directly.

## Keeping it fresh

When a document changes, re-chunk and re-embed it, and delete the stale vectors. Build this into the same pipeline that updates the document, or the index drifts out of date without anyone noticing.

### Try it

Load fifty chunks from a document you know into a vector store. Ask five questions and inspect the top three chunks each time. Were they the ones you would have picked?`,
      keyTakeaways: [
        "A vector index finds approximate nearest neighbours fast at scale.",
        "Embed the query with the same model, fetch the top k chunks, and attach metadata.",
        "Filter by metadata, combine with keyword search, and keep the index in sync with sources.",
      ],
      artifacts: [
        lessonVideo(
          "Vector Search",
          "Explainer, 4 minutes. A query vector drops into a glowing index and the nearest chunks light up; a metadata filter dims unauthorized documents; hybrid search merges two ranked lists.",
          240,
        ),
        {
          key: "vector-search-flow",
          kind: "DIAGRAM",
          title: "Vector search flow",
          brief:
            "Query text → embedding model → query vector → vector index (with metadata filter) → top-k chunks with sources. Optional parallel branch: keyword search → merge → results.",
        },
      ],
    },
    {
      slug: "retrieval-augmented-generation",
      title: "Retrieval-Augmented Generation",
      summary:
        "Give the model your documents at answer time so it is accurate, current, and able to cite sources.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## The idea

Instead of hoping the model memorized your facts during training, you **retrieve** the relevant passages at question time and put them in the prompt. The model then **generates** an answer grounded in those passages. This is RAG, and it is the most common pattern in production AI today.

## The pipeline

1. User asks a question.
2. Embed the question and run vector (or hybrid) search over your documents.
3. Build a prompt: system instructions, the retrieved chunks with source labels, the question.
4. Instruct the model to answer only from the provided context and to cite the sources it used.
5. Return the answer with citations the user can click.

[artifact:rag-pipeline]

## The prompt

\`\`\`
Answer the question using only the sources below. Cite sources as [1], [2].
If the sources do not contain the answer, say so.

[1] (Employee handbook, p. 12) ...
[2] (Benefits FAQ) ...

Question: {question}
\`\`\`

## Why RAG beats alternatives

- Facts can be updated by editing documents, with no retraining.
- Answers can be checked against sources.
- Access control is enforced at retrieval time.
- It works with any model, including small local Llama models.

## Where it fails

Poor retrieval means poor answers; most RAG problems are search problems. Chunks cut mid-sentence, missing metadata, and too few or too many chunks are the usual culprits. Evaluate retrieval separately from generation.

### Try it

Add a RAG step to your garden chatbot using its documents. Ask a question whose answer changed recently and confirm the bot gives the new answer with a citation.`,
      keyTakeaways: [
        "RAG retrieves relevant passages at question time and grounds the answer in them.",
        "Instruct the model to answer only from context and to cite sources.",
        "Most RAG failures are retrieval failures; evaluate search and generation separately.",
      ],
      artifacts: [
        lessonVideo(
          "Retrieval-Augmented Generation",
          "Explainer, 5 minutes. A question travels through the RAG pipeline; retrieved chunks slide into the prompt; the answer appears with clickable citations. A failure case shows a bad chunk producing a bad answer.",
          300,
        ),
        {
          key: "rag-pipeline",
          kind: "DIAGRAM",
          title: "RAG pipeline",
          brief:
            "Question → embed → search index → top chunks → prompt assembly (instructions + chunks + question) → Llama → answer with [1][2] citations → user. Document ingestion shown as a separate lane feeding the index.",
        },
      ],
    },
    {
      slug: "structured-outputs-and-tool-calling",
      title: "Structured Outputs and Tool Calling",
      summary:
        "Getting JSON you can trust and letting the model call your functions.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Why structure

Programs need predictable shapes. Free text with "the total is probably around $42" is useless to code. You want \`{"total": 42.00, "currency": "USD"}\` every time.

## Getting JSON

- Describe the schema in the prompt and show one example object.
- Use the provider's JSON mode or schema-constrained output if available; it guarantees valid JSON.
- Validate the result against your schema in code, and retry with the validation error if it fails.
- Set temperature low.

[artifact:structured-output]

## Tool calling

Llama models can be given a list of functions your code provides, with names, descriptions, and parameter schemas. When the model decides a function is needed, it returns a structured call such as:

\`\`\`json
{ "name": "get_weather", "arguments": { "city": "Nairobi" } }
\`\`\`

Your code runs the function, appends the result as a tool message, and calls the model again. The model then writes a natural-language answer using the real data.

## Good tool design

- Few tools with clear, distinct purposes beat many overlapping ones.
- Descriptions should say when to use the tool, not just what it does.
- Validate arguments before executing. The model can make mistakes.
- Never give the model a tool that can cause irreversible harm without a confirmation step.

## This is the bridge to agents

Tool calling is how models act in the world. The agents track builds on exactly this.

### Try it

Define a single tool, \`lookup_plot_availability(month)\`, for the garden bot. Have the model call it and answer using the result.`,
      keyTakeaways: [
        "Request a schema, use JSON mode when available, validate in code, and retry on failure.",
        "Tool calling lets the model request a function; your code runs it and returns the result.",
        "Design few, clear tools; validate arguments; require confirmation for risky actions.",
      ],
      artifacts: [
        lessonVideo(
          "Structured Outputs and Tool Calling",
          "Explainer, 5 minutes. A messy text answer is replaced by validated JSON; then the model requests a tool, the code runs it, and the final answer uses real data. Round-trip shown clearly.",
          300,
        ),
        {
          key: "structured-output",
          kind: "DIAGRAM",
          title: "Tool-calling round trip",
          brief:
            "Sequence diagram: User → App → Llama (with tool list) → returns tool call → App runs function → App sends tool result → Llama → final answer → User. Minimal arrows, labelled.",
        },
      ],
    },
    {
      slug: "fine-tuning-basics",
      title: "Fine-Tuning Basics",
      summary:
        "When to fine-tune instead of prompt, how it works with Llama, and how to prepare data.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Prompting first

Most problems are solved by better prompts, examples, and retrieval. Fine-tune only when you have a clear, repeated task and prompting has hit a ceiling: inconsistent format, a specialized style, a narrow domain vocabulary, or the need to shrink a prompt that has grown huge.

## What fine-tuning does

You continue training a model on your own examples, nudging its weights toward your task. With open weights like Llama, you can do this yourself. Parameter-efficient methods such as LoRA train a small set of additional weights, which makes fine-tuning an 8B model feasible on a single capable GPU.

[artifact:when-to-fine-tune]

## Preparing data

- Collect hundreds to a few thousand high-quality examples in the chat format: system, user, assistant.
- Make the assistant replies exactly what you want: correct, consistent, in your style.
- Hold out 10–20% for evaluation. Never evaluate on training data.
- Remove personal data and anything you lack rights to use.

## Running it

Hosted providers offer fine-tuning as a service: upload data, pick a base model, wait, get a model id. Locally, open-source toolkits handle the same flow. Start with a small model and few epochs; over-training makes models worse.

## Evaluating

Compare the fine-tuned model with the base model plus your best prompt on the held-out set. If it is not clearly better, keep prompting.

### Try it

Write five perfect example conversations for a task you repeat often. That is the seed of a fine-tuning dataset; notice how hard it is to make them consistent.`,
      keyTakeaways: [
        "Fine-tune only after prompting, examples, and retrieval have hit a ceiling.",
        "LoRA-style methods make fine-tuning open Llama models practical on modest hardware.",
        "Quality, consistency, and a held-out evaluation set matter more than quantity.",
      ],
      artifacts: [
        lessonVideo(
          "Fine-Tuning Basics",
          "Explainer, 4 minutes. A decision flow leads to fine-tuning; a dataset of chat examples is assembled; training runs; the base and tuned models are compared on a held-out set.",
          240,
        ),
        {
          key: "when-to-fine-tune",
          kind: "DIAGRAM",
          title: "Prompt, retrieve, or fine-tune?",
          brief:
            "Decision flowchart: Need facts the model lacks? → Retrieval. Need a format or style prompts can't hold? Repeated narrow task? Prompt too long? → Fine-tune. Otherwise → Better prompting. Clean, few words.",
        },
      ],
    },
    {
      slug: "evaluating-your-app",
      title: "Evaluating Your App",
      summary:
        "Building a test set, scoring with rules, people, and models, and catching regressions.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Why evaluation is the job

Without evaluation you are guessing. Every prompt tweak, model swap, or retrieval change can improve one case and break three. A small, honest evaluation turns guesses into decisions.

## Build a golden set

Collect 30 to 100 real inputs with the ideal outputs. Include easy cases, hard cases, and cases that should be refused. Store it with your code and grow it from production logs over time.

## Three ways to score

- **Rules**: exact match, JSON validity, required fields present, length limits, banned phrases absent. Fast and objective. Use them wherever possible.
- **People**: a rubric with two or three criteria scored 1–5. Slow but trustworthy. Do it periodically.
- **Model-as-judge**: a strong model grades outputs against the rubric and the reference. Fast and scalable; validate it against human scores first.

[artifact:evaluation-loop]

## Evaluate the pieces

For RAG, score retrieval (were the right chunks found?) separately from generation (was the answer faithful to the chunks?). For tool use, check whether the right tool was called with valid arguments.

## Make it routine

Run the evaluation automatically on every change. Track scores over time. When a score drops, that is a regression; fix it before shipping.

## Watch production

Sample real exchanges, let users flag bad answers, and feed both back into the golden set. The best test cases come from real people doing unexpected things.

### Try it

Create a ten-item golden set for your chatbot. Score the current version with two rules and one rubric criterion.`,
      keyTakeaways: [
        "A golden set of real inputs with ideal outputs turns guesses into decisions.",
        "Combine rule checks, human rubrics, and validated model-as-judge scoring.",
        "Evaluate retrieval and generation separately, run it on every change, and feed production back in.",
      ],
      artifacts: [
        lessonVideo(
          "Evaluating Your App",
          "Workflow explainer, 4 minutes. A golden set spreadsheet, a script running rules, a person scoring with a rubric, a judge model agreeing or disagreeing; a score chart dips on a regression and recovers.",
          240,
        ),
        {
          key: "evaluation-loop",
          kind: "DIAGRAM",
          title: "The evaluation loop",
          brief:
            "Cycle: Golden set → run app → score (rules, people, model judge) → compare with previous → ship or fix → production logs → add cases to golden set. Circular arrows.",
        },
      ],
    },
    {
      slug: "cost-latency-and-deployment",
      title: "Cost, Latency, and Deployment",
      summary:
        "Shipping responsibly: estimating spend, making it fast, keeping it safe, and watching it run.",
      estimatedDurationMinutes: 20,
      content: `[artifact:lesson-video]

## Estimating cost

Cost is tokens in plus tokens out, times the per-token price, times requests. Measure average prompt and completion sizes from your logs, multiply by expected traffic, and add a margin. Long system prompts and large retrieved contexts are usually the biggest line items.

## Reducing cost

- Use the smallest model that passes your evaluation.
- Trim system prompts and cap retrieved chunks.
- Cache answers to repeated questions.
- Set max_tokens so runaway outputs cannot surprise you.

## Latency

Users notice delays above a second or two. Stream tokens so something appears immediately. Keep prompts short; time to first token scales with input size. Run retrieval and other steps in parallel where you can. Smaller models are faster.

[artifact:deployment-checklist]

## Safety and privacy in production

- Run input and output guards (Llama Guard or equivalent) for public audiences.
- Strip personal data from logs or do not log content at all.
- Rate-limit per user to contain abuse and cost.
- Show users clearly that they are talking to an AI and how to reach a person.

## Observability

Log request ids, model, token counts, latency, and errors. Dashboard them. Alert on error spikes and cost anomalies. Keep an eye on quality with sampled human review.

## Rolling out

Ship behind a feature flag to a small percentage, compare metrics, then widen. Keep the previous version ready to switch back.

## What you have built

From a single API call to a grounded, tool-using, evaluated assistant. The agents track takes the next step: systems that plan and act.

### Try it

Compute the monthly cost of your chatbot at 1,000 conversations a day using your measured token averages. Then list two changes that would halve it.`,
      keyTakeaways: [
        "Estimate cost from measured token averages and expected traffic; trim prompts and cache.",
        "Stream output, shorten prompts, and parallelize steps to keep latency low.",
        "Guards, privacy-safe logging, rate limits, observability, and gradual rollout make it production-ready.",
      ],
      artifacts: [
        lessonVideo(
          "Cost, Latency, and Deployment",
          "Wrap-up, 5 minutes. A cost calculator fills in from logs; a latency waterfall is optimized; a launch checklist is ticked; a dashboard shows the rollout widening. Closes the track and points to AI Agents.",
          300,
        ),
        {
          key: "deployment-checklist",
          kind: "IMAGE",
          title: "Production launch checklist",
          brief:
            "Checklist card: smallest passing model, trimmed prompts, max_tokens set, streaming on, input/output guards, PII-free logs, rate limits, AI disclosure, dashboards and alerts, feature-flag rollout. Tidy, printable.",
        },
      ],
    },
  ],
};
