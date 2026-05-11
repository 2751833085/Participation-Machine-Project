/**
 * Friend shell — input bindings (draft fields + Enter-to-send).
 */
import { actionSendChat } from "./actions/room-play.js";
import { actionUpdateName, actionSendFriendRequest } from "./actions/social.js";
import { friendOnClick } from "./friend-handlers-click.js";
import { getMyMember } from "./render/helpers.js";

/**
 * @param {object} ctx
 * @param {Event} e
 */
export function friendOnInput(ctx, e) {
  const { state } = ctx;
  const t = e.target;
  if (!t.dataset || !t.dataset.bind) return;
  const path = t.dataset.bind.split(".");
  let val = t.value;
  if (t.id === "hs-join-code") val = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (path.length === 1) {
    state[path[0]] = val;
  } else if (path.length === 2) {
    if (state[path[0]]) state[path[0]][path[1]] = val;
  }
}

/**
 * @param {object} ctx
 * @param {Event} e
 */
export async function friendOnKeyDown(ctx, e) {
  if (e.key !== "Enter") return;
  const t = e.target;
  if (isChatComposer(t)) handleChatEnter(ctx, e, t);
  else if (t.id === "hs-name-input") handleNameEnter(ctx, e, t);
  else if (t.id === "hs-add-friend-input") handleAddFriendEnter(ctx, e, t);
  else if (t.id === "hs-join-code") await handleJoinCodeEnter(ctx, e);
}

function isChatComposer(t) {
  return (
    t.id === "hs-lobby-chat-input" ||
    t.id === "hs-team-chat-input" ||
    t.id === "hs-dispersal-chat-input"
  );
}

function handleChatEnter(ctx, e, t) {
  const { state, render, friendCtx } = ctx;
  e.preventDefault();
  const source = chatSourceForInput(t.id);
  const draftKey = chatDraftKey(source);
  state[draftKey] = t.value || "";
  void actionSendChat(friendCtx(), state[draftKey], chatScope(source));
  state[draftKey] = "";
  render();
}

function chatSourceForInput(id) {
  if (id === "hs-team-chat-input") return "team";
  if (id === "hs-dispersal-chat-input") return "dispersal";
  return "lobby";
}

function chatDraftKey(source) {
  if (source === "team") return "teamChatDraft";
  if (source === "dispersal") return "dispersalChatDraft";
  return "chatDraft";
}

function chatScope(source) {
  const me = getMyMember();
  if (source !== "team" || !me) return "all";
  if (me.team === "hunter") return "hunters";
  if (me.team === "runner") return "runners";
  return "all";
}

function handleNameEnter(ctx, e, t) {
  const { state, render, friendCtx } = ctx;
  e.preventDefault();
  void actionUpdateName(friendCtx(), t.value);
  state.modal = null;
  render();
}

function handleAddFriendEnter(ctx, e, t) {
  e.preventDefault();
  void actionSendFriendRequest(ctx.friendCtx(), t.value);
}

async function handleJoinCodeEnter(ctx, e) {
  e.preventDefault();
  const joinBtn = document.querySelector('[data-action="confirm-join"]');
  if (!joinBtn) return;
  await friendOnClick(ctx, {
    target: joinBtn,
    stopPropagation: () => {},
    preventDefault: () => {},
  });
}
