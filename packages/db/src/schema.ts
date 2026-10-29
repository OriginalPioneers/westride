export { socialPosts } from "./social-schema";
export { learningAttempts, learningMuseBudgets } from "./learning-schema";
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
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
    celebratedAt: timestamp("celebrated_at", {
      withTimezone: true,
      mode: "date",
    }),
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

export const ideaType = pgEnum("idea_type", ["BUSINESS", "NON_PROFIT"]);

export const ideaMemberRole = pgEnum("idea_member_role", ["FOUNDER", "MEMBER"]);

/** ISO 3166-1 countries. Seeded from `country-catalog.ts`. */
export const countries = pgTable(
  "countries",
  {
    /** ISO 3166-1 alpha-2, e.g. "US". */
    code: text("code").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [index("countries_name_idx").on(table.name)],
);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Markdown. */
    description: text("description").notNull(),
    type: ideaType("type").notNull(),
    prototypeUrl: text("prototype_url"),
    prototypeInstructions: text("prototype_instructions"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ideas_name_idx").on(table.name),
    index("ideas_type_idx").on(table.type),
    index("ideas_visibility_idx").on(table.isPublic, table.isFeatured),
    index("ideas_created_at_idx").on(table.createdAt),
  ],
);

/** Durable evidence of a saved builder action, credited only to its actor. */
export const ideaBuilderEvents = pgTable(
  "idea_builder_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    achievementSlug: text("achievement_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idea_builder_events_actor_idea_slug_unique").on(
      table.clerkUserId,
      table.ideaId,
      table.achievementSlug,
    ),
  ],
);

export const ideaMembers = pgTable(
  "idea_members",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** Clerk user id. */
    clerkUserId: text("clerk_user_id").notNull(),
    role: ideaMemberRole("role").notNull().default("MEMBER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ideaId, table.clerkUserId] }),
    index("idea_members_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const ideaGeographies = pgTable(
  "idea_geographies",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    countryCode: text("country_code")
      .notNull()
      .references(() => countries.code),
  },
  (table) => [
    primaryKey({ columns: [table.ideaId, table.countryCode] }),
    index("idea_geographies_country_code_idx").on(table.countryCode),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lowercased, hyphenated name. Two spellings of one tag share a slug. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("tags_slug_unique").on(table.slug)],
);

export const ideaTags = pgTable(
  "idea_tags",
  {
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ideaId, table.tagId] }),
    index("idea_tags_tag_id_idx").on(table.tagId),
  ],
);

export const countriesRelations = relations(countries, ({ many }) => ({
  ideaGeographies: many(ideaGeographies),
}));

export const ideasRelations = relations(ideas, ({ many }) => ({
  members: many(ideaMembers),
  geographies: many(ideaGeographies),
  tags: many(ideaTags),
}));

export const ideaMembersRelations = relations(ideaMembers, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaMembers.ideaId],
    references: [ideas.id],
  }),
}));

export const ideaGeographiesRelations = relations(
  ideaGeographies,
  ({ one }) => ({
    idea: one(ideas, {
      fields: [ideaGeographies.ideaId],
      references: [ideas.id],
    }),
    country: one(countries, {
      fields: [ideaGeographies.countryCode],
      references: [countries.code],
    }),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  ideaTags: many(ideaTags),
}));

export const ideaTagsRelations = relations(ideaTags, ({ one }) => ({
  idea: one(ideas, {
    fields: [ideaTags.ideaId],
    references: [ideas.id],
  }),
  tag: one(tags, {
    fields: [ideaTags.tagId],
    references: [tags.id],
  }),
}));

// ---------------------------------------------------------------------------
// Idea Factory
//
// Each idea gets an advisory team of specialised Muse agents. Conversations
// are shared by the whole team (one thread per agent per idea). Every call
// to Meta Model API is logged in `muse_requests` so members can see what was
// sent, what came back, and what it cost. API keys are never stored: they
// live in the member's browser and travel with each request.
// ---------------------------------------------------------------------------

/** How sure an agent is about a claim, and where that confidence comes from. */
export const evidenceClass = pgEnum("evidence_class", [
  "VERIFIED",
  "ESTIMATE",
  "ASSUMPTION",
  "HYPOTHESIS",
]);

export const factoryMessageRole = pgEnum("factory_message_role", [
  "USER",
  "AGENT",
]);

export const evaluationStatus = pgEnum("evaluation_status", [
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export const findingStatus = pgEnum("finding_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
]);

export type MuseSource = {
  url: string;
  title: string | null;
  /** ISO date the source was published or retrieved, when known. */
  date: string | null;
};

export type MuseFinding = {
  claim: string;
  detail: string;
  evidenceClass: (typeof evidenceClass.enumValues)[number];
  sources: MuseSource[];
};

export type MuseFindingVerdict = "PROMISING" | "CAUTION" | "BLOCKER";

export type MuseSynthesis = {
  overview: string;
  agreements: string[];
  disagreements: { topic: string; positions: string; resolution: string }[];
  risks: string[];
  recommendation: string;
  questionsForYou: string[];
};

export const museRequests = pgTable(
  "muse_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** Clerk user id of the member whose Meta account paid for the call. */
    clerkUserId: text("clerk_user_id").notNull(),
    /** Agent slug from the catalog, or null for the synthesis step. */
    agentSlug: text("agent_slug"),
    /** "chat" | "evaluation" | "synthesis" | "verify" */
    purpose: text("purpose").notNull(),
    model: text("model").notNull(),
    endpoint: text("endpoint").notNull(),
    /** Exactly what was sent, minus the Authorization header. */
    requestBody: jsonb("request_body").$type<unknown>().notNull(),
    responseBody: jsonb("response_body").$type<unknown>(),
    statusCode: integer("status_code"),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    webSearchCalls: integer("web_search_calls").notNull().default(0),
    /** USD in millionths, from the published price list. An estimate. */
    estimatedCostMicros: bigint("estimated_cost_micros", { mode: "number" })
      .notNull()
      .default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    rateLimitRemainingTokens: integer("rate_limit_remaining_tokens"),
    rateLimitRemainingRequests: integer("rate_limit_remaining_requests"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("muse_requests_idea_id_created_at_idx").on(
      table.ideaId,
      table.createdAt,
    ),
    index("muse_requests_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const ideaFactoryThreads = pgTable(
  "idea_factory_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    agentSlug: text("agent_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idea_factory_threads_idea_agent_unique").on(
      table.ideaId,
      table.agentSlug,
    ),
  ],
);

export const ideaFactoryMessages = pgTable(
  "idea_factory_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => ideaFactoryThreads.id, { onDelete: "cascade" }),
    role: factoryMessageRole("role").notNull(),
    /** Who wrote a USER message. Null for AGENT messages. */
    clerkUserId: text("clerk_user_id"),
    /** Markdown. */
    content: text("content").notNull(),
    sources: jsonb("sources").$type<MuseSource[]>().notNull().default([]),
    requestId: uuid("request_id").references(() => museRequests.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idea_factory_messages_thread_id_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
  ],
);

export const ideaFactoryEvaluations = pgTable(
  "idea_factory_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    /** Member who clicked Evaluate. */
    clerkUserId: text("clerk_user_id").notNull(),
    status: evaluationStatus("status").notNull().default("RUNNING"),
    model: text("model").notNull(),
    synthesis: jsonb("synthesis").$type<MuseSynthesis>(),
    synthesisRequestId: uuid("synthesis_request_id").references(
      () => museRequests.id,
      { onDelete: "set null" },
    ),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    index("idea_factory_evaluations_idea_id_created_at_idx").on(
      table.ideaId,
      table.createdAt,
    ),
  ],
);

export const ideaFactoryFindings = pgTable(
  "idea_factory_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => ideaFactoryEvaluations.id, { onDelete: "cascade" }),
    agentSlug: text("agent_slug").notNull(),
    status: findingStatus("status").notNull().default("PENDING"),
    verdict: text("verdict").$type<MuseFindingVerdict>(),
    /** One-paragraph headline from the agent. Markdown. */
    summary: text("summary"),
    findings: jsonb("findings").$type<MuseFinding[]>().notNull().default([]),
    nextSteps: jsonb("next_steps").$type<string[]>().notNull().default([]),
    requestId: uuid("request_id").references(() => museRequests.id, {
      onDelete: "set null",
    }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("idea_factory_findings_evaluation_agent_unique").on(
      table.evaluationId,
      table.agentSlug,
    ),
  ],
);

export const museRequestsRelations = relations(museRequests, ({ one }) => ({
  idea: one(ideas, {
    fields: [museRequests.ideaId],
    references: [ideas.id],
  }),
}));

export const ideaFactoryThreadsRelations = relations(
  ideaFactoryThreads,
  ({ one, many }) => ({
    idea: one(ideas, {
      fields: [ideaFactoryThreads.ideaId],
      references: [ideas.id],
    }),
    messages: many(ideaFactoryMessages),
  }),
);

export const ideaFactoryMessagesRelations = relations(
  ideaFactoryMessages,
  ({ one }) => ({
    thread: one(ideaFactoryThreads, {
      fields: [ideaFactoryMessages.threadId],
      references: [ideaFactoryThreads.id],
    }),
    request: one(museRequests, {
      fields: [ideaFactoryMessages.requestId],
      references: [museRequests.id],
    }),
  }),
);

export const ideaFactoryEvaluationsRelations = relations(
  ideaFactoryEvaluations,
  ({ one, many }) => ({
    idea: one(ideas, {
      fields: [ideaFactoryEvaluations.ideaId],
      references: [ideas.id],
    }),
    findings: many(ideaFactoryFindings),
  }),
);

export const ideaFactoryFindingsRelations = relations(
  ideaFactoryFindings,
  ({ one }) => ({
    evaluation: one(ideaFactoryEvaluations, {
      fields: [ideaFactoryFindings.evaluationId],
      references: [ideaFactoryEvaluations.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// Feedback
//
// Anyone can read feedback. Signed-in users can post it, +1 it once each,
// and comment on it.
// ---------------------------------------------------------------------------

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Clerk user id of the author. */
    clerkUserId: text("clerk_user_id").notNull(),
    title: text("title").notNull(),
    /** Markdown. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_clerk_user_id_idx").on(table.clerkUserId),
    index("feedback_created_at_idx").on(table.createdAt),
  ],
);

/** A +1. One per user per feedback. */
export const feedbackVotes = pgTable(
  "feedback_votes",
  {
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    /** Clerk user id. */
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.feedbackId, table.clerkUserId] }),
    index("feedback_votes_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const feedbackComments = pgTable(
  "feedback_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedbackId: uuid("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    /** Clerk user id of the author. */
    clerkUserId: text("clerk_user_id").notNull(),
    /** Markdown. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_comments_feedback_id_created_at_idx").on(
      table.feedbackId,
      table.createdAt,
    ),
    index("feedback_comments_clerk_user_id_idx").on(table.clerkUserId),
  ],
);

export const feedbackRelations = relations(feedback, ({ many }) => ({
  votes: many(feedbackVotes),
  comments: many(feedbackComments),
}));

export const feedbackVotesRelations = relations(feedbackVotes, ({ one }) => ({
  feedback: one(feedback, {
    fields: [feedbackVotes.feedbackId],
    references: [feedback.id],
  }),
}));

export const feedbackCommentsRelations = relations(
  feedbackComments,
  ({ one }) => ({
    feedback: one(feedback, {
      fields: [feedbackComments.feedbackId],
      references: [feedback.id],
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
export type IdeaType = (typeof ideaType.enumValues)[number];
export type IdeaMemberRole = (typeof ideaMemberRole.enumValues)[number];
export type Country = typeof countries.$inferSelect;
export type NewCountry = typeof countries.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type IdeaMember = typeof ideaMembers.$inferSelect;
export type NewIdeaMember = typeof ideaMembers.$inferInsert;
export type IdeaGeography = typeof ideaGeographies.$inferSelect;
export type NewIdeaGeography = typeof ideaGeographies.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type IdeaTag = typeof ideaTags.$inferSelect;
export type NewIdeaTag = typeof ideaTags.$inferInsert;
export type EvidenceClass = (typeof evidenceClass.enumValues)[number];
export type FactoryMessageRole = (typeof factoryMessageRole.enumValues)[number];
export type EvaluationStatus = (typeof evaluationStatus.enumValues)[number];
export type FindingStatus = (typeof findingStatus.enumValues)[number];
export type MuseRequest = typeof museRequests.$inferSelect;
export type NewMuseRequest = typeof museRequests.$inferInsert;
export type IdeaFactoryThread = typeof ideaFactoryThreads.$inferSelect;
export type IdeaFactoryMessage = typeof ideaFactoryMessages.$inferSelect;
export type NewIdeaFactoryMessage = typeof ideaFactoryMessages.$inferInsert;
export type IdeaFactoryEvaluation = typeof ideaFactoryEvaluations.$inferSelect;
export type IdeaFactoryFinding = typeof ideaFactoryFindings.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type FeedbackVote = typeof feedbackVotes.$inferSelect;
export type NewFeedbackVote = typeof feedbackVotes.$inferInsert;
export type FeedbackComment = typeof feedbackComments.$inferSelect;
export type NewFeedbackComment = typeof feedbackComments.$inferInsert;
