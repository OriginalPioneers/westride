# Achievements and Muse challenges

The Achievements page has 24 permanent achievements in four families. Twelve curated activities share one dialog. Interest and explanation level adapt the task without an API call; Muse provides one brief observation and one improvement after submission. These are participation achievements, not skill certifications.

## Setup

Apply migration `0007_learning_achievements.sql` with the repository's normal migration workflow before running this branch. It adds challenge attempts and request budgets, adds celebration timestamps, and upserts all 24 badges while preserving existing earned records. Existing badges are marked celebrated to avoid replaying old unlocks. No production migration is performed by this change.

Set `MODEL_API_KEY` in `apps/web/.env` for the server-side Muse integration. No public key variable is used. This key funds challenge feedback. The Idea Factory keeps its existing member-key flow. No env file needs to be committed.

Feedback uses `muse-spark-1.3`, low reasoning, a 512-token output cap, a 25-second timeout, and no web search. Each user gets at most 12 attempted calls per UTC day; all users share a 64-call daily cap. Retries count. Feedback is cached per learner/challenge/interest and revisions cost no calls. Request leases prevent overlapping calls for the same attempt. Missing keys, exhausted budgets, and provider failures preserve answers and permit finishing without feedback; revision badges still require actual feedback.

## Track guidance

Next up opens the saved answer for the most recently started unfinished challenge, then suggests an uncompleted challenge. It preserves the resumed interest and explanation level and previews only badges that completion can earn. After all twelve challenge types, it suggests missing interests, useful revisions, Academy exploration, or an idea. Compact rows show Earned, In progress, Ready, and Needs feedback states; signed-out learners see Sign in. Challenge and revision progress bars mark the actual award thresholds and show how far away the next milestone is. Recommendations are local and use no Muse calls.

## Persistence and awards

All actions authenticate with Clerk and scope database operations to that user. One attempt is stored per learner, challenge, and interest. Choosing the same combination resumes it; a different interest permits another attempt. Completion totals and revision totals count distinct challenge types. Answers are bounded to 1,200 characters. Drafts typed in the dialog also stay in that browser tab's session storage, scoped by account and attempt. Use Save answer to persist across devices.

First Spark is awarded on successful idea creation, and the Achievements page reconciles existing founders and any interrupted award writes. Award inserts are idempotent. New celebrations are claimed atomically and shown once. The soft Muse companion animates briefly; both it and confetti honor reduced motion. Finishing closes the dialog and displays any new unlocks.

## Checks

From the repository root: `node --import tsx --test packages/db/tests/challenges.test.ts apps/web/tests/track-progress.test.ts` and `bun run lint`. Build with `bun run build --filter=web`. Use `astryx doctor --built .next` from `apps/web` after a web build.

The implementation was validated without reading user env files or spending live Muse tokens. Live Clerk/Neon/Muse acceptance requires a configured development environment and the migration.

## Companion artwork

`apps/web/public/achievements/muse-companion.png` is a soft rendered adaptation of the white, shaggy Muse character in Meta's [Bringing Your Muse to Life](https://research.meta.ai/blog/bringing-your-muse-to-life) introduction. The user selected this reference. It was generated with the built-in imagegen tool using the [official first-frame image](https://research.meta.ai/articles/bringing-your-muse-to-life/images/muse-realtime-avatar-character-introduction-first-frame-v3.webp) as reference.

Prompt: preserve the reference white yeti's rounded silhouette, shaggy white fur with restrained cool gray shading, long soft arms, small broad feet, tiny glossy black eyes, and thin smile. Full body, relaxed front view, soft tactile rendering, transparent background, and a little padding. No pixel art, exaggerated baby proportions, beige face panel, robot details, accessories, emblem, text, ground, or cast shadow.

Badge symbols use the project's existing Heroicons set through Astryx Icon. The surrounding product uses the existing Stone theme; the WeStride brand mark is unchanged.
