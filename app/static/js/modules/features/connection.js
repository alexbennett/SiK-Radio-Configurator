import { DEBUG_MODE } from "../constants.js";

export function createConnectionController({
  els,
  state,
  fetchJSON,
  runWithLoading,
  logEvent,
  showToast,
  updateConfigButtonsState,
  loadInfo,
  loadParameters,
  clearInfoPanels,
  clearParametersTable,
  webSerialTransport,
}) {
  function normalizePortRecord(port) {
    if (!port || typeof port !== "object") {
      return null;
    }
    const value = port.value || port.id || port.device || port.port || "";
    if (!value) {
      return null;
    }
    let label = "";
    if (port.label && typeof port.label === "string") {
      label = port.label;
    } else if (port.description && typeof port.description === "string") {
      label =
        port.device && port.description && port.description !== port.device
          ? `${port.description} (${port.device})`
          : port.description;
    } else if (port.device) {
      label = port.device;
    } else {
      label = value;
    }
    return {
      value,
      label,
      info: port,
    };
  }

  function updatePortDisplay() {
    if (!els.choosePortButton) {
      return;
    }
    const label = state.selectedPort ? state.selectedPort.label : "";
    els.choosePortButton.textContent = label ? `Port: ${label}` : "Choose Port";
    els.choosePortButton.title = label
      ? `Selected port: ${label}`
      : "Choose a port";
    if (state.selectedPort && state.selectedPort.value) {
      els.choosePortButton.dataset.portId = state.selectedPort.value;
    } else {
      delete els.choosePortButton.dataset.portId;
    }
  }

  function setSelectedPort(record) {
    if (record && record.value) {
      const nextLabel = record.label || record.value;
      if (state.selectedPort && state.selectedPort.value === record.value) {
        state.selectedPort.label = nextLabel;
        if (record.info) {
          state.selectedPort.info = record.info;
        }
      } else {
        state.selectedPort = {
          value: record.value,
          label: nextLabel,
          info: record.info || record,
        };
      }
    } else {
      state.selectedPort = null;
    }
    updatePortDisplay();
    toggleControls(state.connected);
  }

  function alignSelectedPort(value, label) {
    if (!value) {
      return;
    }
    if (!state.selectedPort || state.selectedPort.value !== value) {
      setSelectedPort({ value, label });
    } else if (label && state.selectedPort.label !== label) {
      state.selectedPort.label = label;
      updatePortDisplay();
    }
  }

  function getSelectedPort() {
    return state.selectedPort ? state.selectedPort.value : "";
  }

  function getSelectedPortLabel() {
    return state.selectedPort ? state.selectedPort.label : "";
  }

  async function loadPorts() {
    try {
      logEvent(
        state.usingWebSerial
          ? "Scanning for Web Serial ports granted to this browser..."
          : "Scanning for available serial ports...",
        "info"
      );
      const { ports } = await fetchJSON("/api/ports");
      const normalized = Array.isArray(ports)
        ? ports
            .map((port) =>
              normalizePortRecord({
                ...port,
                value: port.device ?? port.id ?? port.port ?? port.value,
              })
            )
            .filter((item) => item !== null)
        : [];
      state.availablePorts = normalized;

      if (!state.selectedPort && normalized.length === 1) {
        setSelectedPort(normalized[0]);
      } else if (state.selectedPort) {
        const match = normalized.find(
          (item) => item.value === state.selectedPort.value
        );
        if (match) {
          setSelectedPort(match);
        }
      }

      logEvent(
        `Detected ${normalized.length} port${
          normalized.length === 1 ? "" : "s"
        }.`,
        "success"
      );
      return normalized;
    } catch (error) {
      logEvent(
        `Failed to list serial ports: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast(error.message, "error");
      return null;
    }
  }

  async function choosePort() {
    if (DEBUG_MODE) {
      const simulatedPort = {
        value: "debug://simulated-radio",
        label: "Simulated Radio (Demo)",
      };
      setSelectedPort(simulatedPort);
      showToast("Demo mode: Simulated radio selected.");
      logEvent("Demo mode: Selected simulated radio port.", "success");
      return;
    }

    if (state.usingWebSerial && webSerialTransport) {
      try {
        const record = await webSerialTransport.promptPortSelection();
        if (!record) {
          logEvent("Port selection cancelled.", "warning");
          showToast("Port selection cancelled.", "warning");
          return;
        }
        const normalized = normalizePortRecord({
          ...record,
          value: record.id,
          label: record.label,
          description: record.label,
        });
        if (!normalized) {
          showToast("Selected port is not usable.", "error");
          return;
        }
        setSelectedPort(normalized);
        showToast(`Selected ${normalized.label}.`);
        logEvent(`Selected port ${normalized.label}.`, "success");
        await loadPorts();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logEvent(`Web Serial port selection failed: ${message}`, "error");
        showToast(message, "error");
      }
      return;
    }

    const ports = (await loadPorts()) || [];
    if (!ports.length) {
      showToast("No ports detected. Ensure the radio is connected.", "error");
      return;
    }
    const optionsText = ports
      .map((port, index) => `${index + 1}. ${port.label}`)
      .join("\n");
    const defaultValue =
      (state.selectedPort && state.selectedPort.value) || ports[0].value;
    const response = window.prompt(
      `Enter the number or name of the port you want to use:\n${optionsText}`,
      defaultValue || ""
    );
    if (!response) {
      logEvent("Port selection cancelled.", "warning");
      showToast("Port selection cancelled.", "warning");
      return;
    }
    const trimmed = response.trim();
    let chosen = null;
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= ports.length) {
      chosen = ports[numeric - 1];
    } else {
      chosen = ports.find((port) => port.value === trimmed);
    }
    if (!chosen) {
      chosen = { value: trimmed, label: trimmed };
    }
    setSelectedPort(chosen);
    showToast(`Selected ${chosen.label}.`);
    logEvent(`Selected port ${chosen.label}.`, "success");
  }

  function updateStatusCard(status) {
    state.connected = Boolean(status.connected);
    const connected = state.connected;

    if (els.statusValue) {
      els.statusValue.textContent = connected ? "Connected" : "Disconnected";
    }

    if (connected) {
      if (state.usingWebSerial && status.port) {
        alignSelectedPort(getSelectedPort(), status.port);
      } else if (!state.usingWebSerial && status.port) {
        alignSelectedPort(status.port, status.port);
      }
    } else {
      state.parametersLoaded = false;
      state.loadingParameters = false;
    }

    toggleControls(connected);
    if (updateConfigButtonsState) {
      updateConfigButtonsState();
    }

    if (connected && !state.parametersLoaded && !state.loadingParameters) {
      if (loadInfo) {
        loadInfo({ button: els.infoRefresh, label: "Refreshing..." });
      }
      if (loadParameters) {
        loadParameters({ button: els.parametersRefresh, label: "Refreshing..." });
      }
    }
  }

  function toggleControls(connected) {
    if (els.connectButton) {
      const hasPort = Boolean(getSelectedPort());
      if (connected) {
        els.connectButton.textContent = "Disconnect";
        els.connectButton.classList.remove("btn-primary");
        els.connectButton.classList.add("btn-outline-danger");
        els.connectButton.disabled = false;
      } else {
        els.connectButton.textContent = "Connect";
        els.connectButton.classList.remove("btn-outline-danger");
        els.connectButton.classList.add("btn-primary");
        els.connectButton.disabled = !hasPort;
      }
    }
    if (els.choosePortButton) {
      els.choosePortButton.disabled = connected;
    }
    if (els.baudRate) {
      els.baudRate.disabled = connected;
    }
    if (els.infoRefresh) {
      els.infoRefresh.disabled = !connected;
    }
    if (els.parametersRefresh) {
      els.parametersRefresh.disabled = !connected;
    }
    if (els.parametersSave) {
      els.parametersSave.disabled = !connected;
    }
    if (els.rebootButton) {
      els.rebootButton.disabled = !connected;
    }
    if (els.rawSubmit) {
      els.rawSubmit.disabled = !connected;
    }
  }

  async function refreshStatus() {
    try {
      logEvent("Checking radio connection status...", "info");
      const wasConnected = state.connected;
      const { status } = await fetchJSON("/api/status");
      updateStatusCard(status);
      if (!status.connected) {
        if (clearInfoPanels) {
          clearInfoPanels();
        }
        if (clearParametersTable) {
          clearParametersTable();
        }
        if (!state.statusInitialized || wasConnected !== status.connected) {
          logEvent("Status: radio disconnected.", "warning");
        }
      } else if (!state.statusInitialized || wasConnected !== status.connected) {
        logEvent(
          `Status: connected to ${status.port ?? "?"} @ ${
            status.baudrate ?? "?"
          } baud.`,
          "success"
        );
      }
      state.statusInitialized = true;
    } catch (error) {
      logEvent(
        `Failed to read status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  async function connect(event) {
    event.preventDefault();
    const port = getSelectedPort();
    if (!port) {
      showToast("Choose a serial port before connecting.", "error");
      return;
    }

    const portLabel = getSelectedPortLabel() || port;

    let baud = els.baudRate.value.trim();
    if (!baud) {
      baud = "57600";
    }

    state.parametersLoaded = false;
    state.loadingParameters = false;

    let statusResponse;
    try {
      logEvent(`Connecting to ${portLabel} @ ${baud} baud...`, "info");
      statusResponse = await runWithLoading(
        async () => {
          const { status } = await fetchJSON("/api/connect", {
            method: "POST",
            body: JSON.stringify({ port, baudrate: parseInt(baud, 10) }),
          });
          return status;
        },
        { button: els.connectButton, label: "Connecting...", overlay: true }
      );
      const displayPort = statusResponse.port ?? portLabel;
      updateStatusCard(statusResponse);
      showToast(`Connected to ${displayPort}`);
      const connectedBaud = statusResponse.baudrate ?? baud;
      logEvent(`Connected to ${displayPort} @ ${connectedBaud} baud.`, "success");
      if (state.usingWebSerial) {
        alignSelectedPort(port, displayPort);
      } else if (statusResponse.port) {
        alignSelectedPort(statusResponse.port, statusResponse.port);
      }
    } catch (error) {
      logEvent(
        `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("Failed to connect.", "error");
      }
    } finally {
      toggleControls(state.connected);
    }
  }

  async function disconnect() {
    logEvent("Disconnecting from radio...", "info");
    let statusResponse;
    try {
      statusResponse = await runWithLoading(
        async () => {
          const { status } = await fetchJSON("/api/disconnect", { method: "POST" });
          return status;
        },
        { button: els.connectButton, label: "Disconnecting...", overlay: true }
      );
      updateStatusCard(statusResponse);
      if (clearInfoPanels) {
        clearInfoPanels();
      }
      if (clearParametersTable) {
        clearParametersTable();
      }
      if (els.rawResponse) {
        els.rawResponse.textContent = "Response will appear here.";
      }
      showToast("Disconnected.");
      logEvent("Disconnected from radio.", "success");
    } catch (error) {
      logEvent(
        `Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("Failed to disconnect.", "error");
      }
    } finally {
      toggleControls(state.connected);
    }
  }

  return {
    choosePort,
    connect,
    disconnect,
    loadPorts,
    refreshStatus,
    toggleControls,
    updatePortDisplay,
  };
}
