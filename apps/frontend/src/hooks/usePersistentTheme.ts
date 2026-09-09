import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

export function usePersistentTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const storedTheme = localStorage.getItem("ridebook-theme");
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
  });

  useEffect(() => {
    localStorage.setItem("ridebook-theme", theme);
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  return [theme, setTheme];
}
