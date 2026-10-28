CREATE TABLE "mentor_languages" (
	"mentor_profile_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	CONSTRAINT "mentor_languages_mentor_profile_id_language_code_pk" PRIMARY KEY("mentor_profile_id","language_code")
);
--> statement-breakpoint
CREATE TABLE "mentor_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_profile_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"region" text,
	"city" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text NOT NULL,
	"headshot_url" text,
	"github_url" text,
	"linkedin_url" text,
	"facebook_url" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_skills" (
	"mentor_profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "mentor_skills_mentor_profile_id_skill_id_pk" PRIMARY KEY("mentor_profile_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentor_languages" ADD CONSTRAINT "mentor_languages_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_locations" ADD CONSTRAINT "mentor_locations_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skills" ADD CONSTRAINT "mentor_skills_mentor_profile_id_mentor_profiles_id_fk" FOREIGN KEY ("mentor_profile_id") REFERENCES "public"."mentor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_skills" ADD CONSTRAINT "mentor_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentor_languages_language_code_idx" ON "mentor_languages" USING btree ("language_code");--> statement-breakpoint
CREATE INDEX "mentor_locations_mentor_profile_id_idx" ON "mentor_locations" USING btree ("mentor_profile_id");--> statement-breakpoint
CREATE INDEX "mentor_locations_country_code_idx" ON "mentor_locations" USING btree ("country_code");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_profiles_clerk_user_id_unique" ON "mentor_profiles" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "mentor_profiles_display_name_idx" ON "mentor_profiles" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "mentor_skills_skill_id_idx" ON "mentor_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_slug_unique" ON "skills" USING btree ("slug");