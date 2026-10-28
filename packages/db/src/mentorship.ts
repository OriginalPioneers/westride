import {
  and,
  asc,
  eq,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "./client";
import {
  mentorLanguages,
  mentorLocations,
  mentorProfiles,
  mentorSkills,
  skills,
  type MentorLocation,
  type MentorProfile,
  type Skill,
} from "./schema";
import { skillSlug } from "./skill-catalog";

export type MentorWithDetails = MentorProfile & {
  skills: Skill[];
  locations: MentorLocation[];
  languageCodes: string[];
};

export type MentorLocationInput = {
  countryCode: string;
  region: string | null;
  city: string | null;
};

export type MentorProfileInput = {
  displayName: string;
  bio: string;
  headshotUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  isGlobal: boolean;
  /** Skill names. Names without a matching slug become new skills. */
  skillNames: string[];
  locations: MentorLocationInput[];
  languageCodes: string[];
};

/**
 * A location filter. `global` matches mentors who mentor anywhere. The
 * others match a listed location at that depth, plus every global mentor.
 */
export type MentorLocationFilter =
  | { kind: "global" }
  | { kind: "country"; countryCode: string }
  | { kind: "region"; countryCode: string; region: string }
  | {
      kind: "city";
      countryCode: string;
      region: string | null;
      city: string;
    };

export type MentorFilters = {
  skillSlug?: string;
  languageCode?: string;
  location?: MentorLocationFilter;
};

export type MentorFilterOptions = {
  skills: Skill[];
  languageCodes: string[];
  locations: MentorLocationInput[];
  hasGlobal: boolean;
};

async function findMentors(
  where: SQL | undefined,
  limit?: number,
): Promise<MentorWithDetails[]> {
  const rows = await getDb().query.mentorProfiles.findMany({
    where,
    limit,
    orderBy: [asc(mentorProfiles.displayName)],
    // Nested relations are aliased in the query, so ordering goes through
    // the callback's table rather than the imported one.
    with: {
      skills: {
        orderBy: (entry, { asc: by }) => [by(entry.sortOrder)],
        with: { skill: true },
      },
      locations: {
        orderBy: (location, { asc: by }) => [by(location.sortOrder)],
      },
      languages: {
        orderBy: (language, { asc: by }) => [by(language.languageCode)],
      },
    },
  });

  return rows.map(({ skills: skillRows, languages, ...profile }) => ({
    ...profile,
    skills: skillRows.map((entry) => entry.skill),
    languageCodes: languages.map((entry) => entry.languageCode),
  }));
}

export async function getMentorProfileForUser(
  clerkUserId: string,
): Promise<MentorWithDetails | null> {
  const [mentor] = await findMentors(
    eq(mentorProfiles.clerkUserId, clerkUserId),
    1,
  );
  return mentor ?? null;
}

export async function getMentorProfile(
  id: string,
): Promise<MentorWithDetails | null> {
  const [mentor] = await findMentors(eq(mentorProfiles.id, id), 1);
  return mentor ?? null;
}

export async function listSkills(): Promise<Skill[]> {
  return getDb().query.skills.findMany({
    orderBy: [asc(skills.name)],
  });
}

function locationCondition(filter: MentorLocationFilter): SQL | undefined {
  if (filter.kind === "global") {
    return eq(mentorProfiles.isGlobal, true);
  }

  const match: SQL[] = [eq(mentorLocations.countryCode, filter.countryCode)];
  if (filter.kind === "region") {
    match.push(sql`lower(${mentorLocations.region}) = lower(${filter.region})`);
  }
  if (filter.kind === "city") {
    match.push(
      sql`lower(coalesce(${mentorLocations.region}, '')) = lower(${filter.region ?? ""})`,
      sql`lower(${mentorLocations.city}) = lower(${filter.city})`,
    );
  }

  return or(
    eq(mentorProfiles.isGlobal, true),
    inArray(
      mentorProfiles.id,
      getDb()
        .select({ id: mentorLocations.mentorProfileId })
        .from(mentorLocations)
        .where(and(...match)),
    ),
  );
}

export async function listMentors(
  filters: MentorFilters = {},
): Promise<MentorWithDetails[]> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (filters.skillSlug) {
    conditions.push(
      inArray(
        mentorProfiles.id,
        db
          .select({ id: mentorSkills.mentorProfileId })
          .from(mentorSkills)
          .innerJoin(skills, eq(skills.id, mentorSkills.skillId))
          .where(eq(skills.slug, filters.skillSlug)),
      ),
    );
  }

  if (filters.languageCode) {
    conditions.push(
      inArray(
        mentorProfiles.id,
        db
          .select({ id: mentorLanguages.mentorProfileId })
          .from(mentorLanguages)
          .where(eq(mentorLanguages.languageCode, filters.languageCode)),
      ),
    );
  }

  if (filters.location) {
    const condition = locationCondition(filters.location);
    if (condition) {
      conditions.push(condition);
    }
  }

  return findMentors(conditions.length > 0 ? and(...conditions) : undefined);
}

/** Only values some mentor has, so no filter choice comes back empty. */
export async function listMentorFilterOptions(): Promise<MentorFilterOptions> {
  const db = getDb();
  const [skillRows, languageRows, locationRows, globalRows] = await Promise.all([
    db
      .selectDistinct({ id: skills.id, slug: skills.slug, name: skills.name })
      .from(skills)
      .innerJoin(mentorSkills, eq(mentorSkills.skillId, skills.id))
      .orderBy(asc(skills.name)),
    db
      .selectDistinct({ languageCode: mentorLanguages.languageCode })
      .from(mentorLanguages),
    db
      .select({
        countryCode: mentorLocations.countryCode,
        region: mentorLocations.region,
        city: mentorLocations.city,
      })
      .from(mentorLocations),
    db
      .select({ id: mentorProfiles.id })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.isGlobal, true))
      .limit(1),
  ]);

  return {
    skills: skillRows,
    languageCodes: languageRows.map((row) => row.languageCode),
    locations: locationRows,
    hasGlobal: globalRows.length > 0,
  };
}

async function resolveSkillIds(names: string[]): Promise<string[]> {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = skillSlug(name);
    if (slug && !bySlug.has(slug)) {
      bySlug.set(slug, name.trim());
    }
  }
  if (bySlug.size === 0) {
    return [];
  }

  const db = getDb();
  const slugs = [...bySlug.keys()];
  await db
    .insert(skills)
    .values(slugs.map((slug) => ({ slug, name: bySlug.get(slug) ?? slug })))
    .onConflictDoNothing({ target: skills.slug });

  const rows = await db
    .select({ id: skills.id, slug: skills.slug })
    .from(skills)
    .where(inArray(skills.slug, slugs));
  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));

  return slugs.flatMap((slug) => {
    const id = idBySlug.get(slug);
    return id ? [id] : [];
  });
}

/**
 * Creates or replaces the account's mentor profile. Returns the headshot URL
 * it replaced, so the caller can delete that file once the save has landed.
 */
export async function upsertMentorProfile(
  clerkUserId: string,
  input: MentorProfileInput,
): Promise<{ id: string; replacedHeadshotUrl: string | null }> {
  if (!clerkUserId) {
    throw new Error("A signed-in user is required to save a mentor profile.");
  }

  const db = getDb();
  const existing = await db.query.mentorProfiles.findFirst({
    where: eq(mentorProfiles.clerkUserId, clerkUserId),
    columns: { headshotUrl: true },
  });
  const skillIds = await resolveSkillIds(input.skillNames);

  const profileValues = {
    displayName: input.displayName,
    bio: input.bio,
    headshotUrl: input.headshotUrl,
    githubUrl: input.githubUrl,
    linkedinUrl: input.linkedinUrl,
    facebookUrl: input.facebookUrl,
    isGlobal: input.isGlobal,
  };

  const [profile] = await db
    .insert(mentorProfiles)
    .values({ clerkUserId, ...profileValues })
    .onConflictDoUpdate({
      target: mentorProfiles.clerkUserId,
      set: { ...profileValues, updatedAt: new Date() },
    })
    .returning({ id: mentorProfiles.id });

  if (!profile) {
    throw new Error("The mentor profile could not be saved.");
  }

  const mentorProfileId = profile.id;
  const statements: BatchItem<"pg">[] = [
    db
      .delete(mentorSkills)
      .where(eq(mentorSkills.mentorProfileId, mentorProfileId)),
    db
      .delete(mentorLocations)
      .where(eq(mentorLocations.mentorProfileId, mentorProfileId)),
    db
      .delete(mentorLanguages)
      .where(eq(mentorLanguages.mentorProfileId, mentorProfileId)),
  ];

  if (skillIds.length > 0) {
    statements.push(
      db.insert(mentorSkills).values(
        skillIds.map((skillId, index) => ({
          mentorProfileId,
          skillId,
          sortOrder: index,
        })),
      ),
    );
  }
  if (input.locations.length > 0) {
    statements.push(
      db.insert(mentorLocations).values(
        input.locations.map((location, index) => ({
          mentorProfileId,
          ...location,
          sortOrder: index,
        })),
      ),
    );
  }
  const languageCodes = [...new Set(input.languageCodes)];
  if (languageCodes.length > 0) {
    statements.push(
      db
        .insert(mentorLanguages)
        .values(
          languageCodes.map((languageCode) => ({
            mentorProfileId,
            languageCode,
          })),
        ),
    );
  }

  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);

  const previous = existing?.headshotUrl ?? null;
  return {
    id: mentorProfileId,
    replacedHeadshotUrl:
      previous && previous !== input.headshotUrl ? previous : null,
  };
}

/** Returns the removed profile's headshot URL, if it had one. */
export async function deleteMentorProfile(
  clerkUserId: string,
): Promise<{ headshotUrl: string | null } | null> {
  const [removed] = await getDb()
    .delete(mentorProfiles)
    .where(eq(mentorProfiles.clerkUserId, clerkUserId))
    .returning({ headshotUrl: mentorProfiles.headshotUrl });
  return removed ?? null;
}
