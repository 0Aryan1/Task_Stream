import { useEffect, useState } from "react";

const STORAGE_KEY = "taskstream_theme";

export function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem(STORAGE_KEY) || "light");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
}
