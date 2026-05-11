/**
 * Host-driven room phase transitions (ready -> dispersal -> hunt -> stalemate -> end).
 */
import {
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { DEFAULT_SETTINGS, READY_COUNTDOWN_MS } from "./lib/constants.js";
import { tsMs } from "./lib/format-utils.js";
import { bumpStat } from "./lib/local-prefs.js";
import { gameNow } from "./lib/server-time.js";
import { state } from "./state.js";

let phaseTransitionInFlight = false;

export async function handlePhaseTransitions(db) {
  if (phaseTransitionInFlight) return;
  const ctx = phaseContext();
  if (!ctx) return;

  if (await handleReadyCheck(db, ctx)) return;
  if (await handleDispersal(db, ctx)) return;
  if (await handleHunt(db, ctx)) return;
  await handleStalemate(db, ctx);
}

function phaseContext() {
  if (!state.room || !state.user) return null;
  const room = state.room;
  return {
    code: state.roomCode,
    meIsHost: state.user.uid === room.hostUid,
    now: gameNow(),
    room,
  };
}

async function withPhaseTransition(label, task) {
  phaseTransitionInFlight = true;
  try {
    await task();
  } catch (error) {
    console.error(label, error);
  } finally {
    phaseTransitionInFlight = false;
  }
}

async function handleReadyCheck(db, ctx) {
  const { room, meIsHost } = ctx;
  if (room.status !== "ready_check") return false;
  const total = state.members.length;
  if (total === 0) return true;

  const votes = readyVoteCounts();
  if (votes.cancels > 0 && meIsHost) {
    await cancelReadyCheck(db, ctx);
    return true;
  }
  if (votes.readys === total && total >= 1 && meIsHost) {
    return maybeAdvanceReadyCountdown(db, ctx);
  }
  return true;
}

function readyVoteCounts() {
  return state.members.reduce(
    (counts, member) => {
      if (member.readyVote === "ready") counts.readys += 1;
      if (member.readyVote === "cancel") counts.cancels += 1;
      return counts;
    },
    { cancels: 0, readys: 0 },
  );
}

async function cancelReadyCheck(db, { code }) {
  await withPhaseTransition("cancel txn", async () => {
    await updateDoc(doc(db, "hideSeekRooms", code), {
      status: "lobby",
      cancelledBy:
        state.members.find((member) => member.readyVote === "cancel")?.name ||
        "Someone",
      cancelledAt: serverTimestamp(),
      readyCountdownStartedAt: null,
      updatedAt: serverTimestamp(),
    });
    await clearReadyVotes(db, code);
  });
}

async function clearReadyVotes(db, code) {
  for (const member of state.members) {
    if (member.readyVote) {
      await updateDoc(doc(db, "hideSeekRooms", code, "members", member.uid), {
        readyVote: null,
      }).catch(() => {});
    }
  }
}

async function maybeAdvanceReadyCountdown(db, ctx) {
  if (!ctx.room.readyCountdownStartedAt) {
    await withPhaseTransition("countdown start", () =>
      updateDoc(doc(db, "hideSeekRooms", ctx.code), {
        readyCountdownStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    return true;
  }
  const elapsed = ctx.now - tsMs(ctx.room.readyCountdownStartedAt);
  if (elapsed >= READY_COUNTDOWN_MS) {
    await withPhaseTransition("dispersal txn", () =>
      updateDoc(doc(db, "hideSeekRooms", ctx.code), {
        status: "dispersal",
        dispersalStartedAt: serverTimestamp(),
        readyCountdownStartedAt: null,
        updatedAt: serverTimestamp(),
      }),
    );
  }
  return true;
}

async function handleDispersal(db, ctx) {
  const { room, meIsHost } = ctx;
  if (room.status !== "dispersal" || !room.dispersalStartedAt || !meIsHost) {
    return false;
  }
  const elapsed = ctx.now - tsMs(room.dispersalStartedAt);
  const dispMs = (room.dispersalMin || DEFAULT_SETTINGS.dispersalMin) * 60 * 1000;
  if (elapsed < dispMs) return true;
  if (state.members.length === 0) return true;

  await withPhaseTransition("hunt txn", async () => {
    await assignTeamsAndStartHunt(db, ctx);
  });
  return true;
}

async function assignTeamsAndStartHunt(db, { code, room }) {
  const total = state.members.length;
  const runnersCount = Math.max(1, Math.min(total - 1, Math.ceil(total / 4)));
  const shuffled = [...state.members].sort(() => Math.random() - 0.5);
  const runners = shuffled.slice(0, runnersCount);
  const hunters = shuffled.slice(runnersCount);
  const lockMs = (room.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const lockUntil = Timestamp.fromMillis(gameNow() + lockMs);

  await assignRunnerMembers(db, code, runners, lockUntil);
  await assignHunterMembers(db, code, hunters);
  await updateDoc(doc(db, "hideSeekRooms", code), {
    status: "hunt",
    huntStartedAt: serverTimestamp(),
    lastCaptureAt: serverTimestamp(),
    criminalUids: runners.map((runner) => runner.uid),
    updatedAt: serverTimestamp(),
  });
}

async function assignRunnerMembers(db, code, runners, lockUntil) {
  for (const runner of runners) {
    await updateDoc(doc(db, "hideSeekRooms", code, "members", runner.uid), {
      team: "runner",
      lockExpiresAt: lockUntil,
    }).catch(() => {});
  }
}

async function assignHunterMembers(db, code, hunters) {
  for (const hunter of hunters) {
    await updateDoc(doc(db, "hideSeekRooms", code, "members", hunter.uid), {
      team: "hunter",
    }).catch(() => {});
  }
}

async function handleHunt(db, ctx) {
  const { room, meIsHost } = ctx;
  if (room.status !== "hunt" || !meIsHost || !room.huntStartedAt) return false;

  const runners = state.members.filter((member) => member.team === "runner");
  const aliveRunners = runners.filter((member) => !member.capturedAt);
  if (aliveRunners.length === 0 && runners.length > 0) {
    await endHunt(db, ctx.code, "hunters");
    return true;
  }
  if (huntTimeExpired(ctx)) {
    await endHunt(db, ctx.code, "runners");
    return true;
  }
  if (stalemateDue(ctx)) {
    await startStalemate(db, ctx.code);
  }
  return true;
}

function huntTimeExpired({ now, room }) {
  const huntMs = (room.huntMin || DEFAULT_SETTINGS.huntMin) * 60 * 1000;
  return now - tsMs(room.huntStartedAt) >= huntMs;
}

function stalemateDue({ now, room }) {
  const stalemateMs =
    (room.stalemateMin || DEFAULT_SETTINGS.stalemateMin) * 60 * 1000;
  const lastCapMs = tsMs(room.lastCaptureAt) || tsMs(room.huntStartedAt);
  return now - lastCapMs >= stalemateMs && !room.stalemateStartedAt;
}

async function endHunt(db, code, winner) {
  await withPhaseTransition(`end ${winner}-win txn`, async () => {
    await updateDoc(doc(db, "hideSeekRooms", code), {
      status: "ended",
      winner,
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    bumpEndStats(winner);
  });
}

function bumpEndStats(winner) {
  bumpStat("games", 1);
  const me = state.members.find((member) => member.uid === state.user.uid);
  if (winner === "hunters" && me?.team === "hunter") bumpStat("wins", 1);
  if (winner === "runners" && me?.team === "runner" && !me.capturedAt) {
    bumpStat("wins", 1);
  }
}

async function startStalemate(db, code) {
  await withPhaseTransition("stalemate start txn", async () => {
    await updateDoc(doc(db, "hideSeekRooms", code), {
      status: "stalemate",
      stalemateStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await clearActiveRunnerPositions(db, code);
  });
}

async function clearActiveRunnerPositions(db, code) {
  const activeRunners = state.members.filter(
    (member) => member.team === "runner" && !member.capturedAt,
  );
  for (const runner of activeRunners) {
    await updateDoc(doc(db, "hideSeekRooms", code, "members", runner.uid), {
      positionPhotoUrl: "",
      positionPhotoAt: null,
      lockExpiresAt: null,
    }).catch(() => {});
  }
}

async function handleStalemate(db, ctx) {
  const { room, meIsHost } = ctx;
  if (room.status !== "stalemate" || !room.stalemateStartedAt || !meIsHost) {
    return false;
  }
  const stalemateMs = (room.lockMin || DEFAULT_SETTINGS.lockMin) * 60 * 1000;
  const elapsed = ctx.now - tsMs(room.stalemateStartedAt);
  if (elapsed < stalemateMs) return true;

  await withPhaseTransition("stalemate end txn", () =>
    updateDoc(doc(db, "hideSeekRooms", ctx.code), {
      status: "hunt",
      stalemateStartedAt: null,
      lastCaptureAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return true;
}
