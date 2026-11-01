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

/** Talks to WeStride with the device token. Every call carries the runner's user agent. */
export class WeStrideApi {
  constructor(
    private readonly baseUrl: string,
    private token: string | null,
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
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
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
