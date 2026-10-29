import "server-only";

const API = "https://api.github.com";

export class GithubApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly isRateLimited = false,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

export function isGithubStatus(error: unknown, ...statuses: number[]) {
  return error instanceof GithubApiError && statuses.includes(error.status);
}

type RequestOptions = {
  /** Installation, user, or app JWT. Omit for an anonymous request. */
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accept?: string;
  headers?: Record<string, string>;
};

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: options.accept ?? "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "WeStride",
    ...options.headers,
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path.startsWith("https://") ? path : `${API}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = response.statusText || `GitHub returned ${response.status}`;
    try {
      const data = (await response.json()) as { message?: unknown };
      if (typeof data.message === "string" && data.message) {
        message = data.message;
      }
    } catch {
      // Not JSON. Keep the status text.
    }
    const isRateLimited =
      (response.status === 403 || response.status === 429) &&
      (response.headers.get("x-ratelimit-remaining") === "0" ||
        /rate limit/i.test(message));
    throw new GithubApiError(response.status, message, isRateLimited);
  }
  return response;
}

export async function githubJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** File contents as text, e.g. a README with the raw media type. */
export async function githubText(
  path: string,
  options: RequestOptions = {},
): Promise<string> {
  const response = await send(path, {
    ...options,
    accept: options.accept ?? "application/vnd.github.raw+json",
  });
  return response.text();
}
