CREATE TABLE "idea_builder_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"achievement_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "prototype_url" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "prototype_instructions" text;--> statement-breakpoint
ALTER TABLE "idea_builder_events" ADD CONSTRAINT "idea_builder_events_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idea_builder_events_actor_idea_slug_unique" ON "idea_builder_events" USING btree ("clerk_user_id","idea_id","achievement_slug");
--> statement-breakpoint
INSERT INTO achievements (slug, name, description, badge_url, sort_order) VALUES
('idea-refiner', 'Better by Design', 'Save a changed description on an idea you founded.', '/achievements/idea-refiner.svg', 24),
('team-builder', 'Team Up', 'Add another WeStride member to an idea you founded.', '/achievements/team-builder.svg', 25),
('prototype-shared', 'Made Real', 'Share a tested prototype link and something to try on your idea.', '/achievements/prototype-shared.svg', 26)
ON CONFLICT (slug) DO UPDATE SET name = excluded.name, description = excluded.description, badge_url = excluded.badge_url, sort_order = excluded.sort_order;
