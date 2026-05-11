/**
 * Friends — home shell markup (tabs, create/join forms).
 */
import { DEFAULT_SETTINGS, escapeHtml, fmtAgo, fmtClock, getInitial, getOrCreateFriendCode, gameNow, loadStats, state, tsMs } from "./render-home-runtime.js";
import { getMyMember } from "./helpers.js";

// ════════════════════════════════════════════════
// HOME (4 main tabs + dock)
// ════════════════════════════════════════════════

function renderHomeShell() {
  const tab = state.activeTab;
  let body = "";
  if (tab === "start") body = renderStartTab();
  else if (tab === "ranks") body = renderRanksTab();
  else if (tab === "social") body = renderSocialTab();
  else if (tab === "me") body = renderMeTab();
  return `
    <div class="hs-shell has-dock">
      ${renderBackToMainChip()}
      ${renderPermissionBanner()}
      ${body}
      ${renderHomeDock(tab)}
    </div>
  `;
}

function renderPermissionBanner() {
  if (state.permissionState !== "denied") return "";
  return `
    <button type="button" class="hs-perm-banner" data-action="retry-permission">
      <div class="ico">!</div>
      <div class="text">
        <b>Camera access needed</b>
        <small>Tap here to retry — or enable it in Settings → Safari → Camera.</small>
      </div>
    </button>
  `;
}

function renderBackToMainChip() {
  return `
    <button type="button" class="hs-exit-chip" data-action="open-exit-tourgo" aria-label="Back to Tourgo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      <span>Tourgo</span>
    </button>
  `;
}

function renderHomeDock(activeTab) {
  return `
    <nav class="hs-dock" data-hs-dock>
      <div class="hs-dock-inner cols-4">
        ${[
          { id: "start", label: "Start", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>` },
          { id: "ranks", label: "Ranks", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M5 6H3v2a3 3 0 0 0 3 3M19 6h2v2a3 3 0 0 1-3 3"/></svg>` },
          { id: "social", label: "Social", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/></svg>` },
          { id: "me", label: "Me", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c1-3.5 4-5.4 7.5-5.4s6.5 1.9 7.5 5.4"/></svg>` },
        ].map((t) => `
          <button type="button" class="hs-dock-tab ${t.id === activeTab ? "is-active" : ""}" data-tab="${t.id}">
            ${t.icon}
            <span>${t.label}</span>
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}

function renderStartTab() {
  return `
    <main class="hs-start">
      <div class="hs-start-hero">
        <div class="kicker">Tourgo Friends</div>
        <h1>Manhunt <em>with friends</em></h1>
        <p>Start a game or join a friend's room. The hunt takes you through the city's streets.</p>
      </div>
      <div class="hs-start-grid">
        <button type="button" class="hs-start-tile create" data-action="open-create">
          <div class="tile-num">01</div>
          <div>
            <div class="tile-name">Create<br>Room</div>
            <div class="tile-sub">Host a room</div>
          </div>
          <div class="tile-arrow">→</div>
        </button>
        <button type="button" class="hs-start-tile join" data-action="open-join">
          <div class="tile-num">02</div>
          <div>
            <div class="tile-name">Join<br>Room</div>
            <div class="tile-sub">Join with code</div>
          </div>
          <div class="tile-arrow">→</div>
        </button>
      </div>
      <div class="hs-start-foot">
        <span class="dot"></span>
        <span>Signed in (anonymous) · code <b>${escapeHtml(getOrCreateFriendCode())}</b></span>
      </div>
    </main>
  `;
}

function renderRanksTab() {
  const stats = loadStats();
  return `
    <div class="hs-tab-body">
      <div class="hs-tab-head">
        <span class="kicker">Friends ranks</span>
        <h2>Hall of <em>friends.</em></h2>
        <p class="meta">Your lifetime record across rooms.</p>
      </div>
      <div class="hs-stat-grid">
        <div class="hs-stat-tile accent">
          <span class="lbl">Captures</span>
          <span class="val">${stats.captures || 0}</span>
        </div>
        <div class="hs-stat-tile runner">
          <span class="lbl">Wins</span>
          <span class="val">${stats.wins || 0}</span>
        </div>
        <div class="hs-stat-tile">
          <span class="lbl">Games</span>
          <span class="val">${stats.games || 0}</span>
        </div>
        <div class="hs-stat-tile">
          <span class="lbl">Hosted</span>
          <span class="val">${stats.hosted || 0}</span>
        </div>
      </div>
      <div class="hs-empty">
        <h4>Achievements coming soon</h4>
        <p>Your stats are saved on this device.</p>
      </div>
    </div>
  `;
}

function renderSocialTab() {
  const requests = state.friendRequests || [];
  const friends = state.friends || [];
  const myCode = getOrCreateFriendCode();
  return `
    <div class="hs-tab-body">
      <div class="hs-tab-head">
        <span class="kicker">Social</span>
        <h2>Friends</h2>
        <p class="meta">Your code: <b style="color:var(--ink);font-weight:600">${escapeHtml(myCode)}</b> · share so others can add you.</p>
      </div>

      ${requests.length ? `
        <div class="hs-section-head">Pending requests<small>${requests.length}</small></div>
        ${requests.map((r) => `
          <div class="hs-req-row">
            <div class="hs-av hs-av-sm"><span>${escapeHtml(getInitial(r.fromName))}</span></div>
            <div class="body">
              <div class="name">${escapeHtml(r.fromName || "Friend")}</div>
              <div class="code-meta">code <b>${escapeHtml(r.fromCode || "")}</b></div>
            </div>
            <div class="actions">
              <button type="button" class="reject" data-action="reject-friend" data-id="${escapeHtml(r.id)}">Decline</button>
              <button type="button" class="accept" data-action="accept-friend" data-id="${escapeHtml(r.id)}">Accept</button>
            </div>
          </div>
        `).join("")}
      ` : ""}

      <div class="hs-section-head">Your friends<small>${friends.length}</small></div>
      ${friends.length ? `
        <div class="hs-list-card">
          ${friends.map((f) => `
            <div class="hs-friend-row">
              <div class="hs-av hs-av-sm"><span>${escapeHtml(getInitial(f.name))}</span></div>
              <div class="body">
                <div class="name">${escapeHtml(f.name || "Friend")}</div>
                <div class="meta">Friend</div>
              </div>
              <button type="button" class="remove" data-action="remove-friend" data-uid="${escapeHtml(f.uid)}">Remove</button>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="hs-empty">
          <h4>No friends yet</h4>
          <p>Tap the + button to add a friend by their 6-character code.</p>
        </div>
      `}
    </div>
    <button type="button" class="hs-fab" data-action="open-add-friend" aria-label="Add friend">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  `;
}

function renderMeTab() {
  const name = state.user.name;
  const code = getOrCreateFriendCode();
  return `
    <div class="hs-tab-body">
      <div class="hs-tab-head">
        <span class="kicker">Profile</span>
        <h2>Your Tourgo <em>Friend card</em></h2>
        <p class="meta">Your display name shows up in rooms.</p>
      </div>
      <div class="hs-profile-hero">
        <div class="hs-av hs-av-lg has-photo">${escapeHtml(getInitial(name))}</div>
        <div class="info">
          <span class="kicker">Tourgo · Friend</span>
          <span class="name">${escapeHtml(name)}</span>
          <span class="status">Anonymous · saved on device</span>
        </div>
      </div>
      <div class="hs-code-card">
        <div class="info">
          <div class="label">Your friend code</div>
          <div class="value">${escapeHtml(code)}</div>
        </div>
        <button type="button" class="copy" data-action="copy-friend-code">Copy</button>
      </div>
      <div class="hs-set-list">
        <button type="button" class="hs-set-row" data-action="edit-name">
          <span class="lbl">Display name</span>
          <span class="val">${escapeHtml(name)}</span>
          <span class="chev">›</span>
        </button>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════
// CREATE / JOIN FORMS
// ════════════════════════════════════════════════

function renderCreateForm() {
  const draft = state.createDraft;
  return `
    <div class="hs-shell">
      <header class="hs-gh">
        <button type="button" class="hs-gh-back" data-action="back-home" aria-label="Back">←</button>
        <div>
          <div class="hs-gh-sub">Step 1 / 2</div>
          <div class="hs-gh-title">Create Room</div>
        </div>
      </header>
      <div class="hs-form-body">
        <div class="hs-form-hero">
          <h2>New game</h2>
          <p>Name your room and set the defaults.</p>
        </div>
        <div class="hs-field">
          <label class="hs-field-label" for="hs-create-name">Room name</label>
          <input id="hs-create-name" class="hs-input" data-bind="createDraft.name" value="${escapeHtml(draft.name)}" placeholder="Friday Night SOHO" maxlength="40" autocomplete="off" />
        </div>
        ${renderStepper("Dispersal", "Spread-out window · default 2 min", "createDraft.dispersalMin", draft.dispersalMin, 1, 5, "min")}
        ${renderStepper("Hunt duration", "Total timer · default 40 min", "createDraft.huntMin", draft.huntMin, 10, 90, "min")}
        ${renderStepper("Stay-still lock", "Runner stationary · default 5 min", "createDraft.lockMin", draft.lockMin, 2, 15, "min")}
        ${renderStepper("Stalemate trigger", "No-find threshold · default 15 min", "createDraft.stalemateMin", draft.stalemateMin, 5, 30, "min")}
        ${state.createError ? `<p style="color:var(--danger);font-size:13px;font-weight:600">${escapeHtml(state.createError)}</p>` : ""}
        <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-btn-lg" data-action="confirm-create" ${state.busy ? "disabled" : ""} style="margin-top:auto">${state.busy ? "Creating..." : "Create Room"}</button>
      </div>
    </div>
  `;
}

function renderStepper(label, hint, bindKey, value, min, max, unit) {
  return `
    <div class="hs-opt-row">
      <div class="left">
        <span class="lbl">${escapeHtml(label)}</span>
        <span class="hint">${escapeHtml(hint)}</span>
      </div>
      <div class="stepper">
        <button type="button" data-step="${bindKey}" data-delta="-1" data-min="${min}" data-max="${max}">−</button>
        <span class="val">${value} ${escapeHtml(unit)}</span>
        <button type="button" data-step="${bindKey}" data-delta="1" data-min="${min}" data-max="${max}">+</button>
      </div>
    </div>
  `;
}

function renderJoinForm() {
  return `
    <div class="hs-shell">
      <header class="hs-gh">
        <button type="button" class="hs-gh-back" data-action="back-home" aria-label="Back">←</button>
        <div>
          <div class="hs-gh-sub">Step 1 / 2</div>
          <div class="hs-gh-title">Join Room</div>
        </div>
      </header>
      <div class="hs-form-body">
        <div class="hs-form-hero">
          <h2>Enter invite code</h2>
          <p>The 6-character room code your friend sent you.</p>
        </div>
        <div class="hs-field">
          <label class="hs-field-label" for="hs-join-code">Room code</label>
          <input id="hs-join-code" class="hs-input code-input" data-bind="joinDraft.code" value="${escapeHtml(state.joinDraft.code)}" placeholder="ABCDEF" maxlength="6" autocomplete="off" autocapitalize="characters" inputmode="text" />
        </div>
        ${state.joinError ? `<p style="color:var(--danger);font-size:13px;font-weight:600">${escapeHtml(state.joinError)}</p>` : ""}
        <button type="button" class="hs-btn hs-btn-primary hs-btn-block hs-btn-lg" data-action="confirm-join" ${state.busy ? "disabled" : ""} style="margin-top:auto">${state.busy ? "Joining..." : "Join Room"}</button>
      </div>
    </div>
  `;
}

export {
  renderHomeShell,
  renderCreateForm,
  renderJoinForm,
};
