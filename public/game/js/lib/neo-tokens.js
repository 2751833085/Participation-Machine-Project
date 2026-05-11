/**
 * NEO design tokens for the Friend / Manhunt sub-app.
 *
 * Mirrors `_design-v2/project/lib/neo-pages.jsx:5-55`. The light palette is the
 * source of truth for the production light theme (dark theme is deferred per
 * plan `sentrux-woolly-coral.md`). Token values are duplicated as CSS
 * variables in `public/game/hide-seek.css :root`; this module is for the rare
 * cases where a render function needs an inline style (radial gradients,
 * computed shades) that CSS variables can't cover ergonomically.
 */

export const NEO_LIGHT = Object.freeze({
  bg: "#ece8df",
  bgAlt: "#f1ede4",
  surface: "#f7f3ea",
  accent: "#c76a4e",
  accentSoft: "#d99a82",
  deep: "#3c5b53",
  copy: "#b57258",
  text: "#2c3c37",
  muted: "#6a7570",
  border: "rgba(44,60,55,0.16)",
  dock: "#e0d2b3",
  dockActive: "#c76a4e",
  cardLav: "#bdaec4",
  cardPeach: "#d9a892",
  cardMustard: "#c4b585",
  cardMint: "#a8b8ac",
  btn: "#c76a4e",
});

export const NEO_DISPLAY =
  '"Barlow Condensed", "DIN Condensed", "Arial Narrow", "Helvetica Neue Condensed", sans-serif';

export const NEO_UI =
  '"Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const NFG_MAP = Object.freeze({
  "#3f2a56": "#f2ecdf",
  "#5a2615": "#f7e7da",
  "#3e3310": "#f3eccf",
  "#1d5c4d": "#e4ece3",
  "#2f5a4e": "#f7e7da",
});

export function nFg(dark, light) {
  if (!dark) return light;
  return NFG_MAP[light] || light;
}
