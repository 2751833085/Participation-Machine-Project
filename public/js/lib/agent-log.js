/**
 * Debug telemetry — posts to a local Cursor/agent ingest server.
 * Off by default on deployed hosts so production never opens 127.0.0.1.
 *
 * - Enabled on `localhost` / `127.0.0.1`.
 * - Else: set `localStorage.setItem('tm-agent-debug','1')` and reload.
 */

const INGEST_URL =
  "http://127.0.0.1:7341/ingest/4b7aa510-9615-4966-a1b1-2a6196821643";
const SESSION_ID = "4804a9";

function isAgentDebugTransportEnabled() {
  try {
    if (typeof location === "undefined") return false;
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    return localStorage.getItem("tm-agent-debug") === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string} runId
 * @param {string} hypothesisId
 * @param {string} loc
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
export function agentDebugLog(runId, hypothesisId, loc, message, data) {
  if (!isAgentDebugTransportEnabled()) return;
  try {
    fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        runId,
        hypothesisId,
        location: loc,
        message,
        data: data ?? {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    /* never throw from a logger */
  }
}

/**
 * @param {{
 *   runId: string,
 *   hypothesisId: string,
 *   location: string,
 *   message: string,
 *   data?: Record<string, unknown>,
 * }} entry
 */
export function agentLog(entry) {
  if (!entry) return;
  agentDebugLog(
    entry.runId,
    entry.hypothesisId,
    entry.location,
    entry.message,
    entry.data,
  );
}
