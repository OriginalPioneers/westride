import {
  RUNNER_HEARTBEAT_PATH,
  RUNNER_LEASE_PATH,
  RUNNER_PAIR_PATH,
  RUNNER_RESULT_PATH,
  RUNNER_USER_AGENT,
  type HeartbeatRequest,
  type HeartbeatResponse,
  type LeaseResponse,
  type PairRequest,
  type PairResponse,
  type ResultRequest,
  type ResultResponse,
} from "@westride/runner-protocol";
import { RUNNER_VERSION } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
  /** The server no longer recognises this device; pairing again is the only fix. */
  get isUnauthorized() {
    return this.status === 401;
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);
const MAX_REDIRECTS = 3;

/** Talks to WeStride with the device token. Every call carries the runner's user agent. */
export class WeStrideApi {
  constructor(
    private baseUrl: string,
    private token: string | null,
    private readonly onBaseUrlChange: (baseUrl: string) => void = () => {},
  ) {}

  setToken(token: string) {
    this.token = token;
  }

  private async post<T>(path: string, body: unknown, options: { auth: boolean; timeoutMs: number }): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": `${RUNNER_USER_AGENT}/${RUNNER_VERSION}`,
    };
    if (options.auth) {
      if (!this.token) throw new ApiError(401, "This runner is not paired.");
      headers.Authorization = `Bearer ${this.token}`;
    }
    const payload = JSON.stringify(body);
    // Redirects are followed by hand: fetch drops the Authorization header when a
    // redirect crosses origins (for example westride.org -> www.westride.org), which
    // would turn every authenticated call into a 401 after a successful pairing.
    let url = `${this.baseUrl}${path}`;
    let response: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      if (!REDIRECT_STATUSES.has(response.status)) break;
      const location = response.headers.get("location");
      if (!location) break;
      const target = new URL(location, url);
      url = target.href;
      if (target.origin !== this.baseUrl) {
        // Remember the origin WeStride actually lives at so later calls go straight there.
        this.baseUrl = target.origin;
        this.onBaseUrlChange(this.baseUrl);
      }
    }
    if (!response) throw new ApiError(0, "No response from WeStride.");
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const data = (await response.json()) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        // Not JSON; keep the status line.
      }
      throw new ApiError(response.status, message);
    }
    return (await response.json()) as T;
  }

  pair(request: PairRequest) {
    return this.post<PairResponse>(RUNNER_PAIR_PATH, request, { auth: false, timeoutMs: 20_000 });
  }

  heartbeat(request: HeartbeatRequest) {
    return this.post<HeartbeatResponse>(RUNNER_HEARTBEAT_PATH, request, { auth: true, timeoutMs: 20_000 });
  }

  lease() {
    return this.post<LeaseResponse>(RUNNER_LEASE_PATH, {}, { auth: true, timeoutMs: 45_000 });
  }

  result(request: ResultRequest) {
    return this.post<ResultResponse>(RUNNER_RESULT_PATH, request, { auth: true, timeoutMs: 120_000 });
  }
}
