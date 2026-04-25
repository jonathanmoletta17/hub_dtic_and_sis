"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const PRIMARY_STORAGE_KEY = "theme";
const LEGACY_STORAGE_KEY = "hub_theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function resolveStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = localStorage.getItem(PRIMARY_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  return isTheme(stored) ? stored : "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle("dark", theme === "dark");
}

function persistTheme(theme: Theme) {
  localStorage.setItem(PRIMARY_STORAGE_KEY, theme);
  localStorage.setItem(LEGACY_STORAGE_KEY, theme);
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}>({
  theme: "dark",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "dark" : resolveStoredTheme(),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme: Theme) => {
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        persistTheme(nextTheme);
      },
      toggleTheme: () => {
        const nextTheme: Theme = theme === "dark" ? "light" : "dark";
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        persistTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
