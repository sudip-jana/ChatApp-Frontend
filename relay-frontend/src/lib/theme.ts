// Theme choice is not sensitive, so localStorage is fine here (tokens are never stored).
const KEY = "relay-theme";

export function applyStoredTheme() {
  const stored = localStorage.getItem(KEY);
  const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(KEY, dark ? "dark" : "light");
}
