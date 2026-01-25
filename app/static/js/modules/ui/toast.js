export function createToast(els) {
  function showToast(message, variant = "info") {
    if (!els.toast) {
      return;
    }
    els.toast.textContent = message;
    els.toast.dataset.variant = variant;
    els.toast.classList.add("visible");
    setTimeout(() => {
      els.toast.classList.remove("visible");
    }, 2400);
  }

  return { showToast };
}
