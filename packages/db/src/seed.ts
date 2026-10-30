import { sql } from "drizzle-orm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { achievementCatalog } from "./achievement-catalog";
import { academyLessons, validateAcademyLessons } from "./academy-lessons";
import { academyTracks } from "./academy-tracks";
import { getDb } from "./client";
import { countryCatalog } from "./country-catalog";
import {
  databaseLabel,
  databaseUrl,
  dbTargetFromArgv,
  loadDbEnv,
} from "./load-env";
import { fail } from "./run";
import {
  achievements,
  countries,
  lessonArtifacts,
  lessons,
  skills,
  tags,
  tracks,
} from "./schema";
import { skillCatalog, skillSlug } from "./skill-catalog";
import { tagCatalog, tagSlug } from "./tag-catalog";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = dbTargetFromArgv(process.argv);

try {
  loadDbEnv(packageDir, target);
} catch (error) {
  fail(error);
}

console.log(`Seeding the ${target} database at ${databaseLabel(databaseUrl())}.`);

// Catch catalog mistakes before touching the database.
try {
  validateAcademyLessons();
} catch (error) {
  fail(error);
}

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

// Lessons are keyed by (track, slug) so re-seeding updates text in place and
// keeps lesson ids, and with them members' completion records, stable.
const trackIdBySlug = new Map(
  (await db.select({ id: tracks.id, slug: tracks.slug }).from(tracks)).map(
    (row) => [row.slug, row.id],
  ),
);

const lessonRows = academyLessons.flatMap((entry) => {
  const trackId = trackIdBySlug.get(entry.trackSlug);
  if (!trackId) {
    fail(new Error(`Track "${entry.trackSlug}" was not seeded.`));
  }
  return entry.lessons.map((lesson, index) => ({
    trackId,
    slug: lesson.slug,
    name: lesson.title,
    summary: lesson.summary,
    sortOrder: index + 1,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    content: lesson.content,
    keyTakeaways: [...lesson.keyTakeaways],
  }));
});

const seededLessons = await db
  .insert(lessons)
  .values(lessonRows)
  .onConflictDoUpdate({
    target: [lessons.trackId, lessons.slug],
    set: {
      name: sql`excluded.name`,
      summary: sql`excluded.summary`,
      sortOrder: sql`excluded.sort_order`,
      estimatedDurationMinutes: sql`excluded.estimated_duration_minutes`,
      content: sql`excluded.content`,
      keyTakeaways: sql`excluded.key_takeaways`,
    },
  })
  .returning({ id: lessons.id, trackId: lessons.trackId, slug: lessons.slug });

console.log(`Seeded ${seededLessons.length} academy lessons.`);

const lessonIdByKey = new Map(
  seededLessons.map((row) => [`${row.trackId}/${row.slug}`, row.id]),
);

const artifactRows = academyLessons.flatMap((entry) =>
  entry.lessons.flatMap((lesson) => {
    const lessonId = lessonIdByKey.get(
      `${trackIdBySlug.get(entry.trackSlug)}/${lesson.slug}`,
    );
    if (!lessonId) {
      fail(new Error(`Lesson "${entry.trackSlug}/${lesson.slug}" was not seeded.`));
    }
    return lesson.artifacts.map((artifact, index) => ({
      lessonId,
      key: artifact.key,
      kind: artifact.kind,
      title: artifact.title,
      brief: artifact.brief,
      url: artifact.url ?? null,
      durationSeconds: artifact.durationSeconds ?? null,
      sortOrder: index + 1,
    }));
  }),
);

// A generated asset's URL is written to the database by the pipeline that
// produced it, not by this seed. Re-seeding keeps an existing URL unless the
// catalog supplies one of its own.
await db
  .insert(lessonArtifacts)
  .values(artifactRows)
  .onConflictDoUpdate({
    target: [lessonArtifacts.lessonId, lessonArtifacts.key],
    set: {
      kind: sql`excluded.kind`,
      title: sql`excluded.title`,
      brief: sql`excluded.brief`,
      url: sql`coalesce(excluded.url, ${lessonArtifacts.url})`,
      durationSeconds: sql`excluded.duration_seconds`,
      sortOrder: sql`excluded.sort_order`,
    },
  });

console.log(`Seeded ${artifactRows.length} lesson artifacts.`);

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

const countryRows = Object.entries(countryCatalog).map(([code, name]) => ({
  code,
  name,
}));

await db
  .insert(countries)
  .values(countryRows)
  .onConflictDoUpdate({
    target: countries.code,
    set: { name: sql`excluded.name` },
  });

console.log(`Seeded ${countryRows.length} countries.`);

const tagRows = tagCatalog.map((name) => ({ slug: tagSlug(name), name }));

// Someone may have tagged an idea with a catalog tag first under another
// spelling. The catalog spelling wins.
await db
  .insert(tags)
  .values(tagRows)
  .onConflictDoUpdate({
    target: tags.slug,
    set: { name: sql`excluded.name` },
  });

console.log(`Seeded ${tagRows.length} tags.`);
