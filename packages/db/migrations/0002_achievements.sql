CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"badge_url" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievements_slug_unique" ON "achievements" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "achievements_sort_order_idx" ON "achievements" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievements_user_achievement_unique" ON "user_achievements" USING btree ("clerk_user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "user_achievements_clerk_user_id_idx" ON "user_achievements" USING btree ("clerk_user_id");