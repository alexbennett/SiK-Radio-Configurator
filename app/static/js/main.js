"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // ============================================
  // Debug Mode Configuration
  // ============================================
  const DEBUG_MODE = new URLSearchParams(window.location.search).has("debug");
  
  const SIMULATED_DATA = {
    status: {
      connected: false,
      port: "Simulated Radio (Demo)",
      baudrate: 57600,
      connected_at: null,
    },
    info: {
      firmware: ["SiK 2.2 on HM-TRP", "Built: Jan 15 2026", "Bootloader: 1.1"],
      hardware: ["HopeRF HM-TRP", "Si1000 Rev B", "8051 Core @ 24MHz"],
      registers: ["S0:FORMAT=25", "S1:SERIAL_SPEED=64", "S2:AIR_SPEED=64", "S3:NETID=25"],
      board_frequencies: ["Min Freq: 915000", "Max Freq: 928000", "Num Channels: 50"],
    },
    parameters: [
      { code: "S0", value: "25", raw: "FORMAT=25", human_readable: "AT Command Mode", definition: { name: "FORMAT", description: "Serial protocol format (fixed AT command interface)", value_type: "int", min: 0, max: 255 } },
      { code: "S1", value: "64", raw: "SERIAL_SPEED=64", human_readable: "57600 bps", definition: { name: "SERIAL_SPEED", description: "Serial port baud rate encoding", value_type: "enum", choices: [{ value: "1", label: "1200" }, { value: "2", label: "2400" }, { value: "4", label: "4800" }, { value: "9", label: "9600" }, { value: "19", label: "19200" }, { value: "38", label: "38400" }, { value: "57", label: "57600" }, { value: "64", label: "57600 (alt)" }, { value: "115", label: "115200" }, { value: "230", label: "230400" }] } },
      { code: "S2", value: "64", raw: "AIR_SPEED=64", human_readable: "64 kbps", definition: { name: "AIR_SPEED", description: "Over-the-air data rate in kbps", value_type: "enum", choices: [{ value: "2", label: "2 kbps" }, { value: "4", label: "4 kbps" }, { value: "8", label: "8 kbps" }, { value: "16", label: "16 kbps" }, { value: "19", label: "19 kbps" }, { value: "24", label: "24 kbps" }, { value: "32", label: "32 kbps" }, { value: "48", label: "48 kbps" }, { value: "64", label: "64 kbps" }, { value: "96", label: "96 kbps" }, { value: "128", label: "128 kbps" }, { value: "192", label: "192 kbps" }, { value: "250", label: "250 kbps" }] } },
      { code: "S3", value: "25", raw: "NETID=25", human_readable: "Network 25", definition: { name: "NETID", description: "Network ID (must match on both radios)", value_type: "int", min: 0, max: 499 } },
      { code: "S4", value: "20", raw: "TXPOWER=20", human_readable: "20 dBm", definition: { name: "TXPOWER", description: "Transmit power in dBm (0-30)", value_type: "int", min: 0, max: 30, unit: "dBm" } },
      { code: "S5", value: "1", raw: "ECC=1", human_readable: "Enabled", definition: { name: "ECC", description: "Enable error correcting code for improved reliability", value_type: "bool" } },
      { code: "S6", value: "1", raw: "MAVLINK=1", human_readable: "Enabled", definition: { name: "MAVLINK", description: "Enable MAVLink framing mode for optimized telemetry", value_type: "bool" } },
      { code: "S7", value: "0", raw: "OPPRESEND=0", human_readable: "Disabled", definition: { name: "OPPRESEND", description: "Opportunistic resend of missed packets", value_type: "bool" } },
      { code: "S8", value: "915000", raw: "MIN_FREQ=915000", human_readable: "915.000 MHz", definition: { name: "MIN_FREQ", description: "Minimum frequency in kHz", value_type: "int", min: 895000, max: 935000, unit: "kHz" } },
      { code: "S9", value: "928000", raw: "MAX_FREQ=928000", human_readable: "928.000 MHz", definition: { name: "MAX_FREQ", description: "Maximum frequency in kHz", value_type: "int", min: 895000, max: 935000, unit: "kHz" } },
      { code: "S10", value: "50", raw: "NUM_CHANNELS=50", human_readable: "50 channels", definition: { name: "NUM_CHANNELS", description: "Number of frequency hopping channels", value_type: "int", min: 1, max: 50 } },
      { code: "S11", value: "100", raw: "DUTY_CYCLE=100", human_readable: "100%", definition: { name: "DUTY_CYCLE", description: "Transmit duty cycle percentage", value_type: "int", min: 10, max: 100, unit: "%" } },
      { code: "S12", value: "0", raw: "LBT_RSSI=0", human_readable: "Disabled", definition: { name: "LBT_RSSI", description: "Listen-before-talk RSSI threshold (0=disabled)", value_type: "int", min: 0, max: 255 } },
      { code: "S13", value: "0", raw: "MANCHESTER=0", human_readable: "Disabled", definition: { name: "MANCHESTER", description: "Enable Manchester encoding", value_type: "bool" } },
      { code: "S14", value: "1", raw: "RTSCTS=1", human_readable: "Enabled", definition: { name: "RTSCTS", description: "Enable hardware flow control (RTS/CTS)", value_type: "bool" } },
      { code: "S15", value: "131", raw: "MAX_WINDOW=131", human_readable: "131 ms", definition: { name: "MAX_WINDOW", description: "Maximum transmit window in milliseconds", value_type: "int", min: 20, max: 400, unit: "ms" } },
    ],
    rawCommands: {
      "ATI": ["SiK 2.2 on HM-TRP", "OK"],
      "ATI2": ["HopeRF HM-TRP", "Si1000 Rev B", "OK"],
      "ATI3": ["S0:FORMAT", "S1:SERIAL_SPEED", "S2:AIR_SPEED", "S3:NETID", "S4:TXPOWER", "OK"],
      "ATI4": ["915000 to 928000 kHz", "Num channels: 50", "OK"],
      "ATI5": ["S0:FORMAT=25", "S1:SERIAL_SPEED=64", "S2:AIR_SPEED=64", "S3:NETID=25", "S4:TXPOWER=20", "S5:ECC=1", "OK"],
      "ATI6": ["Vcc: 3.3V", "Temp: 28C", "OK"],
      "ATI7": ["EEPROM: 0x1234ABCD", "Flash: 0xDEADBEEF", "OK"],
      "ATI9": ["Bootloader: 1.1", "OK"],
      "AT&V": ["SERIAL_SPEED=57600", "AIR_SPEED=64", "NETID=25", "TXPOWER=20", "ECC=1", "OK"],
      "AT&W": ["OK"],
      "ATZ": ["OK"],
      "ATO": ["OK"],
    },
  };

  class DebugTransport {
    constructor() {
      this.connected = false;
      this.connectedAt = null;
      this.parameters = JSON.parse(JSON.stringify(SIMULATED_DATA.parameters));
    }

    handles(url) {
      return DEBUG_MODE && url.startsWith("/api/");
    }

    async handle(url, options = {}) {
      const method = (options.method || "GET").toUpperCase();
      const path = url.split("?")[0];
      
      // Simulate network delay
      await this._delay(150 + Math.random() * 300);

      if (path === "/api/status") {
        return { status: this._getStatus() };
      }

      if (path === "/api/ports") {
        return { ports: [{ device: "debug://simulated-radio", description: "Simulated Radio (Demo)" }] };
      }

      if (path === "/api/connect" && method === "POST") {
        this.connected = true;
        this.connectedAt = Date.now() / 1000;
        return { status: this._getStatus() };
      }

      if (path === "/api/disconnect" && method === "POST") {
        this.connected = false;
        this.connectedAt = null;
        return { status: this._getStatus() };
      }

      if (path === "/api/info" && this.connected) {
        return { info: SIMULATED_DATA.info };
      }

      if (path === "/api/settings" && method === "GET" && this.connected) {
        return { parameters: this.parameters };
      }

      if (path === "/api/settings/save" && method === "POST" && this.connected) {
        return { status: "saved" };
      }

      const paramMatch = path.match(/^\/api\/settings\/([^/]+)$/);
      if (paramMatch && this.connected) {
        const code = decodeURIComponent(paramMatch[1]).toUpperCase();
        const normalizedCode = code.startsWith("S") ? code : `S${code}`;
        
        if (method === "GET") {
          const param = this.parameters.find(p => p.code === normalizedCode);
          if (param) return { parameter: param };
          throw new Error(`Unknown parameter: ${normalizedCode}`);
        }
        
        if (method === "POST") {
          const body = options.body ? JSON.parse(options.body) : {};
          const param = this.parameters.find(p => p.code === normalizedCode);
          if (param) {
            param.value = String(body.value);
            param.raw = `${param.definition.name}=${body.value}`;
            return { parameter: param };
          }
          throw new Error(`Unknown parameter: ${normalizedCode}`);
        }
      }

      if (path === "/api/reboot" && method === "POST" && this.connected) {
        this.connected = false;
        this.connectedAt = null;
        return { status: "rebooting" };
      }

      if (path === "/api/raw" && method === "POST" && this.connected) {
        const body = options.body ? JSON.parse(options.body) : {};
        const cmd = (body.command || "").toUpperCase().trim();
        const response = SIMULATED_DATA.rawCommands[cmd] || [`Unknown command: ${cmd}`, "ERROR"];
        return { response };
      }

      if (path === "/api/parameter-definitions") {
        const definitions = {};
        SIMULATED_DATA.parameters.forEach(p => {
          definitions[p.code] = p.definition;
        });
        return { definitions };
      }

      if (!this.connected && ["/api/info", "/api/settings", "/api/raw", "/api/reboot"].some(p => path.startsWith(p))) {
        throw new Error("No radio connected (Demo Mode)");
      }

      throw new Error(`Debug mode: Unhandled request ${method} ${path}`);
    }

    _getStatus() {
      return {
        connected: this.connected,
        port: this.connected ? SIMULATED_DATA.status.port : null,
        baudrate: this.connected ? SIMULATED_DATA.status.baudrate : null,
        connected_at: this.connectedAt,
      };
    }

    _delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  const debugTransport = DEBUG_MODE ? new DebugTransport() : null;

  if (DEBUG_MODE) {
    console.log("%c🎮 DEMO MODE ENABLED", "color: #635bff; font-size: 16px; font-weight: bold;");
    console.log("Simulated radio connection is available. All API calls will return mock data.");
    console.log("Remove ?debug from URL to exit demo mode.");
  }

  // ============================================
  // Element References
  // ============================================
  const els = {
    toast: document.getElementById("toast"),
    statusCard: document.getElementById("connection-status"),
    statusValue: document.querySelector("#connection-status .status-value"),
    portSelect: document.getElementById("port-select"),
    portHint: document.getElementById("port-hint"),
    choosePortButton: document.getElementById("choose-port-button"),
    baudRate: document.getElementById("baud-rate"),
    connectForm: document.getElementById("connection-form"),
    connectButton: document.getElementById("connect-button"),
    infoRefresh: document.getElementById("refresh-info"),
    firmwareInfo: document.getElementById("firmware-info"),
    hardwareInfo: document.getElementById("hardware-info"),
    parameterTableBody: document.getElementById("parameter-table-body"),
    parametersRefresh: document.getElementById("refresh-parameters"),
    parametersSave: document.getElementById("save-parameters"),
    rebootButton: document.getElementById("reboot-button"),
    rawForm: document.getElementById("raw-command-form"),
    rawInput: document.getElementById("raw-command"),
    rawSubmit: document.getElementById("raw-command-submit"),
    rawResponse: document.getElementById("raw-command-response"),
    rawSelect: document.getElementById("raw-command-select"),
    rawDescription: document.getElementById("raw-command-description"),
    globalLoading: document.getElementById("global-loading"),
    configSelect: document.getElementById("config-select"),
    configSave: document.getElementById("save-config"),
    configSaveAs: document.getElementById("save-config-as"),
    configSaveAsModal: document.getElementById("config-saveas-modal"),
    configSaveAsName: document.getElementById("config-saveas-name"),
    configSaveAsConfirm: document.getElementById("config-saveas-confirm"),
    configDelete: document.getElementById("delete-config"),
    configDownload: document.getElementById("download-config"),
    configUpload: document.getElementById("upload-config"),
    configUploadInput: document.getElementById("upload-config-input"),
    themeToggle: document.getElementById("theme-toggle"),
    logModal: document.getElementById("activity-log"),
    logBody: document.getElementById("activity-log-body"),
    logList: document.getElementById("activity-log-list"),
    logToggle: document.getElementById("activity-log-toggle"),
    logClear: document.getElementById("activity-log-clear"),
    debugBanner: document.getElementById("debug-banner"),
  };

  // Show debug banner if in debug mode
  if (DEBUG_MODE && els.debugBanner) {
    els.debugBanner.classList.remove("d-none");
  }

  const state = {
    connected: false,
    parameters: [],
    radioParameters: {},
    stagedParameters: {},
    cachedConfigs: [],
    overlayClaims: 0,
    selectedConfigId: null,
    parametersLoaded: false,
    loadingParameters: false,
    theme: null,
    activeParameterCode: null,
    activityLog: [],
    logCollapsed: false,
    statusInitialized: false,
    usingWebSerial: false,
    availablePorts: [],
    selectedPort: null,
  };

  const CONFIG_STORAGE_KEY = "sik-radio-configs";
  const THEME_STORAGE_KEY = "sik-theme";
  const BASE_RAW_COMMANDS = [
    {
      command: "ATI",
      description: "Display firmware version and build information.",
    },
    {
      command: "ATI2",
      description: "Show hardware details and board type.",
    },
    {
      command: "ATI3",
      description: "List the registered AT command handlers.",
    },
    {
      command: "ATI4",
      description: "Show supported frequency ranges.",
    },
    {
      command: "ATI5",
      description: "Dump all configuration parameters.",
    },
    {
      command: "ATI6",
      description: "Display board voltage and temperature telemetry.",
    },
    {
      command: "ATI7",
      description: "Display EEPROM and flash memory signatures.",
    },
    {
      command: "ATI9",
      description: "Show bootloader version information.",
    },
    {
      command: "AT&V",
      description: "View current configuration and channel settings.",
    },
    {
      command: "AT&W",
      description: "Persist the active settings to flash memory.",
    },
    {
      command: "ATZ",
      description: "Reboot the radio and exit command mode.",
    },
    {
      command: "AT&F",
      description: "Restore factory defaults (requires reconnect).",
    },
    {
      command: "ATO",
      description: "Exit command mode and resume data forwarding.",
    },
  ];
  const RAW_COMMAND_CUSTOM_VALUE = "__custom__";
  const MAX_LOG_ENTRIES = 200;

  function generateConfigId() {
    return `cfg-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function normalizeConfig(input) {
    if (!input || typeof input !== "object") {
      return null;
    }
    const name =
      typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;
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
    } catch (error) {
      return [];
    }
  }

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

  function updatePortHintText() {
    if (!els.portHint) {
      return;
    }
    els.portHint.classList.remove("d-none");
    if (state.usingWebSerial) {
      els.portHint.textContent =
        "Authorize access in your browser when prompted to choose a radio.";
    } else if (state.availablePorts.length) {
      els.portHint.textContent =
        "Select a port using the chooser or enter a device name when prompted.";
    } else {
      els.portHint.textContent =
        "No ports detected. Ensure the radio is connected and try again.";
    }
  }

  function getParameterByCode(code) {
    if (!code) {
      return null;
    }
    return (
      state.parameters.find(
        (item) => item && typeof item === "object" && item.code === code
      ) || null
    );
  }

  function normalizeParamValue(value) {
    return value != null ? String(value) : "";
  }

  function setRadioSnapshot(parameters) {
    state.radioParameters = {};
    if (!Array.isArray(parameters)) {
      return;
    }
    parameters.forEach((param) => {
      if (param && typeof param === "object" && typeof param.code === "string") {
        state.radioParameters[param.code] = normalizeParamValue(param.value);
      }
    });
  }

  function setRadioValue(code, value) {
    if (!code) {
      return;
    }
    if (!state.radioParameters || typeof state.radioParameters !== "object") {
      state.radioParameters = {};
    }
    state.radioParameters[code] = normalizeParamValue(value);
  }

  function getRadioValue(code) {
    if (!code || !state.radioParameters) {
      return "";
    }
    return state.radioParameters[code] ?? "";
  }

  function getStagedValue(code) {
    if (!code || !state.stagedParameters) {
      return null;
    }
    if (!Object.prototype.hasOwnProperty.call(state.stagedParameters, code)) {
      return null;
    }
    return state.stagedParameters[code];
  }

  function setStagedValue(code, value) {
    if (!code) {
      return;
    }
    if (!state.stagedParameters || typeof state.stagedParameters !== "object") {
      state.stagedParameters = {};
    }
    if (value == null) {
      delete state.stagedParameters[code];
      return;
    }
    const normalized = normalizeParamValue(value);
    const radioValue = getRadioValue(code);
    if (normalized === radioValue) {
      delete state.stagedParameters[code];
      return;
    }
    state.stagedParameters[code] = normalized;
  }

  function reconcileStagedWithRadio() {
    if (!state.stagedParameters || typeof state.stagedParameters !== "object") {
      return;
    }
    Object.keys(state.stagedParameters).forEach((code) => {
      const stagedValue = state.stagedParameters[code];
      if (stagedValue === getRadioValue(code)) {
        delete state.stagedParameters[code];
      }
    });
  }

  function isParameterUnsaved(code) {
    if (!state.parametersLoaded) {
      return false;
    }
    const stagedValue = getStagedValue(code);
    if (stagedValue == null) {
      return false;
    }
    return stagedValue !== getRadioValue(code);
  }

  function setParameterInputValue(input, value) {
    if (!input) {
      return;
    }
    const normalized = normalizeParamValue(value);
    if (input.tagName === "SELECT") {
      const select = input;
      let option = Array.from(select.options).find(
        (opt) => opt.value === normalized
      );
      if (!option) {
        option = document.createElement("option");
        option.value = normalized;
        option.textContent = `Current: ${normalized || "(empty)"}`;
        select.appendChild(option);
      }
      select.value = normalized;
      return;
    }
    input.value = normalized;
  }

  function updateUnsavedBadge(row, unsaved) {
    if (!row) {
      return;
    }
    const valueDisplay = row.querySelector(".value-display");
    if (!valueDisplay) {
      return;
    }
    const existing = valueDisplay.querySelector(".unsaved-badge");
    if (unsaved) {
      if (existing) {
        return;
      }
      const badge = document.createElement("span");
      badge.className = "unsaved-badge";
      badge.textContent = "Unsaved";
      valueDisplay.appendChild(badge);
    } else if (existing) {
      existing.remove();
    }
  }

  function syncRowUnsavedState(row, parameter, options = {}) {
    if (!row) {
      return;
    }
    const code = row.dataset.code;
    if (!code) {
      return;
    }
    const unsaved = isParameterUnsaved(code);
    row.classList.toggle("unsaved", unsaved);
    updateUnsavedBadge(row, unsaved);
    if (options.preserveInput) {
      return;
    }
    const input = row.querySelector(".param-input");
    if (!input) {
      return;
    }
    if (row.classList.contains("editing") && !options.forceInput) {
      return;
    }
    const stagedValue = getStagedValue(code);
    const fallback = parameter
      ? normalizeParamValue(parameter.value)
      : getRadioValue(code);
    const desired = stagedValue != null ? stagedValue : fallback;
    setParameterInputValue(input, desired);
  }

  function refreshParameterRowStates(options = {}) {
    if (!els.parameterTableBody) {
      return;
    }
    const rows = els.parameterTableBody.querySelectorAll("tr.parameter-row");
    rows.forEach((row) => {
      const code = row.dataset.code;
      if (!code) {
        return;
      }
      const parameter = getParameterByCode(code);
      if (parameter) {
        syncRowUnsavedState(row, parameter, options);
      }
    });
  }

  function setRowEditing(row, editing) {
    if (!row) {
      return;
    }
    const code = row.dataset.code;
    if (!code) {
      return;
    }
    if (editing) {
      if (state.activeParameterCode && state.activeParameterCode !== code) {
        const activeRow =
          els.parameterTableBody &&
          els.parameterTableBody.querySelector(
            `tr.parameter-row[data-code="${state.activeParameterCode}"]`
          );
        if (activeRow) {
          setRowEditing(activeRow, false);
        }
      }
      const parameter = getParameterByCode(code);
      if (parameter) {
        updateParameterRow(row, parameter);
      }
      const baseValue =
        getStagedValue(code) ??
        (parameter ? normalizeParamValue(parameter.value) : "");
      row.dataset.originalValue = baseValue;
      row.classList.add("editing");
      state.activeParameterCode = code;
      const input = row.querySelector(".param-input");
      if (input) {
        input.disabled = false;
        requestAnimationFrame(() => {
          try {
            if (input.tagName === "SELECT") {
              input.focus();
            } else {
              input.focus({ preventScroll: true });
              input.select();
            }
          } catch (_error) {
            // Ignore focus errors
          }
        });
      }
    } else {
      row.classList.remove("editing");
      const input = row.querySelector(".param-input");
      if (input) {
        input.disabled = true;
        input.blur();
      }
      const parameter = getParameterByCode(code);
      if (parameter) {
        updateParameterRow(row, parameter);
      }
      if (state.activeParameterCode === code) {
        state.activeParameterCode = null;
      }
      delete row.dataset.originalValue;
    }
  }

  function buildParameterCommandOptions() {
    if (!Array.isArray(state.parameters) || !state.parameters.length) {
      return [];
    }
    return state.parameters.map((param) => ({
      command: `ATS${param.code}?`,
      description: `Read ${ (param.definition && param.definition.name) || `parameter ${param.code}` }`,
    }));
  }

  function refreshRawCommandOptions() {
    if (!els.rawSelect) {
      return;
    }
    const previousValue = els.rawSelect.value || RAW_COMMAND_CUSTOM_VALUE;
    els.rawSelect.innerHTML = "";

    const customOption = document.createElement("option");
    customOption.value = RAW_COMMAND_CUSTOM_VALUE;
    customOption.textContent = "Custom command";
    customOption.dataset.description = "Enter any AT command manually.";
    els.rawSelect.appendChild(customOption);

    if (BASE_RAW_COMMANDS.length) {
      const baseGroup = document.createElement("optgroup");
      baseGroup.label = "Common Commands";
      BASE_RAW_COMMANDS.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.command;
        option.textContent = `${preset.command} — ${preset.description}`;
        option.dataset.description = preset.description;
        baseGroup.appendChild(option);
      });
      els.rawSelect.appendChild(baseGroup);
    }

    const parameterCommands = buildParameterCommandOptions();
    if (parameterCommands.length) {
      const paramGroup = document.createElement("optgroup");
      paramGroup.label = "Parameter Queries";
      parameterCommands.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.command;
        option.textContent = `${preset.command} — ${preset.description}`;
        option.dataset.description = preset.description;
        paramGroup.appendChild(option);
      });
      els.rawSelect.appendChild(paramGroup);
    }

    const hasPrevious = Array.from(els.rawSelect.options).some(
      (opt) => opt.value === previousValue
    );
    els.rawSelect.value = hasPrevious ? previousValue : RAW_COMMAND_CUSTOM_VALUE;
    handleRawCommandPresetChange();

    if (els.rawSelect) {
      els.rawSelect.disabled = !state.connected;
    }
    if (els.rawInput) {
      els.rawInput.disabled = !state.connected;
    }
    if (!state.connected && els.rawDescription) {
      els.rawDescription.textContent = "Connect to a radio to send commands.";
    }
  }

  function handleRawCommandPresetChange() {
    if (!els.rawSelect || !els.rawInput) {
      return;
    }
    const selectedOption = els.rawSelect.options[els.rawSelect.selectedIndex];
    const selectedValue = els.rawSelect.value;
    const description =
      selectedOption && selectedOption.dataset && selectedOption.dataset.description
        ? selectedOption.dataset.description
        : "Select a command to view details.";
    if (els.rawDescription) {
      els.rawDescription.textContent = description;
    }
    if (selectedValue === RAW_COMMAND_CUSTOM_VALUE) {
      els.rawInput.placeholder = "Enter AT command";
      els.rawInput.readOnly = false;
    } else {
      els.rawInput.value = selectedValue;
      els.rawInput.readOnly = false;
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
    } catch (error) {
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
    stageSelectedConfiguration();
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

  function stageSelectedConfiguration() {
    const config = getSelectedConfig();
    if (!config) {
      return;
    }
    state.stagedParameters = {};
    const entries = Object.entries(config.parameters || {});
    entries.forEach(([code, value]) => {
      if (typeof code !== "string") {
        return;
      }
      state.stagedParameters[code] = normalizeParamValue(value);
    });
    reconcileStagedWithRadio();
    refreshParameterRowStates();
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

  function setGlobalLoading(active) {
    if (!els.globalLoading) {
      return;
    }
    state.overlayClaims = Math.max(
      0,
      state.overlayClaims + (active ? 1 : -1)
    );
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

  function logEvent(message, level = "info") {
    const timestamp = new Date();
    const entry = {
      id: `log-${timestamp.getTime()}-${Math.random().toString(16).slice(2, 10)}`,
      time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message,
      level,
    };
    state.activityLog.push(entry);
    if (state.activityLog.length > MAX_LOG_ENTRIES) {
      state.activityLog.shift();
    }
    renderLog();
  }

  function renderLog() {
    if (!els.logList) {
      return;
    }
    els.logList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    state.activityLog.forEach((entry) => {
      const item = document.createElement("li");
      item.className = `log-item log-${entry.level}`;
      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = entry.time;
      const message = document.createElement("span");
      message.className = "log-message";
      message.textContent = entry.message;
      item.appendChild(time);
      item.appendChild(message);
      fragment.appendChild(item);
    });
    els.logList.appendChild(fragment);
    if (!state.logCollapsed && els.logBody) {
      els.logBody.scrollTop = els.logBody.scrollHeight;
    }
  }

  function toggleLogCollapse() {
    state.logCollapsed = !state.logCollapsed;
    if (els.logModal) {
      els.logModal.classList.toggle("collapsed", state.logCollapsed);
    }
    if (els.logToggle) {
      els.logToggle.textContent = state.logCollapsed ? "Expand" : "Minimize";
    }
    if (!state.logCollapsed && els.logBody) {
      els.logBody.scrollTop = els.logBody.scrollHeight;
    }
  }

  function clearLog() {
    state.activityLog = [];
    renderLog();
    logEvent("Activity log cleared.", "info");
  }

  function getStoredTheme() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    try {
      const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
      return theme === "dark" || theme === "light" ? theme : null;
    } catch (_error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function updateThemeToggleLabel(theme) {
    if (!els.themeToggle) {
      return;
    }
    const label = els.themeToggle.querySelector("[data-theme-label]");
    const nextLabel = theme === "dark" ? "Light Mode" : "Dark Mode";
    if (label) {
      label.textContent = nextLabel;
    } else {
      els.themeToggle.textContent = nextLabel;
    }
    els.themeToggle.setAttribute("aria-label", `Switch to ${nextLabel}`);
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const effectiveTheme = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-bs-theme", effectiveTheme);
    state.theme = effectiveTheme;
    updateThemeToggleLabel(effectiveTheme);
  }

  function getPreferredTheme() {
    const stored = getStoredTheme();
    if (stored) {
      return stored;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function toggleTheme() {
    const next = state.theme === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
  }

  function initTheme() {
    const preferred = getPreferredTheme();
    applyTheme(preferred);
    if (window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (event) => {
        if (!getStoredTheme()) {
          applyTheme(event.matches ? "dark" : "light");
        }
      };
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(onChange);
      }
    }
  }

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

  const httpFetchJSON = async (url, { method = "GET", body, headers } = {}) => {
    const response = await window.fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body,
    });

    let data;
    try {
      data = await response.json();
    } catch (_error) {
      data = {};
    }

    if (!response.ok) {
      const message = data && data.error ? data.error : `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  };

  class WebSerialTransport {
    constructor(httpFetchJSON) {
      this.httpFetchJSON = httpFetchJSON;
      this.stopTokens = ["OK", "ERROR", "ERR"];
      this.encoder = new TextEncoder();
      this.decoder = new TextDecoder();
      this.portRecords = new Map();
      this.portIdMap = new WeakMap();
      this.usedPortIds = new Set();
      this.active = null;
      this.writer = null;
      this.pending = Promise.resolve();
      this.definitions = null;
      this.defaultBaudrate = 57600;
    }

    handles(url, options = {}) {
      const method = (options && options.method ? options.method : "GET").toUpperCase();
      const path = url.split("?")[0];
      if (!path.startsWith("/api/")) {
        return false;
      }
      if (path === "/api/parameter-definitions") {
        return false;
      }
      if (method === "GET" && (path === "/api/ports" || path === "/api/status" || path === "/api/info" || path === "/api/settings")) {
        return true;
      }
      if (method === "POST" && (path === "/api/connect" || path === "/api/disconnect" || path === "/api/settings/save" || path === "/api/reboot" || path === "/api/raw")) {
        return true;
      }
      if (path.startsWith("/api/settings/")) {
        return true;
      }
      return false;
    }

    async handle(url, options = {}) {
      const method = (options && options.method ? options.method : "GET").toUpperCase();
      const path = url.split("?")[0];
      const payload = this._parsePayload(options.body);

      if (method === "GET" && path === "/api/status") {
        return { status: this.status() };
      }

      return this._queue(async () => {
        if (method === "GET" && path === "/api/ports") {
          const ports = await this.listPorts();
          return { ports };
        }
        if (method === "POST" && path === "/api/connect") {
          const status = await this.connect(payload);
          return { status };
        }
        if (method === "POST" && path === "/api/disconnect") {
          const status = await this.disconnect();
          return { status };
        }
        if (method === "GET" && path === "/api/info") {
          const info = await this.getDeviceInfo();
          return { info };
        }
        if (method === "GET" && path === "/api/settings") {
          const parameters = await this.getParameters();
          return { parameters };
        }
        if (path === "/api/settings/save" && method === "POST") {
          await this.saveParameters();
          return { status: "saved" };
        }
        const parameterMatch = path.match(/^\/api\/settings\/([^/]+)$/);
        if (parameterMatch) {
          const code = decodeURIComponent(parameterMatch[1]);
          if (method === "GET") {
            const parameter = await this.queryParameter(code);
            return { parameter };
          }
          if (method === "POST") {
            const parameter = await this.setParameter(code, payload && payload.value);
            return { parameter };
          }
        }
        if (path === "/api/reboot" && method === "POST") {
          await this.reboot();
          return { status: "rebooting" };
        }
        if (path === "/api/raw" && method === "POST") {
          const response = await this.sendRawCommand(payload && payload.command);
          return { response };
        }
        throw new Error(`Unsupported Web Serial request: ${method} ${path}`);
      });
    }

    async listPorts() {
      await this._refreshPorts();
      return Array.from(this.portRecords.values()).map((record) => ({
        device: record.id,
        description: record.label,
        hwid: record.hwid,
      }));
    }

    async resolvePortSelection(portId) {
      const record = await this._resolvePortRecord(portId);
      return record ? record.id : null;
    }

    async connect(payload = {}) {
      const requestedBaud = Number.parseInt(payload.baudrate, 10);
      const baudrate = Number.isFinite(requestedBaud) && requestedBaud > 0 ? requestedBaud : this.defaultBaudrate;

      if (this.active) {
        if (payload.port && this.active.id === payload.port && this.active.baudrate === baudrate) {
          return this.status();
        }
        throw new Error(`Already connected to ${this.active.label || "a radio"}. Disconnect before connecting elsewhere.`);
      }

      const record = await this._resolvePortRecord(payload.port);
      if (!record) {
        throw new Error("Serial port selection was cancelled.");
      }

      await record.port.open({
        baudRate: baudrate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 4096,
      });
      this.writer = record.port.writable.getWriter();

      try {
        await this._enterCommandMode(record.port);
      } catch (error) {
        try {
          this.writer.releaseLock();
        } catch (_releaseError) {
          // Ignore release errors.
        }
        this.writer = null;
        try {
          await record.port.close();
        } catch (_closeError) {
          // Ignore close errors.
        }
        throw error instanceof Error ? error : new Error(String(error));
      }

      this.active = {
        id: record.id,
        port: record.port,
        label: record.label,
        hwid: record.hwid,
        baudrate,
        connectedAt: Date.now() / 1000,
      };

      return this.status();
    }

    async disconnect() {
      await this._disconnectInternal();
      return this.status();
    }

    status() {
      if (!this.active) {
        return {
          connected: false,
          port: null,
          baudrate: null,
          connected_at: null,
        };
      }
      return {
        connected: true,
        port: this.active.label,
        baudrate: this.active.baudrate,
        connected_at: this.active.connectedAt,
      };
    }

    async getDeviceInfo() {
      this._ensureConnected();
      const info = {};
      const commands = {
        firmware: "ATI",
        hardware: "ATI2",
        registers: "ATI3",
        board_frequencies: "ATI4",
      };
      for (const [key, command] of Object.entries(commands)) {
        const lines = await this._executeCommand(command);
        info[key] = lines.filter((line) => !this.stopTokens.includes(line));
      }
      return info;
    }

    async getParameters() {
      this._ensureConnected();
      await this._ensureDefinitions();
      const lines = await this._executeCommand("ATI5");
      const parameters = [];
      for (const line of lines) {
        if (!line || this.stopTokens.includes(line)) {
          continue;
        }
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) {
          continue;
        }
        const code = line.slice(0, separatorIndex).trim().toUpperCase();
        const rawValue = line.slice(separatorIndex + 1).trim();
        const value = this.extractValueToken(rawValue);
        const definition = (this.definitions && this.definitions[code]) || {};
        parameters.push({
          code,
          value,
          raw: rawValue,
          human_readable: this.interpretValue(code, value),
          definition,
        });
      }
      return parameters;
    }

    async queryParameter(parameter) {
      this._ensureConnected();
      await this._ensureDefinitions();
      const normalized = this._normalizeParameter(parameter);
      const lines = await this._executeCommand(`ATS${normalized}?`);
      let value = null;
      let rawValue = null;
      for (const line of lines) {
        if (!line || this.stopTokens.includes(line)) {
          continue;
        }
        const separatorIndex = line.indexOf(":");
        if (separatorIndex !== -1) {
          rawValue = line.slice(separatorIndex + 1).trim();
          value = this.extractValueToken(rawValue);
          break;
        }
      }
      if (value === null) {
        throw new Error(`Failed to read parameter S${normalized}`);
      }
      const code = `S${normalized}`;
      const definition = (this.definitions && this.definitions[code]) || {};
      return {
        code,
        value,
        raw: rawValue,
        human_readable: this.interpretValue(code, value),
        definition,
      };
    }

    async setParameter(parameter, value) {
      this._ensureConnected();
      const normalized = this._normalizeParameter(parameter);
      const response = await this._executeCommand(`ATS${normalized}=${value}`);
      if (!this._didCommandSucceed(response)) {
        throw new Error("Radio rejected the parameter update.");
      }
      return this.queryParameter(normalized);
    }

    async saveParameters() {
      this._ensureConnected();
      const response = await this._executeCommand("AT&W");
      if (!this._didCommandSucceed(response)) {
        throw new Error("Failed to write parameters to radio.");
      }
    }

    async reboot() {
      this._ensureConnected();
      const response = await this._executeCommand("ATZ");
      if (!this._didCommandSucceed(response)) {
        throw new Error("Radio did not acknowledge reboot.");
      }
      await this._disconnectInternal({ sendEscape: false });
    }

    async sendRawCommand(command) {
      this._ensureConnected();
      if (!command || typeof command !== "string") {
        throw new Error("Command must not be empty.");
      }
      return this._executeCommand(command, { sanitize: false });
    }

    async _ensureDefinitions() {
      if (this.definitions) {
        return;
      }
      try {
        const payload = await this.httpFetchJSON("/api/parameter-definitions");
        this.definitions = payload && payload.definitions ? payload.definitions : {};
      } catch (_error) {
        this.definitions = {};
      }
    }

    extractValueToken(payload) {
      if (payload == null) {
        return "";
      }
      const trimmed = String(payload).trim();
      if (!trimmed) {
        return "";
      }
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex !== -1) {
        return trimmed.slice(eqIndex + 1).trim();
      }
      return trimmed;
    }

    interpretValue(code, value) {
      if (!this.definitions || !this.definitions[code]) {
        return value != null ? String(value).trim() || null : null;
      }
      const definition = this.definitions[code];
      const normalized = value != null ? String(value).trim() : "";
      if (definition.aliases && Object.prototype.hasOwnProperty.call(definition.aliases, normalized)) {
        return definition.aliases[normalized];
      }
      if (definition.value_type === "enum" && Array.isArray(definition.choices)) {
        const match = definition.choices.find((choice) => String(choice.value) === normalized);
        if (match && match.label) {
          return match.label;
        }
      } else if (definition.value_type === "bool") {
        if (normalized === "1") {
          return "Enabled";
        }
        if (normalized === "0") {
          return "Disabled";
        }
      }
      if (definition.unit) {
        if (!normalized.endsWith(definition.unit)) {
          return `${normalized} ${definition.unit}`.trim();
        }
      }
      return normalized || null;
    }

    _normalizeParameter(parameter) {
      const raw = String(parameter || "").trim().toUpperCase();
      const normalized = raw.startsWith("S") ? raw.slice(1) : raw;
      if (!/^\d+$/.test(normalized)) {
        throw new Error(`Invalid parameter identifier: ${parameter}`);
      }
      return normalized;
    }

    _didCommandSucceed(response) {
      return Array.isArray(response) && response.some((line) => line === "OK");
    }

    _ensureConnected() {
      if (!this.active || !this.active.port || !this.active.port.readable || !this.writer) {
        throw new Error("No radio is currently connected.");
      }
      return this.active;
    }

    async _enterCommandMode(port) {
      await this._sleep(1200);
      await this._drainInput(port);
      await this._writeRaw("+++");
      const lines = await this._readResponse(port, 2.5, ["OK"]);
      if (!lines.includes("OK")) {
        throw new Error("Radio did not acknowledge command mode request ('+++').");
      }
      await this._sleep(200);
    }

    async _executeCommand(command, { sanitize = true, timeoutSeconds = 1.5, stopTokens = this.stopTokens } = {}) {
      const prepared = typeof command === "string" ? command.trim() : "";
      if (!prepared) {
        throw new Error("Command must not be empty.");
      }
      const active = this._ensureConnected();
      if (sanitize) {
        await this._drainInput(active.port);
      }
      await this._writeCommand(prepared);
      return this._readResponse(active.port, timeoutSeconds, stopTokens);
    }

    async _drainInput(port) {
      if (!port || !port.readable) {
        return;
      }
      const reader = port.readable.getReader();
      const deadline = performance.now() + 200;
      try {
        while (performance.now() < deadline) {
          const remaining = deadline - performance.now();
          const chunk = await this._readChunk(reader, remaining);
          if (!chunk || chunk.timedOut || chunk.done || !chunk.value || chunk.value.length === 0) {
            break;
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    async _readResponse(port, timeoutSeconds = 1.5, stopTokens = this.stopTokens) {
      if (!port || !port.readable) {
        return [];
      }
      const reader = port.readable.getReader();
      const deadline = performance.now() + timeoutSeconds * 1000;
      const lines = [];
      let buffer = "";
      const stopSet = new Set(stopTokens || []);
      try {
        while (performance.now() < deadline) {
          const remaining = deadline - performance.now();
          const chunk = await this._readChunk(reader, remaining);
          if (!chunk || chunk.timedOut) {
            break;
          }
          if (chunk.done) {
            break;
          }
          if (chunk.value && chunk.value.length) {
            buffer += this.decoder.decode(chunk.value, { stream: true });
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const rawLine = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              const line = rawLine.replace(/\r/g, "").trim();
              if (line) {
                lines.push(line);
                if (stopSet.has(line)) {
                  return lines;
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const trailing = buffer.replace(/\r/g, "").trim();
      if (trailing) {
        lines.push(trailing);
      }
      return lines;
    }

    _readChunk(reader, timeoutMs) {
      if (timeoutMs <= 0) {
        return Promise.resolve({ value: null, done: false, timedOut: true });
      }
      return Promise.race([
        reader.read(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ value: null, done: false, timedOut: true }), timeoutMs)
        ),
      ]);
    }

    async _writeRaw(text) {
      if (!this.writer) {
        throw new Error("Serial writer is not ready.");
      }
      await this.writer.write(this.encoder.encode(text));
    }

    async _writeCommand(command) {
      await this._writeRaw(`${command}\r\n`);
    }

    async _disconnectInternal({ sendEscape = true } = {}) {
      if (!this.active) {
        return;
      }
      if (sendEscape) {
        try {
          await this._writeCommand("ATO");
          await this._sleep(100);
        } catch (_error) {
          // Ignore failures when attempting to exit command mode.
        }
      }
      try {
        if (this.writer) {
          this.writer.releaseLock();
        }
      } catch (_releaseError) {
        // Ignore release errors.
      }
      this.writer = null;
      try {
        await this.active.port.close();
      } catch (_closeError) {
        // Ignore close errors.
      }
      this.active = null;
    }

    async _refreshPorts() {
      const ports = await navigator.serial.getPorts();
      const nextRecords = new Map();
      for (const port of ports) {
        const id = this._ensurePortRegistered(port);
        const record = this._describePort(port, id);
        nextRecords.set(id, record);
      }
      this.portRecords = nextRecords;
      return nextRecords;
    }

    _ensurePortRegistered(port) {
      let existing = this.portIdMap.get(port);
      if (existing) {
        return existing;
      }
      const info = this._getPortInfo(port);
      const base = this._buildPortIdBase(info);
      let candidate = base;
      let suffix = 1;
      while (this.usedPortIds.has(candidate)) {
        suffix += 1;
        candidate = `${base}:${suffix}`;
      }
      this.portIdMap.set(port, candidate);
      this.usedPortIds.add(candidate);
      return candidate;
    }

    _getPortInfo(port) {
      try {
        return port.getInfo();
      } catch (_error) {
        return {};
      }
    }

    _buildPortIdBase(info) {
      const vendor = info && info.usbVendorId != null ? this._formatHex(info.usbVendorId) : "unknown-vendor";
      const product = info && info.usbProductId != null ? this._formatHex(info.usbProductId) : "unknown-product";
      return `webserial:${vendor}:${product}`;
    }

    _formatHex(value, padding = 4) {
      return Number(value).toString(16).toUpperCase().padStart(padding, "0");
    }

    _describePort(port, id) {
      const info = this._getPortInfo(port);
      const labels = [];
      if (info && info.usbVendorId != null && info.usbProductId != null) {
        labels.push(`USB ${this._formatHex(info.usbVendorId)}:${this._formatHex(info.usbProductId)}`);
      }
      if (info && info.serialNumber) {
        labels.push(`#${info.serialNumber}`);
      }
      const label = labels.length ? labels.join(" ") : "Web Serial Device";
      const hwidParts = [];
      if (info && info.usbVendorId != null && info.usbProductId != null) {
        hwidParts.push(`VID:PID=${this._formatHex(info.usbVendorId)}:${this._formatHex(info.usbProductId)}`);
      }
      if (info && info.manufacturer) {
        hwidParts.push(info.manufacturer);
      }
      if (info && info.product) {
        hwidParts.push(info.product);
      }
      return {
        id,
        port,
        label,
        hwid: hwidParts.length ? hwidParts.join(" ") : "WebSerial",
      };
    }

    async promptPortSelection() {
      try {
        const port = await navigator.serial.requestPort();
        const id = this._ensurePortRegistered(port);
        await this._refreshPorts();
        return this.portRecords.get(id) || null;
      } catch (error) {
        if (error && (error.name === "NotFoundError" || error.name === "AbortError")) {
          return null;
        }
        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    async _resolvePortRecord(portId) {
      await this._refreshPorts();
      if (portId && this.portRecords.has(portId)) {
        return this.portRecords.get(portId);
      }
      if (portId && !String(portId).startsWith("webserial:")) {
        throw new Error("Use the browser's Web Serial prompt to select a port.");
      }
      return this.promptPortSelection();
    }

    _parsePayload(body) {
      if (!body) {
        return {};
      }
      try {
        return JSON.parse(body);
      } catch (_error) {
        return {};
      }
    }

    _queue(task) {
      const run = this.pending.then(() => task());
      this.pending = run.catch(() => {});
      return run;
    }

    _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

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
    updatePortHintText();
  }

  if (DEBUG_MODE) {
    logEvent(
      "🎮 DEMO MODE: Simulated radio available. Connect to explore all features.",
      "warning"
    );
  }

  async function fetchJSON(url, options = {}) {
    // Debug transport takes priority
    if (debugTransport && debugTransport.handles(url, options)) {
      return debugTransport.handle(url, options);
    }
    if (webSerialTransport && webSerialTransport.handles(url, options)) {
      return webSerialTransport.handle(url, options);
    }
    return httpFetchJSON(url, options);
  }

  function updateStatusCard(status) {
    state.connected = Boolean(status.connected);
    const connected = state.connected;

    els.statusValue.textContent = connected ? "Connected" : "Disconnected";

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
    updateConfigButtonsState();

    if (connected && !state.parametersLoaded && !state.loadingParameters) {
      loadInfo({ silent: true });
      loadParameters({ silent: true });
    }
  }

  function toggleControls(connected) {
    if (els.connectButton) {
      const hasPort = Boolean(getSelectedPort());
      // Dynamic connect/disconnect button
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
    if (els.portSelect) {
      els.portSelect.readOnly = true;
      if (!connected) {
        els.portSelect.classList.toggle("is-invalid", !getSelectedPort());
      } else {
        els.portSelect.classList.remove("is-invalid");
      }
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
    updatePortHintText();
  }

  function clearInfoPanels() {
    els.firmwareInfo.textContent = "--";
    els.hardwareInfo.textContent = "--";
  }

  function clearParametersTable(message = "Connect to a radio to load parameters.") {
    els.parameterTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state">${message}</td>
      </tr>
    `;
    state.parameters = [];
    state.parametersLoaded = false;
    state.loadingParameters = false;
    state.activeParameterCode = null;
    state.radioParameters = {};
    updateConfigButtonsState();
    refreshRawCommandOptions();
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
        const match = normalized.find((item) => item.value === state.selectedPort.value);
        if (match) {
          setSelectedPort(match);
        }
      }

      updatePortHintText();
      logEvent(
        `Detected ${normalized.length} port${normalized.length === 1 ? "" : "s"}.`,
        "success"
      );
      return normalized;
    } catch (error) {
      logEvent(
        `Failed to list serial ports: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
      return null;
    }
  }

  async function choosePort() {
    // In demo mode, auto-select the simulated port
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

  async function refreshStatus() {
    try {
      logEvent("Checking radio connection status...", "info");
      const wasConnected = state.connected;
      const { status } = await fetchJSON("/api/status");
      updateStatusCard(status);
      if (!status.connected) {
        clearInfoPanels();
        clearParametersTable();
        if (!state.statusInitialized || wasConnected !== status.connected) {
          logEvent("Status: radio disconnected.", "warning");
        }
      } else if (!state.statusInitialized || wasConnected !== status.connected) {
        logEvent(
          `Status: connected to ${status.port ?? "?"} @ ${status.baudrate ?? "?"} baud.`,
          "success"
        );
      }
      state.statusInitialized = true;
    } catch (error) {
      logEvent(
        `Failed to read status: ${error instanceof Error ? error.message : String(error)}`,
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
      logEvent(
        `Connected to ${displayPort} @ ${connectedBaud} baud.`,
        "success"
      );
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
      clearInfoPanels();
      clearParametersTable();
      els.rawResponse.textContent = "Response will appear here.";
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

  function renderInfo(info = {}) {
    const fallback = (lines) => (Array.isArray(lines) && lines.length ? lines.join("\n") : "--");
    els.firmwareInfo.textContent = fallback(info.firmware);
    els.hardwareInfo.textContent = fallback(info.hardware);
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
        `Failed to load radio information: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  async function loadParameters(options = {}) {
    if (!state.connected || state.loadingParameters) {
      return;
    }
    state.loadingParameters = true;
    logEvent("Requesting parameter list from radio...", "info");
    try {
      await runWithLoading(
        async () => {
          const { parameters } = await fetchJSON("/api/settings");
          state.parameters = parameters;
          state.parametersLoaded = true;
          setRadioSnapshot(parameters);
          reconcileStagedWithRadio();
          renderParameters(parameters);
          logEvent(`Loaded ${parameters.length} parameters.`, "success");
        },
        options
      );
    } catch (error) {
      state.parametersLoaded = false;
      logEvent(
        `Failed to load parameters: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    } finally {
      state.loadingParameters = false;
      updateConfigButtonsState();
    }
  }

  function renderParameters(parameters) {
    const previousActive = state.activeParameterCode;
    state.activeParameterCode = null;
    els.parameterTableBody.innerHTML = "";

    if (!Array.isArray(parameters) || !parameters.length) {
      clearParametersTable("No parameter data received from the radio.");
      state.parametersLoaded = true;
      return;
    }

    let rowToActivate = null;

    parameters.forEach((param) => {
      const row = document.createElement("tr");
      row.className = "parameter-row";
      row.dataset.code = param.code;
      row.tabIndex = 0;

      const codeCell = document.createElement("td");
      const codeBadge = document.createElement("span");
      codeBadge.className = "value-chip";
      codeBadge.textContent = param.code;
      codeCell.appendChild(codeBadge);

      const nameCell = document.createElement("td");
      const definition = param.definition || {};
      const name = definition.name || "Unknown parameter";
      const description = definition.description || "";
      const nameEl = document.createElement("div");
      nameEl.className = "param-name";
      nameEl.textContent = name;
      nameCell.appendChild(nameEl);
      if (description) {
        const descEl = document.createElement("div");
        descEl.className = "param-description";
        descEl.textContent = description;
        nameCell.appendChild(descEl);
      }

      const currentCell = document.createElement("td");
      currentCell.className = "parameter-value-cell";
      const valueDisplay = document.createElement("div");
      valueDisplay.className = "value-display";
      const valueChip = document.createElement("span");
      valueChip.className = "value-chip";
      valueChip.textContent = param.value != null ? String(param.value) : "?";
      valueDisplay.appendChild(valueChip);
      const human = param.human_readable;
      if (human && human !== String(param.value)) {
        const humanHint = document.createElement("span");
        humanHint.className = "value-hint";
        humanHint.textContent = human;
        valueDisplay.appendChild(humanHint);
      }
      currentCell.appendChild(valueDisplay);

      const editor = document.createElement("div");
      editor.className = "parameter-editor";
      const input = buildParameterInput(param);
      input.classList.add("param-input");
      input.disabled = true;
      editor.appendChild(input);

      const actions = document.createElement("div");
      actions.className = "parameter-editor-actions";
      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.textContent = "Apply";
      applyButton.dataset.action = "apply";
      applyButton.className = "btn btn-primary btn-sm";
      actions.appendChild(applyButton);

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      cancelButton.dataset.action = "cancel";
      cancelButton.className = "btn btn-outline-secondary btn-sm";
      actions.appendChild(cancelButton);

      editor.appendChild(actions);
      currentCell.appendChild(editor);

      row.appendChild(codeCell);
      row.appendChild(nameCell);
      row.appendChild(currentCell);

      els.parameterTableBody.appendChild(row);
      syncRowUnsavedState(row, param, { forceInput: true });

      if (param.code === previousActive) {
        rowToActivate = row;
      }
    });

    if (rowToActivate) {
      setRowEditing(rowToActivate, true);
    }

    refreshRawCommandOptions();
  }

  function buildParameterInput(param) {
    const definition = param.definition || {};
    const valueType = (definition.value_type || "").toLowerCase();
    const rawValue = param.value != null ? String(param.value) : "";

    if (valueType === "bool") {
      const select = document.createElement("select");
      select.classList.add("form-select");
      select.dataset.code = param.code;
      [
        { value: "1", label: "Enabled" },
        { value: "0", label: "Disabled" },
      ].forEach((optionDef) => {
        const option = document.createElement("option");
        option.value = optionDef.value;
        option.textContent = optionDef.label;
        select.appendChild(option);
      });
      const normalized = rawValue.toLowerCase();
      if (normalized === "1" || normalized === "true" || normalized === "enabled") {
        select.value = "1";
      } else if (normalized === "0" || normalized === "false" || normalized === "disabled") {
        select.value = "0";
      } else {
        const customOption = document.createElement("option");
        customOption.value = rawValue;
        customOption.textContent = `Current: ${rawValue}`;
        select.appendChild(customOption);
        select.value = rawValue;
      }
      return select;
    }

    if (valueType === "enum" && Array.isArray(definition.choices) && definition.choices.length) {
      const select = document.createElement("select");
      select.classList.add("form-select");
      select.dataset.code = param.code;
      definition.choices.forEach((choice) => {
        const option = document.createElement("option");
        option.value = String(choice.value);
        option.textContent = choice.label || choice.value;
        select.appendChild(option);
      });
      const matched = definition.choices.some(
        (choice) => String(choice.value) === rawValue
      );
      if (!matched && rawValue) {
        const customOption = document.createElement("option");
        customOption.value = rawValue;
        customOption.textContent = `Current: ${rawValue}`;
        customOption.selected = true;
        select.appendChild(customOption);
      } else {
        select.value = rawValue;
      }
      return select;
    }

    const input = document.createElement("input");
    input.classList.add("form-control");
    input.dataset.code = param.code;
    if (valueType === "int") {
      input.type = "number";
      if (definition.range && typeof definition.range.min === "number") {
        input.min = definition.range.min;
      }
      if (definition.range && typeof definition.range.max === "number") {
        input.max = definition.range.max;
      }
    } else {
      input.type = "text";
    }
    input.value = rawValue;
    return input;
  }

  async function applyParameter(code, value, row, triggerButton) {
    const normalizedValue = typeof value === "string" ? value.trim() : value;
    const displayValue = normalizedValue != null ? String(normalizedValue) : "";
    row.classList.add("updating");
    try {
      logEvent(`Applying ${code} = ${displayValue}`, "info");
      const parameter = await runWithLoading(
        async () => {
          const { parameter } = await fetchJSON(`/api/settings/${code}`, {
            method: "POST",
            body: JSON.stringify({ value: normalizedValue }),
          });
          return parameter;
        },
        { button: triggerButton, label: "Applying..." }
      );
      if (parameter) {
        setRadioValue(parameter.code, parameter.value);
        setStagedValue(parameter.code, null);
        updateParameterRow(row, parameter);
        showToast(`Updated ${parameter.code} -> ${parameter.value}`);
        logEvent(`Parameter ${parameter.code} updated to ${parameter.value}`, "success");
        row.classList.add("success");
        setTimeout(() => row.classList.remove("success"), 1400);
        setRowEditing(row, false);
      }
    } catch (error) {
      logEvent(
        `Failed to update ${code}: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    } finally {
      row.classList.remove("updating");
    }
  }

  function updateParameterRow(row, parameter) {
    if (!row || !parameter) {
      return;
    }
    const valueDisplay = row.querySelector(".value-display");
    if (valueDisplay) {
      valueDisplay.innerHTML = "";
      const valueChip = document.createElement("span");
      valueChip.className = "value-chip";
      valueChip.textContent = parameter.value != null ? String(parameter.value) : "?";
      valueDisplay.appendChild(valueChip);
      if (parameter.human_readable && parameter.human_readable !== parameter.value) {
        const hint = document.createElement("span");
        hint.className = "value-hint";
        hint.textContent = parameter.human_readable;
        valueDisplay.appendChild(hint);
      }
    }
    const input = row.querySelector(".param-input");
    if (input && !row.classList.contains("editing")) {
      input.disabled = true;
    }
    if (Array.isArray(state.parameters)) {
      const index = state.parameters.findIndex(
        (item) => item && typeof item === "object" && item.code === parameter.code
      );
      if (index !== -1) {
        state.parameters[index] = {
          ...state.parameters[index],
          value: parameter.value,
          raw: parameter.raw ?? parameter.value,
          human_readable: parameter.human_readable,
        };
      }
    }
    syncRowUnsavedState(row, parameter);
  }

  function restoreRowOriginalValue(row) {
    if (!row) {
      return;
    }
    const code = row.dataset.code;
    if (!code) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(row.dataset, "originalValue")) {
      setStagedValue(code, row.dataset.originalValue);
    } else {
      setStagedValue(code, null);
    }
    const parameter = getParameterByCode(code);
    if (parameter) {
      syncRowUnsavedState(row, parameter, { forceInput: true });
    }
  }

  function handleParameterInputChange(event) {
    const input = event.target.closest(".param-input");
    if (!input) {
      return;
    }
    const row = input.closest("tr.parameter-row");
    if (!row) {
      return;
    }
    const code = row.dataset.code;
    if (!code) {
      return;
    }
    setStagedValue(code, input.value);
    const parameter = getParameterByCode(code);
    if (parameter) {
      syncRowUnsavedState(row, parameter, { preserveInput: true });
    }
  }

  async function saveParameters() {
    if (!state.connected) {
      return;
    }
    try {
      logEvent("Saving parameters to radio...", "info");
      await runWithLoading(
        async () => {
          await fetchJSON("/api/settings/save", { method: "POST" });
        },
        { button: els.parametersSave, label: "Saving...", overlay: true }
      );
      showToast("Parameters saved to radio.");
      logEvent("Parameters saved to radio.", "success");
    } catch (error) {
      logEvent(
        `Failed to save parameters: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  async function rebootRadio() {
    if (!state.connected) {
      return;
    }
    try {
      logEvent("Issuing radio reboot...", "warning");
      await runWithLoading(
        async () => {
          await fetchJSON("/api/reboot", { method: "POST" });
        },
        { button: els.rebootButton, label: "Rebooting...", overlay: true }
      );
      showToast("Radio rebooting...");
      logEvent("Radio reboot command sent.", "success");
      await refreshStatus();
    } catch (error) {
      logEvent(
        `Failed to reboot radio: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  async function sendRawCommand(event) {
    event.preventDefault();
    if (!state.connected) {
      showToast("Connect to a radio first.", "error");
      return;
    }
    const command = els.rawInput.value.trim();
    if (!command) {
      showToast("Enter an AT command.", "error");
      return;
    }
    try {
      logEvent(`Sending raw command: ${command}`, "info");
      const responsePayload = await runWithLoading(
        async () => {
          const { response } = await fetchJSON("/api/raw", {
            method: "POST",
            body: JSON.stringify({ command }),
          });
          return response;
        },
        { button: els.rawSubmit, label: "Sending..." }
      );
      els.rawResponse.textContent =
        responsePayload && responsePayload.length
          ? responsePayload.join("\n")
          : "(no response)";
      showToast(`Command "${command}" sent.`);
      const responseCount = Array.isArray(responsePayload) ? responsePayload.length : 0;
      logEvent(
        `Command "${command}" completed${responseCount ? ` (${responseCount} line${responseCount === 1 ? "" : "s"})` : " with no response"}.`,
        "success"
      );
    } catch (error) {
      logEvent(
        `Command "${command}" failed: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  function snapshotCurrentParameters() {
    if (!Array.isArray(state.parameters) || !state.parameters.length) {
      return null;
    }
    const snapshot = {};
    state.parameters.forEach((param) => {
      if (param && typeof param === "object" && typeof param.code === "string") {
        snapshot[param.code] = param.value != null ? String(param.value) : "";
      }
    });
    return Object.keys(snapshot).length ? snapshot : null;
  }

  function saveConfiguration(options = {}) {
    const { asNew = false, name } = options;
    const snapshot = snapshotCurrentParameters();
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

  async function loadConfigurationToRadio() {
    const config = getSelectedConfig();
    if (!config) {
      showToast("Select a configuration to load.", "error");
      logEvent("Load configuration aborted: nothing selected.", "warning");
      return;
    }
    if (!state.connected) {
      showToast("Connect to a radio first.", "error");
      logEvent("Load configuration aborted: radio not connected.", "warning");
      return;
    }
    const entries = Object.entries(config.parameters || {});
    if (!entries.length) {
      showToast("Configuration is empty.", "error");
      logEvent(`Configuration "${config.name}" is empty.`, "warning");
      return;
    }
    try {
      logEvent(
        `Loading configuration "${config.name}" (${entries.length} parameter${entries.length === 1 ? "" : "s"})...`,
        "info"
      );
      await runWithLoading(
        async () => {
          for (const [code, value] of entries) {
            await fetchJSON(`/api/settings/${code}`, {
              method: "POST",
              body: JSON.stringify({ value }),
            });
          }
        },
        { button: els.configLoad, label: "Applying...", overlay: true }
      );
      showToast(`Loaded "${config.name}".`);
      logEvent(`Configuration "${config.name}" applied to radio.`, "success");
      await loadParameters({ silent: true });
    } catch (error) {
      logEvent(
        `Failed to load configuration "${config.name}": ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
      showToast(error.message, "error");
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
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "sik-radio-config";
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
        `Failed to download configuration "${config?.name ?? ""}": ${error instanceof Error ? error.message : String(error)}`,
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
          showToast(`Imported ${imported} configuration${imported === 1 ? "" : "s"}.`);
          logEvent(`Imported ${imported} configuration${imported === 1 ? "" : "s"} from file.`, "success");
        } else {
          showToast("No valid configurations found in file.", "error");
          logEvent("No valid configurations found in uploaded file.", "error");
        }
      } catch (error) {
        showToast("Invalid configuration file.", "error");
        logEvent(
          `Failed to parse configuration file: ${error instanceof Error ? error.message : String(error)}`,
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
      `Loaded ${state.cachedConfigs.length} cached configuration${state.cachedConfigs.length === 1 ? "" : "s"}.`,
      "info"
    );
  }

  initTheme();
  refreshRawCommandOptions();
  if (els.logToggle) {
    els.logToggle.textContent = "Minimize";
    els.logToggle.setAttribute("aria-expanded", "true");
  }
  logEvent("Configurator ready.");
  updatePortDisplay();
  toggleControls(state.connected);

  // Event listeners
  if (els.choosePortButton) {
    els.choosePortButton.addEventListener("click", (event) => {
      event.preventDefault();
      choosePort();
    });
  }
  if (els.portSelect) {
    els.portSelect.addEventListener("click", (event) => {
      if (state.connected) {
        return;
      }
      event.preventDefault();
      choosePort();
    });
    els.portSelect.addEventListener("keydown", (event) => {
      if (state.connected) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choosePort();
      }
    });
  }
  if (els.connectForm) {
    els.connectForm.addEventListener("submit", connect);
  }
  // Dynamic connect/disconnect button handler
  if (els.connectButton) {
    els.connectButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (state.connected) {
        disconnect();
      } else {
        connect(event);
      }
    });
  }
  if (els.infoRefresh) {
    els.infoRefresh.addEventListener("click", () =>
      loadInfo({ button: els.infoRefresh, label: "Refreshing..." })
    );
  }
  if (els.parametersRefresh) {
    els.parametersRefresh.addEventListener("click", () =>
      loadParameters({
        button: els.parametersRefresh,
        label: "Refreshing...",
      })
    );
  }
  if (els.parametersSave) {
    els.parametersSave.addEventListener("click", saveParameters);
  }
  if (els.rebootButton) {
    els.rebootButton.addEventListener("click", rebootRadio);
  }
  if (els.rawForm) {
    els.rawForm.addEventListener("submit", sendRawCommand);
  }

  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", toggleTheme);
  }

  if (els.parameterTableBody) {
    els.parameterTableBody.addEventListener("click", (event) => {
      const applyButton = event.target.closest("button[data-action='apply']");
      if (applyButton) {
        event.stopPropagation();
        const row = applyButton.closest("tr.parameter-row");
        if (!row) {
          return;
        }
        const input = row.querySelector(".param-input");
        if (!input) {
          showToast("Input not found for this parameter.", "error");
          return;
        }
        const code = row.dataset.code;
        if (code == null) {
          showToast("Parameter code missing.", "error");
          return;
        }
        const rawValue = input.value;
        const preparedValue = typeof rawValue === "string" ? rawValue.trim() : rawValue;
        applyParameter(code, preparedValue, row, applyButton);
        return;
      }

      const cancelButton = event.target.closest("button[data-action='cancel']");
      if (cancelButton) {
        event.stopPropagation();
        const row = cancelButton.closest("tr.parameter-row");
        if (row) {
          restoreRowOriginalValue(row);
          setRowEditing(row, false);
          row.focus();
        }
        return;
      }

      const row = event.target.closest("tr.parameter-row");
      if (!row) {
        return;
      }

      if (event.target.closest(".parameter-editor")) {
        return;
      }

      if (!row.classList.contains("editing")) {
        setRowEditing(row, true);
      }
    });

    els.parameterTableBody.addEventListener("keydown", (event) => {
      const row = event.target.closest("tr.parameter-row");
      if (!row) {
        return;
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        !row.classList.contains("editing")
      ) {
        event.preventDefault();
        setRowEditing(row, true);
      } else if (event.key === "Escape" && row.classList.contains("editing")) {
        event.preventDefault();
        setRowEditing(row, false);
        row.focus();
      }
    });

    els.parameterTableBody.addEventListener("input", handleParameterInputChange);
    els.parameterTableBody.addEventListener("change", handleParameterInputChange);
  }

  if (els.rawSelect) {
    els.rawSelect.addEventListener("change", handleRawCommandPresetChange);
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
    els.configSave.addEventListener("click", () => saveConfiguration());
  }
  if (els.configSaveAs) {
    els.configSaveAs.addEventListener("click", openSaveAsModal);
  }
  if (els.configSaveAsConfirm) {
    els.configSaveAsConfirm.addEventListener("click", confirmSaveAs);
  }
  if (els.configDelete) {
    els.configDelete.addEventListener("click", deleteConfiguration);
  }
  if (els.configDownload) {
    els.configDownload.addEventListener("click", downloadConfiguration);
  }
  if (els.configUpload) {
    els.configUpload.addEventListener("click", requestConfigUpload);
  }
  if (els.configUploadInput) {
    els.configUploadInput.addEventListener("change", handleConfigUploadInput);
  }
  if (els.configSelect) {
    els.configSelect.addEventListener("change", () => {
      const value = els.configSelect.value;
      setSelectedConfig(value || null);
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
        confirmSaveAs();
      }
    });
  }

  initializeConfigs();

  // Initial load
  loadPorts();
  refreshStatus();
});












