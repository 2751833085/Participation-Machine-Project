/**
 * Create entry — choose hunt mode (standard map hunt vs. future friends mode).
 */

import { renderShell } from "../components/shell.js";

const LOCK_ICON = `<svg class="create-mode-card__status-icon create-mode-card__status-icon--lock" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const CLOCK_ICON = `<svg class="create-mode-card__status-icon create-mode-card__status-icon--clock" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

/** Stylized map + zone + timer — classic hunt */
const VIZ_CLASSIC = `
  <svg class="create-mode-viz__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 72" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="136" height="68" rx="8" fill="var(--surface-2)" stroke="var(--border)" stroke-width="1"/>
    <g stroke="var(--border-strong)" stroke-width="0.65" opacity="0.45">
      <path d="M24 18h92M24 36h92M24 54h92"/>
      <path d="M38 10v52M70 10v52M102 10v52"/>
    </g>
    <circle cx="70" cy="36" r="16" stroke="var(--accent)" stroke-width="2" opacity="0.9" fill="color-mix(in srgb, var(--accent) 22%, transparent)"/>
    <circle cx="70" cy="36" r="3.5" fill="var(--accent)"/>
    <path d="M12 58h26" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round" opacity="0.35"/>
  </svg>
`;

/** Ghosted lobby / hide-and-seek vibe — coming soon */
const VIZ_FRIENDS = `
  <svg class="create-mode-viz__svg create-mode-viz__svg--ghost" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 72" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="136" height="68" rx="8" fill="color-mix(in srgb, var(--surface-2) 40%, var(--surface))" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 3" opacity="0.75"/>
    <rect x="54" y="14" width="32" height="44" rx="4" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="3 2.5" opacity="0.4"/>
    <circle cx="62" cy="36" r="2.2" fill="var(--text-muted)" opacity="0.45"/>
    <circle cx="70" cy="36" r="2.2" fill="var(--text-muted)" opacity="0.45"/>
    <circle cx="78" cy="36" r="2.2" fill="var(--text-muted)" opacity="0.45"/>
    <g opacity="0.28">
      <circle cx="28" cy="44" r="9" fill="var(--text-muted)"/>
      <path d="M28 53v6M22 48h12" stroke="var(--text)" stroke-width="1.2" stroke-linecap="round"/>
    </g>
    <g opacity="0.28">
      <circle cx="112" cy="44" r="9" fill="var(--text-muted)"/>
      <path d="M112 53v6M106 48h12" stroke="var(--text)" stroke-width="1.2" stroke-linecap="round"/>
    </g>
    <path d="M36 24 Q70 8 104 24" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3" opacity="0.25" fill="none"/>
  </svg>
`;

export function cleanup() {}

export function render() {
  renderShell(
    `
    <div class="page-narrow create-mode-page">
      <section class="hero create-mode-hero" aria-labelledby="create-mode-title">
        <p class="hero-eyebrow">Photo scavenger hunts</p>
        <h1 class="hero-title" id="create-mode-title">Choose a mode</h1>
        <p class="lead hero-lead">Classic is ready to use. Hide &amp; seek will arrive later.</p>
      </section>
      <div class="create-mode-grid" role="list">
        <a class="create-mode-card create-mode-card--active" href="#/create/classic" role="listitem">
          ${CLOCK_ICON}
          <div class="create-mode-card__body">
            <span class="create-mode-card__label">Classic hunt</span>
            <h2 class="create-mode-card__title">Map &amp; timer</h2>
            <p class="create-mode-card__desc">Manhattan checkpoint, timer, and hints—then publish.</p>
          </div>
          <div class="create-mode-card__viz">
            ${VIZ_CLASSIC}
          </div>
          <div class="create-mode-card__footer">
            <span class="create-mode-card__cta">Tap to continue</span>
          </div>
        </a>
        <div class="create-mode-card create-mode-card--locked" role="listitem" aria-disabled="true">
          ${LOCK_ICON}
          <div class="create-mode-card__body">
            <span class="create-mode-card__label">Friends online</span>
            <h2 class="create-mode-card__title">Hide &amp; seek</h2>
            <p class="create-mode-card__desc">Room for friends, roles, and clues—still in development.</p>
          </div>
          <div class="create-mode-card__viz create-mode-card__viz--locked">
            ${VIZ_FRIENDS}
          </div>
          <div class="create-mode-card__footer">
            <span class="create-mode-card__cta create-mode-card__cta--disabled">Not available yet</span>
          </div>
        </div>
      </div>
    </div>
  `,
    "create",
  );
}
