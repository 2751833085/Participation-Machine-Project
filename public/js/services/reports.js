/**
 * User reports on hunts (challenge listings).
 */

import { auth, db } from "../firebase-init.js";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { openAlertModal, openReportHuntModal } from "../components/modal.js";
import { promptGuestNeedsSignIn } from "./auth.js";

/** Preset reasons shown in the report modal (value stored as `category`). */
export const CHALLENGE_REPORT_PRESETS = [
  { id: "spam_misleading", label: "Spam or misleading listing" },
  { id: "harassment", label: "Harassment or hate" },
  { id: "illegal", label: "Illegal or dangerous content" },
  {
    id: "image_distressing",
    label: "Checkpoint / listing photos make me uncomfortable",
  },
  { id: "copyright", label: "Copyright or impersonation" },
  { id: "other", label: "Other — I’ll describe below" },
];

/**
 * @param {{
 *   challengeId: string,
 *   challengeTitleSnapshot: string,
 *   category: string,
 *   details: string,
 * }} input
 */
export async function submitChallengeReport(input) {
  if (!auth.currentUser) {
    throw new Error("Please sign in to submit a report.");
  }
  const challengeId = String(input.challengeId || "").trim();
  if (!challengeId) throw new Error("Missing hunt.");
  const category = String(input.category || "").trim();
  const allowed = CHALLENGE_REPORT_PRESETS.map((p) => p.id);
  if (!allowed.includes(category)) {
    throw new Error("Choose a report reason.");
  }
  const details = String(input.details ?? "").trim();
  if (details.length > 2000) {
    throw new Error("Details are too long (max 2000 characters).");
  }
  const challengeTitleSnapshot = String(
    input.challengeTitleSnapshot || "",
  ).trim();

  await addDoc(collection(db, "challengeReports"), {
    challengeId,
    challengeTitleSnapshot: challengeTitleSnapshot.slice(0, 200),
    category,
    details: details.slice(0, 2000),
    reporterUid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
}

/**
 * Full UI flow: guest prompts, modal, confirmation — for hunt list & preview.
 * @param {{ challengeId: string, huntTitle: string }} args
 */
export async function promptReportChallenge({ challengeId, huntTitle }) {
  if (!auth.currentUser) {
    if (
      await promptGuestNeedsSignIn("Reporting a hunt needs a Google account.")
    ) {
      return;
    }
    await openAlertModal({
      title: "Sign in to report",
      message: "Please sign in with Google so we can follow up if needed.",
      okText: "OK",
    });
    return;
  }

  const ok = await openReportHuntModal({
    huntTitle,
    categories: CHALLENGE_REPORT_PRESETS,
    async onSubmit({ categoryId, details }) {
      await submitChallengeReport({
        challengeId,
        challengeTitleSnapshot: huntTitle,
        category: categoryId,
        details,
      });
    },
  });
  if (ok) {
    await openAlertModal({
      title: "Report sent",
      message: "Thanks — staff will review this in the admin dashboard.",
      okText: "OK",
    });
  }
}
