import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getDb } from "./client";
import {
  countries,
  ideaGeographies,
  ideaMembers,
  ideas,
  ideaTags,
  tags,
  type Country,
  type Idea,
  type IdeaMember,
  type IdeaMemberRole,
  type IdeaType,
  type Tag,
} from "./schema";
import { tagSlug } from "./tag-catalog";

export type IdeaWithDetails = Idea & {
  members: IdeaMember[];
  countries: Country[];
  tags: Tag[];
};

export type IdeaMemberInput = {
  clerkUserId: string;
  role: IdeaMemberRole;
};

export type IdeaInput = {
  name: string;
  /** Markdown. */
  description: string;
  type: IdeaType;
  isFeatured: boolean;
  isPublic: boolean;
  /** May be empty. One row per user; a later duplicate wins. */
  members: IdeaMemberInput[];
  /** ISO 3166-1 alpha-2 codes. May be empty. Unknown codes are dropped. */
  countryCodes: string[];
  /** Tag names. Names without a matching slug become new tags. */
  tagNames: string[];
};

export const IDEA_SORTS = [
  "newest",
  "oldest",
  "updated",
  "name-asc",
  "name-desc",
] as const;

export type IdeaSort = (typeof IDEA_SORTS)[number];

export function isIdeaSort(value: string): value is IdeaSort {
  return (IDEA_SORTS as readonly string[]).includes(value);
}

export type IdeaFilters = {
  /** Matches the name or description, case-insensitively. */
  query?: string;
  type?: IdeaType;
  countryCode?: string;
  tagSlug?: string;
  featuredOnly?: boolean;
  sort?: IdeaSort;
};

export type IdeaFilterOptions = {
  types: IdeaType[];
  countries: Country[];
  tags: Tag[];
};

/**
 * Who is looking. Public ideas are visible to everyone; private ideas only
 * to their members. `null` is a signed-out visitor.
 */
export type IdeaViewer = { clerkUserId: string | null };

const ANYONE: IdeaViewer = { clerkUserId: null };

function visibilityCondition(viewer: IdeaViewer): SQL {
  const isPublic = eq(ideas.isPublic, true);
  if (!viewer.clerkUserId) {
    return isPublic;
  }
  const memberOf = getDb()
    .select({ id: ideaMembers.ideaId })
    .from(ideaMembers)
    .where(eq(ideaMembers.clerkUserId, viewer.clerkUserId));
  return or(isPublic, inArray(ideas.id, memberOf)) ?? isPublic;
}

function visibleIdeaIds(viewer: IdeaViewer) {
  return getDb()
    .select({ id: ideas.id })
    .from(ideas)
    .where(visibilityCondition(viewer));
}

function orderFor(sort: IdeaSort): SQL[] {
  switch (sort) {
    case "oldest":
      return [asc(ideas.createdAt), asc(ideas.name)];
    case "updated":
      return [desc(ideas.updatedAt), asc(ideas.name)];
    case "name-asc":
      return [asc(ideas.name), desc(ideas.createdAt)];
    case "name-desc":
      return [desc(ideas.name), desc(ideas.createdAt)];
    case "newest":
      return [desc(ideas.createdAt), asc(ideas.name)];
  }
}

/** Escapes the LIKE wildcards so a search for "100%" means the characters. */
function likePattern(query: string): string {
  const escaped = query.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

async function findIdeas(
  where: SQL | undefined,
  orderBy: SQL[],
  limit?: number,
): Promise<IdeaWithDetails[]> {
  const rows = await getDb().query.ideas.findMany({
    where,
    orderBy,
    limit,
    // Nested relations are aliased in the query, so ordering goes through
    // the callback's table rather than the imported one.
    with: {
      members: {
        orderBy: (member, { asc: by }) => [by(member.role), by(member.createdAt)],
      },
      geographies: {
        with: { country: true },
      },
      tags: {
        orderBy: (entry, { asc: by }) => [by(entry.sortOrder)],
        with: { tag: true },
      },
    },
  });

  return rows.map(({ geographies, tags: tagRows, ...idea }) => ({
    ...idea,
    countries: geographies
      .map((entry) => entry.country)
      .sort((a, b) => a.name.localeCompare(b.name, "en")),
    tags: tagRows.map((entry) => entry.tag),
  }));
}

export async function listIdeas(
  filters: IdeaFilters = {},
  viewer: IdeaViewer = ANYONE,
): Promise<IdeaWithDetails[]> {
  const db = getDb();
  const conditions: SQL[] = [visibilityCondition(viewer)];

  const query = filters.query?.trim();
  if (query) {
    const pattern = likePattern(query);
    const match = or(
      ilike(ideas.name, pattern),
      ilike(ideas.description, pattern),
    );
    if (match) {
      conditions.push(match);
    }
  }

  if (filters.type) {
    conditions.push(eq(ideas.type, filters.type));
  }

  if (filters.featuredOnly) {
    conditions.push(eq(ideas.isFeatured, true));
  }

  if (filters.countryCode) {
    conditions.push(
      inArray(
        ideas.id,
        db
          .select({ id: ideaGeographies.ideaId })
          .from(ideaGeographies)
          .where(eq(ideaGeographies.countryCode, filters.countryCode)),
      ),
    );
  }

  if (filters.tagSlug) {
    conditions.push(
      inArray(
        ideas.id,
        db
          .select({ id: ideaTags.ideaId })
          .from(ideaTags)
          .innerJoin(tags, eq(tags.id, ideaTags.tagId))
          .where(eq(tags.slug, filters.tagSlug)),
      ),
    );
  }

  return findIdeas(and(...conditions), orderFor(filters.sort ?? "newest"));
}

export async function getIdea(
  id: string,
  viewer: IdeaViewer = ANYONE,
): Promise<IdeaWithDetails | null> {
  const [idea] = await findIdeas(
    and(eq(ideas.id, id), visibilityCondition(viewer)),
    orderFor("newest"),
    1,
  );
  return idea ?? null;
}

/** Only values some visible idea has, so no filter choice comes back empty. */
export async function listIdeaFilterOptions(
  viewer: IdeaViewer = ANYONE,
): Promise<IdeaFilterOptions> {
  const db = getDb();
  const visible = visibleIdeaIds(viewer);

  const [typeRows, countryRows, tagRows] = await Promise.all([
    db
      .selectDistinct({ type: ideas.type })
      .from(ideas)
      .where(visibilityCondition(viewer)),
    db
      .selectDistinct({ code: countries.code, name: countries.name })
      .from(countries)
      .innerJoin(
        ideaGeographies,
        eq(ideaGeographies.countryCode, countries.code),
      )
      .where(inArray(ideaGeographies.ideaId, visible))
      .orderBy(asc(countries.name)),
    db
      .selectDistinct({ id: tags.id, slug: tags.slug, name: tags.name })
      .from(tags)
      .innerJoin(ideaTags, eq(ideaTags.tagId, tags.id))
      .where(inArray(ideaTags.ideaId, visible))
      .orderBy(asc(tags.name)),
  ]);

  return {
    types: typeRows.map((row) => row.type).sort(),
    countries: countryRows,
    tags: tagRows,
  };
}

/** Every tag, for pickers. Users may also type a tag that is not listed. */
export async function listTags(): Promise<Tag[]> {
  return getDb().query.tags.findMany({ orderBy: [asc(tags.name)] });
}

export async function listCountries(): Promise<Country[]> {
  return getDb().query.countries.findMany({ orderBy: [asc(countries.name)] });
}

async function resolveTagIds(names: string[]): Promise<string[]> {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = tagSlug(name);
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
    .insert(tags)
    .values(slugs.map((slug) => ({ slug, name: bySlug.get(slug) ?? slug })))
    .onConflictDoNothing({ target: tags.slug });

  const rows = await db
    .select({ id: tags.id, slug: tags.slug })
    .from(tags)
    .where(inArray(tags.slug, slugs));
  const idBySlug = new Map(rows.map((row) => [row.slug, row.id]));

  return slugs.flatMap((slug) => {
    const id = idBySlug.get(slug);
    return id ? [id] : [];
  });
}

async function knownCountryCodes(codes: string[]): Promise<string[]> {
  const wanted = [...new Set(codes.map((code) => code.trim().toUpperCase()))];
  if (wanted.length === 0) {
    return [];
  }
  const rows = await getDb()
    .select({ code: countries.code })
    .from(countries)
    .where(inArray(countries.code, wanted));
  const known = new Set(rows.map((row) => row.code));
  return wanted.filter((code) => known.has(code));
}

function dedupeMembers(members: IdeaMemberInput[]): IdeaMemberInput[] {
  const byUser = new Map<string, IdeaMemberInput>();
  for (const member of members) {
    const clerkUserId = member.clerkUserId.trim();
    if (clerkUserId) {
      byUser.set(clerkUserId, { clerkUserId, role: member.role });
    }
  }
  return [...byUser.values()];
}

/** Replaces every member, geography, and tag row for the idea. */
async function writeIdeaAssociations(
  ideaId: string,
  input: IdeaInput,
): Promise<void> {
  const db = getDb();
  const [tagIds, countryCodes] = await Promise.all([
    resolveTagIds(input.tagNames),
    knownCountryCodes(input.countryCodes),
  ]);
  const members = dedupeMembers(input.members);

  const statements: BatchItem<"pg">[] = [
    db.delete(ideaMembers).where(eq(ideaMembers.ideaId, ideaId)),
    db.delete(ideaGeographies).where(eq(ideaGeographies.ideaId, ideaId)),
    db.delete(ideaTags).where(eq(ideaTags.ideaId, ideaId)),
  ];

  if (members.length > 0) {
    statements.push(
      db
        .insert(ideaMembers)
        .values(members.map((member) => ({ ideaId, ...member }))),
    );
  }
  if (countryCodes.length > 0) {
    statements.push(
      db
        .insert(ideaGeographies)
        .values(countryCodes.map((countryCode) => ({ ideaId, countryCode }))),
    );
  }
  if (tagIds.length > 0) {
    statements.push(
      db.insert(ideaTags).values(
        tagIds.map((tagId, index) => ({
          ideaId,
          tagId,
          sortOrder: index,
        })),
      ),
    );
  }

  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
}

export async function createIdea(input: IdeaInput): Promise<{ id: string }> {
  const [created] = await getDb()
    .insert(ideas)
    .values({
      name: input.name,
      description: input.description,
      type: input.type,
      isFeatured: input.isFeatured,
      isPublic: input.isPublic,
    })
    .returning({ id: ideas.id });

  if (!created) {
    throw new Error("The idea could not be saved.");
  }

  await writeIdeaAssociations(created.id, input);
  return created;
}

export async function updateIdea(id: string, input: IdeaInput): Promise<void> {
  const [updated] = await getDb()
    .update(ideas)
    .set({
      name: input.name,
      description: input.description,
      type: input.type,
      isFeatured: input.isFeatured,
      isPublic: input.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(ideas.id, id))
    .returning({ id: ideas.id });

  if (!updated) {
    throw new Error(`Unknown idea: ${id}`);
  }

  await writeIdeaAssociations(id, input);
}

export type IdeaDetailsPatch = {
  name: string;
  description: string;
  /** The full team after the edit. At least one founder is required. */
  members: IdeaMemberInput[];
};

const FOUNDER_REQUIRED = "Keep at least one founder.";
const FOUNDER_ONLY = "Only a founder can edit this idea.";

/**
 * Updates the name, description, and membership of an idea.
 * Type, visibility, tags, and geographies stay as they are.
 * `editorClerkUserId` must already be a founder. The saved team can omit
 * that person when another founder remains.
 */
export async function updateIdeaDetails(
  id: string,
  editorClerkUserId: string,
  input: IdeaDetailsPatch,
): Promise<void> {
  const members = dedupeMembers(input.members);
  if (!members.some((member) => member.role === "FOUNDER")) {
    throw new Error(FOUNDER_REQUIRED);
  }

  const db = getDb();
  const [idea, editor] = await Promise.all([
    db.query.ideas.findFirst({
      where: eq(ideas.id, id),
      columns: { id: true },
    }),
    db.query.ideaMembers.findFirst({
      where: and(
        eq(ideaMembers.ideaId, id),
        eq(ideaMembers.clerkUserId, editorClerkUserId),
        eq(ideaMembers.role, "FOUNDER"),
      ),
      columns: { ideaId: true },
    }),
  ]);

  if (!idea) {
    throw new Error(`Unknown idea: ${id}`);
  }
  if (!editor) {
    throw new Error(FOUNDER_ONLY);
  }

  const statements: BatchItem<"pg">[] = [
    db
      .update(ideas)
      .set({
        name: input.name,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(ideas.id, id)),
    db.delete(ideaMembers).where(
      and(
        eq(ideaMembers.ideaId, id),
        notInArray(
          ideaMembers.clerkUserId,
          members.map((member) => member.clerkUserId),
        ),
      ),
    ),
    db
      .insert(ideaMembers)
      .values(members.map((member) => ({ ideaId: id, ...member })))
      .onConflictDoUpdate({
        target: [ideaMembers.ideaId, ideaMembers.clerkUserId],
        set: { role: sql`excluded.role` },
      }),
  ];

  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
}

export async function deleteIdea(id: string): Promise<boolean> {
  const removed = await getDb()
    .delete(ideas)
    .where(eq(ideas.id, id))
    .returning({ id: ideas.id });
  return removed.length > 0;
}

/** Adds or changes one member without touching the rest of the idea. */
export async function setIdeaMember(
  ideaId: string,
  member: IdeaMemberInput,
): Promise<void> {
  await getDb()
    .insert(ideaMembers)
    .values({ ideaId, ...member })
    .onConflictDoUpdate({
      target: [ideaMembers.ideaId, ideaMembers.clerkUserId],
      set: { role: sql`excluded.role` },
    });
}

export async function removeIdeaMember(
  ideaId: string,
  clerkUserId: string,
): Promise<void> {
  await getDb()
    .delete(ideaMembers)
    .where(
      and(
        eq(ideaMembers.ideaId, ideaId),
        eq(ideaMembers.clerkUserId, clerkUserId),
      ),
    );
}
