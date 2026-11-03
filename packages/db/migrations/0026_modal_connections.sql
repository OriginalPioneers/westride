CREATE TYPE "public"."compute_source" AS ENUM('OWN', 'WESTRIDE_CLOUD');--> statement-breakpoint
CREATE TYPE "public"."own_sandbox_provider" AS ENUM('VERCEL', 'MODAL');--> statement-breakpoint
CREATE TABLE "modal_connections" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"token_id" text NOT NULL,
	"token_secret" text NOT NULL,
	"token_id_suffix" text NOT NULL,
	"environment" text,
	"app_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "compute_source" "compute_source" DEFAULT 'OWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "compute_source" "compute_source" DEFAULT 'OWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud_accounts" ADD COLUMN "sandbox_provider" "own_sandbox_provider";--> statement-breakpoint
-- Before members could bring their own Modal account, every Modal sandbox was WeStride Cloud's.
UPDATE "agent_jobs" SET "compute_source" = 'WESTRIDE_CLOUD' WHERE "runner_kind" = 'MODAL_SANDBOX';--> statement-breakpoint
UPDATE "agent_runs" SET "compute_source" = 'WESTRIDE_CLOUD' WHERE "runner_kind" = 'MODAL_SANDBOX';