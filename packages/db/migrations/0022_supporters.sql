CREATE TYPE "public"."device_status" AS ENUM('ACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."pledge_kind" AS ENUM('TOKENS', 'COMPUTE');--> statement-breakpoint
CREATE TYPE "public"."pledge_status" AS ENUM('ACTIVE', 'PAUSED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."runner_kind" AS ENUM('VERCEL_SANDBOX', 'VOLUNTEER_DEVICE');--> statement-breakpoint
CREATE TABLE "device_pairing_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "device_status" DEFAULT 'ACTIVE' NOT NULL,
	"token_hash" text NOT NULL,
	"os" text DEFAULT '' NOT NULL,
	"arch" text DEFAULT '' NOT NULL,
	"cpus" integer DEFAULT 0 NOT NULL,
	"memory_mb" integer DEFAULT 0 NOT NULL,
	"runner_version" text DEFAULT '' NOT NULL,
	"models" text[] DEFAULT '{}' NOT NULL,
	"has_meta_key" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"current_job_id" uuid,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_capital_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"url" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledge_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pledge_id" uuid NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"kind" "pledge_kind" NOT NULL,
	"job_id" uuid,
	"device_id" uuid,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"wall_clock_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"kind" "pledge_kind" NOT NULL,
	"status" "pledge_status" DEFAULT 'ACTIVE' NOT NULL,
	"cap_micros" bigint,
	"resets_monthly" boolean DEFAULT false NOT NULL,
	"period_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"spent_micros_this_period" bigint DEFAULT 0 NOT NULL,
	"spent_micros_total" bigint DEFAULT 0 NOT NULL,
	"jobs_total" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "pledge_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "runner_kind" "runner_kind";--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "device_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "allow_sponsor_tokens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "allow_volunteer_compute" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "volunteer_local_model" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "wants_tokens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "wants_compute" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "wants_capital" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "idea_capital_links" ADD CONSTRAINT "idea_capital_links_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD CONSTRAINT "pledge_contributions_pledge_id_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD CONSTRAINT "pledge_contributions_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD CONSTRAINT "pledge_contributions_job_id_agent_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."agent_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD CONSTRAINT "pledge_contributions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_pairing_codes_user_idx" ON "device_pairing_codes" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_token_hash_unique" ON "devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "devices_status_seen_idx" ON "devices" USING btree ("status","last_seen_at");--> statement-breakpoint
CREATE INDEX "idea_capital_links_idea_idx" ON "idea_capital_links" USING btree ("idea_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pledge_contributions_job_unique" ON "pledge_contributions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "pledge_contributions_idea_idx" ON "pledge_contributions" USING btree ("idea_id","created_at");--> statement-breakpoint
CREATE INDEX "pledge_contributions_pledge_idx" ON "pledge_contributions" USING btree ("pledge_id","created_at");--> statement-breakpoint
CREATE INDEX "pledge_contributions_user_idx" ON "pledge_contributions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pledges_idea_user_kind_unique" ON "pledges" USING btree ("idea_id","clerk_user_id","kind");--> statement-breakpoint
CREATE INDEX "pledges_user_idx" ON "pledges" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "pledges_idea_kind_status_idx" ON "pledges" USING btree ("idea_id","kind","status");--> statement-breakpoint
CREATE INDEX "agent_jobs_runner_status_idx" ON "agent_jobs" USING btree ("runner_kind","status");--> statement-breakpoint
CREATE INDEX "agent_jobs_device_idx" ON "agent_jobs" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "ideas_wants_idx" ON "ideas" USING btree ("wants_tokens","wants_compute","wants_capital");