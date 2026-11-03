import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import { darkColors, lightColors, type Palette } from "@/theme";

const STORAGE_KEY = "westride-color-mode";

/** `system` follows the device. An explicit choice is stored on this device. */
export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: "light" | "dark";
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

function webStorage(): Storage | null {
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  return storage ?? null;
}

async function readStoredMode(): Promise<ThemeMode> {
  try {
    if (Platform.OS === "web") {
      return parseMode(webStorage()?.getItem(STORAGE_KEY));
    }
    return parseMode(await SecureStore.getItemAsync(STORAGE_KEY));
  } catch {
    return "system";
  }
}

async function writeStoredMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const storage = webStorage();
      if (!storage) return;
      if (mode === "system") storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, mode);
      return;
    }
    if (mode === "system") await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, mode);
  } catch {
    // The in-memory choice still applies for this session.
  }
}

function applyNativeScheme(mode: ThemeMode) {
  try {
    Appearance.setColorScheme(mode === "system" ? "auto" : mode);
  } catch {
    // Web has no native override. The palette still follows the saved choice.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readStoredMode().then((stored) => {
      if (cancelled) return;
      setModeState(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) applyNativeScheme(mode);
  }, [mode, ready]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void writeStoredMode(next);
  }, []);

  const scheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, setMode, scheme, colors }),
    [mode, setMode, scheme, colors],
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}

export function useColors(): Palette {
  return useTheme().colors;
}
