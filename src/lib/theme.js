import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "heartOfEnglishTheme";
export const THEME_CHANGE_EVENT = "heartOfEnglishThemeChange";
export const THEMES = ["dark"];
const DEFAULT_THEME = "dark";

function isValidTheme(theme) {
  return THEMES.includes(theme);
}

export function isDarkTheme(theme) {
  return theme === "dark";
}

export function getStoredTheme() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme) {
  const safeTheme = isValidTheme(theme) ? theme : DEFAULT_THEME;

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = safeTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.setAttribute("content", "#050505");
    }
  }

  return safeTheme;
}

function announceThemeChange(theme) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}

export function saveTheme(theme) {
  const safeTheme = applyTheme(theme);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    } catch {
      // Theme persistence is nice-to-have; the app should keep working without storage.
    }

    announceThemeChange(safeTheme);
  }

  return safeTheme;
}

export function initializeTheme() {
  return applyTheme(getStoredTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState(() => initializeTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleThemeChange(event) {
      const nextTheme = event.detail?.theme;
      setTheme(isValidTheme(nextTheme) ? nextTheme : getStoredTheme());
    }

    function handleStorageChange(event) {
      if (event.key === THEME_STORAGE_KEY) {
        setTheme(isValidTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function updateTheme(nextTheme) {
    setTheme(saveTheme(nextTheme));
  }

  return {
    theme,
    isDark: isDarkTheme(theme),
    setTheme: updateTheme
  };
}
