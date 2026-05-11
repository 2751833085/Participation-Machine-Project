import { auth, escapeHtml, nav, saveAuthReturn, syncThemeFromStorage, signOutUser } from "./admin-utils.js";

export function mountFrame(kicker, titleHtml, innerHtml) {
  document.body.className = "admin-app";
  document.body.innerHTML = `
    <div class="admin-page">
      <header class="admin-hero">
        <div class="admin-hero-row">
          <a href="#/" class="admin-hero-back" aria-label="Back to app">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            App
          </a>
          <span class="ds-chip admin-hero-chip">Admin</span>
        </div>
        <p class="ds-kicker admin-hero-kicker">${escapeHtml(kicker)}</p>
        <h1 class="admin-hero-title">${titleHtml}</h1>
      </header>
      <main class="admin-main" id="admin-main">${innerHtml}</main>
    </div>
  `;
  syncThemeFromStorage();
}

export function setPortalErr(msg) {
  const el = document.getElementById("admin-portal-err");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

/**
 * Non-admin user hit `#/admin`. Surface a short explanation with a link to
 * the main login page (where `admin` / password signs them in).
 */
export function renderDenied() {
  const signedIn = !!auth.currentUser;
  const whoami = signedIn ? escapeHtml(auth.currentUser.email || "signed in") : "";
  mountFrame(
    "Restricted",
    `Admin<br /><span class="admin-hero-title-accent">access only.</span>`,
    `
    <section class="admin-section">
      <div class="ds-card admin-denied-card">
        <p class="admin-lead">This area is restricted to the Tourgo admin account.</p>
        ${signedIn ? `<p class="admin-lead admin-lead--small">Currently signed in as <code class="admin-code">${whoami}</code>. Sign out to switch to the admin account.</p>` : ""}
        <div class="admin-denied-actions">
          ${signedIn
            ? `<button type="button" class="btn btn-primary btn-block" id="admin-denied-signout">Sign out &amp; go to login</button>`
            : `<button type="button" class="btn btn-primary btn-block" id="admin-denied-login">Go to login</button>`}
          <a href="#/" class="btn btn-secondary btn-block">Back to app</a>
        </div>
      </div>
    </section>
  `,
  );

  document.getElementById("admin-denied-login")?.addEventListener("click", () => {
    saveAuthReturn("#/admin");
    nav("#/login");
  });
  document.getElementById("admin-denied-signout")?.addEventListener("click", async () => {
    try {
      await signOutUser();
    } finally {
      saveAuthReturn("#/admin");
      nav("#/login");
    }
  });
}
