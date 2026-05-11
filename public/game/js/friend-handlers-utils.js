/**
 * Small shared helpers for Friend DOM handlers (`app-handlers` family).
 */

/** @typedef {{ state: object, render: () => void, friendCtx: () => object, showToast: (text: string, kind?: string) => void }} FriendUiCtx */

/** @param {FriendUiCtx} ctx */
export function camPart(ctx) {
  return { state: ctx.state, render: ctx.render, showToast: ctx.showToast, friendCtx: ctx.friendCtx };
}

/** @param {FriendUiCtx} ctx */
export async function friendCopyToClipboard(ctx, text) {
  try {
    await navigator.clipboard.writeText(text);
    ctx.showToast("Copied to clipboard", "success");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      ctx.showToast("Copied", "success");
    } catch (e2) {
      ctx.showToast("Copy failed", "danger");
    }
    document.body.removeChild(ta);
  }
}

/** @param {FriendUiCtx} ctx */
export async function friendRequestCameraPermission(ctx) {
  if (!navigator.mediaDevices?.getUserMedia) {
    ctx.state.permissionState = "denied";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch (e) {}
    });
    ctx.state.permissionState = "granted";
  } catch (e) {
    ctx.state.permissionState = "denied";
  }
  ctx.render();
}
