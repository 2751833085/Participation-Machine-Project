/** Labels for `challengeReports.category` (same ids as client report modal). */
export const CHALLENGE_REPORT_LABELS = {
  spam_misleading: "Spam / misleading",
  harassment: "Harassment / hate",
  illegal: "Illegal / dangerous",
  image_distressing: "Photos uncomfortable",
  copyright: "Copyright / impersonation",
  other: "Other",
};

export function formatTs(ts) {
  if (!ts) return "—";
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : ts;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  } catch {
    /* ignore */
  }
  return "—";
}

export function formatIso(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Matches player run feed: 👍 👎 😂 😭 😅 (vote + mood from same vote doc). */
export function formatReactionBar(row) {
  const u = Number(row?.voteUp) || 0;
  const d = Number(row?.voteDown) || 0;
  const l = Number(row?.moodLaugh) || 0;
  const c = Number(row?.moodCry) || 0;
  const a = Number(row?.moodAwkward) || 0;
  return `${u} up · ${d} down · ${l} laugh · ${c} cry · ${a} awk`;
}
