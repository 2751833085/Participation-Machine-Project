/**
 * Firestore listeners for one hideSeek room (doc + members + captures + chats).
 * No app state — callers pass hooks. No import from `public/js`.
 */

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { tsMs } from "./format-utils.js";
import { calibrateServerTime } from "./server-time.js";

/** @param {object} db Firestore instance from Firebase init */
export function createRoomSubscriptionManager(db) {
  /** @type {(() => void)[]} */
  const subs = [];
  return {
    clearSubs: () => clearRoomSubs(subs),
    subscribeRoom: (code, hooks) => subscribeRoomWithDb(db, subs, code, hooks),
  };
}

function clearRoomSubs(subs) {
  while (subs.length) {
    const fn = subs.pop();
    try {
      fn();
    } catch (e) {
      /* ignore */
    }
  }
}

// Re-subscribe with backoff so a transient permission error doesn't leave the
// player permanently stuck with empty state.
function watchWithRetry(name, attach) {
  let unsub = null;
  let cancelled = false;
  let retryTimer = null;
  let attempts = 0;
  function start() {
    if (cancelled) return;
    try {
      unsub = attach((err) => {
        if (cancelled) return;
        attempts += 1;
        const delay = Math.min(8000, 500 * 2 ** attempts);
        console.error(`${name} sub error (retry in ${delay}ms)`, err);
        unsub = stopSubscription(unsub);
        retryTimer = setTimeout(start, delay);
      });
    } catch (e) {
      console.error(`${name} attach failed`, e);
    }
  }
  start();
  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    stopSubscription(unsub);
  };
}

function stopSubscription(unsub) {
  if (!unsub) return null;
  try {
    unsub();
  } catch (e) {
    /* ignore */
  }
  return null;
}

/**
 * @param {string} code
 * @param {{
 *   onRoomDeleted: () => void,
 *   onRoomUpdate: (data: Record<string, unknown>) => void,
 *   onMembers: (members: Record<string, unknown>[]) => void,
 *   onCaptures: (captures: Record<string, unknown>[]) => void,
 *   onChats: (chats: { id: string }[]) => void,
 * }} hooks
 */
function subscribeRoomWithDb(db, subs, code, hooks) {
  clearRoomSubs(subs);
  if (!code) return;

    subs.push(
      watchWithRetry("room", (onErr) =>
        onSnapshot(
          doc(db, "hideSeekRooms", code),
          (snap) => {
            if (!snap.exists()) {
              hooks.onRoomDeleted();
              return;
            }
            const data = snap.data();
            if (data.updatedAt) calibrateServerTime(tsMs(data.updatedAt));
            hooks.onRoomUpdate(data);
          },
          onErr,
        ),
      ),
    );

    subs.push(
      watchWithRetry("members", (onErr) =>
        onSnapshot(
          collection(db, "hideSeekRooms", code, "members"),
          (snap) => {
            const members = snap.docs
              .map((d) => ({ ...d.data() }))
              .sort((a, b) => tsMs(a.joinedAt) - tsMs(b.joinedAt));
            hooks.onMembers(members);
          },
          onErr,
        ),
      ),
    );

    subs.push(
      watchWithRetry("captures", (onErr) =>
        onSnapshot(
          collection(db, "hideSeekRooms", code, "captures"),
          (snap) => {
            const captures = snap.docs
              .map((d) => ({ ...d.data() }))
              .sort((a, b) => tsMs(a.capturedAt) - tsMs(b.capturedAt));
            hooks.onCaptures(captures);
          },
          onErr,
        ),
      ),
    );

    const chatsQ = query(
      collection(db, "hideSeekRooms", code, "chats"),
      orderBy("sentAt", "desc"),
      limit(200),
    );
    subs.push(
      watchWithRetry("chats", (onErr) =>
        onSnapshot(
          chatsQ,
          (snap) => {
            const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
            hooks.onChats(chats);
          },
          onErr,
        ),
      ),
    );
}
