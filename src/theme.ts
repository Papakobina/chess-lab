import { useEffect, useState } from "react";
export type Theme = "light" | "dark";
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("chess-lab-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* The toggle still works when browser storage is unavailable. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#151c17" : "#f7f8f3");
    try {
      localStorage.setItem("chess-lab-theme", theme);
    } catch {
      /* Session-only preference. */
    }
  }, [theme]);
  return {
    theme,
    toggleTheme: () =>
      setTheme((value) => (value === "dark" ? "light" : "dark")),
  };
}
