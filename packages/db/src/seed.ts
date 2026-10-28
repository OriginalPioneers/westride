import { sql } from "drizzle-orm";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { achievementCatalog } from "./achievement-catalog";
import { academyTracks } from "./academy-tracks";
import { getDb } from "./client";
import { achievements, skills, tracks } from "./schema";
import { skillCatalog, skillSlug } from "./skill-catalog";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: resolve(packageDir, ".env") });
config({ path: resolve(packageDir, "../../apps/web/.env") });

const rows = academyTracks.map((track) => ({
  slug: track.slug,
  name: track.title,
  description: track.description,
  difficulty: track.difficulty,
  category: track.category,
  estimatedDurationMinutes: track.estimatedDurationMinutes,
  lessonCount: track.lessonCount,
  sortOrder: track.order,
  icon: track.icon,
  tags: [...track.tags],
  prerequisiteSlugs: [...track.prerequisites],
  learningObjectives: [...track.learningObjectives],
  achievementTitle: track.achievementTitle,
}));

const db = getDb();

await db
  .insert(tracks)
  .values(rows)
  .onConflictDoUpdate({
    target: tracks.slug,
    set: {
      name: sql`excluded.name`,
      description: sql`excluded.description`,
      difficulty: sql`excluded.difficulty`,
      category: sql`excluded.category`,
      estimatedDurationMinutes: sql`excluded.estimated_duration_minutes`,
      lessonCount: sql`excluded.lesson_count`,
      sortOrder: sql`excluded.sort_order`,
      icon: sql`excluded.icon`,
      tags: sql`excluded.tags`,
      prerequisiteSlugs: sql`excluded.prerequisite_slugs`,
      learningObjectives: sql`excluded.learning_objectives`,
      achievementTitle: sql`excluded.achievement_title`,
    },
  });

console.log(`Seeded ${rows.length} academy tracks.`);

const achievementRows = achievementCatalog.map((achievement) => ({
  slug: achievement.slug,
  name: achievement.name,
  description: achievement.description,
  badgeUrl: achievement.badgeUrl,
  sortOrder: achievement.sortOrder,
}));

await db
  .insert(achievements)
  .values(achievementRows)
  .onConflictDoUpdate({
    target: achievements.slug,
    set: {
      name: sql`excluded.name`,
      description: sql`excluded.description`,
      badgeUrl: sql`excluded.badge_url`,
      sortOrder: sql`excluded.sort_order`,
    },
  });

console.log(`Seeded ${achievementRows.length} achievements.`);

const skillRows = skillCatalog.map((name) => ({ slug: skillSlug(name), name }));

// A mentor may have added a catalog skill first under another spelling.
// The catalog spelling wins.
await db
  .insert(skills)
  .values(skillRows)
  .onConflictDoUpdate({
    target: skills.slug,
    set: { name: sql`excluded.name` },
  });

console.log(`Seeded ${skillRows.length} skills.`);
