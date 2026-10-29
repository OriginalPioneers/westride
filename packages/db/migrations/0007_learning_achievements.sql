CREATE TABLE "learning_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"challenge_slug" text NOT NULL,
	"interest" text NOT NULL,
	"depth" text NOT NULL,
	"prompt" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"feedback" jsonb,
	"revision" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone,
	"busy_until" timestamp with time zone,
	"operation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_muse_budgets" (
	"key" text PRIMARY KEY NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "celebrated_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_attempts_user_challenge_interest_unique" ON "learning_attempts" USING btree ("clerk_user_id","challenge_slug","interest");
--> statement-breakpoint
UPDATE user_achievements SET celebrated_at = earned_at;
--> statement-breakpoint
INSERT INTO achievements (slug, name, description, badge_url, sort_order) VALUES
('newbie', 'First Step', 'Sign in to start your journey.', '/achievements/newbie.svg', 0),
('curious-cat', 'Curious Cat', 'Visit the Academy.', '/achievements/curious-cat.svg', 1),
('first-spark', 'First Spark', 'Save your first idea, public or private.', '/achievements/first-spark.svg', 2),
('prompt-pilot', 'Prompt Pilot', 'Complete your first challenge.', '/achievements/prompt-pilot.svg', 3),
('second-draft', 'Second Draft', 'Save a changed answer after Muse gives feedback.', '/achievements/second-draft.svg', 4),
('three-for-three', 'Three for Three', 'Complete three different challenges.', '/achievements/three-for-three.svg', 5),
('clear-intent', 'Clear Intent', 'Complete the Clear Intent challenge.', '/achievements/clear-intent.svg', 6),
('context-counts', 'Context Counts', 'Complete the Context Counts challenge.', '/achievements/context-counts.svg', 7),
('step-by-step', 'Step by Step', 'Complete the Step by Step challenge.', '/achievements/step-by-step.svg', 8),
('set-the-boundaries', 'Set the Boundaries', 'Complete the Set the Boundaries challenge.', '/achievements/set-the-boundaries.svg', 9),
('teach-it-back', 'Teach It Back', 'Complete the Teach It Back challenge.', '/achievements/teach-it-back.svg', 10),
('ask-for-evidence', 'Ask for Evidence', 'Complete the Ask for Evidence challenge.', '/achievements/ask-for-evidence.svg', 11),
('problem-finder', 'Problem Finder', 'Complete the Problem Finder challenge.', '/achievements/problem-finder.svg', 12),
('people-first', 'People First', 'Complete the People First challenge.', '/achievements/people-first.svg', 13),
('what-if', 'What If?', 'Complete the What If? challenge.', '/achievements/what-if.svg', 14),
('two-ways', 'Two Ways', 'Complete the Two Ways challenge.', '/achievements/two-ways.svg', 15),
('start-small', 'Start Small', 'Complete the Start Small challenge.', '/achievements/start-small.svg', 16),
('human-in-charge', 'Human in Charge', 'Complete the Human in Charge challenge.', '/achievements/human-in-charge.svg', 17),
('game-thinker', 'Game Thinker', 'Complete a challenge about games.', '/achievements/game-thinker.svg', 18),
('everyday-inventor', 'Everyday Inventor', 'Complete a challenge about everyday life.', '/achievements/everyday-inventor.svg', 19),
('helping-hand', 'Helping Hand', 'Complete a challenge about helping people.', '/achievements/helping-hand.svg', 20),
('on-a-roll', 'On a Roll', 'Complete six different challenges.', '/achievements/on-a-roll.svg', 21),
('full-circle', 'Full Circle', 'Complete all twelve challenges.', '/achievements/full-circle.svg', 22),
('thoughtful-revisions', 'Thoughtful Revisions', 'Revise answers in three different challenges after Muse feedback.', '/achievements/thoughtful-revisions.svg', 23)
ON CONFLICT (slug) DO UPDATE SET name = excluded.name, description = excluded.description, badge_url = excluded.badge_url, sort_order = excluded.sort_order;
