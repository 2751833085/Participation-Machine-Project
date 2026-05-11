export function dashboardContentHtml() {
  return `
    <p class="status-banner error admin-portal-err" id="admin-portal-err" role="alert" hidden></p>

    <section class="admin-toolbar-card ds-card" data-neo-card="peach">
      <div class="admin-toolbar-body">
        <p class="ds-kicker admin-toolbar-kicker">Live overview</p>
        <p class="admin-stats" id="admin-stats-line">Loading…</p>
      </div>
      <button type="button" class="btn btn-ghost admin-toolbar-logout" id="admin-logout">Sign out admin</button>
    </section>

    <section class="admin-section">
      <header class="admin-section-head">
        <p class="ds-kicker">Moderation</p>
        <h2 class="admin-h2">Hunt reports</h2>
        <p class="admin-help">Submitted from the home feed report button. Reporter UID is the signed-in user who filed the report.</p>
      </header>
      <div class="ds-card admin-table-card">
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-tb-reports">
            <thead><tr>
              <th>Time</th><th>Hunt</th><th>Category</th><th>Details</th><th>Reporter UID</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="admin-section">
      <header class="admin-section-head">
        <p class="ds-kicker">People</p>
        <h2 class="admin-h2">Users</h2>
        <p class="admin-help">Delete removes Firestore profile, handle, attempts, run photos, and the Firebase Auth account.</p>
      </header>
      <div class="ds-card admin-table-card">
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-tb-users">
            <thead><tr>
              <th>UID</th><th>Display name</th><th>Handle</th><th>Merits</th><th>Updated</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="admin-section">
      <header class="admin-section-head">
        <p class="ds-kicker">Content</p>
        <h2 class="admin-h2">Hunts</h2>
        <p class="admin-help">Delete removes the hunt, all attempts, run photos (and Storage files), and comments.</p>
      </header>
      <div class="ds-card admin-table-card">
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-tb-challenges">
            <thead><tr>
              <th>ID</th><th>Title</th><th>Creator UID</th><th>Area</th><th>CPs</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="admin-section">
      <header class="admin-section-head">
        <p class="ds-kicker">Community</p>
        <h2 class="admin-h2">Hunt photos &amp; comments</h2>
        <p class="admin-help">Load photos for a hunt. Staff posts appear to players as <strong>administrator</strong>.</p>
      </header>
      <div class="ds-card admin-social-bar">
        <label class="admin-inline-label" for="admin-hunt-social-select">Hunt</label>
        <select id="admin-hunt-social-select" class="login-field-input admin-select-wide">
          <option value="">Select a hunt…</option>
        </select>
        <button type="button" class="btn btn-primary" id="admin-load-social">Load</button>
      </div>
      <div id="admin-social-root" class="admin-social-root"></div>
    </section>

    <section class="admin-section">
      <header class="admin-section-head">
        <p class="ds-kicker">Activity</p>
        <h2 class="admin-h2">Attempts (recent)</h2>
        <p class="admin-help">Delete removes the attempt and its run photos (and Storage).</p>
      </header>
      <div class="ds-card admin-table-card">
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-tb-attempts">
            <thead><tr>
              <th>ID</th><th>User</th><th>Hunt</th><th>Status</th><th>Started</th><th>Deadline</th><th>Actions</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

export function collectDashboardElements() {
  return {
    tbUsers: document.querySelector("#admin-tb-users tbody"),
    tbReports: document.querySelector("#admin-tb-reports tbody"),
    tbChallenges: document.querySelector("#admin-tb-challenges tbody"),
    tbAttempts: document.querySelector("#admin-tb-attempts tbody"),
    statsEl: document.getElementById("admin-stats-line"),
    huntSelect: document.getElementById("admin-hunt-social-select"),
    socialRoot: document.getElementById("admin-social-root"),
  };
}