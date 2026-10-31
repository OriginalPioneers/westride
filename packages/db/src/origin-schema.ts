import { pgEnum } from "drizzle-orm/pg-core";

/**
 * How a record came to exist. MEMBER rows were created by the person who
 * owns them. IMPORT rows were created from a GitHub repository with no team,
 * and stay claimable until someone becomes their founder or owner.
 *
 * Lives apart from `schema.ts` because both it and `build-schema.ts` use the
 * enum at table-definition time, and the two files import each other.
 */
export const contentOrigin = pgEnum("content_origin", ["MEMBER", "IMPORT"]);

export type ContentOrigin = (typeof contentOrigin.enumValues)[number];
