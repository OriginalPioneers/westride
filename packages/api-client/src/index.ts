export const WESTRIDE_API_PRODUCTION_URL = "https://api.westride.org";

// ---------------------------------------------------------------------------
// Academy
// ---------------------------------------------------------------------------

export type TrackDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type AcademyTrack = {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: TrackDifficulty;
  category: string;
  estimatedDurationMinutes: number;
  /** Planned lesson count; may exceed `lessons.length` until lessons are seeded. */
  lessonCount: number;
  sortOrder: number;
  /** Lucide icon name, e.g. "Brain". */
  icon: string;
  tags: string[];
  prerequisiteSlugs: string[];
  learningObjectives: string[];
};

export type AcademyLesson = {
  id: string;
  name: string;
};

export type AcademyTrackReference = {
  slug: string;
  name: string;
};

export type AcademyTrackDetail = AcademyTrack & {
  lessons: AcademyLesson[];
  /** Resolved `prerequisiteSlugs`, in the same order. */
  prerequisites: AcademyTrackReference[];
};

// ---------------------------------------------------------------------------
// People and the signed-in member
// ---------------------------------------------------------------------------

/** A WeStride member as other members see them. */
export type Person = {
  /** Clerk user id. Use it wherever a request asks for a member. */
  id: string;
  name: string;
  username: string | null;
  imageUrl: string | null;
};

export type TokenType = "oauth_token" | "api_key" | "session_token";

export type Me = Person & {
  /** How the request was authenticated. */
  tokenType: TokenType;
};

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export type IdeaType =
  | "BUSINESS"
  | "NON_PROFIT"
  | "GAME"
  | "OPEN_SOURCE"
  | "WEBSITE"
  | "MOBILE_APP";
export type IdeaMemberRole = "FOUNDER" | "MEMBER";
export type ContentOrigin = "MEMBER" | "IMPORT";
export type IdeaView = "mine" | "following" | "featured";
export type IdeaSort = "newest" | "oldest" | "updated" | "name-asc" | "name-desc";
export type SupportWant = "tokens" | "compute" | "capital";

export type IdeaMember = Person & { role: IdeaMemberRole };

export type Category = { slug: string; name: string };
export type Country = { code: string; name: string };

export type GithubRepoLink = {
  owner: string;
  name: string;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
};

export type CapitalLink = { url: string; label: string };

export type Idea = {
  id: string;
  name: string;
  /** Markdown. */
  description: string;
  type: IdeaType;
  imageUrl: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  origin: ContentOrigin;
  prototypeUrl: string | null;
  prototypeInstructions: string | null;
  wants: { tokens: boolean; compute: boolean; capital: boolean };
  categories: Category[];
  countries: Country[];
  members: IdeaMember[];
  githubRepo: GithubRepoLink | null;
  capitalLinks: CapitalLink[];
  followerCount: number;
  /** Whether the authenticated member follows this idea. False for visitors. */
  isFollowing: boolean;
  /** The authenticated member's role on the team, or null. */
  viewerRole: IdeaMemberRole | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  isPublic: boolean;
};

export type AgentSummary = {
  id: string;
  name: string;
  status: AgentStatus;
  isPublic: boolean;
};

export type IdeaDetail = Idea & {
  /** Projects building this idea that the caller may see. */
  projects: ProjectSummary[];
  /** Agents linked to this idea that the caller may see. */
  agents: AgentSummary[];
};

export type ListIdeasQuery = {
  q?: string;
  type?: IdeaType;
  /** Category slug. */
  category?: string;
  /** ISO 3166-1 alpha-2 code. */
  country?: string;
  view?: IdeaView;
  wants?: SupportWant;
  sort?: IdeaSort;
};

export type MemberInvite<Role extends string> = { userId: string; role: Role };

export type CreateIdeaBody = {
  type: IdeaType;
  name: string;
  description: string;
  /** Category names. New names become new categories. */
  categories: string[];
  isPublic: boolean;
  /** People to add besides the caller, who becomes a founder. */
  invites?: MemberInvite<IdeaMemberRole>[];
};

export type UpdateIdeaBody = {
  name?: string;
  description?: string;
  categories?: string[];
  prototypeUrl?: string | null;
  prototypeInstructions?: string | null;
  /** Required when the prototype changes. */
  prototypeTested?: boolean;
  /** The whole team after the change. Keep at least one founder. */
  members?: MemberInvite<IdeaMemberRole>[];
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectStatus = "PLANNING" | "BUILDING" | "LAUNCHED" | "PAUSED";
export type ProjectMemberRole = "OWNER" | "MEMBER";
export type CollectionSort = "updated" | "newest" | "oldest" | "name-asc" | "name-desc";
export type TicketStatus = "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MilestoneStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export type TicketCounts = Record<TicketStatus, number>;

export type ProjectMember = Person & { role: ProjectMemberRole };

export type ProjectRepo = GithubRepoLink & {
  id: string;
  isPrimary: boolean;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  /** ISO date (YYYY-MM-DD), or null. */
  targetDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  /** Markdown. */
  description: string;
  status: ProjectStatus;
  imageUrl: string | null;
  isPublic: boolean;
  origin: ContentOrigin;
  /** The idea this project builds, if any. */
  idea: { id: string; name: string } | null;
  members: ProjectMember[];
  repos: ProjectRepo[];
  milestones: Milestone[];
  ticketCounts: TicketCounts;
  /** The authenticated member's role, or null. */
  viewerRole: ProjectMemberRole | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = Project & {
  /** Agents linked to this project that the caller may see. */
  agents: AgentSummary[];
};

export type ListProjectsQuery = {
  q?: string;
  status?: ProjectStatus;
  /** Only projects the caller belongs to. */
  mine?: boolean;
  sort?: CollectionSort;
};

export type CreateProjectBody = {
  name: string;
  description: string;
  isPublic: boolean;
  ideaId?: string | null;
  /** People to add besides the caller, who becomes an owner. */
  invites?: MemberInvite<ProjectMemberRole>[];
};

export type UpdateProjectBody = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  status?: ProjectStatus;
  /** The whole team after the change. Keep at least one owner. */
  members?: MemberInvite<ProjectMemberRole>[];
};

export type TicketSource = "MEMBER" | "MUSE";

export type Ticket = {
  id: string;
  /** Per-project sequence starting at 1. */
  number: number;
  /** Short code, e.g. NTL-12. */
  key: string;
  title: string;
  /** Markdown. */
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  blockedReason: string | null;
  milestone: { id: string; title: string } | null;
  repo: { id: string; owner: string; name: string } | null;
  assignee: Person | null;
  source: TicketSource;
  createdBy: Person | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TicketComment = {
  id: string;
  /** Markdown. */
  body: string;
  author: Person | null;
  /** Set when an agent run wrote the comment. */
  agentRunId: string | null;
  createdAt: string;
};

export type TicketDetail = Ticket & {
  comments: TicketComment[];
};

export type ListTicketsQuery = {
  status?: TicketStatus;
};

export type CreateTicketBody = {
  title: string;
  description?: string;
  priority?: TicketPriority;
  milestoneId?: string | null;
  repoId?: string | null;
  assigneeUserId?: string | null;
};

export type UpdateTicketBody = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  milestoneId?: string | null;
  repoId?: string | null;
  assigneeUserId?: string | null;
  /** Moving to BLOCKED needs `blockedReason`. */
  status?: TicketStatus;
  blockedReason?: string;
};

export type CreateCommentBody = { body: string };

export type CreateMilestoneBody = {
  title: string;
  description?: string;
  status?: MilestoneStatus;
  targetDate?: string | null;
};

export type UpdateMilestoneBody = Partial<CreateMilestoneBody>;

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type AgentSchedule = "NONE" | "HOURLY" | "DAILY" | "WEEKLY";
export type AgentRole = "OWNER" | "COLLABORATOR";
export type MuseModelId = "muse-spark-1.3" | "muse-spark-1.3-contributor" | "muse-wonder-1.0";

export type UsageTotals = {
  jobs: number;
  modelCalls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  /** USD in millionths. An estimate from the published price list. */
  estimatedCostMicros: number;
};

export type AgentScheduleSpec = {
  schedule: AgentSchedule;
  /** 0–23 UTC, for DAILY and WEEKLY. */
  hourUtc: number | null;
  /** 0 (Sunday) – 6 (Saturday), for WEEKLY. */
  weekday: number | null;
  /** Markdown. What a scheduled wake-up does when the queue is empty. */
  standingTask: string;
  /** Plain-English summary, e.g. "Daily at 09:00 UTC". */
  summary: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
};

export type Agent = {
  id: string;
  name: string;
  /** Markdown. */
  description: string;
  /** Markdown. The standing brief every job starts from. */
  instructions: string;
  imageUrl: string | null;
  status: AgentStatus;
  isPublic: boolean;
  owner: Person;
  idea: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  model: string;
  maxSteps: number;
  allowSponsorTokens: boolean;
  allowVolunteerCompute: boolean;
  volunteerLocalModel: string | null;
  repo: GithubRepoLink | null;
  schedule: AgentScheduleSpec;
  ticketCounts: TicketCounts;
  usage: UsageTotals;
  activeJobs: number;
  /** What the authenticated member may do, or null. */
  viewerRole: AgentRole | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAgentsQuery = {
  q?: string;
  status?: AgentStatus;
  /** Only agents the caller owns. */
  mine?: boolean;
  sort?: CollectionSort;
};

export type CreateAgentBody = {
  name: string;
  description: string;
  instructions?: string;
  isPublic: boolean;
  ideaId?: string | null;
  projectId?: string | null;
  model?: MuseModelId;
  maxSteps?: number;
  allowSponsorTokens?: boolean;
  allowVolunteerCompute?: boolean;
  volunteerLocalModel?: string | null;
  schedule?: AgentSchedule;
  scheduleHourUtc?: number | null;
  scheduleWeekday?: number | null;
  standingTask?: string;
  /** A first ticket to queue so the agent has something to do. */
  firstTicket?: string;
};

export type UpdateAgentBody = {
  name?: string;
  description?: string;
  instructions?: string;
  isPublic?: boolean;
  ideaId?: string | null;
  projectId?: string | null;
  model?: MuseModelId;
  maxSteps?: number;
  allowSponsorTokens?: boolean;
  allowVolunteerCompute?: boolean;
  volunteerLocalModel?: string | null;
  schedule?: AgentSchedule;
  scheduleHourUtc?: number | null;
  scheduleWeekday?: number | null;
  standingTask?: string;
  /** ACTIVE resumes, PAUSED stops the schedule, ARCHIVED retires the agent. */
  status?: AgentStatus;
};

export type AgentTicketSource = "MEMBER" | "SCHEDULE";

export type AgentTicket = {
  id: string;
  number: number;
  key: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  blockedReason: string | null;
  source: AgentTicketSource;
  createdBy: Person | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AgentTicketDetail = AgentTicket & {
  /** Jobs that worked this ticket, newest first. */
  jobs: AgentJob[];
};

export type CreateAgentTicketBody = {
  title: string;
  description?: string;
  priority?: TicketPriority;
};

export type UpdateAgentTicketBody = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  blockedReason?: string;
};

export type AgentJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type AgentJobTrigger = "MANUAL" | "SCHEDULE";
export type AgentJobKind = "CODE" | "REPORT";

export type AgentJob = {
  id: string;
  ticketId: string | null;
  ticketTitle: string;
  trigger: AgentJobTrigger;
  kind: AgentJobKind;
  status: AgentJobStatus;
  startedBy: Person | null;
  model: string;
  maxSteps: number;
  repoFullName: string | null;
  branch: string | null;
  prUrl: string | null;
  /** Markdown. The closing message or report. */
  summary: string | null;
  error: string | null;
  usage: UsageTotals;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AgentLogEntry = {
  id: string;
  kind: "agent" | "ticket" | "job" | "schedule" | "settings";
  /** Markdown. */
  message: string;
  ticketId: string | null;
  jobId: string | null;
  actor: Person | null;
  createdAt: string;
};

export type UsageBreakdownRow = UsageTotals & { key: string };

export type AgentUsage = {
  totals: UsageTotals;
  byModel: UsageBreakdownRow[];
  byTrigger: UsageBreakdownRow[];
  /** Last 30 days, oldest first. Days with no jobs are omitted. */
  byDay: UsageBreakdownRow[];
};

// ---------------------------------------------------------------------------
// Envelopes and errors
// ---------------------------------------------------------------------------

export type DataResponse<T> = { data: T };

export type ApiErrorCode =
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "validation_failed"
  | "conflict"
  | "internal_error";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level messages for validation_failed, keyed by dotted path. */
    fields?: Record<string, string>;
  };
};

export class WestrideApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "network_error" | "unexpected_response";
  readonly fields: Record<string, string> | undefined;

  constructor(
    message: string,
    status: number,
    code: WestrideApiError["code"],
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "WestrideApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export type WestrideApiOptions = {
  baseUrl: string;
  /**
   * Bearer token sent with every request: a WeStride API key, an OAuth
   * access token, or a Clerk session token. Omit it to call the public,
   * read-only endpoints.
   */
  token?: string;
  /**
   * Called on each request when `token` is not set. Use this from a mobile
   * or web client that refreshes a Clerk session token.
   */
  getToken?: () => Promise<string | null | undefined>;
  fetch?: typeof fetch;
};

export type RequestOptions = {
  signal?: AbortSignal;
  /** Overrides the client's token for this request. */
  token?: string;
};

type QueryValue = string | number | boolean | undefined | null;

function queryString(params: Record<string, QueryValue> | undefined): string {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function createWestrideApi({
  baseUrl,
  token: defaultToken,
  getToken,
  fetch: fetchImpl = globalThis.fetch,
}: WestrideApiOptions) {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    path: string,
    options?: RequestOptions & { body?: unknown; query?: Record<string, QueryValue> },
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    const token = options?.token ?? defaultToken ?? (await getToken?.()) ?? undefined;
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    if (options?.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}${queryString(options?.query)}`, {
        method,
        headers,
        body: options?.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options?.signal,
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        throw cause;
      }
      throw new WestrideApiError(
        `Could not reach the WeStride API at ${root}.`,
        0,
        "network_error",
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = (body as ApiErrorResponse | null)?.error;
      throw new WestrideApiError(
        error?.message ?? `Request failed with status ${response.status}.`,
        response.status,
        error?.code ?? "unexpected_response",
        error?.fields,
      );
    }

    if (body === null) {
      throw new WestrideApiError(
        "The WeStride API returned an empty or non-JSON response.",
        response.status,
        "unexpected_response",
      );
    }

    return body as T;
  }

  const get = <T>(path: string, query?: Record<string, QueryValue>, options?: RequestOptions) =>
    request<DataResponse<T>>("GET", path, { ...options, query }).then((r) => r.data);
  const send = <T>(method: string, path: string, body?: unknown, options?: RequestOptions) =>
    request<DataResponse<T>>(method, path, { ...options, body }).then((r) => r.data);
  const remove = (path: string, options?: RequestOptions) =>
    request<DataResponse<{ ok: true }>>("DELETE", path, options).then(() => undefined);
  const id = encodeURIComponent;

  return {
    // Academy -------------------------------------------------------------
    listAcademyTracks: (options?: RequestOptions) =>
      get<AcademyTrack[]>("/v1/academy/tracks", undefined, options),
    getAcademyTrack: (slug: string, options?: RequestOptions) =>
      get<AcademyTrackDetail>(`/v1/academy/tracks/${id(slug)}`, undefined, options),

    // Me ------------------------------------------------------------------
    getMe: (options?: RequestOptions) => get<Me>("/v1/me", undefined, options),

    // Ideas ---------------------------------------------------------------
    listIdeas: (query?: ListIdeasQuery, options?: RequestOptions) =>
      get<Idea[]>("/v1/ideas", query, options),
    getIdea: (ideaId: string, options?: RequestOptions) =>
      get<IdeaDetail>(`/v1/ideas/${id(ideaId)}`, undefined, options),
    createIdea: (body: CreateIdeaBody, options?: RequestOptions) =>
      send<IdeaDetail>("POST", "/v1/ideas", body, options),
    updateIdea: (ideaId: string, body: UpdateIdeaBody, options?: RequestOptions) =>
      send<IdeaDetail>("PATCH", `/v1/ideas/${id(ideaId)}`, body, options),
    followIdea: (ideaId: string, options?: RequestOptions) =>
      send<{ isFollowing: boolean; followerCount: number }>(
        "PUT",
        `/v1/ideas/${id(ideaId)}/follow`,
        undefined,
        options,
      ),
    unfollowIdea: (ideaId: string, options?: RequestOptions) =>
      send<{ isFollowing: boolean; followerCount: number }>(
        "DELETE",
        `/v1/ideas/${id(ideaId)}/follow`,
        undefined,
        options,
      ),
    listCategories: (options?: RequestOptions) =>
      get<Category[]>("/v1/ideas/categories", undefined, options),

    // Projects ------------------------------------------------------------
    listProjects: (query?: ListProjectsQuery, options?: RequestOptions) =>
      get<Project[]>("/v1/projects", query, options),
    getProject: (projectId: string, options?: RequestOptions) =>
      get<ProjectDetail>(`/v1/projects/${id(projectId)}`, undefined, options),
    createProject: (body: CreateProjectBody, options?: RequestOptions) =>
      send<ProjectDetail>("POST", "/v1/projects", body, options),
    updateProject: (projectId: string, body: UpdateProjectBody, options?: RequestOptions) =>
      send<ProjectDetail>("PATCH", `/v1/projects/${id(projectId)}`, body, options),
    listTickets: (projectId: string, query?: ListTicketsQuery, options?: RequestOptions) =>
      get<Ticket[]>(`/v1/projects/${id(projectId)}/tickets`, query, options),
    getTicket: (projectId: string, number: number, options?: RequestOptions) =>
      get<TicketDetail>(`/v1/projects/${id(projectId)}/tickets/${number}`, undefined, options),
    createTicket: (projectId: string, body: CreateTicketBody, options?: RequestOptions) =>
      send<Ticket>("POST", `/v1/projects/${id(projectId)}/tickets`, body, options),
    updateTicket: (
      projectId: string,
      number: number,
      body: UpdateTicketBody,
      options?: RequestOptions,
    ) => send<Ticket>("PATCH", `/v1/projects/${id(projectId)}/tickets/${number}`, body, options),
    deleteTicket: (projectId: string, number: number, options?: RequestOptions) =>
      remove(`/v1/projects/${id(projectId)}/tickets/${number}`, options),
    addTicketComment: (
      projectId: string,
      number: number,
      body: CreateCommentBody,
      options?: RequestOptions,
    ) =>
      send<TicketComment>(
        "POST",
        `/v1/projects/${id(projectId)}/tickets/${number}/comments`,
        body,
        options,
      ),
    createMilestone: (projectId: string, body: CreateMilestoneBody, options?: RequestOptions) =>
      send<Milestone>("POST", `/v1/projects/${id(projectId)}/milestones`, body, options),
    updateMilestone: (
      projectId: string,
      milestoneId: string,
      body: UpdateMilestoneBody,
      options?: RequestOptions,
    ) =>
      send<Milestone>(
        "PATCH",
        `/v1/projects/${id(projectId)}/milestones/${id(milestoneId)}`,
        body,
        options,
      ),
    deleteMilestone: (projectId: string, milestoneId: string, options?: RequestOptions) =>
      remove(`/v1/projects/${id(projectId)}/milestones/${id(milestoneId)}`, options),

    // Agents --------------------------------------------------------------
    listAgents: (query?: ListAgentsQuery, options?: RequestOptions) =>
      get<Agent[]>("/v1/agents", query, options),
    getAgent: (agentId: string, options?: RequestOptions) =>
      get<Agent>(`/v1/agents/${id(agentId)}`, undefined, options),
    createAgent: (body: CreateAgentBody, options?: RequestOptions) =>
      send<Agent>("POST", "/v1/agents", body, options),
    updateAgent: (agentId: string, body: UpdateAgentBody, options?: RequestOptions) =>
      send<Agent>("PATCH", `/v1/agents/${id(agentId)}`, body, options),
    deleteAgent: (agentId: string, options?: RequestOptions) =>
      remove(`/v1/agents/${id(agentId)}`, options),
    listAgentTickets: (agentId: string, query?: ListTicketsQuery, options?: RequestOptions) =>
      get<AgentTicket[]>(`/v1/agents/${id(agentId)}/tickets`, query, options),
    getAgentTicket: (agentId: string, number: number, options?: RequestOptions) =>
      get<AgentTicketDetail>(`/v1/agents/${id(agentId)}/tickets/${number}`, undefined, options),
    createAgentTicket: (agentId: string, body: CreateAgentTicketBody, options?: RequestOptions) =>
      send<AgentTicket>("POST", `/v1/agents/${id(agentId)}/tickets`, body, options),
    updateAgentTicket: (
      agentId: string,
      number: number,
      body: UpdateAgentTicketBody,
      options?: RequestOptions,
    ) => send<AgentTicket>("PATCH", `/v1/agents/${id(agentId)}/tickets/${number}`, body, options),
    deleteAgentTicket: (agentId: string, number: number, options?: RequestOptions) =>
      remove(`/v1/agents/${id(agentId)}/tickets/${number}`, options),
    listAgentJobs: (agentId: string, query?: { limit?: number }, options?: RequestOptions) =>
      get<AgentJob[]>(`/v1/agents/${id(agentId)}/jobs`, query, options),
    getAgentJob: (agentId: string, jobId: string, options?: RequestOptions) =>
      get<AgentJob>(`/v1/agents/${id(agentId)}/jobs/${id(jobId)}`, undefined, options),
    listAgentLog: (agentId: string, query?: { limit?: number }, options?: RequestOptions) =>
      get<AgentLogEntry[]>(`/v1/agents/${id(agentId)}/log`, query, options),
    getAgentUsage: (agentId: string, options?: RequestOptions) =>
      get<AgentUsage>(`/v1/agents/${id(agentId)}/usage`, undefined, options),
  };
}

export type WestrideApi = ReturnType<typeof createWestrideApi>;
