import { RUNNER_USER_AGENT, type JobEvent, type JobEventType } from "@westride/runner-protocol";
import { RUNNER_VERSION } from "./config";
import { warn } from "./log";

const MAX_PAYLOAD = 16_000;
const BATCH_SIZE = 25;
const FLUSH_AFTER_MS = 1500;

function clip(value: unknown): unknown {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined || text.length <= MAX_PAYLOAD) return value;
  if (typeof value === "string") return `${value.slice(0, MAX_PAYLOAD)}\n…[clipped]`;
  return { clipped: true, text: `${text.slice(0, MAX_PAYLOAD)}…[clipped]` };
}

/**
 * Streams a job's work log to WeStride in batches, the same shape the
 * sandbox runner sends, with the job's own run token. If WeStride says the
 * job is gone (401/404/410) the stream goes quiet and `isClosed` turns on,
 * so the job can be abandoned.
 */
export class EventStream {
  private sequence = 0;
  private queue: JobEvent[] = [];
  private flushing: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  isClosed = false;

  constructor(
    private readonly eventsUrl: string,
    private readonly jobId: string,
    private readonly runToken: string,
  ) {}

  emit(type: JobEventType, payload: unknown): void {
    if (this.isClosed) return;
    this.queue.push({ sequence: this.sequence++, type, payload: clip(payload), at: new Date().toISOString() });
    if (this.queue.length >= BATCH_SIZE) {
      void this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), FLUSH_AFTER_MS);
    }
  }

  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const batch = this.queue;
    this.queue = [];
    if (batch.length === 0) return this.flushing;
    this.flushing = this.flushing.then(() => this.post(batch));
    return this.flushing;
  }

  private async post(events: JobEvent[]): Promise<void> {
    const body = JSON.stringify({ runId: this.jobId, events });
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(this.eventsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.runToken}`,
            "User-Agent": `${RUNNER_USER_AGENT}/${RUNNER_VERSION}`,
          },
          body,
          signal: AbortSignal.timeout(20_000),
        });
        if (response.ok) return;
        if (response.status === 401 || response.status === 404 || response.status === 410) {
          warn(`WeStride refused events for job ${this.jobId} (${response.status}); the job is closed.`);
          this.isClosed = true;
          return;
        }
      } catch (error) {
        warn(`Event post failed: ${String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
