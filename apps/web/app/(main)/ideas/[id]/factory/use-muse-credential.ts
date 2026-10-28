"use client";

import { useCallback, useRef, useState } from "react";
import {
  clearMuseCredential,
  needsKeyRefresh,
  readMuseCredential,
  writeMuseCredential,
  type MuseAccess,
  type MuseCredential,
} from "@/lib/idea-factory/credentials";
import { refreshMetaKey } from "./actions";

export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialError";
  }
}

/**
 * The member's Meta credential, kept in this browser only. `getAccess`
 * hands back a key for one request, re-minting a connected account's daily
 * key when it is about to lapse.
 */
export function useMuseCredential(clerkUserId: string) {
  // The dialog only mounts after a click, so localStorage is available on
  // first render and there is no server markup to mismatch.
  const [credential, setCredential] = useState<MuseCredential | null>(() =>
    readMuseCredential(clerkUserId),
  );
  // Mirror of `credential` that async callers can read without a stale closure.
  const latest = useRef<MuseCredential | null>(credential);

  const save = useCallback(
    (next: MuseCredential) => {
      writeMuseCredential(clerkUserId, next);
      latest.current = next;
      setCredential(next);
    },
    [clerkUserId],
  );

  const clear = useCallback(() => {
    clearMuseCredential(clerkUserId);
    latest.current = null;
    setCredential(null);
  }, [clerkUserId]);

  const getAccess = useCallback(async (): Promise<MuseAccess> => {
    const current = latest.current;
    if (!current) {
      throw new CredentialError("Connect your Meta account to use the Idea Factory.");
    }
    if (!needsKeyRefresh(current) || !current.identityToken) {
      return { apiKey: current.apiKey };
    }
    const refreshed = await refreshMetaKey(current.identityToken);
    if (refreshed.status !== "ok") {
      clear();
      throw new CredentialError(refreshed.message);
    }
    save({ ...current, apiKey: refreshed.apiKey, expiresAt: refreshed.expiresAt });
    return { apiKey: refreshed.apiKey };
  }, [clear, save]);

  return { credential, isLoaded: true, save, clear, getAccess };
}
