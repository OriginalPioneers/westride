CREATE TYPE "public"."mentor_request_status" AS ENUM('NEW', 'REVIEWED');--> statement-breakpoint
CREATE TABLE "mentor_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_profile_id" uuid NOT NULL,
	"requester_clerk_user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"job_title" text,
	"phone" text,
	"inquiry_reason" text,
	"timing" text,
	"details" text NOT NULL,
	"status" "mentor_request_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentor_requests_mentor_profile_created_idx" ON "mentor_requests" USING btree ("mentor_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "mentor_requests_requester_clerk_user_id_idx" ON "mentor_requests" USING btree ("requester_clerk_user_id");