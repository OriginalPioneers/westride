import "server-only";
import {
  WESTRIDE_API_PRODUCTION_URL,
  createWestrideApi,
  type AcademyTrack,
} from "@westride/api-client";

/** The same public API the WeStride MCP server reads. */
const api = createWestrideApi({
  baseUrl: process.env.WESTRIDE_API_URL?.trim() || WESTRIDE_API_PRODUCTION_URL,
});

/** Slack and Discord drop a reply that takes longer than 3 seconds. */
const TIMEOUT_MS = 2_000;

export function listAcademyTracks(): Promise<AcademyTrack[]> {
  return api.listAcademyTracks({ signal: AbortSignal.timeout(TIMEOUT_MS) });
}
