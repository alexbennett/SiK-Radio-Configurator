export function createInfoController({
  els,
  state,
  fetchJSON,
  runWithLoading,
  logEvent,
  showToast,
}) {
  function clearInfoPanels() {
    if (els.firmwareInfo) {
      els.firmwareInfo.textContent = "--";
    }
    if (els.hardwareInfo) {
      els.hardwareInfo.textContent = "--";
    }
  }

  function renderInfo(info = {}) {
    const fallback = (lines) =>
      Array.isArray(lines) && lines.length ? lines.join("\n") : "--";
    if (els.firmwareInfo) {
      els.firmwareInfo.textContent = fallback(info.firmware);
    }
    if (els.hardwareInfo) {
      els.hardwareInfo.textContent = fallback(info.hardware);
    }
  }

  async function loadInfo(options = {}) {
    if (!state.connected) {
      return;
    }
    try {
      logEvent("Requesting radio information...", "info");
      await runWithLoading(
        async () => {
          const { info } = await fetchJSON("/api/info");
          renderInfo(info);
          logEvent("Radio information refreshed.", "success");
        },
        options
      );
    } catch (error) {
      logEvent(
        `Failed to load radio information: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  return {
    clearInfoPanels,
    loadInfo,
    renderInfo,
  };
}
