import { DEBUG_MODE } from "./modules/constants.js";
import { createFetchJSON } from "./modules/api.js";
import { getElements } from "./modules/elements.js";
import { createState } from "./modules/state.js";
import { createToast } from "./modules/ui/toast.js";
import { createLoadingController } from "./modules/ui/loading.js";
import { createLogController } from "./modules/ui/log.js";
import { createThemeController } from "./modules/ui/theme.js";
import { createDebugTransport } from "./modules/transports/debugTransport.js";
import { httpFetchJSON } from "./modules/transports/http.js";
import { WebSerialTransport } from "./modules/transports/webSerialTransport.js";
import { createInfoController } from "./modules/features/info.js";
import { createParametersController } from "./modules/features/parameters.js";
import { createUtilitiesController } from "./modules/features/utilities.js";
import { createConfigController } from "./modules/features/configs.js";
import { createConnectionController } from "./modules/features/connection.js";

document.addEventListener("DOMContentLoaded", () => {
  const els = getElements();
  const state = createState();
  const { showToast } = createToast(els);
  const { setButtonLoading, runWithLoading } = createLoadingController(els, state);
  const log = createLogController(els, state);
  const { logEvent, toggleLogCollapse, clearLog } = log;

  if (DEBUG_MODE && els.debugBanner) {
    els.debugBanner.classList.remove("d-none");
  }

  if (DEBUG_MODE) {
    console.log(
      "%c🎮 DEMO MODE ENABLED",
      "color: #635bff; font-size: 16px; font-weight: bold;"
    );
    console.log("Simulated radio connection is available. All API calls will return mock data.");
    console.log("Remove ?debug from URL to exit demo mode.");
  }

  const debugTransport = createDebugTransport();

  const webSerialTransport =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    navigator.serial
      ? new WebSerialTransport(httpFetchJSON)
      : null;

  if (webSerialTransport) {
    state.usingWebSerial = true;
    logEvent(
      "Web Serial mode enabled. Use the browser prompt to grant access to your local SiK radio.",
      "info"
    );
  }

  if (DEBUG_MODE) {
    logEvent(
      "🎮 DEMO MODE: Simulated radio available. Connect to explore all features.",
      "warning"
    );
  }

  const fetchJSON = createFetchJSON({
    debugTransport,
    webSerialTransport,
    httpFetchJSON,
  });

  const theme = createThemeController(els, state);
  const info = createInfoController({
    els,
    state,
    fetchJSON,
    runWithLoading,
    logEvent,
    showToast,
  });

  let parametersController;
  const configs = createConfigController({
    els,
    state,
    showToast,
    logEvent,
    setButtonLoading,
    getParameterSnapshot: () =>
      parametersController ? parametersController.snapshotCurrentParameters() : null,
    stageConfigurationParameters: (params) => {
      if (parametersController) {
        parametersController.stageConfigurationParameters(params);
      }
    },
  });

  parametersController = createParametersController({
    els,
    state,
    fetchJSON,
    runWithLoading,
    logEvent,
    showToast,
    updateConfigButtonsState: configs.updateConfigButtonsState,
  });

  const connection = createConnectionController({
    els,
    state,
    fetchJSON,
    runWithLoading,
    logEvent,
    showToast,
    updateConfigButtonsState: configs.updateConfigButtonsState,
    loadInfo: info.loadInfo,
    loadParameters: parametersController.loadParameters,
    clearInfoPanels: info.clearInfoPanels,
    clearParametersTable: parametersController.clearParametersTable,
    webSerialTransport,
  });

  const utilities = createUtilitiesController({
    els,
    state,
    fetchJSON,
    runWithLoading,
    logEvent,
    showToast,
    refreshStatus: connection.refreshStatus,
  });

  parametersController.setOnParametersUpdated(utilities.refreshRawCommandOptions);

  theme.initTheme();
  utilities.refreshRawCommandOptions();

  if (els.logToggle) {
    els.logToggle.textContent = "Minimize";
    els.logToggle.setAttribute("aria-expanded", "true");
  }

  logEvent("Configurator ready.");
  connection.updatePortDisplay();
  connection.toggleControls(state.connected);

  if (els.choosePortButton) {
    els.choosePortButton.addEventListener("click", (event) => {
      event.preventDefault();
      connection.choosePort();
    });
  }

  if (els.connectForm) {
    els.connectForm.addEventListener("submit", connection.connect);
  }

  if (els.connectButton) {
    els.connectButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (state.connected) {
        connection.disconnect();
      } else {
        connection.connect(event);
      }
    });
  }

  if (els.infoRefresh) {
    els.infoRefresh.addEventListener("click", () =>
      info.loadInfo({ button: els.infoRefresh, label: "Refreshing..." })
    );
  }

  if (els.parametersRefresh) {
    els.parametersRefresh.addEventListener("click", () =>
      parametersController.loadParameters({
        button: els.parametersRefresh,
        label: "Refreshing...",
      })
    );
  }

  if (els.parametersSave) {
    els.parametersSave.addEventListener("click", parametersController.saveParameters);
  }

  if (els.rebootButton) {
    els.rebootButton.addEventListener("click", utilities.rebootRadio);
  }

  if (els.rawForm) {
    els.rawForm.addEventListener("submit", utilities.sendRawCommand);
  }

  if (els.rawSelect) {
    els.rawSelect.addEventListener("change", utilities.handleRawCommandPresetChange);
  }

  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", theme.toggleTheme);
  }

  if (els.logToggle) {
    els.logToggle.addEventListener("click", (event) => {
      event.preventDefault();
      toggleLogCollapse();
    });
  }

  if (els.logClear) {
    els.logClear.addEventListener("click", (event) => {
      event.preventDefault();
      clearLog();
    });
  }

  if (els.configSave) {
    els.configSave.addEventListener("click", () => configs.saveConfiguration());
  }

  if (els.configSaveAs) {
    els.configSaveAs.addEventListener("click", configs.openSaveAsModal);
  }

  if (els.configSaveAsConfirm) {
    els.configSaveAsConfirm.addEventListener("click", configs.confirmSaveAs);
  }

  if (els.configDelete) {
    els.configDelete.addEventListener("click", configs.deleteConfiguration);
  }

  if (els.configDownload) {
    els.configDownload.addEventListener("click", configs.downloadConfiguration);
  }

  if (els.configUpload) {
    els.configUpload.addEventListener("click", configs.requestConfigUpload);
  }

  if (els.configUploadInput) {
    els.configUploadInput.addEventListener("change", configs.handleConfigUploadInput);
  }

  if (els.configSelect) {
    els.configSelect.addEventListener("change", () => {
      const value = els.configSelect.value;
      configs.setSelectedConfig(value || null);
    });
  }

  if (els.configSaveAsModal) {
    els.configSaveAsModal.addEventListener("shown.bs.modal", () => {
      if (els.configSaveAsName) {
        els.configSaveAsName.focus();
        els.configSaveAsName.select();
      }
    });
  }

  if (els.configSaveAsName) {
    els.configSaveAsName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        configs.confirmSaveAs();
      }
    });
  }

  parametersController.bindParameterTableEvents();
  configs.initializeConfigs();

  connection.loadPorts();
  connection.refreshStatus();
});
