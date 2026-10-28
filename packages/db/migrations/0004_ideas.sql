CREATE TYPE "public"."idea_member_role" AS ENUM('FOUNDER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."idea_type" AS ENUM('BUSINESS', 'NON_PROFIT');--> statement-breakpoint
CREATE TABLE "countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_geographies" (
	"idea_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	CONSTRAINT "idea_geographies_idea_id_country_code_pk" PRIMARY KEY("idea_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "idea_members" (
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" "idea_member_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_members_idea_id_clerk_user_id_pk" PRIMARY KEY("idea_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "idea_tags" (
	"idea_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "idea_tags_idea_id_tag_id_pk" PRIMARY KEY("idea_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" "idea_type" NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_geographies" ADD CONSTRAINT "idea_geographies_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_geographies" ADD CONSTRAINT "idea_geographies_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_members" ADD CONSTRAINT "idea_members_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_tags" ADD CONSTRAINT "idea_tags_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_tags" ADD CONSTRAINT "idea_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "countries_name_idx" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idea_geographies_country_code_idx" ON "idea_geographies" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idea_members_clerk_user_id_idx" ON "idea_members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idea_tags_tag_id_idx" ON "idea_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "ideas_name_idx" ON "ideas" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ideas_type_idx" ON "ideas" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ideas_visibility_idx" ON "ideas" USING btree ("is_public","is_featured");--> statement-breakpoint
CREATE INDEX "ideas_created_at_idx" ON "ideas" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_unique" ON "tags" USING btree ("slug");