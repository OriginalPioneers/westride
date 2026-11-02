// ---------------------------------------------------------------------------
// Members are stored as Clerk user ids. Responses carry a name and avatar
// beside each id so a caller, human or assistant, can read a team without a
// second lookup. Profiles change rarely, so each one is held for a while.
// ---------------------------------------------------------------------------
import type { Person } from "@westride/api-client";
import { clerk, isClerkConfigured } from "./auth";

const CACHE_TTL_MS = 5 * 60 * 1000;
const LOOKUP_BATCH = 100;

const cache = new Map<string, { person: Person; expiresAt: number }>();

type ClerkUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  hasImage: boolean;
  imageUrl: string;
};

function toPerson(user: ClerkUser): Person {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return {
    id: user.id,
    name: name || user.username || "WeStride member",
    username: user.username,
    imageUrl: user.hasImage ? user.imageUrl : null,
  };
}

function placeholder(id: string): Person {
  return { id, name: "WeStride member", username: null, imageUrl: null };
}

/** The people Clerk knows among `ids`, from the cache or a batched lookup. */
async function lookup(ids: Iterable<string>): Promise<Map<string, Person>> {
  const now = Date.now();
  const wanted = [...new Set(ids)].filter(Boolean);
  const found = new Map<string, Person>();
  const missing: string[] = [];

  for (const id of wanted) {
    const hit = cache.get(id);
    if (hit && hit.expiresAt > now) {
      found.set(id, hit.person);
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0 && isClerkConfigured()) {
    for (let i = 0; i < missing.length; i += LOOKUP_BATCH) {
      const batch = missing.slice(i, i + LOOKUP_BATCH);
      try {
        const { data } = await clerk().users.getUserList({ userId: batch, limit: batch.length });
        for (const user of data) {
          const person = toPerson(user);
          cache.set(user.id, { person, expiresAt: now + CACHE_TTL_MS });
          found.set(user.id, person);
        }
      } catch (error) {
        console.error("Member lookup failed", error);
      }
    }
  }
  return found;
}

/** Resolves people by Clerk user id. Unknown ids get a placeholder, never an error. */
export async function resolvePeople(ids: Iterable<string>): Promise<Map<string, Person>> {
  const wanted = [...new Set(ids)].filter(Boolean);
  const found = await lookup(wanted);
  for (const id of wanted) {
    if (!found.has(id)) {
      found.set(id, placeholder(id));
    }
  }
  return found;
}

export async function resolvePerson(id: string): Promise<Person> {
  const people = await resolvePeople([id]);
  return people.get(id) ?? placeholder(id);
}

/** Looks up one person, or null when the id matches no account. */
export function personOrNull(people: Map<string, Person>, id: string | null): Person | null {
  return id ? (people.get(id) ?? placeholder(id)) : null;
}

/** The ids among `ids` that name no WeStride account. Used before adding people to a team. */
export async function unknownPeople(ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) {
    return [];
  }
  const found = await lookup(unique);
  return unique.filter((id) => !found.has(id));
}
