/**
 * Generic confirm modal dialog.
 */

/** Leaflet tiles sit in transformed layers; `backdrop-filter` often skips them — blur the map explicitly. */
function setModalMapBlur(on) {
  if (on) {
    document.body.dataset.modalOpen = "true";
  } else {
    delete document.body.dataset.modalOpen;
  }
}

/** Backdrop + dialog slide/fade in (alerts, report form, etc.). */
function mountModalWithSheetEnter(backdrop) {
  backdrop.classList.add("modal-backdrop--sheet-enter");
  const dlg = backdrop.querySelector(".modal-dialog");
  if (dlg) dlg.classList.add("modal-dialog--sheet-enter");
  setModalMapBlur(true);
  document.body.appendChild(backdrop);
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ) {
    backdrop.classList.add("is-visible");
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
    });
  });
}

function waitBackdropFadeOut(backdrop) {
  return new Promise((resolve) => {
    backdrop.classList.remove("is-visible");
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const t = window.setTimeout(settle, 450);
    backdrop.addEventListener(
      "transitionend",
      (e) => {
        if (e.target !== backdrop || e.propertyName !== "opacity") return;
        window.clearTimeout(t);
        settle();
      },
      { once: true },
    );
  });
}

export function openConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  animate = false,
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = animate
      ? "modal-backdrop modal-backdrop--animating"
      : "modal-backdrop";
    backdrop.setAttribute("role", "presentation");
    backdrop.innerHTML = `
      <div class="modal-dialog${animate ? " modal-dialog--animating" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-dlg-title">
        <h2 id="modal-dlg-title" class="modal-dialog-title">${title}</h2>
        <p class="modal-dialog-text">${message}</p>
        <div class="modal-dialog-actions">
          <button type="button" class="btn btn-ghost" data-action="cancel">${cancelText}</button>
          <button type="button" class="btn btn-primary" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `;

    const finish = async (confirmed) => {
      document.removeEventListener("keydown", onKey);
      if (animate) {
        await waitBackdropFadeOut(backdrop);
      }
      backdrop.remove();
      setModalMapBlur(false);
      resolve(confirmed);
    };

    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) finish(false);
    });
    backdrop
      .querySelector(".modal-dialog")
      .addEventListener("click", (e) => e.stopPropagation());

    backdrop
      .querySelector('[data-action="cancel"]')
      .addEventListener("click", () => finish(false));
    backdrop
      .querySelector('[data-action="confirm"]')
      .addEventListener("click", () => finish(true));

    setModalMapBlur(true);
    document.body.appendChild(backdrop);
    if (animate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => backdrop.classList.add("is-visible"));
      });
    }
    backdrop.querySelector('[data-action="cancel"]').focus();
  });
}

/** Full-screen success moment after publish; enter + exit transitions, then resolves. */
export function showPublishSuccessOverlay({
  title = "You're live",
  message = "Your hunt was published successfully.",
  minVisibleMs = 1650,
} = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className =
      "modal-backdrop modal-backdrop--animating modal-backdrop--success";
    backdrop.setAttribute("role", "presentation");

    const card = document.createElement("div");
    card.className = "publish-success-card";
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");

    const icon = document.createElement("div");
    icon.className = "publish-success-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✓";

    const h2 = document.createElement("h2");
    h2.className = "publish-success-title";
    h2.textContent = title;

    const p = document.createElement("p");
    p.className = "publish-success-text";
    p.textContent = message;

    card.append(icon, h2, p);
    backdrop.appendChild(card);

    setModalMapBlur(true);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => backdrop.classList.add("is-visible"));
    });

    const runExit = async () => {
      await waitBackdropFadeOut(backdrop);
      backdrop.remove();
      setModalMapBlur(false);
      resolve();
    };

    window.setTimeout(runExit, minVisibleMs);
  });
}

/**
 * Report a hunt from Open hunts — preset categories + optional details (required length for “other”).
 * @param {{ title?: string, huntTitle: string, categories: { id: string, label: string }[], onSubmit: (data: { categoryId: string, details: string }) => void | Promise<void> }} opts
 * @returns {Promise<boolean>} true if submitted successfully
 */
export function openReportHuntModal({
  title = "Report this hunt",
  huntTitle,
  categories,
  onSubmit,
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "modal-dialog report-hunt-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "report-hunt-title");

    const h = document.createElement("h2");
    h.className = "modal-dialog-title";
    h.id = "report-hunt-title";
    h.textContent = title;

    const sub = document.createElement("p");
    sub.className = "modal-dialog-text report-hunt-sub";
    sub.textContent = huntTitle || "This hunt";

    const fieldset = document.createElement("fieldset");
    fieldset.className = "report-hunt-fieldset";
    const leg = document.createElement("legend");
    leg.className = "report-hunt-legend";
    leg.textContent = "Why are you reporting?";
    fieldset.appendChild(leg);

    const radios = [];
    categories.forEach((c, idx) => {
      const row = document.createElement("div");
      row.className = "report-hunt-option";
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = "report-hunt-cat";
      inp.value = c.id;
      inp.id = `report-hunt-cat-${c.id}`;
      if (idx === 0) inp.checked = true;
      const lab = document.createElement("label");
      lab.htmlFor = inp.id;
      lab.textContent = c.label;
      row.append(inp, lab);
      fieldset.appendChild(row);
      radios.push(inp);
    });

    const detLab = document.createElement("label");
    detLab.className = "report-hunt-details-label";
    detLab.htmlFor = "report-hunt-details";
    detLab.textContent = "Additional details (optional)";

    const ta = document.createElement("textarea");
    ta.id = "report-hunt-details";
    ta.className = "input-grow report-hunt-details";
    ta.rows = 4;
    ta.maxLength = 2000;
    ta.setAttribute("placeholder", "Optional context.");

    const hint = document.createElement("p");
    hint.className = "report-hunt-hint";
    hint.textContent =
      "Reports are sent to Tourgo staff. Misuse may affect your account.";

    const errEl = document.createElement("p");
    errEl.className = "profile-edit-hunt-err report-hunt-err";
    errEl.setAttribute("aria-live", "polite");
    errEl.hidden = true;

    const actions = document.createElement("div");
    actions.className = "modal-dialog-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = "Cancel";
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "btn btn-primary";
    submitBtn.textContent = "Submit report";

    actions.append(cancelBtn, submitBtn);
    dialog.append(
      h,
      sub,
      fieldset,
      detLab,
      ta,
      hint,
      errEl,
      actions,
    );
    backdrop.appendChild(dialog);

    const finish = (ok) => {
      backdrop.remove();
      setModalMapBlur(false);
      document.removeEventListener("keydown", onKey);
      resolve(ok);
    };

    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) finish(false);
    });
    dialog.addEventListener("click", (e) => e.stopPropagation());

    cancelBtn.addEventListener("click", () => finish(false));

    submitBtn.addEventListener("click", async () => {
      errEl.hidden = true;
      errEl.textContent = "";
      const selected = radios.find((r) => r.checked);
      const categoryId = selected?.value || "";
      const details = ta.value.trim();
      if (!categoryId) {
        errEl.textContent = "Pick a reason.";
        errEl.hidden = false;
        return;
      }
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      try {
        await onSubmit({ categoryId, details });
        finish(true);
      } catch (e) {
        errEl.textContent = e?.message || "Could not send report.";
        errEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    });

    mountModalWithSheetEnter(backdrop);
    radios[0]?.focus();
  });
}

/** Single-action notice (OK only). Uses text nodes — safe for any string. */
export function openAlertModal({
  title,
  message,
  okText = "OK",
}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "presentation");
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    const h = document.createElement("h2");
    h.className = "modal-dialog-title";
    h.id = "alert-dlg-title";
    h.textContent = title;
    const p = document.createElement("p");
    p.className = "modal-dialog-text";
    p.textContent = message;
    const actions = document.createElement("div");
    actions.className = "modal-dialog-actions";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "btn btn-primary";
    okBtn.dataset.action = "ok";
    okBtn.textContent = okText;
    actions.appendChild(okBtn);
    dialog.appendChild(h);
    dialog.appendChild(p);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);

    const finish = () => {
      backdrop.remove();
      setModalMapBlur(false);
      document.removeEventListener("keydown", onKey);
      resolve();
    };

    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    document.addEventListener("keydown", onKey);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) finish();
    });
    dialog.addEventListener("click", (e) => e.stopPropagation());
    okBtn.addEventListener("click", finish);

    mountModalWithSheetEnter(backdrop);
    okBtn.focus();
  });
}
