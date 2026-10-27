CREATE TYPE "public"."track_difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "difficulty" "track_difficulty" NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "estimated_duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "lesson_count" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "sort_order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "icon" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "tags" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "prerequisite_slugs" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "learning_objectives" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "achievement_title" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_slug_unique" ON "tracks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tracks_sort_order_idx" ON "tracks" USING btree ("sort_order");