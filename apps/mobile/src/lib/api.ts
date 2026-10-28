import {
  WESTRIDE_API_PRODUCTION_URL,
  createWestrideApi,
} from "@westride/api-client";
import Constants from "expo-constants";

const LOCAL_API_PORT = 3001;

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    return configured;
  }

  if (!__DEV__) {
    return WESTRIDE_API_PRODUCTION_URL;
  }

  // On a device or emulator `localhost` is the device itself, so use the host
  // serving the bundle. Web has no `hostUri` and can use `localhost`.
  const devHost = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${devHost}:${LOCAL_API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = createWestrideApi({ baseUrl: API_BASE_URL });
