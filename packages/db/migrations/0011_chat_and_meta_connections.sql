CREATE TYPE "public"."chat_platform" AS ENUM('SLACK', 'DISCORD', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."meta_credential_kind" AS ENUM('META_ACCOUNT', 'API_KEY');--> statement-breakpoint
CREATE TABLE "chat_connections" (
	"clerk_user_id" text NOT NULL,
	"platform" "chat_platform" NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text NOT NULL,
	"workspace_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_connections_clerk_user_id_platform_pk" PRIMARY KEY("clerk_user_id","platform")
);
--> statement-breakpoint
CREATE TABLE "chat_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"platform" "chat_platform" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_connections" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"kind" "meta_credential_kind" NOT NULL,
	"api_key" text NOT NULL,
	"api_key_expires_at" timestamp with time zone,
	"identity_token" text,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_connections_platform_external_id_unique" ON "chat_connections" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "chat_link_codes_clerk_user_id_idx" ON "chat_link_codes" USING btree ("clerk_user_id","platform");