CREATE TABLE "github_connections" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"github_user_id" bigint NOT NULL,
	"login" text NOT NULL,
	"avatar_url" text,
	"access_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_github_repos" (
	"idea_id" uuid PRIMARY KEY NOT NULL,
	"repo_id" bigint NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"html_url" text NOT NULL,
	"default_branch" text NOT NULL,
	"is_private" boolean NOT NULL,
	"linked_by_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_github_repos" ADD CONSTRAINT "idea_github_repos_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_connections_github_user_id_idx" ON "github_connections" USING btree ("github_user_id");--> statement-breakpoint
CREATE INDEX "idea_github_repos_repo_id_idx" ON "idea_github_repos" USING btree ("repo_id");