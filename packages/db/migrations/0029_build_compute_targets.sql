CREATE TYPE "public"."compute_target" AS ENUM('WESTRIDE_CLOUD', 'LOCAL', 'SPONSORS', 'THIRD_PARTY');--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "compute_target" "compute_target" DEFAULT 'THIRD_PARTY' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "device_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "local_model" text;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "pledge_id" uuid;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "pledge_contributions" ADD CONSTRAINT "pledge_contributions_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_runner_status_idx" ON "agent_runs" USING btree ("runner_kind","status");--> statement-breakpoint
CREATE INDEX "agent_runs_device_idx" ON "agent_runs" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pledge_contributions_run_unique" ON "pledge_contributions" USING btree ("run_id");--> statement-breakpoint
-- Before members could choose, a run on WeStride's Modal account was the only non-own-account route.
UPDATE "agent_runs" SET "compute_target" = 'WESTRIDE_CLOUD' WHERE "compute_source" = 'WESTRIDE_CLOUD';