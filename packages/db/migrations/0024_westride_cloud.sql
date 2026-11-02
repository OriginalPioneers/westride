CREATE TYPE "public"."cloud_ledger_kind" AS ENUM('TOP_UP', 'CODE', 'AI_USAGE', 'COMPUTE_USAGE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."cloud_provider_preference" AS ENUM('OWN', 'WESTRIDE_CLOUD');--> statement-breakpoint
CREATE TYPE "public"."muse_source" AS ENUM('OWN', 'WESTRIDE_CLOUD');--> statement-breakpoint
ALTER TYPE "public"."runner_kind" ADD VALUE 'MODAL_SANDBOX';--> statement-breakpoint
CREATE TABLE "cloud_accounts" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"provider_preference" "cloud_provider_preference" DEFAULT 'OWN' NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_code_redemptions" (
	"code_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cloud_code_redemptions_code_id_clerk_user_id_pk" PRIMARY KEY("code_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "cloud_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"kind" "cloud_ledger_kind" NOT NULL,
	"amount_micros" bigint NOT NULL,
	"reference" text NOT NULL,
	"description" text NOT NULL,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"compute_seconds" integer DEFAULT 0 NOT NULL,
	"vcpus" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_redemption_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"amount_micros" bigint NOT NULL,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "muse_source" "muse_source" DEFAULT 'OWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "runner_kind" "runner_kind" DEFAULT 'VERCEL_SANDBOX' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "muse_source" "muse_source" DEFAULT 'OWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "model_calls" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "output_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "reasoning_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "total_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "estimated_cost_micros" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud_code_redemptions" ADD CONSTRAINT "cloud_code_redemptions_code_id_cloud_redemption_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."cloud_redemption_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cloud_code_redemptions_user_idx" ON "cloud_code_redemptions" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_ledger_entries_reference_unique" ON "cloud_ledger_entries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "cloud_ledger_entries_user_created_idx" ON "cloud_ledger_entries" USING btree ("clerk_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_redemption_codes_code_unique" ON "cloud_redemption_codes" USING btree ("code");