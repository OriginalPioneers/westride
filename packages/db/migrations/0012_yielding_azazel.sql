CREATE TYPE "public"."lesson_artifact_kind" AS ENUM('IMAGE', 'VIDEO', 'AUDIO', 'DIAGRAM');--> statement-breakpoint
CREATE TABLE "lesson_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"key" text NOT NULL,
	"kind" "lesson_artifact_kind" NOT NULL,
	"title" text NOT NULL,
	"brief" text NOT NULL,
	"url" text,
	"duration_seconds" integer,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "sort_order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "estimated_duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "key_takeaways" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_artifacts" ADD CONSTRAINT "lesson_artifacts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_artifacts_lesson_key_unique" ON "lesson_artifacts" USING btree ("lesson_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_completions_user_lesson_unique" ON "lesson_completions" USING btree ("clerk_user_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_completions_clerk_user_id_idx" ON "lesson_completions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_track_slug_unique" ON "lessons" USING btree ("track_id","slug");--> statement-breakpoint
CREATE INDEX "lessons_track_sort_order_idx" ON "lessons" USING btree ("track_id","sort_order");