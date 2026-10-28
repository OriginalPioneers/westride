import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const trackDifficulty = pgEnum("track_difficulty", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    difficulty: trackDifficulty("difficulty").notNull(),
    category: text("category").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    /** Planned lesson count. Lesson rows are added in a later seed. */
    lessonCount: integer("lesson_count").notNull(),
    sortOrder: integer("sort_order").notNull(),
    icon: text("icon").notNull(),
    tags: text("tags").array().notNull(),
    prerequisiteSlugs: text("prerequisite_slugs").array().notNull(),
    learningObjectives: text("learning_objectives").array().notNull(),
    achievementTitle: text("achievement_title").notNull(),
  },
  (table) => [
    uniqueIndex("tracks_slug_unique").on(table.slug),
    index("tracks_sort_order_idx").on(table.sortOrder),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => tracks.id),
  },
  (table) => [index("lessons_track_id_idx").on(table.trackId)],
);

export const tracksRelations = relations(tracks, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  track: one(tracks, {
    fields: [lessons.trackId],
    references: [tracks.id],
  }),
}));

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    badgeUrl: text("badge_url").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    uniqueIndex("achievements_slug_unique").on(table.slug),
    index("achievements_sort_order_idx").on(table.sortOrder),
  ],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Clerk user id. Guests are never written here. */
    clerkUserId: text("clerk_user_id").notNull(),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_achievement_unique").on(
      table.clerkUserId,
      table.achievementId,
    ),
    index("user_achievements_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

export const mentorProfiles = pgTable(
  "mentor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Clerk user id. One mentor profile per account. */
    clerkUserId: text("clerk_user_id").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull(),
    headshotUrl: text("headshot_url"),
    githubUrl: text("github_url"),
    linkedinUrl: text("linkedin_url"),
    facebookUrl: text("facebook_url"),
    /** Mentors anyone, wherever they are, in addition to listed locations. */
    isGlobal: boolean("is_global").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mentor_profiles_clerk_user_id_unique").on(table.clerkUserId),
    index("mentor_profiles_display_name_idx").on(table.displayName),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lowercased, hyphenated name. Two spellings of one skill share a slug. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("skills_slug_unique").on(table.slug)],
);

export const mentorSkills = pgTable(
  "mentor_skills",
  {
    mentorProfileId: uuid("mentor_profile_id")
      .notNull()
      .references(() => mentorProfiles.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mentorProfileId, table.skillId] }),
    index("mentor_skills_skill_id_idx").on(table.skillId),
  ],
);

export const mentorLocations = pgTable(
  "mentor_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mentorProfileId: uuid("mentor_profile_id")
      .notNull()
      .references(() => mentorProfiles.id, { onDelete: "cascade" }),
    /** ISO 3166-1 alpha-2, e.g. "US". */
    countryCode: text("country_code").notNull(),
    /** State, province, or region. */
    region: text("region"),
    city: text("city"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    index("mentor_locations_mentor_profile_id_idx").on(table.mentorProfileId),
    index("mentor_locations_country_code_idx").on(table.countryCode),
  ],
);

export const mentorLanguages = pgTable(
  "mentor_languages",
  {
    mentorProfileId: uuid("mentor_profile_id")
      .notNull()
      .references(() => mentorProfiles.id, { onDelete: "cascade" }),
    /** ISO 639-1, e.g. "en". */
    languageCode: text("language_code").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mentorProfileId, table.languageCode] }),
    index("mentor_languages_language_code_idx").on(table.languageCode),
  ],
);

export const mentorProfilesRelations = relations(
  mentorProfiles,
  ({ many }) => ({
    skills: many(mentorSkills),
    locations: many(mentorLocations),
    languages: many(mentorLanguages),
  }),
);

export const skillsRelations = relations(skills, ({ many }) => ({
  mentorSkills: many(mentorSkills),
}));

export const mentorSkillsRelations = relations(mentorSkills, ({ one }) => ({
  mentorProfile: one(mentorProfiles, {
    fields: [mentorSkills.mentorProfileId],
    references: [mentorProfiles.id],
  }),
  skill: one(skills, {
    fields: [mentorSkills.skillId],
    references: [skills.id],
  }),
}));

export const mentorLocationsRelations = relations(
  mentorLocations,
  ({ one }) => ({
    mentorProfile: one(mentorProfiles, {
      fields: [mentorLocations.mentorProfileId],
      references: [mentorProfiles.id],
    }),
  }),
);

export const mentorLanguagesRelations = relations(
  mentorLanguages,
  ({ one }) => ({
    mentorProfile: one(mentorProfiles, {
      fields: [mentorLanguages.mentorProfileId],
      references: [mentorProfiles.id],
    }),
  }),
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type NewMentorProfile = typeof mentorProfiles.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type MentorLocation = typeof mentorLocations.$inferSelect;
export type NewMentorLocation = typeof mentorLocations.$inferInsert;
