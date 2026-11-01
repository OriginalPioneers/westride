import { eq } from "drizzle-orm";
import { agents } from "./agent-schema";
import { projects } from "./build-schema";
import { getDb } from "./client";
import { ideas } from "./schema";

/** The things that carry a primary image. */
export const ENTITY_IMAGE_KINDS = ["idea", "project", "agent"] as const;
export type EntityImageKind = (typeof ENTITY_IMAGE_KINDS)[number];

const TABLES = { idea: ideas, project: projects, agent: agents } as const;

/**
 * Points the entity at a new image, or clears it with null. Returns the URL it
 * replaced so the caller can delete the old file. The caller checks who may edit.
 */
export async function setEntityImage(
  kind: EntityImageKind,
  id: string,
  imageUrl: string | null,
): Promise<{ previousUrl: string | null } | null> {
  const table = TABLES[kind];
  const db = getDb();
  const [current] = await db
    .select({ imageUrl: table.imageUrl })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (!current) {
    return null;
  }
  await db
    .update(table)
    .set({ imageUrl, updatedAt: new Date() })
    .where(eq(table.id, id));
  return { previousUrl: current.imageUrl };
}
