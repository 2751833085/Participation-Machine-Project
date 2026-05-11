/**
 * Admin dashboard — session login, Firestore overview, destructive ops via Callable adminPortal.
 * Implementation split under `./admin/` (helpers, frame, social, dashboard).
 */

import { isAdminAuthed, waitForAuthReady } from "../services/auth.js";
import { renderDenied } from "./admin/frame.js";
import { renderDashboard } from "./admin/dashboard.js";

let unsubs = [];

export async function render() {
  try {
    await waitForAuthReady();
  } catch {
    /* ignore */
  }
  if (!isAdminAuthed()) {
    renderDenied();
    return;
  }
  renderDashboard((fn) => {
    unsubs.push(fn);
  });
}

export function cleanup() {
  unsubs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
  unsubs = [];
}
