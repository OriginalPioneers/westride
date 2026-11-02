// ---------------------------------------------------------------------------
// Field limits for member-written content. The website's forms and the public
// API validate against the same numbers, so a request that passes one passes
// the other. Needs no database; client components may import this file.
// ---------------------------------------------------------------------------

// Ideas
export const MAX_IDEA_NAME = 120;
export const MAX_IDEA_DESCRIPTION = 8000;
export const MAX_IDEA_INVITES = 20;
/** One founder, plus the people they can invite while creating an idea. */
export const MAX_IDEA_MEMBERS = MAX_IDEA_INVITES + 1;
export const MAX_IDEA_CATEGORIES = 6;
export const MAX_CATEGORY_NAME = 40;
export const MAX_PROTOTYPE_URL = 2048;
export const MAX_PROTOTYPE_INSTRUCTIONS = 600;

// Projects
export const MAX_PROJECT_NAME = 120;
export const MAX_PROJECT_DESCRIPTION = 8000;
export const MAX_PROJECT_MEMBERS = 30;
export const MAX_MILESTONE_TITLE = 120;
export const MAX_MILESTONE_DESCRIPTION = 2000;

// Tickets (projects and agents share these)
export const MAX_TICKET_TITLE = 160;
export const MAX_TICKET_DESCRIPTION = 8000;
export const MAX_BLOCKED_REASON = 600;
export const MAX_COMMENT = 4000;

// Agents
export const MAX_AGENT_NAME = 80;
export const MAX_AGENT_DESCRIPTION = 2000;
export const MAX_AGENT_INSTRUCTIONS = 8000;
export const MAX_STANDING_TASK = 4000;
export const MAX_LOCAL_MODEL = 120;
export const MIN_AGENT_STEPS = 10;
export const MAX_AGENT_STEPS = 400;
export const DEFAULT_AGENT_STEPS = 120;
/** Free-text guidance added to a plan, a run, or a job. */
export const MAX_PLAN_NOTES = 1500;
export const MAX_JOB_INSTRUCTIONS = MAX_PLAN_NOTES;

/** Clerk user ids are short opaque strings. */
export const MAX_CLERK_USER_ID = 128;
