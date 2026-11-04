CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "slug" text;--> statement-breakpoint
-- Existing ideas get a slug from their name, the same way idea-slug.ts does
-- it: lowercase, accents and apostrophes dropped, "&" becomes "and", runs of
-- anything else become one hyphen. The oldest idea keeps the bare slug;
-- later ones with the same name get -2, -3, … in creation order.
WITH base AS (
  SELECT
    id,
    created_at,
    coalesce(
      nullif(
        left(
          trim(both '-' from regexp_replace(
            lower(replace(regexp_replace(unaccent(name), '[''’]', '', 'g'), '&', ' and ')),
            '[^a-z0-9]+', '-', 'g'
          )),
          80
        ),
        ''
      ),
      'idea'
    ) AS base
  FROM "ideas"
), numbered AS (
  SELECT id, base, row_number() OVER (PARTITION BY base ORDER BY created_at, id) AS n
  FROM base
)
UPDATE "ideas" SET "slug" = CASE WHEN numbered.n = 1 THEN numbered.base ELSE numbered.base || '-' || numbered.n END
FROM numbered WHERE "ideas".id = numbered.id;--> statement-breakpoint
-- A name that already ended in "-2" can collide with a generated one; break
-- any remaining tie with the start of the id.
UPDATE "ideas" SET "slug" = "slug" || '-' || left(id::text, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY "slug" ORDER BY created_at, id) AS n FROM "ideas"
  ) dupes WHERE n > 1
);--> statement-breakpoint
ALTER TABLE "ideas" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ideas_slug_idx" ON "ideas" USING btree ("slug");
