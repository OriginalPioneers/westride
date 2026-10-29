CREATE TABLE "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"platform" text NOT NULL,
	"brief" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"generated_at" timestamp with time zone,
	"operation_id" uuid,
	"busy_until" timestamp with time zone,
	"shared_url" text,
	"shared_at" timestamp with time zone,
	"shared_day" text,
	"time_zone" text,
	"engagement" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_posts_user_url_unique" ON "social_posts" USING btree ("clerk_user_id","shared_url");--> statement-breakpoint
CREATE INDEX "social_posts_user_idx" ON "social_posts" USING btree ("clerk_user_id");
--> statement-breakpoint
INSERT INTO achievements (slug,name,description,badge_url,sort_order) VALUES
('post-maker','Post Maker!','Save your first post drafted with Muse.','/achievements/post-maker.svg',27),
('hello-world','Hello, World!','Confirm your first published post.','/achievements/hello-world.svg',28),
('triple-feature','Triple Feature','Confirm three different posts in one day.','/achievements/triple-feature.svg',29),
('seven-day-signal','Seven-Day Signal','Confirm at least one post each day for seven consecutive days.','/achievements/seven-day-signal.svg',30),
('across-the-feed','Across the Feed','Confirm posts on two different platforms.','/achievements/across-the-feed.svg',31),
('audience-engaged','Audience: Engaged!','Record a useful reply or feedback on a post you shared.','/achievements/audience-engaged.svg',32)
ON CONFLICT (slug) DO UPDATE SET name=excluded.name, description=excluded.description, badge_url=excluded.badge_url, sort_order=excluded.sort_order;
