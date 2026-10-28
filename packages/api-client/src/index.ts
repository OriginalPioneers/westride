export const WESTRIDE_API_PRODUCTION_URL = "https://api.westride.org";

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
  achievementTitle: string;
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

export type ListAcademyTracksResponse = {
  data: AcademyTrack[];
};

export type GetAcademyTrackResponse = {
  data: AcademyTrackDetail;
};

export type ApiErrorCode = "not_found" | "internal_error";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export class WestrideApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "network_error" | "unexpected_response";

  constructor(
    message: string,
    status: number,
    code: WestrideApiError["code"],
  ) {
    super(message);
    this.name = "WestrideApiError";
    this.status = status;
    this.code = code;
  }
}

export type WestrideApiOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export type RequestOptions = {
  signal?: AbortSignal;
};

export function createWestrideApi({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
}: WestrideApiOptions) {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, options?: RequestOptions): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        headers: { accept: "application/json" },
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

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = (body as ApiErrorResponse | null)?.error;
      throw new WestrideApiError(
        error?.message ?? `Request failed with status ${response.status}.`,
        response.status,
        error?.code ?? "unexpected_response",
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

  return {
    async listAcademyTracks(options?: RequestOptions): Promise<AcademyTrack[]> {
      const body = await request<ListAcademyTracksResponse>(
        "/v1/academy/tracks",
        options,
      );
      return body.data;
    },

    async getAcademyTrack(
      slug: string,
      options?: RequestOptions,
    ): Promise<AcademyTrackDetail> {
      const body = await request<GetAcademyTrackResponse>(
        `/v1/academy/tracks/${encodeURIComponent(slug)}`,
        options,
      );
      return body.data;
    },
  };
}

export type WestrideApi = ReturnType<typeof createWestrideApi>;
