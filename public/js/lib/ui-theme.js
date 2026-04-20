/**
 * Visual theme state (independent from light/dark color scheme).
 *
 * We currently ship only the stable "Classical" UI.
 * "Material Design" is registered as beta for future rollout.
 */

const UI_THEME_STORAGE_KEY = "tm-ui-theme";

export const UI_THEME_CLASSICAL = "classical";
export const UI_THEME_MATERIAL_DESIGN = "material-design";

const UI_THEME_REGISTRY = Object.freeze([
  Object.freeze({
    id: UI_THEME_CLASSICAL,
    label: "Classical",
    beta: false,
    implemented: true,
  }),
  Object.freeze({
    id: UI_THEME_MATERIAL_DESIGN,
    label: "Material Design",
    beta: true,
    implemented: true,
  }),
]);

function getThemeById(id) {
  return UI_THEME_REGISTRY.find((theme) => theme.id === id) || null;
}

export function getUiThemeRegistry() {
  return UI_THEME_REGISTRY;
}

export function getUiThemeDefinition(themeId) {
  return getThemeById(themeId);
}

export function getUiThemePreference() {
  const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
  return getThemeById(stored)?.id || UI_THEME_CLASSICAL;
}

export function resolveUiTheme() {
  const pref = getUiThemePreference();
  const theme = getThemeById(pref);
  if (!theme) return UI_THEME_CLASSICAL;
  return theme.id;
}

export function setUiThemePreference(themeId) {
  if (!getThemeById(themeId)) return;
  localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  syncUiThemeFromStorage();
}

export function syncUiThemeFromStorage() {
  const resolved = resolveUiTheme();
  document.documentElement.dataset.uiTheme = resolved;
}
