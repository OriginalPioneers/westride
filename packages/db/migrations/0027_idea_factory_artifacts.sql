CREATE TYPE "public"."artifact_kind" AS ENUM('IMAGE', 'DOCUMENT', 'REPORT');--> statement-breakpoint
CREATE TABLE "idea_build_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"model" text NOT NULL,
	"summary" text NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_factory_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"agent_slug" text,
	"message_id" uuid,
	"evaluation_id" uuid,
	"request_id" uuid,
	"kind" "artifact_kind" NOT NULL,
	"collection" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"chosen_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_build_suggestions" ADD CONSTRAINT "idea_build_suggestions_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_build_suggestions" ADD CONSTRAINT "idea_build_suggestions_request_id_muse_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."muse_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_artifacts" ADD CONSTRAINT "idea_factory_artifacts_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_artifacts" ADD CONSTRAINT "idea_factory_artifacts_message_id_idea_factory_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."idea_factory_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_artifacts" ADD CONSTRAINT "idea_factory_artifacts_evaluation_id_idea_factory_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."idea_factory_evaluations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_artifacts" ADD CONSTRAINT "idea_factory_artifacts_request_id_muse_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."muse_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_build_suggestions_idea_id_created_at_idx" ON "idea_build_suggestions" USING btree ("idea_id","created_at");--> statement-breakpoint
CREATE INDEX "idea_factory_artifacts_idea_id_created_at_idx" ON "idea_factory_artifacts" USING btree ("idea_id","created_at");--> statement-breakpoint
CREATE INDEX "idea_factory_artifacts_message_id_idx" ON "idea_factory_artifacts" USING btree ("message_id");