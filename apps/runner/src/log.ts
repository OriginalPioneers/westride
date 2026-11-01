/** Plain timestamped lines; `docker logs westride-runner` is the only UI. */
export function log(message: string, ...rest: unknown[]): void {
  console.log(`[${new Date().toISOString()}] ${message}`, ...rest);
}

export function warn(message: string, ...rest: unknown[]): void {
  console.warn(`[${new Date().toISOString()}] ${message}`, ...rest);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
