import { useAuth } from "@clerk/expo";
import type { WestrideApi } from "@westride/api-client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createMobileApi } from "./api";

const ApiContext = createContext<WestrideApi | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const api = useMemo(
    () => createMobileApi(isSignedIn ? () => getToken() : undefined),
    [getToken, isSignedIn],
  );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): WestrideApi {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error("useApi must be used inside ApiProvider.");
  }
  return api;
}
