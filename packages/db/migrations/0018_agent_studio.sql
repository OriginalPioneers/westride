CREATE TYPE "public"."agent_job_kind" AS ENUM('CODE', 'REPORT');--> statement-breakpoint
CREATE TYPE "public"."agent_job_trigger" AS ENUM('MANUAL', 'SCHEDULE');--> statement-breakpoint
CREATE TYPE "public"."agent_schedule" AS ENUM('NONE', 'HOURLY', 'DAILY', 'WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."agent_ticket_source" AS ENUM('MEMBER', 'SCHEDULE');--> statement-breakpoint
CREATE TABLE "agent_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"ticket_id" uuid,
	"ticket_title" text NOT NULL,
	"trigger" "agent_job_trigger" NOT NULL,
	"kind" "agent_job_kind" NOT NULL,
	"status" "agent_run_status" DEFAULT 'QUEUED' NOT NULL,
	"started_by_clerk_user_id" text,
	"paid_by_clerk_user_id" text NOT NULL,
	"model" text NOT NULL,
	"max_steps" integer NOT NULL,
	"sandbox_name" text,
	"repo_full_name" text,
	"branch" text,
	"base_branch" text,
	"callback_token_hash" text,
	"muse_session_id" text,
	"exit_code" integer,
	"head_sha" text,
	"pr_number" integer,
	"pr_url" text,
	"muse_request_id" uuid,
	"summary" text,
	"error" text,
	"event_count" integer DEFAULT 0 NOT NULL,
	"model_calls" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_event_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"ticket_id" uuid,
	"job_id" uuid,
	"actor_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "ticket_status" DEFAULT 'BACKLOG' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"blocked_reason" text,
	"source" "agent_ticket_source" DEFAULT 'MEMBER' NOT NULL,
	"created_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"status" "agent_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"idea_id" uuid,
	"project_id" uuid,
	"model" text NOT NULL,
	"max_steps" integer NOT NULL,
	"repo_id" bigint,
	"repo_owner" text,
	"repo_name" text,
	"repo_html_url" text,
	"repo_default_branch" text,
	"repo_is_private" boolean,
	"schedule" "agent_schedule" DEFAULT 'NONE' NOT NULL,
	"schedule_hour_utc" integer,
	"schedule_weekday" integer,
	"standing_task" text DEFAULT '' NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"next_ticket_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "muse_requests" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_job_events" ADD CONSTRAINT "agent_job_events_job_id_agent_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_ticket_id_agent_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."agent_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_log_entries" ADD CONSTRAINT "agent_log_entries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_log_entries" ADD CONSTRAINT "agent_log_entries_ticket_id_agent_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."agent_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_log_entries" ADD CONSTRAINT "agent_log_entries_job_id_agent_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tickets" ADD CONSTRAINT "agent_tickets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_job_events_job_sequence_unique" ON "agent_job_events" USING btree ("job_id","sequence");--> statement-breakpoint
CREATE INDEX "agent_jobs_agent_created_idx" ON "agent_jobs" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_jobs_ticket_created_idx" ON "agent_jobs" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_jobs_status_idx" ON "agent_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_jobs_paid_by_idx" ON "agent_jobs" USING btree ("paid_by_clerk_user_id");--> statement-breakpoint
CREATE INDEX "agent_log_entries_agent_created_idx" ON "agent_log_entries" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_tickets_agent_number_unique" ON "agent_tickets" USING btree ("agent_id","number");--> statement-breakpoint
CREATE INDEX "agent_tickets_agent_status_sort_idx" ON "agent_tickets" USING btree ("agent_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "agents_owner_idx" ON "agents" USING btree ("owner_clerk_user_id");--> statement-breakpoint
CREATE INDEX "agents_idea_id_idx" ON "agents" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "agents_project_id_idx" ON "agents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "agents_visibility_idx" ON "agents" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "agents_due_idx" ON "agents" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "agents_updated_at_idx" ON "agents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "muse_requests_agent_id_idx" ON "muse_requests" USING btree ("agent_id");