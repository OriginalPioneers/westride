CREATE TYPE "public"."vercel_credential_kind" AS ENUM('VERCEL_ACCOUNT', 'ACCESS_TOKEN');--> statement-breakpoint
CREATE TABLE "vercel_connections" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"kind" "vercel_credential_kind" NOT NULL,
	"vercel_user_id" text NOT NULL,
	"username" text NOT NULL,
	"access_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token" text,
	"team_id" text,
	"team_slug" text,
	"team_name" text,
	"project_id" text,
	"project_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
