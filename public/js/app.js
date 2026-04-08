import { auth, db, storage } from "./firebase-init.js";
import { compressCheckpointImage } from "./image-utils.js";
import { runRecaptcha } from "./recaptcha.js";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const MERIT_PER_WIN = 25;
const MAX_SPOTS = 10;
const MIN_SPOTS = 2;
const THEME_STORAGE_KEY = "tm-theme";
const AUTH_RETURN_KEY = "tm-auth-return";

/** reCAPTCHA only after client-side “abnormal” signals (no server metrics). */
const SS_AUTH_FAILS = "tm-auth-fail-ts";
const SS_RECAPTCHA_FORCE = "tm-recaptcha-required";
const SS_SIGNIN_CLICKS = "tm-signin-clicks-ts";
const AUTH_FAIL_WINDOW_MS = 12 * 60 * 1000;
const AUTH_FAIL_THRESHOLD = 2;
const CLICK_BURST_WINDOW_MS = 45 * 1000;
const CLICK_BURST_THRESHOLD = 6;

function pruneTs(key, windowMs) {
  const now = Date.now();
  const arr = JSON.parse(sessionStorage.getItem(key) || "[]");
  return arr.filter((t) => now - t < windowMs);
}

function recordSigninBurst() {
  const now = Date.now();
  const clicks = pruneTs(SS_SIGNIN_CLICKS, CLICK_BURST_WINDOW_MS);
  clicks.push(now);
  sessionStorage.setItem(SS_SIGNIN_CLICKS, JSON.stringify(clicks));
  if (clicks.length >= CLICK_BURST_THRESHOLD) {
    sessionStorage.setItem(SS_RECAPTCHA_FORCE, "1");
  }
}

function recordAuthFailureForGate() {
  const now = Date.now();
  const fails = pruneTs(SS_AUTH_FAILS, AUTH_FAIL_WINDOW_MS);
  fails.push(now);
  sessionStorage.setItem(SS_AUTH_FAILS, JSON.stringify(fails));
  if (fails.length >= AUTH_FAIL_THRESHOLD) {
    sessionStorage.setItem(SS_RECAPTCHA_FORCE, "1");
  }
}

function clearAuthAnomalyState() {
  sessionStorage.removeItem(SS_AUTH_FAILS);
  sessionStorage.removeItem(SS_RECAPTCHA_FORCE);
  sessionStorage.removeItem(SS_SIGNIN_CLICKS);
}

function shouldRunRecaptchaGate() {
  return sessionStorage.getItem(SS_RECAPTCHA_FORCE) === "1";
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const meritEl = () => document.getElementById("merit-points");

function redirectToLogin() {
  const h = location.hash || "#/";
  if (h !== "#/login") sessionStorage.setItem(AUTH_RETURN_KEY, h);
  nav("#/login");
}

function afterAuthSuccess() {
  let ret = sessionStorage.getItem(AUTH_RETURN_KEY) || "#/";
  sessionStorage.removeItem(AUTH_RETURN_KEY);
  if (ret === "#/login" || !ret.startsWith("#")) ret = "#/";
  location.hash = ret;
}

function effectiveTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function syncThemeFromStorage() {
  document.documentElement.dataset.theme = effectiveTheme();
}

function footer() {
  return `
    <footer class="app-footer">
      <div class="footer-inner">
        <p class="footer-brand">Tourist Manhunt</p>
        <p class="footer-tag">City photo hunts · Made for curious walkers</p>
      </div>
    </footer>
  `;
}

let listUnsub = null;
let userUnsub = null;
let runTimerId = null;
let runAttemptUnsub = null;
let manhattanMap = null;
let manhattanMarkersLayer = null;

const MANHATTAN_BOUNDS = [
  [40.682, -74.047],
  [40.883, -73.907],
];


const MANHATTAN_CENTROIDS = [
  { key: "harlem", lat: 40.8116, lng: -73.9465 },
  { key: "upper west", lat: 40.787, lng: -73.9754 },
  { key: "upper east", lat: 40.7735, lng: -73.9566 },
  { key: "midtown", lat: 40.7549, lng: -73.984 },
  { key: "chelsea", lat: 40.7465, lng: -74.0014 },
  { key: "west village", lat: 40.7358, lng: -74.0036 },
  { key: "greenwich", lat: 40.7336, lng: -74.0027 },
  { key: "soho", lat: 40.7233, lng: -74.003 },
  { key: "tribeca", lat: 40.7195, lng: -74.0089 },
  { key: "chinatown", lat: 40.7158, lng: -73.997 },
  { key: "lower east", lat: 40.715, lng: -73.9843 },
  { key: "lower manhattan", lat: 40.7075, lng: -74.0113 },
  { key: "battery park", lat: 40.7041, lng: -74.0172 },
  { key: "financial district", lat: 40.7073, lng: -74.0088 },
  { key: "union square", lat: 40.7359, lng: -73.9911 },
  { key: "east village", lat: 40.7265, lng: -73.9815 },
  { key: "times square", lat: 40.758, lng: -73.9855 },
];

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  const page = parts[0] || "home";
  return { page, id: parts[1] ?? null };
}

function nav(to) {
  location.hash = to;
}

function clearSubs() {
  if (listUnsub) {
    listUnsub();
    listUnsub = null;
  }
  if (runAttemptUnsub) {
    runAttemptUnsub();
    runAttemptUnsub = null;
  }
  if (runTimerId) {
    clearInterval(runTimerId);
    runTimerId = null;
  }
  if (manhattanMap) {
    manhattanMap.remove();
    manhattanMap = null;
  }
  manhattanMarkersLayer = null;
}

function formatCountdown(msLeft) {
  if (msLeft <= 0) return "0:00";
  const s = Math.floor(msLeft / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function allSpotsFound(found, total) {
  if (found.length !== total) return false;
  const set = new Set(found);
  for (let i = 0; i < total; i += 1) {
    if (!set.has(i)) return false;
  }
  return true;
}

const DOCK_ICONS = {
  hunts: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`,
  signIn: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>`,
};

function mobileDock(activePage) {
  const user = auth.currentUser;
  const profileHref = user ? "#/profile" : "#/login";
  const dockItem = (href, pageKey, label, iconHtml) =>
    `<a class="mobile-tab ${activePage === pageKey ? "is-active" : ""}" href="${href}">
      <span class="mobile-tab-icon">${iconHtml}</span>
      <span class="mobile-tab-label">${label}</span>
    </a>`;
  const profileIcon = user ? DOCK_ICONS.profile : DOCK_ICONS.signIn;
  const profileLabel = user ? "Profile" : "Sign in";
  const profileKey = user ? "profile" : "login";
  return `
    <nav class="app-dock" aria-label="App navigation">
      <div class="app-dock-inner">
        ${dockItem("#/", "hunts", "Hunts", DOCK_ICONS.hunts)}
        <a class="mobile-tab mobile-tab-plus ${activePage === "create" ? "is-active" : ""}" href="#/create" aria-label="Start hunt">
          <span class="mobile-tab-plus-circle">${DOCK_ICONS.plus}</span>
          <span class="mobile-tab-label">Hunt</span>
        </a>
        ${dockItem(profileHref, profileKey, profileLabel, profileIcon)}
      </div>
    </nav>
  `;
}

function renderShell(inner, activePage = "home") {
  document.body.innerHTML = `
    <main id="app-main" class="main-wrap">${inner}</main>
    ${mobileDock(activePage)}
    ${footer()}
  `;
  syncThemeFromStorage();
  wireHeaderMerit();
}

function openSignOutConfirmModal() {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "presentation");
    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="signout-dlg-title">
        <h2 id="signout-dlg-title" class="modal-dialog-title">Sign out?</h2>
        <p class="modal-dialog-text">You will need to sign in again to create hunts or play.</p>
        <div class="modal-dialog-actions">
          <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
          <button type="button" class="btn btn-primary" data-action="confirm">Sign out</button>
        </div>
      </div>
    `;

    const finish = (confirmed) => {
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      resolve(confirmed);
    };

    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) finish(false);
    });
    backdrop
      .querySelector(".modal-dialog")
      .addEventListener("click", (e) => e.stopPropagation());

    backdrop
      .querySelector('[data-action="cancel"]')
      .addEventListener("click", () => finish(false));
    backdrop
      .querySelector('[data-action="confirm"]')
      .addEventListener("click", () => finish(true));

    document.body.appendChild(backdrop);
    backdrop.querySelector('[data-action="cancel"]').focus();
  });
}

function wireHeaderMerit() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    if (userUnsub) {
      userUnsub();
      userUnsub = null;
    }
    const pill = meritEl();
    if (pill) pill.textContent = "Guest";
    return;
  }
  if (userUnsub) userUnsub();
  const userRef = doc(db, "users", uid);
  userUnsub = onSnapshot(
    userRef,
    (snap) => {
      const pts = snap.exists() ? snap.data().meritPoints ?? 0 : 0;
      if (meritEl()) meritEl().textContent = String(pts);
    },
    () => {
      if (meritEl()) meritEl().textContent = "0";
    },
  );
}

async function ensureUser() {
  if (auth.currentUser) return;
  redirectToLogin();
  throw new Error("Please sign in to continue.");
}

function renderLogin() {
  renderShell(`
    <div class="page-narrow auth-page">
      <a href="#/" class="back-link">← Hunts</a>
      <h1 class="h1">Sign in</h1>
      <p class="lead">Sign in with your Google account to create hunts, play, and sync merits across devices.</p>
      <div id="login-status"></div>
      <div class="card auth-card stack">
        <button type="button" class="btn btn-primary btn-block" id="btn-google">Continue with Google</button>
        <p class="recaptcha-legal">Google sign-in is usually one step. If our systems notice unusual activity, Google reCAPTCHA may run first. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a></p>
      </div>
    </div>
  `, "login");

  const statusEl = document.getElementById("login-status");
  const showErr = (msg) => {
    statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(msg)}</div>`;
  };

  document.getElementById("btn-google").addEventListener("click", async () => {
    const btn = document.getElementById("btn-google");
    statusEl.innerHTML = "";
    btn.disabled = true;
    recordSigninBurst();

    try {
      if (shouldRunRecaptchaGate()) {
        statusEl.innerHTML =
          '<div class="status-banner info">Unusual sign-in activity — running a quick security check…</div>';
        const token = await runRecaptcha("google_signin");
        statusEl.innerHTML = "";
        if (!token) {
          showErr(
            "Security check did not complete. Check your connection, pause ad blockers for this site, then try again.",
          );
          btn.disabled = false;
          return;
        }
      }

      await signInWithPopup(auth, googleProvider);
      clearAuthAnomalyState();
      afterAuthSuccess();
    } catch (e) {
      if (e.code === "auth/popup-closed-by-user") {
        btn.disabled = false;
        return;
      }
      recordAuthFailureForGate();
      showErr(e.message || "Google sign-in failed.");
      btn.disabled = false;
    }
  });
}

function renderHuntsFeed() {
  renderShell(
    `
    <section class="hero">
      <p class="hero-eyebrow">Photo scavenger hunts</p>
      <h1 class="hero-title">Explore the city on a timer</h1>
      <p class="lead hero-lead">Browse NYC-area hunts, open one to preview checkpoints, then start the clock. Use <strong>+</strong> in the bar below to publish your own.</p>
    </section>
    <section class="section" aria-labelledby="hunts-feed-heading">
      <h2 id="hunts-feed-heading" class="section-title">Open hunts</h2>
      <div id="hunts-feed" class="challenge-grid loading">Loading…</div>
    </section>
  `,
    "hunts",
  );

  const feed = document.getElementById("hunts-feed");
  const q = query(
    collection(db, "challenges"),
    orderBy("createdAt", "desc"),
    limit(40),
  );

  if (listUnsub) listUnsub();
  listUnsub = onSnapshot(
    q,
    (snap) => {
      if (!snap.size) {
        feed.classList.remove("loading");
        feed.innerHTML =
          '<p class="empty-state">No hunts yet. Be the first to <a href="#/create">create one</a>.</p>';
        return;
      }
      feed.classList.remove("loading");
      feed.innerHTML = snap.docs
        .map((d) => {
          const c = d.data();
          const spots = c.spots?.length ?? 0;
          const mins = c.timeLimitMinutes ?? "?";
          const thumb = c.spots?.[0]?.imageUrl;
          const thumbBlock = thumb
            ? `<div class="hunt-card-thumb"><img src="${escapeHtml(thumb)}" alt="" loading="lazy" width="400" height="300" /></div>`
            : `<div class="hunt-card-thumb hunt-card-thumb--empty" role="img" aria-label=""></div>`;
          return `
            <a class="hunt-card" href="#/challenge/${d.id}">
              ${thumbBlock}
              <div class="hunt-card-body">
                <span class="badge">${spots} checkpoints · ${mins} min</span>
                <h3>${escapeHtml(c.title || "Untitled hunt")}</h3>
                <p class="hunt-card-meta">${escapeHtml(c.areaLabel || "NYC")}</p>
              </div>
            </a>
          `;
        })
        .join("");
    },
    (err) => {
      feed.classList.remove("loading");
      feed.innerHTML = `<div class="status-banner error">${escapeHtml(err.message)}</div>`;
    },
  );
}

function renderProfile() {
  const user = auth.currentUser;
  const label = user
    ? user.email || user.phoneNumber || user.displayName || "Signed in"
    : "Not signed in";

  renderShell(
    `
    <div class="page-narrow">
      <h1 class="h1">Profile</h1>
      <p class="lead">Account and settings.</p>
      <div class="card stack">
        <div class="form-field">
          <label>Account</label>
          <div class="profile-value">${escapeHtml(label)}</div>
        </div>
        <div class="form-field">
          <label>Merits</label>
          <div class="profile-value"><span id="merit-points">—</span></div>
        </div>
        <div class="form-field">
          <label>Explore</label>
          <a class="btn btn-ghost btn-block" href="#/map">Manhattan map</a>
        </div>
        <div class="form-field">
          <label>Theme</label>
          <button type="button" class="btn btn-block" id="profile-theme-toggle">Toggle light / dark</button>
        </div>
        ${
          user
            ? '<button type="button" class="btn btn-ghost btn-block" id="profile-sign-out">Sign out</button>'
            : '<a href="#/login" class="btn btn-primary btn-block">Sign in with Google</a>'
        }
      </div>
    </div>
  `,
    "profile",
  );

  document
    .getElementById("profile-theme-toggle")
    ?.addEventListener("click", () => {
      const next =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      document.documentElement.dataset.theme = next;
    });

  document.getElementById("profile-sign-out")?.addEventListener("click", async () => {
    const ok = await openSignOutConfirmModal();
    if (!ok) return;
    try {
      await signOut(auth);
      nav("#/");
    } catch (e) {
      alert(e.message || "Could not sign out.");
    }
  });
}

function inferManhattanPoint(challenge) {
  if (
    typeof challenge?.lat === "number" &&
    typeof challenge?.lng === "number" &&
    challenge.lat >= MANHATTAN_BOUNDS[0][0] &&
    challenge.lat <= MANHATTAN_BOUNDS[1][0] &&
    challenge.lng >= MANHATTAN_BOUNDS[0][1] &&
    challenge.lng <= MANHATTAN_BOUNDS[1][1]
  ) {
    return { lat: challenge.lat, lng: challenge.lng };
  }

  const area = String(challenge?.areaLabel || "").toLowerCase();
  for (const p of MANHATTAN_CENTROIDS) {
    if (area.includes(p.key)) return { lat: p.lat, lng: p.lng };
  }
  if (area.includes("manhattan")) return { lat: 40.7589, lng: -73.9851 };
  return null;
}

function buildMapMarkerHtml(spotsCount) {
  return `<div class="city-blip"><span>${spotsCount}</span></div>`;
}

function renderMapPage() {
  renderShell(
    `
    <section class="hero">
      <p class="hero-eyebrow">Live city map</p>
      <h1 class="hero-title">Manhattan hunt activity</h1>
      <p class="lead hero-lead">Interactive hunt map inspired by city alert apps. Scope is Manhattan only.</p>
    </section>
    <section class="section">
      <div class="map-wrap card">
        <div id="hunt-map" class="hunt-map"></div>
      </div>
      <p class="card-meta" style="margin-top:0.75rem;">Showing hunts we can locate in Manhattan from challenge area labels.</p>
    </section>
  `,
    "map",
  );

  const mapNode = document.getElementById("hunt-map");
  if (!window.L || !mapNode) {
    mapNode.innerHTML =
      '<div class="status-banner error">Map library failed to load.</div>';
    return;
  }

  const theme = effectiveTheme();
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  manhattanMap = window.L.map("hunt-map", {
    zoomControl: true,
    minZoom: 11,
    maxZoom: 18,
    maxBounds: MANHATTAN_BOUNDS,
    maxBoundsViscosity: 1.0,
  }).fitBounds(MANHATTAN_BOUNDS);

  window.L.tileLayer(tileUrl, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: "abcd",
  }).addTo(manhattanMap);

  const q = query(
    collection(db, "challenges"),
    orderBy("createdAt", "desc"),
    limit(120),
  );
  if (listUnsub) listUnsub();
  listUnsub = onSnapshot(q, (snap) => {
    if (!manhattanMap) return;
    if (manhattanMarkersLayer) {
      manhattanMarkersLayer.remove();
    }
    manhattanMarkersLayer = window.L.layerGroup().addTo(manhattanMap);
    snap.docs.forEach((d) => {
      const c = d.data();
      const p = inferManhattanPoint(c);
      if (!p) return;
      const spots = c.spots?.length ?? 0;
      const icon = window.L.divIcon({
        className: "city-blip-icon",
        html: buildMapMarkerHtml(spots || 1),
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = window.L.marker([p.lat, p.lng], { icon }).addTo(
        manhattanMarkersLayer,
      );
      marker.bindPopup(
        `<strong>${escapeHtml(c.title || "Untitled hunt")}</strong><br>${escapeHtml(c.areaLabel || "Manhattan")}<br><a href="#/challenge/${d.id}">Open hunt</a>`,
      );
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function spotRowHtml(i) {
  return `
    <div class="spot-row" data-spot-index="${i}">
      <div class="form-field">
        <label>Checkpoint photo ${i + 1}</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>
      <div class="form-field">
        <label>Hint (optional)</label>
        <input type="text" name="hint" placeholder="Landmark or street clue" />
      </div>
    </div>
  `;
}

function renderCreate() {
  if (!auth.currentUser) {
    sessionStorage.setItem(AUTH_RETURN_KEY, "#/create");
    renderLogin();
    return;
  }

  let spotCount = MIN_SPOTS;
  const rows = () =>
    Array.from({ length: spotCount }, (_, i) => spotRowHtml(i)).join("");

  renderShell(`
    <div class="page-narrow">
      <a href="#/" class="back-link" aria-label="Back to all hunts">← All hunts</a>
      <h1 class="h1">Create a hunt</h1>
      <p class="lead">Upload photos of real places in your play area. Images are resized and saved as JPEG before upload to save storage. Players race the clock to “find” each spot (honor system for now).</p>
      <div id="create-status"></div>
      <form id="create-form" class="card stack">
      <div class="form-field">
        <label for="title">Title</label>
        <input id="title" name="title" type="text" required maxlength="80" placeholder="Union Square sprint" />
      </div>
      <div class="form-field">
        <label for="area">Area / neighborhood</label>
        <input id="area" name="area" type="text" required maxlength="80" placeholder="Union Square, Manhattan" />
      </div>
      <div class="form-field">
        <label for="minutes">Time limit (minutes)</label>
        <input id="minutes" name="minutes" type="number" min="5" max="180" value="30" required />
      </div>
      <div id="spot-rows" class="spot-rows">${rows()}</div>
      <div class="stack" style="flex-direction: row; flex-wrap: wrap;">
        <button type="button" class="btn btn-ghost" id="add-spot">Add checkpoint</button>
        <button type="button" class="btn btn-ghost" id="remove-spot">Remove last</button>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="submit-create">Publish hunt</button>
    </form>
    </div>
  `, "create");

  const spotRowsEl = document.getElementById("spot-rows");
  const statusEl = document.getElementById("create-status");
  const form = document.getElementById("create-form");

  document.getElementById("add-spot").addEventListener("click", () => {
    if (spotCount >= MAX_SPOTS) return;
    spotCount += 1;
    spotRowsEl.innerHTML = rows();
  });

  document.getElementById("remove-spot").addEventListener("click", () => {
    if (spotCount <= MIN_SPOTS) return;
    spotCount -= 1;
    spotRowsEl.innerHTML = rows();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.innerHTML = "";
    const btn = document.getElementById("submit-create");
    btn.disabled = true;

    try {
      await ensureUser();
      const title = document.getElementById("title").value.trim();
      const areaLabel = document.getElementById("area").value.trim();
      const timeLimitMinutes = parseInt(
        document.getElementById("minutes").value,
        10,
      );

      const rowEls = spotRowsEl.querySelectorAll(".spot-row");
      if (rowEls.length < MIN_SPOTS) {
        throw new Error(`Add at least ${MIN_SPOTS} checkpoints.`);
      }

      const files = [];
      const hints = [];
      rowEls.forEach((row) => {
        const input = row.querySelector('input[type="file"]');
        const hint = row.querySelector('input[name="hint"]')?.value.trim() ?? "";
        if (!input?.files?.[0]) throw new Error("Each checkpoint needs a photo.");
        files.push(input.files[0]);
        hints.push(hint);
      });

      const challengeRef = doc(collection(db, "challenges"));
      const challengeId = challengeRef.id;
      const spots = [];

      for (let i = 0; i < files.length; i += 1) {
        const jpegBlob = await compressCheckpointImage(files[i]);
        const path = `challenges/${challengeId}/${i}.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, jpegBlob, { contentType: "image/jpeg" });
        const imageUrl = await getDownloadURL(storageRef);
        spots.push({
          imageUrl,
          hint: hints[i] || "",
        });
      }

      await setDoc(challengeRef, {
        title,
        areaLabel,
        timeLimitMinutes,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        spots,
      });

      statusEl.innerHTML =
        '<div class="status-banner ok">Published! Redirecting…</div>';
      setTimeout(() => nav(`#/challenge/${challengeId}`), 600);
    } catch (err) {
      statusEl.innerHTML = `<div class="status-banner error">${escapeHtml(err.message || "Could not publish.")}</div>`;
      btn.disabled = false;
    }
  });
}

async function renderChallenge(id) {
  renderShell('<p class="loading">Loading hunt…</p>', "home");
  try {
    const refC = doc(db, "challenges", id);
    const snap = await getDoc(refC);
    if (!snap.exists()) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">This hunt was not found.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>',
      );
      return;
    }
    const c = snap.data();
    const spots = c.spots ?? [];
    const spotsHtml = spots
      .map(
        (s, i) => `
      <div class="spot-check">
        <img src="${escapeHtml(s.imageUrl)}" alt="Checkpoint ${i + 1}" loading="lazy" />
        <div class="body">
          <strong>Checkpoint ${i + 1}</strong>
          ${s.hint ? `<p class="card-meta">${escapeHtml(s.hint)}</p>` : ""}
        </div>
      </div>
    `,
      )
      .join("");

    renderShell(`
      <a href="#/" class="back-link">← All hunts</a>
      <div class="two-col-desktop">
        <div>
          <span class="badge">${spots.length} checkpoints · ${c.timeLimitMinutes} min</span>
          <h1 class="h1" style="margin-top:0.5rem;">${escapeHtml(c.title || "Hunt")}</h1>
          <p class="lead" style="margin-bottom:1rem;">${escapeHtml(c.areaLabel || "NYC")}</p>
          <p class="card-meta">Timer starts when you tap <strong>Start hunt</strong>. Check off every checkpoint before the clock hits zero to earn merits.</p>
          <button type="button" class="btn btn-primary btn-block" id="start-hunt" style="margin-top:1.25rem;">Start hunt</button>
          <div id="challenge-status"></div>
        </div>
        <div class="card">${spotsHtml}</div>
      </div>
    `, "home");

    document.getElementById("start-hunt").addEventListener("click", async () => {
      const st = document.getElementById("challenge-status");
      const btn = document.getElementById("start-hunt");
      if (!auth.currentUser) {
        sessionStorage.setItem(AUTH_RETURN_KEY, `#/challenge/${id}`);
        nav("#/login");
        return;
      }
      btn.disabled = true;
      try {
        const now = Timestamp.now();
        const ms = (c.timeLimitMinutes || 30) * 60 * 1000;
        const deadline = Timestamp.fromMillis(now.toMillis() + ms);
        const attemptRef = await addDoc(collection(db, "attempts"), {
          challengeId: id,
          userId: auth.currentUser.uid,
          startedAt: now,
          deadlineAt: deadline,
          foundSpotIndices: [],
          status: "active",
        });
        nav(`#/run/${attemptRef.id}`);
      } catch (err) {
        st.innerHTML = `<div class="status-banner error">${escapeHtml(err.message)}</div>`;
        btn.disabled = false;
      }
    });
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message)}</div><p><a href="#/" class="back-link">← All hunts</a></p></div>`,
    );
  }
}

async function awardMerit() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(
    doc(db, "users", uid),
    { meritPoints: increment(MERIT_PER_WIN) },
    { merge: true },
  );
}

async function renderRun(attemptId) {
  if (!auth.currentUser) {
    sessionStorage.setItem(AUTH_RETURN_KEY, `#/run/${attemptId}`);
    renderLogin();
    return;
  }

  renderShell('<p class="loading">Starting run…</p>', "home");

  try {
    const attemptRef = doc(db, "attempts", attemptId);

    const attemptSnap = await getDoc(attemptRef);
    if (!attemptSnap.exists()) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">Run not found.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }

    const attempt = attemptSnap.data();
    if (attempt.userId !== auth.currentUser.uid) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">This run belongs to another player.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }

    const chSnap = await getDoc(doc(db, "challenges", attempt.challengeId));
    if (!chSnap.exists()) {
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">Challenge missing.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
      return;
    }
    const challenge = chSnap.data();
    const spots = challenge.spots ?? [];
    const total = spots.length;

    const renderFrame = (data) => {
      if (runTimerId) {
        clearInterval(runTimerId);
        runTimerId = null;
      }

      const found = data.foundSpotIndices ?? [];
      const status = data.status || "active";
      const deadlineMs = data.deadlineAt.toMillis();
      const startedMs = data.startedAt.toMillis();
      const nowMs = Date.now();
      const left = Math.max(0, deadlineMs - nowMs);
      const totalMs = Math.max(1, deadlineMs - startedMs);
      const pct =
        status === "active"
          ? Math.min(100, (left / totalMs) * 100)
          : status === "won"
            ? 100
            : 0;

      const checks = spots
        .map((s, i) => {
          const checked = found.includes(i);
          const disabled = status !== "active";
          return `
            <div class="spot-check">
              <img src="${escapeHtml(s.imageUrl)}" alt="" loading="lazy" />
              <div class="body">
                <label>
                  <input type="checkbox" data-index="${i}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
                  Checkpoint ${i + 1}
                </label>
                ${s.hint ? `<p class="card-meta">${escapeHtml(s.hint)}</p>` : ""}
              </div>
            </div>
          `;
        })
        .join("");

      let banner = "";
      if (status === "won") {
        banner = '<div class="status-banner ok">You finished in time. Merits added to your profile.</div>';
      } else if (status === "lost") {
        banner = '<div class="status-banner error">Time is up. Try another hunt!</div>';
      } else {
        banner = `<div class="status-banner info">Time left: <strong id="time-left">${formatCountdown(left)}</strong></div>`;
      }

      renderShell(`
        <a href="#/" class="back-link">← Home</a>
        <h1 class="h1">${escapeHtml(challenge.title || "Hunt")}</h1>
        ${banner}
        <div class="timer-bar"><div style="width:${pct}%"></div></div>
        <div class="card" id="run-checks">${checks}</div>
      `, "home");

      if (status === "active") {
        document.querySelectorAll("#run-checks input[type=checkbox]").forEach((el) => {
          el.addEventListener("change", async () => {
            const boxes = document.querySelectorAll("#run-checks input[type=checkbox]");
            const arr = [];
            boxes.forEach((box) => {
              if (box.checked) arr.push(parseInt(box.dataset.index, 10));
            });
            arr.sort((a, b) => a - b);
            try {
              const now = Date.now();
              if (allSpotsFound(arr, total) && now <= deadlineMs) {
                await updateDoc(attemptRef, {
                  foundSpotIndices: arr,
                  status: "won",
                  completedAt: Timestamp.now(),
                });
                await awardMerit();
              } else {
                await updateDoc(attemptRef, { foundSpotIndices: arr });
              }
            } catch (err) {
              el.checked = !el.checked;
              alert(err.message);
            }
          });
        });
      }
    };

    if (runAttemptUnsub) runAttemptUnsub();
    runAttemptUnsub = onSnapshot(attemptRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      renderFrame(data);

      if (runTimerId) clearInterval(runTimerId);
      if (data.status === "active") {
        const deadline = data.deadlineAt.toMillis();
        runTimerId = setInterval(async () => {
          const t = document.getElementById("time-left");
          if (t) {
            const left = Math.max(0, deadline - Date.now());
            t.textContent = formatCountdown(left);
          }
          if (Date.now() > deadline) {
            clearInterval(runTimerId);
            runTimerId = null;
            try {
              const latest = await getDoc(attemptRef);
              const d = latest.data();
              if (d.status === "active") {
                await updateDoc(attemptRef, {
                  status: "lost",
                  completedAt: Timestamp.now(),
                });
              }
            } catch {
              /* ignore */
            }
          }
        }, 1000);
      }
    });
  } catch (err) {
    renderShell(
      `<div class="page-narrow"><div class="status-banner error">${escapeHtml(err.message)}</div><p><a href="#/" class="back-link">← Home</a></p></div>`,
    );
  }
}

function route() {
  clearSubs();
  const { page, id } = parseRoute();

  switch (page) {
    case "home":
    case "":
    case "overview":
    case "list":
      renderHuntsFeed();
      break;
    case "map":
      renderMapPage();
      break;
    case "login":
      if (auth.currentUser) {
        afterAuthSuccess();
        return;
      }
      renderLogin();
      break;
    case "create":
      renderCreate();
      break;
    case "profile":
      renderProfile();
      break;
    case "challenge":
      if (!id) {
        renderShell(
          '<div class="page-narrow"><div class="status-banner error">Missing hunt id.</div><p><a href="#/" class="back-link">← All hunts</a></p></div>',
        );
        break;
      }
      renderChallenge(id);
      break;
    case "run":
      if (!id) {
        renderShell(
          '<div class="page-narrow"><div class="status-banner error">Missing run id.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
        );
        break;
      }
      renderRun(id);
      break;
    default:
      renderShell(
        '<div class="page-narrow"><div class="status-banner error">Unknown page.</div><p><a href="#/" class="back-link">← Home</a></p></div>',
      );
  }
}

renderShell('<p class="loading">Connecting…</p>');

let initialRouteDone = false;

onAuthStateChanged(auth, () => {
  if (!initialRouteDone) {
    initialRouteDone = true;
  }
  route();
});

window.addEventListener("hashchange", () => {
  route();
});
