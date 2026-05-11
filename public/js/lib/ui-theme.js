/**
 * Visual theme state (independent from light/dark color scheme).
 *
 * NeoUI is now the only shipped UI theme.
 * Light/dark color mode is handled separately via `data-theme` + `state.js`.
 */

const UI_THEME_STORAGE_KEY = "tm-ui-theme";
const LEGACY_NEO_ID = "material-design";

export const UI_THEME_NEO_DESIGN = "neo-design";

const UI_THEME_REGISTRY = Object.freeze([
  Object.freeze({ id: UI_THEME_NEO_DESIGN, label: "NeoUI" }),
]);

function getThemeById(id) {
  return UI_THEME_REGISTRY.find((theme) => theme.id === id) || null;
}

/** Migrate legacy stored value ("material-design" → "neo-design") transparently. */
function readStoredThemeId() {
  const raw = localStorage.getItem(UI_THEME_STORAGE_KEY);
  if (raw === LEGACY_NEO_ID) {
    localStorage.setItem(UI_THEME_STORAGE_KEY, UI_THEME_NEO_DESIGN);
    return UI_THEME_NEO_DESIGN;
  }
  return raw;
}

export function getUiThemeRegistry() {
  return UI_THEME_REGISTRY;
}

export function getUiThemeDefinition(themeId) {
  return getThemeById(themeId);
}

export function getUiThemePreference() {
  const stored = readStoredThemeId();
  return getThemeById(stored)?.id || UI_THEME_NEO_DESIGN;
}

export function resolveUiTheme() {
  return getUiThemePreference();
}

export function setUiThemePreference(themeId) {
  if (!getThemeById(themeId)) return;
  localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  syncUiThemeFromStorage();
}

export function syncUiThemeFromStorage() {
  const resolved = resolveUiTheme();
  document.documentElement.dataset.uiTheme = resolved;
  if (readStoredThemeId() !== resolved) {
    localStorage.setItem(UI_THEME_STORAGE_KEY, resolved);
  }
}
