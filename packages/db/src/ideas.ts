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
  ideaFollows,
  ideaGeographies,
  ideaMembers,
  ideas,
  ideaTags,
  tags,
  type ContentOrigin,
  type Country,
  type Idea,
  type IdeaCapitalLink,
  type IdeaGithubRepo,
  type IdeaMember,
  type IdeaMemberRole,
  type IdeaType,
  type Tag,
} from "./schema";
import { prototypeUrl } from "./builder-progress";
import { isUuid, isValidIdeaSlug, slugifyIdeaName } from "./idea-slug";
import { tagCatalog, tagSlug } from "./tag-catalog";

export type IdeaWithDetails = Idea & {
  members: IdeaMember[];
  countries: Country[];
  /** Categories, in the order the team listed them. */
  tags: Tag[];
  githubRepo: IdeaGithubRepo | null;
  capitalLinks: IdeaCapitalLink[];
  followerCount: number;
  /** Whether the viewer the list was fetched for follows this idea. */
  isFollowing: boolean;
};

/**
 * A collection on the Idea Workshop page. `mine` is the ideas the viewer is
 * on the team of, `following` the ones they follow, `featured` the ones the
 * WeStride team picked as the best of WeStride.
 */
export const IDEA_VIEWS = ["mine", "following", "featured"] as const;

export type IdeaView = (typeof IDEA_VIEWS)[number];

export function isIdeaView(value: string): value is IdeaView {
  return (IDEA_VIEWS as readonly string[]).includes(value);
}

/** A category someone can pick for an idea. */
export type CategoryOption = { slug: string; name: string };

/** A kind of support an idea can ask for. */
export type SupportWant = "tokens" | "compute" | "capital";

export const SUPPORT_WANTS: readonly SupportWant[] = ["tokens", "compute", "capital"];

export function isSupportWant(value: string): value is SupportWant {
  return (SUPPORT_WANTS as readonly string[]).includes(value);
}

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
  /** Defaults to MEMBER. IMPORT ideas have no team and can be claimed. */
  origin?: ContentOrigin;
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
  /** Category slug. */
  tagSlug?: string;
  featuredOnly?: boolean;
  /**
   * Narrows to one collection. `mine` and `following` need a signed-in
   * viewer and return nothing for a visitor.
   */
  view?: IdeaView;
  /** Only ideas asking supporters for this. */
  wants?: SupportWant;
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
  return (
    or(isPublic, inArray(ideas.id, memberIdeaIds(viewer.clerkUserId))) ??
    isPublic
  );
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
  viewer: IdeaViewer,
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
        orderBy: (member, { asc: by }) => [
          by(member.role),
          by(member.createdAt),
        ],
      },
      follows: {
        columns: { clerkUserId: true },
      },
      geographies: {
        with: { country: true },
      },
      tags: {
        orderBy: (entry, { asc: by }) => [by(entry.sortOrder)],
        with: { tag: true },
      },
      githubRepo: true,
      capitalLinks: {
        orderBy: (link, { asc: by }) => [by(link.sortOrder), by(link.createdAt)],
      },
    },
  });

  return rows.map(({ geographies, tags: tagRows, follows, ...idea }) => ({
    ...idea,
    countries: geographies
      .map((entry) => entry.country)
      .sort((a, b) => a.name.localeCompare(b.name, "en")),
    tags: tagRows.map((entry) => entry.tag),
    followerCount: follows.length,
    isFollowing:
      viewer.clerkUserId !== null &&
      follows.some((follow) => follow.clerkUserId === viewer.clerkUserId),
  }));
}

function memberIdeaIds(clerkUserId: string) {
  return getDb()
    .select({ id: ideaMembers.ideaId })
    .from(ideaMembers)
    .where(eq(ideaMembers.clerkUserId, clerkUserId));
}

function followedIdeaIds(clerkUserId: string) {
  return getDb()
    .select({ id: ideaFollows.ideaId })
    .from(ideaFollows)
    .where(eq(ideaFollows.clerkUserId, clerkUserId));
}

export async function listIdeas(
  filters: IdeaFilters = {},
  viewer: IdeaViewer = ANYONE,
): Promise<IdeaWithDetails[]> {
  const db = getDb();
  const conditions: SQL[] = [visibilityCondition(viewer)];

  if (filters.view === "mine" || filters.view === "following") {
    if (!viewer.clerkUserId) {
      return [];
    }
    conditions.push(
      inArray(
        ideas.id,
        filters.view === "mine"
          ? memberIdeaIds(viewer.clerkUserId)
          : followedIdeaIds(viewer.clerkUserId),
      ),
    );
  } else if (filters.view === "featured") {
    conditions.push(eq(ideas.isFeatured, true));
  }

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

  if (filters.wants === "tokens") {
    conditions.push(eq(ideas.wantsTokens, true));
  } else if (filters.wants === "compute") {
    conditions.push(eq(ideas.wantsCompute, true));
  } else if (filters.wants === "capital") {
    conditions.push(eq(ideas.wantsCapital, true));
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

  return findIdeas(
    and(...conditions),
    orderFor(filters.sort ?? "newest"),
    viewer,
  );
}

/** Ideas this member belongs to, including private ones. Recently updated first. */
export async function listIdeasForMember(
  clerkUserId: string,
): Promise<IdeaWithDetails[]> {
  if (!clerkUserId) {
    return [];
  }

  return findIdeas(
    inArray(ideas.id, memberIdeaIds(clerkUserId)),
    orderFor("updated"),
    { clerkUserId },
  );
}

/** Matches an idea by id when `ref` is a UUID, otherwise by slug. */
function ideaRefCondition(ref: string): SQL {
  return isUuid(ref) ? eq(ideas.id, ref) : eq(ideas.slug, ref);
}

/** `ref` is the idea's id or its slug; both forms of the address resolve. */
export async function getIdea(
  ref: string,
  viewer: IdeaViewer = ANYONE,
): Promise<IdeaWithDetails | null> {
  const [idea] = await findIdeas(
    and(ideaRefCondition(ref), visibilityCondition(viewer)),
    orderFor("newest"),
    viewer,
    1,
  );
  return idea ?? null;
}

/** Public ideas, lightest shape, for the sitemap. */
export async function listPublicIdeaAddresses(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return getDb()
    .select({ slug: ideas.slug, updatedAt: ideas.updatedAt })
    .from(ideas)
    .where(eq(ideas.isPublic, true))
    .orderBy(desc(ideas.updatedAt));
}

/**
 * Whether no other idea uses this slug. `excludeIdeaId` is the idea being
 * edited, whose current slug counts as free for itself.
 */
export async function isIdeaSlugAvailable(
  slug: string,
  excludeIdeaId?: string,
): Promise<boolean> {
  if (!isValidIdeaSlug(slug)) {
    return false;
  }
  const [taken] = await getDb()
    .select({ id: ideas.id })
    .from(ideas)
    .where(eq(ideas.slug, slug))
    .limit(1);
  return !taken || taken.id === excludeIdeaId;
}

/**
 * A free slug made from the name: the plain form when nobody has it, else
 * the first free of -2, -3, … A name that slugs to nothing becomes "idea".
 */
async function freeSlugFor(name: string): Promise<string> {
  const base = slugifyIdeaName(name) || "idea";
  const padded = base.length < 3 ? `${base}-idea` : base;
  const rows = await getDb()
    .select({ slug: ideas.slug })
    .from(ideas)
    .where(or(eq(ideas.slug, padded), ilike(ideas.slug, `${padded}-%`)));
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(padded)) {
    return padded;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${padded}-${n}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}

/**
 * Starts following an idea the viewer can see. Following your own idea is a
 * no-op: the team already sees it under "Your Ideas". Returns false when the
 * idea is not visible to the viewer.
 */
export async function followIdea(
  ideaId: string,
  clerkUserId: string,
): Promise<boolean> {
  const idea = await getIdea(ideaId, { clerkUserId });
  if (!idea) {
    return false;
  }
  if (idea.members.some((member) => member.clerkUserId === clerkUserId)) {
    return true;
  }
  await getDb()
    .insert(ideaFollows)
    .values({ ideaId, clerkUserId })
    .onConflictDoNothing({
      target: [ideaFollows.ideaId, ideaFollows.clerkUserId],
    });
  return true;
}

export async function unfollowIdea(
  ideaId: string,
  clerkUserId: string,
): Promise<void> {
  await getDb()
    .delete(ideaFollows)
    .where(
      and(
        eq(ideaFollows.ideaId, ideaId),
        eq(ideaFollows.clerkUserId, clerkUserId),
      ),
    );
}

/** Names of the given ideas the viewer may see, for labelling links to them. */
export async function listIdeaNames(
  ids: string[],
  viewer: IdeaViewer = ANYONE,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return new Map();
  }
  const rows = await getDb()
    .select({ id: ideas.id, name: ideas.name })
    .from(ideas)
    .where(and(inArray(ideas.id, unique), visibilityCondition(viewer)));
  return new Map(rows.map((row) => [row.id, row.name]));
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

/**
 * Every category someone can pick: the starter catalog plus anything a
 * member has added, deduped by slug. The catalog spelling wins. Pickers also
 * let people type a category that is not listed.
 */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const bySlug = new Map<string, string>();
  for (const name of tagCatalog) {
    bySlug.set(tagSlug(name), name);
  }
  for (const tag of await listTags()) {
    if (!bySlug.has(tag.slug)) {
      bySlug.set(tag.slug, tag.name);
    }
  }
  return [...bySlug.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
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

export async function createIdea(
  input: IdeaInput,
): Promise<{ id: string; slug: string }> {
  const [created] = await getDb()
    .insert(ideas)
    .values({
      slug: await freeSlugFor(input.name),
      name: input.name,
      description: input.description,
      type: input.type,
      isFeatured: input.isFeatured,
      isPublic: input.isPublic,
      origin: input.origin ?? "MEMBER",
    })
    .returning({ id: ideas.id, slug: ideas.slug });

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
  prototypeUrl: string;
  prototypeInstructions: string;
  prototypeTested: boolean;
  name: string;
  /** The address name. Must be valid and not in use by another idea. */
  slug: string;
  description: string;
  /** The full team after the edit. At least one founder is required. */
  members: IdeaMemberInput[];
  /** Category names after the edit. Unknown names become new categories. */
  categoryNames: string[];
};

const FOUNDER_REQUIRED = "Keep at least one founder.";
const FOUNDER_ONLY = "Only a founder can edit this idea.";
export const SLUG_INVALID = "That link name is not allowed.";
export const SLUG_TAKEN = "That link name is already in use.";

/**
 * Updates the name, slug, description, categories, and membership of an idea.
 * Type, visibility, and geographies stay as they are.
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
  if (!isValidIdeaSlug(input.slug)) {
    throw new Error(SLUG_INVALID);
  }
  if (input.slug !== idea.slug && !(await isIdeaSlugAvailable(input.slug, id))) {
    throw new Error(SLUG_TAKEN);
  }

  const tagIds = await resolveTagIds(input.categoryNames);
  const url = input.prototypeUrl.trim()
    ? prototypeUrl(input.prototypeUrl)
    : null;
  if (
    input.prototypeUrl.trim() &&
    (!url ||
      input.prototypeUrl.length > 2048 ||
      !input.prototypeInstructions.trim() ||
      input.prototypeInstructions.length > 600)
  )
    throw new Error("Add a valid HTTPS prototype link and something to try.");
  const changedPrototype = Boolean(
    url &&
    (url !== idea.prototypeUrl ||
      input.prototypeInstructions.trim() !== idea.prototypeInstructions),
  );
  if (changedPrototype && !input.prototypeTested)
    throw new Error("Test your prototype and confirm it works before sharing.");
  const statements: BatchItem<"pg">[] = [
    db
      .update(ideas)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description,
        prototypeUrl: url,
        prototypeInstructions: url ? input.prototypeInstructions.trim() : null,
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
    db.delete(ideaTags).where(eq(ideaTags.ideaId, id)),
  ];

  if (tagIds.length > 0) {
    statements.push(
      db.insert(ideaTags).values(
        tagIds.map((tagId, index) => ({ ideaId: id, tagId, sortOrder: index })),
      ),
    );
  }

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
