/**
 * Create hunt — search first; picking a result opens map + form together.
 * Checkpoint is a read-only ~48 m zone on the map (no tap / drag / zoom); change via search or area field.
 */


import { escapeHtml } from "./page-html.js";
import { renderAppShell } from "./page-shell.js";
const FIREBASE_PATH = "../firebase-init.js";
const STATE_PATH = "../lib/state.js";
const GEO_FLAGS_PATH = "../lib/geo-flags.js";
const I18N_PATH = "../lib/i18n.js";
const LOGIN_PAGE_PATH = "./login.js";
const CREATE_MAP_SESSION_PATH = "./create-map/session.js";

let auth;
let saveAuthReturn;
let REQUIRE_PHOTO_GPS_PROOF;
let t;
let loginPage;
let mountCreateMapSession;
let createMapDepsPromise;

const NE_ARROW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7 M8 7 H17 V16"/></svg>`;

async function loadCreateMapDeps() {
  if (!createMapDepsPromise) {
    createMapDepsPromise = Promise.all([
      import(FIREBASE_PATH),
      import(STATE_PATH),
      import(GEO_FLAGS_PATH),
      import(I18N_PATH),
      import(LOGIN_PAGE_PATH),
      import(CREATE_MAP_SESSION_PATH),
    ]).then(([firebase, state, geoFlags, i18n, login, session]) => {
      auth = firebase.auth;
      saveAuthReturn = state.saveAuthReturn;
      REQUIRE_PHOTO_GPS_PROOF = geoFlags.REQUIRE_PHOTO_GPS_PROOF;
      t = i18n.t;
      loginPage = login;
      mountCreateMapSession = session.mountCreateMapSession;
    });
  }
  return createMapDepsPromise;
}

let mapCleanup = null;

export async function render() {
  await loadCreateMapDeps();
  if (!auth.currentUser) {
    saveAuthReturn("#/create/classic");
    loginPage.render();
    return;
  }

  const listingRunProofNote = REQUIRE_PHOTO_GPS_PROOF
    ? "live-hunt proof is enforced when players run the hunt"
    : "checkpoint GPS proof is temporarily off during runs";

  await renderAppShell(
    `
    <div class="create-map-page">
      <section class="create-hero create-hero--static" data-tint="peach">
        <div class="create-hero__kicker">Find a spot</div>
        <div class="create-hero__slab-title">Search<br/>Manhattan.</div>
        <div class="create-hero__chip">Address, landmark, or shuffle</div>
      </section>

      <div id="create-map-status" class="create-status"></div>

      <div class="cmap-toolbar">
        <div class="cmap-toolbar__row">
          <input type="search" id="create-map-search-q" class="cmap-toolbar__input" placeholder="${escapeHtml(t("create.searchPlaceholder"))}" autocomplete="street-address" aria-label="${escapeHtml(t("create.searchAria"))}" />
          <button type="button" class="cmap-toolbar__go" id="create-map-search-btn">${escapeHtml(t("create.searchButton"))}</button>
        </div>
        <div class="cmap-toolbar__row cmap-toolbar__row--full">
          <button type="button" class="cmap-toolbar__locate" id="create-map-locate-btn">${escapeHtml(t("create.useMyLocation"))}</button>
        </div>
        <div id="create-map-results" class="cmap-results" hidden></div>
      </div>
    </div>

    <div id="create-map-fs" class="cmap-fs" hidden>
      <div id="create-map-checkpoint-scroll" class="cmap-fs__scroll create-map-checkpoint-scroll">
        <header class="cmap-fs__top create-map-fs-top">
          <button type="button" class="cmap-fs__back create-map-shrink-btn" id="create-map-shrink" aria-label="Back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div class="cmap-fs__title">
            <span class="cmap-fs__kicker">Checkpoint</span>
            <span class="cmap-fs__heading">Map &amp; details</span>
          </div>
          <span class="cmap-fs__spacer create-map-fs-spacer" aria-hidden="true"></span>
        </header>
        <p class="cmap-fs__hint create-map-fs-hint" id="create-map-fs-hint"></p>
        <div id="create-map-fs-map-host" class="cmap-fs__map-host create-map-fs-map-host">
          <div id="create-hunt-map" class="create-hunt-map" role="application" aria-label="Manhattan map"></div>
        </div>

        <div id="create-map-sheet" class="cmap-sheet create-map-sheet create-map-sheet--before-pin" aria-hidden="true">
          <div class="cmap-sheet__panel create-map-sheet-inner create-map-sheet-panel" id="create-map-sheet-panel">
            <header class="cmap-sheet__head sheet-head">
              <div class="sheet-head-main">
                <div class="sheet-head-text">
                  <p class="create-kicker cmap-sheet__kicker sheet-kicker">Checkpoint</p>
                  <h2 class="cmap-sheet__title sheet-title">Photo &amp; hunt details</h2>
                </div>
              </div>
            </header>
            <p class="cmap-sheet__coords sheet-coords" id="create-map-coords-line"></p>

            <label class="cmap-photo photo-drop" data-tint="mint">
              <span class="cmap-photo__preview photo-drop-preview" id="create-map-photo-preview" hidden></span>
              <span class="cmap-photo__empty photo-drop-empty" id="create-map-photo-empty">
                <span class="cmap-photo__icon photo-drop-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </span>
                <strong class="cmap-photo__title photo-drop-title">Checkpoint photo</strong>
                <span class="cmap-photo__sub photo-drop-sub">JPEG / PNG / WebP / HEIC — any photo for the listing (${escapeHtml(listingRunProofNote)}).</span>
              </span>
              <input type="file" id="create-map-photo" name="photo" class="photo-drop-input" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required />
            </label>

            <form id="create-map-form" class="cmap-form sheet-form stack">
              <div class="create-field-block form-field sheet-field">
                <label class="create-field__label" for="create-map-title">Title</label>
                <input id="create-map-title" name="title" type="text" required maxlength="80" placeholder="Union Square sprint" class="login-field-input create-title-input" />
              </div>
              <div class="create-field-block form-field sheet-field">
                <label class="create-field__label" for="create-map-area">Area / neighborhood</label>
                <p class="cmap-field-hint field-hint" id="area-field-hint" hidden>Type to search Manhattan, or tap a suggestion. Leave blank and we'll pick the closest neighborhood when you publish.</p>
                <div class="area-combobox-wrap" id="area-combobox-wrap">
                  <input
                    type="text"
                    id="create-map-area"
                    name="area"
                    autocomplete="off"
                    maxlength="80"
                    placeholder="Nearby suggestions · type to search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="false"
                    aria-controls="area-suggest-list"
                    class="login-field-input"
                  />
                  <ul class="area-suggest-list" id="area-suggest-list" role="listbox" hidden></ul>
                </div>
                <div class="area-pin-suggest" id="area-pin-suggest" hidden>
                  <p class="area-pin-suggest__title">Suggested from map pin</p>
                  <div class="area-pin-suggest__chips" id="area-pin-suggest-chips"></div>
                  <p class="area-pin-suggest__hint">Tap one or edit the field. If you leave it empty, we use the closest match when you publish.</p>
                </div>
              </div>
              <div class="create-field-block form-field sheet-field">
                <label class="create-field__label" for="create-map-challenge-hint">Whole hunt hint <span class="create-field__optional">(optional)</span></label>
                <input id="create-map-challenge-hint" name="challengeHint" type="text" maxlength="300" placeholder="${escapeHtml(t("create.huntHintPlaceholder"))}" class="login-field-input" />
              </div>
              <div class="create-field-block form-field sheet-field">
                <div class="cmap-slider-row time-slider-label-row">
                  <label class="create-field__label" for="create-map-minutes">Time limit</label>
                  <output class="cmap-slider-out time-slider-out" id="create-map-minutes-out" for="create-map-minutes">30 min</output>
                </div>
                <input type="range" id="create-map-minutes" name="minutes" class="cmap-slider time-slider" min="5" max="60" step="1" value="30" required />
                <div class="cmap-slider-ticks time-slider-ticks" aria-hidden="true"><span>5 min</span><span>60 min</span></div>
              </div>
              <div class="create-field-block form-field sheet-field">
                <label class="create-field__label" for="create-map-hint">Hint <span class="create-field__optional">(optional)</span></label>
                <input id="create-map-hint" name="hint" type="text" placeholder="${escapeHtml(t("create.hintPlaceholder"))}" class="login-field-input" />
              </div>
              <button type="submit" class="cmap-sheet__submit" id="create-map-submit">Publish hunt ${NE_ARROW_ICON}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
    "create",
    { hideHeader: true },
  );

  if (mapCleanup) mapCleanup();
  mapCleanup = mountCreateMapSession();
}

export function cleanup() {
  if (!createMapDepsPromise) return;
  if (mapCleanup) mapCleanup();
  mapCleanup = null;
}
