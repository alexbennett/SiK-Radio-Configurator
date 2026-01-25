import { CONFIG_STORAGE_KEY } from "../constants.js";

export function createConfigController({
  els,
  state,
  showToast,
  logEvent,
  setButtonLoading,
  getParameterSnapshot,
  stageConfigurationParameters,
}) {
  function generateConfigId() {
    return `cfg-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function normalizeConfig(input) {
    if (!input || typeof input !== "object") {
      return null;
    }
    const name =
      typeof input.name === "string" && input.name.trim()
        ? input.name.trim()
        : null;
    const parametersRaw = input.parameters;
    const normalizedParameters = {};

    if (Array.isArray(parametersRaw)) {
      parametersRaw.forEach((entry) => {
        if (entry && typeof entry === "object" && typeof entry.code === "string") {
          normalizedParameters[entry.code] =
            entry.value != null ? String(entry.value) : "";
        }
      });
    } else if (parametersRaw && typeof parametersRaw === "object") {
      Object.entries(parametersRaw).forEach(([code, value]) => {
        if (typeof code === "string") {
          normalizedParameters[code] = value != null ? String(value) : "";
        }
      });
    }

    const parameterCodes = Object.keys(normalizedParameters);
    if (!parameterCodes.length) {
      return null;
    }

    return {
      id: typeof input.id === "string" && input.id ? input.id : generateConfigId(),
      name: name || "Saved Configuration",
      parameters: normalizedParameters,
      updatedAt:
        typeof input.updatedAt === "string"
          ? input.updatedAt
          : new Date().toISOString(),
    };
  }

  function loadConfigsFromStorage() {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => normalizeConfig(item))
        .filter((item) => item !== null);
    } catch (_error) {
      return [];
    }
  }

  function persistConfigs() {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(
        CONFIG_STORAGE_KEY,
        JSON.stringify(state.cachedConfigs)
      );
    } catch (_error) {
      // Ignore storage errors (e.g., quota exceeded).
    }
  }

  function getSelectedConfig() {
    if (!state.selectedConfigId) {
      return null;
    }
    return (
      state.cachedConfigs.find((config) => config.id === state.selectedConfigId) ||
      null
    );
  }

  function setSelectedConfig(configId) {
    state.selectedConfigId = configId;
    const selected = getSelectedConfig();
    if (selected && stageConfigurationParameters) {
      stageConfigurationParameters(selected.parameters || {});
    }
    updateConfigButtonsState();
  }

  function promoteConfigToTop(configId) {
    const index = state.cachedConfigs.findIndex((cfg) => cfg.id === configId);
    if (index > 0) {
      const [config] = state.cachedConfigs.splice(index, 1);
      state.cachedConfigs.unshift(config);
    }
  }

  function sortConfigsByUpdatedAt() {
    state.cachedConfigs.sort((a, b) => {
      const aTime = a.updatedAt || "";
      const bTime = b.updatedAt || "";
      if (aTime === bTime) {
        return 0;
      }
      return aTime > bTime ? -1 : 1;
    });
  }

  function renderConfigOptions(preserveSelection = true) {
    if (!els.configSelect) {
      return;
    }
    const select = els.configSelect;
    const previousId = preserveSelection ? state.selectedConfigId : null;
    select.innerHTML = "";

    if (!state.cachedConfigs.length) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.textContent = "No saved configurations";
      select.appendChild(placeholder);
      select.selectedIndex = 0;
      setSelectedConfig(null);
      return;
    }

    let matchedSelection = false;
    state.cachedConfigs.forEach((config) => {
      const option = document.createElement("option");
      option.value = config.id;
      option.textContent = config.name;
      select.appendChild(option);
      if (previousId && config.id === previousId) {
        matchedSelection = true;
      }
    });

    if (matchedSelection && previousId) {
      select.value = previousId;
      setSelectedConfig(previousId);
    } else {
      const firstId = state.cachedConfigs[0].id;
      select.value = firstId;
      setSelectedConfig(firstId);
    }
  }

  function updateConfigButtonsState() {
    const hasConfig = Boolean(getSelectedConfig());
    const hasParameters =
      Array.isArray(state.parameters) && state.parameters.length > 0;
    if (els.configDelete) {
      els.configDelete.disabled = !hasConfig;
    }
    if (els.configDownload) {
      els.configDownload.disabled = !hasConfig;
    }
    if (els.configSave) {
      els.configSave.disabled = !hasParameters || !hasConfig;
    }
    if (els.configSaveAs) {
      els.configSaveAs.disabled = !hasParameters;
    }
  }

  function saveConfiguration(options = {}) {
    const { asNew = false, name } = options;
    const snapshot = getParameterSnapshot ? getParameterSnapshot() : null;
    if (!snapshot) {
      showToast("Load parameters from a radio before saving.", "error");
      logEvent("Cannot save configuration: parameters not loaded.", "warning");
      return;
    }
    const explicitName = typeof name === "string" ? name.trim() : "";
    const timestamp = new Date().toISOString();
    const selected = getSelectedConfig();

    if (!asNew) {
      if (!selected) {
        showToast("Select a configuration or use Save As.", "error");
        logEvent("Cannot save configuration: none selected.", "warning");
        return;
      }
      const configName = explicitName || selected.name;
      logEvent(`Saving configuration "${configName}"...`, "info");
      selected.name = configName;
      selected.parameters = snapshot;
      selected.updatedAt = timestamp;
      promoteConfigToTop(selected.id);
      sortConfigsByUpdatedAt();
      renderConfigOptions();
      persistConfigs();
      showToast(`Saved "${selected.name}".`);
      logEvent(`Configuration "${selected.name}" updated.`, "success");
      return;
    }

    if (!explicitName) {
      showToast("Enter a configuration name.", "error");
      logEvent("Cannot save configuration: name is required.", "warning");
      return;
    }
    logEvent(`Saving configuration "${explicitName}" as new...`, "info");

    const newConfig = {
      id: generateConfigId(),
      name: explicitName,
      parameters: snapshot,
      updatedAt: timestamp,
    };
    state.cachedConfigs.unshift(newConfig);
    sortConfigsByUpdatedAt();
    renderConfigOptions(false);
    setSelectedConfig(newConfig.id);
    persistConfigs();
    showToast(`Saved "${newConfig.name}".`);
    logEvent(`Configuration "${newConfig.name}" saved.`, "success");
  }

  function getSaveAsModalInstance() {
    if (!els.configSaveAsModal) {
      return null;
    }
    if (!window.bootstrap || !window.bootstrap.Modal) {
      return null;
    }
    return window.bootstrap.Modal.getOrCreateInstance(els.configSaveAsModal);
  }

  function openSaveAsModal() {
    if (!els.configSaveAsName) {
      return;
    }
    const selected = getSelectedConfig();
    const suggested = selected ? `${selected.name} Copy` : "";
    els.configSaveAsName.value = suggested;
    const modal = getSaveAsModalInstance();
    if (modal) {
      modal.show();
    }
  }

  function confirmSaveAs() {
    if (!els.configSaveAsName) {
      return;
    }
    const name = els.configSaveAsName.value.trim();
    if (!name) {
      showToast("Enter a configuration name.", "error");
      logEvent("Cannot save configuration: name is required.", "warning");
      return;
    }
    saveConfiguration({ asNew: true, name });
    const modal = getSaveAsModalInstance();
    if (modal) {
      modal.hide();
    }
  }

  function deleteConfiguration() {
    const config = getSelectedConfig();
    if (!config) {
      showToast("Select a configuration to delete.", "error");
      logEvent("Delete configuration aborted: nothing selected.", "warning");
      return;
    }
    const index = state.cachedConfigs.findIndex((item) => item.id === config.id);
    if (index === -1) {
      return;
    }
    state.cachedConfigs.splice(index, 1);
    persistConfigs();
    renderConfigOptions(false);
    showToast(`Deleted "${config.name}".`);
    logEvent(`Configuration "${config.name}" deleted.`, "warning");
  }

  function sanitizeFileName(name) {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-") || "sik-radio-config"
    );
  }

  function downloadConfiguration() {
    const config = getSelectedConfig();
    if (!config) {
      showToast("Select a configuration to download.", "error");
      logEvent("Download configuration aborted: nothing selected.", "warning");
      return;
    }
    try {
      logEvent(`Downloading configuration "${config.name}"...`, "info");
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      const filename = `${sanitizeFileName(config.name)}.json`;
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      showToast(`Downloaded "${config.name}".`);
      logEvent(`Configuration "${config.name}" downloaded.`, "success");
    } catch (error) {
      logEvent(
        `Failed to download configuration "${config?.name ?? ""}": ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast("Unable to download configuration.", "error");
    }
  }

  function requestConfigUpload() {
    if (els.configUploadInput) {
      logEvent("Opening configuration upload dialog...", "info");
      els.configUploadInput.click();
    }
  }

  function handleConfigUploadInput(event) {
    const { files } = event.target;
    if (!files || !files.length) {
      logEvent("Upload cancelled: no file selected.", "warning");
      return;
    }
    const file = files[0];
    if (!file) {
      logEvent("Upload cancelled: file handle missing.", "warning");
      return;
    }
    setButtonLoading(els.configUpload, true, "Uploading...");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const parsed = JSON.parse(text);
        const configs = Array.isArray(parsed) ? parsed : [parsed];
        let imported = 0;
        configs.forEach((item) => {
          const normalized = normalizeConfig(item);
          if (normalized) {
            normalized.id = generateConfigId();
            normalized.updatedAt = new Date().toISOString();
            state.cachedConfigs.unshift(normalized);
            imported += 1;
          }
        });
        if (imported > 0) {
          sortConfigsByUpdatedAt();
          renderConfigOptions(false);
          persistConfigs();
          showToast(
            `Imported ${imported} configuration${imported === 1 ? "" : "s"}.`
          );
          logEvent(
            `Imported ${imported} configuration${
              imported === 1 ? "" : "s"
            } from file.`,
            "success"
          );
        } else {
          showToast("No valid configurations found in file.", "error");
          logEvent("No valid configurations found in uploaded file.", "error");
        }
      } catch (error) {
        showToast("Invalid configuration file.", "error");
        logEvent(
          `Failed to parse configuration file: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error"
        );
      } finally {
        setButtonLoading(els.configUpload, false);
        els.configUploadInput.value = "";
      }
    };
    reader.onerror = () => {
      showToast("Failed to read configuration file.", "error");
      logEvent("Failed to read configuration file.", "error");
      setButtonLoading(els.configUpload, false);
      els.configUploadInput.value = "";
    };
    reader.readAsText(file);
  }

  function initializeConfigs() {
    state.cachedConfigs = loadConfigsFromStorage();
    sortConfigsByUpdatedAt();
    renderConfigOptions(false);
    updateConfigButtonsState();
    logEvent(
      `Loaded ${state.cachedConfigs.length} cached configuration${
        state.cachedConfigs.length === 1 ? "" : "s"
      }.`,
      "info"
    );
  }

  return {
    confirmSaveAs,
    deleteConfiguration,
    downloadConfiguration,
    handleConfigUploadInput,
    initializeConfigs,
    openSaveAsModal,
    renderConfigOptions,
    requestConfigUpload,
    saveConfiguration,
    setSelectedConfig,
    updateConfigButtonsState,
  };
}
