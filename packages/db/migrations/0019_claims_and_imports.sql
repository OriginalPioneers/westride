CREATE TYPE "public"."claim_request_status" AS ENUM('PENDING', 'APPROVED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."content_origin" AS ENUM('MEMBER', 'IMPORT');--> statement-breakpoint
CREATE TABLE "claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"project_id" uuid,
	"clerk_user_id" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" "claim_request_status" DEFAULT 'PENDING' NOT NULL,
	"review_token_hash" text NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_github_repos" ALTER COLUMN "linked_by_clerk_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_repos" ALTER COLUMN "linked_by_clerk_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "origin" "content_origin" DEFAULT 'MEMBER' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "origin" "content_origin" DEFAULT 'MEMBER' NOT NULL;--> statement-breakpoint
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_requests" ADD CONSTRAINT "claim_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "claim_requests_pending_unique" ON "claim_requests" USING btree ("idea_id","clerk_user_id") WHERE "claim_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "claim_requests_idea_id_idx" ON "claim_requests" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "claim_requests_clerk_user_id_idx" ON "claim_requests" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "ideas_origin_idx" ON "ideas" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "projects_origin_idx" ON "projects" USING btree ("origin");