/**
 * The short name in an idea's address: westride.org/ideas/<slug>. One is
 * made from the name when the idea is created, and a founder can change it
 * to any free one. Old slugs are not kept: the previous address stops
 * working. The UUID keeps working alongside the slug.
 */

export const MIN_IDEA_SLUG = 3;
export const MAX_IDEA_SLUG = 80;

/** Lowercase letters and digits, single hyphens between, no hyphen at either end. */
const IDEA_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Turns a name (or a typed slug) into slug characters. Accents are dropped
 * ("Café" → "cafe"), so are apostrophes ("Mother's" → "mothers"); anything
 * else that is not a letter or digit becomes a hyphen. Returns "" when
 * nothing usable remains.
 */
export function slugifyIdeaName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_IDEA_SLUG)
    .replace(/-+$/g, "");
}

/**
 * Whether a slug someone typed is allowed. A UUID-shaped slug is refused
 * because /ideas/<uuid> is read as an id.
 */
export function isValidIdeaSlug(slug: string): boolean {
  return (
    slug.length >= MIN_IDEA_SLUG &&
    slug.length <= MAX_IDEA_SLUG &&
    IDEA_SLUG.test(slug) &&
    !isUuid(slug)
  );
}

export const IDEA_SLUG_RULES = `${MIN_IDEA_SLUG}–${MAX_IDEA_SLUG} lowercase letters, numbers, and hyphens.`;
