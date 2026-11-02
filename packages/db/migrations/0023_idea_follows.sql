CREATE TABLE "idea_follows" (
	"idea_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_follows_idea_id_clerk_user_id_pk" PRIMARY KEY("idea_id","clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "idea_follows" ADD CONSTRAINT "idea_follows_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_follows_clerk_user_id_idx" ON "idea_follows" USING btree ("clerk_user_id");