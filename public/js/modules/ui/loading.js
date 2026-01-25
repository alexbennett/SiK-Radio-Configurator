export function createLoadingController(els, state) {
  function setGlobalLoading(active) {
    if (!els.globalLoading) {
      return;
    }
    state.overlayClaims = Math.max(0, state.overlayClaims + (active ? 1 : -1));
    if (state.overlayClaims > 0) {
      els.globalLoading.classList.remove("d-none");
    } else {
      els.globalLoading.classList.add("d-none");
    }
  }

  function setButtonLoading(button, loading, label) {
    if (!button) {
      return;
    }
    if (loading) {
      if (!button.dataset.originalContent) {
        button.dataset.originalContent = button.innerHTML;
      }
      button.dataset.prevDisabled = button.disabled ? "true" : "false";
      const text = label || button.textContent.trim() || "Working...";
      const spinner =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
      button.innerHTML = `${spinner}<span class="ms-2">${text}</span>`;
      button.disabled = true;
      button.classList.add("loading");
    } else {
      if (!button.dataset.originalContent) {
        return;
      }
      button.innerHTML = button.dataset.originalContent;
      const wasDisabled = button.dataset.prevDisabled === "true";
      button.disabled = wasDisabled;
      button.classList.remove("loading");
    }
  }

  async function runWithLoading(task, options = {}) {
    const { button, label, overlay = false, silent = false } = options;
    if (silent) {
      return task();
    }
    try {
      if (button) {
        setButtonLoading(button, true, label);
      }
      if (overlay) {
        setGlobalLoading(true);
      }
      return await task();
    } finally {
      if (overlay) {
        setGlobalLoading(false);
      }
      if (button) {
        setButtonLoading(button, false);
      }
    }
  }

  return {
    setGlobalLoading,
    setButtonLoading,
    runWithLoading,
  };
}
