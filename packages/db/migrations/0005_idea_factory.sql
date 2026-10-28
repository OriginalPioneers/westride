CREATE TYPE "public"."evaluation_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."evidence_class" AS ENUM('VERIFIED', 'ESTIMATE', 'ASSUMPTION', 'HYPOTHESIS');--> statement-breakpoint
CREATE TYPE "public"."factory_message_role" AS ENUM('USER', 'AGENT');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "idea_factory_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"status" "evaluation_status" DEFAULT 'RUNNING' NOT NULL,
	"model" text NOT NULL,
	"synthesis" jsonb,
	"synthesis_request_id" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idea_factory_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"agent_slug" text NOT NULL,
	"status" "finding_status" DEFAULT 'PENDING' NOT NULL,
	"verdict" text,
	"summary" text,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_id" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idea_factory_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" "factory_message_role" NOT NULL,
	"clerk_user_id" text,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_factory_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"agent_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muse_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"agent_slug" text,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"endpoint" text NOT NULL,
	"request_body" jsonb NOT NULL,
	"response_body" jsonb,
	"status_code" integer,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"web_search_calls" integer DEFAULT 0 NOT NULL,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"rate_limit_remaining_tokens" integer,
	"rate_limit_remaining_requests" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_factory_evaluations" ADD CONSTRAINT "idea_factory_evaluations_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_evaluations" ADD CONSTRAINT "idea_factory_evaluations_synthesis_request_id_muse_requests_id_fk" FOREIGN KEY ("synthesis_request_id") REFERENCES "public"."muse_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_findings" ADD CONSTRAINT "idea_factory_findings_evaluation_id_idea_factory_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."idea_factory_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_findings" ADD CONSTRAINT "idea_factory_findings_request_id_muse_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."muse_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_messages" ADD CONSTRAINT "idea_factory_messages_thread_id_idea_factory_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."idea_factory_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_messages" ADD CONSTRAINT "idea_factory_messages_request_id_muse_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."muse_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_factory_threads" ADD CONSTRAINT "idea_factory_threads_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muse_requests" ADD CONSTRAINT "muse_requests_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_factory_evaluations_idea_id_created_at_idx" ON "idea_factory_evaluations" USING btree ("idea_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idea_factory_findings_evaluation_agent_unique" ON "idea_factory_findings" USING btree ("evaluation_id","agent_slug");--> statement-breakpoint
CREATE INDEX "idea_factory_messages_thread_id_created_at_idx" ON "idea_factory_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idea_factory_threads_idea_agent_unique" ON "idea_factory_threads" USING btree ("idea_id","agent_slug");--> statement-breakpoint
CREATE INDEX "muse_requests_idea_id_created_at_idx" ON "muse_requests" USING btree ("idea_id","created_at");--> statement-breakpoint
CREATE INDEX "muse_requests_clerk_user_id_idx" ON "muse_requests" USING btree ("clerk_user_id");