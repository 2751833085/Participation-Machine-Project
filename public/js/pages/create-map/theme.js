export function tileUrlForTheme() {
  const theme = effectiveTheme();
  return theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

export function themeAccentColor() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return v || "#c4a574";
}

export function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function effectiveTheme() {
  const stored = localStorage.getItem("tm-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
