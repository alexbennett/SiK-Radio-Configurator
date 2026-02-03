import { PARAMETER_DEFINITIONS } from "../parameterDefinitions.js";

export class WebSerialTransport {
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
    if (method === "GET" && path === "/api/parameter-definitions") {
      return true;
    }
    if (
      method === "GET" &&
      (path === "/api/ports" ||
        path === "/api/status" ||
        path === "/api/info" ||
        path === "/api/settings")
    ) {
      return true;
    }
    if (
      method === "POST" &&
      (path === "/api/connect" ||
        path === "/api/disconnect" ||
        path === "/api/settings/save" ||
        path === "/api/reboot" ||
        path === "/api/raw")
    ) {
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
    if (method === "GET" && path === "/api/parameter-definitions") {
      await this._ensureDefinitions();
      return { definitions: this.definitions || {} };
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
    const baudrate =
      Number.isFinite(requestedBaud) && requestedBaud > 0
        ? requestedBaud
        : this.defaultBaudrate;

    if (this.active) {
      if (
        payload.port &&
        this.active.id === payload.port &&
        this.active.baudrate === baudrate
      ) {
        return this.status();
      }
      throw new Error(
        `Already connected to ${
          this.active.label || "a radio"
        }. Disconnect before connecting elsewhere.`
      );
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
      const trimmed = line.trim();
      const separatorIndex = trimmed.indexOf(":");
      if (separatorIndex !== -1) {
        rawValue = trimmed.slice(separatorIndex + 1).trim();
        value = this.extractValueToken(rawValue);
        break;
      }
      if (trimmed.includes("=")) {
        rawValue = trimmed;
        value = this.extractValueToken(rawValue);
        break;
      }
      const looseMatch = trimmed.match(/^S\\d+\\s+(.+)$/i);
      if (looseMatch && looseMatch[1]) {
        rawValue = looseMatch[1].trim();
        value = this.extractValueToken(rawValue);
        break;
      }
      if (/^[+-]?\\d+(?:\\.\\d+)?$/.test(trimmed)) {
        rawValue = trimmed;
        value = trimmed;
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
    try {
      return await this.queryParameter(normalized);
    } catch (_error) {
      await this._ensureDefinitions();
      const code = `S${normalized}`;
      const definition = (this.definitions && this.definitions[code]) || {};
      const stringValue = value != null ? String(value) : "";
      return {
        code,
        value: stringValue,
        raw: definition && definition.name ? `${definition.name}=${stringValue}` : stringValue,
        human_readable: this.interpretValue(code, stringValue),
        definition,
      };
    }
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
    const fallback = PARAMETER_DEFINITIONS || {};
    try {
      const payload = await this.httpFetchJSON("/api/parameter-definitions");
      const definitions = payload && payload.definitions ? payload.definitions : null;
      this.definitions =
        definitions && Object.keys(definitions).length ? definitions : fallback;
    } catch (_error) {
      this.definitions = fallback;
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
    if (
      definition.aliases &&
      Object.prototype.hasOwnProperty.call(definition.aliases, normalized)
    ) {
      return definition.aliases[normalized];
    }
    if (definition.value_type === "enum" && Array.isArray(definition.choices)) {
      const match = definition.choices.find(
        (choice) => String(choice.value) === normalized
      );
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

  async _executeCommand(
    command,
    { sanitize = true, timeoutSeconds = 1.5, stopTokens = this.stopTokens } = {}
  ) {
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
    const existing = this.portIdMap.get(port);
    if (existing) {
      return existing;
    }
    let id = `serial-${Math.random().toString(16).slice(2, 10)}`;
    while (this.usedPortIds.has(id)) {
      id = `serial-${Math.random().toString(16).slice(2, 10)}`;
    }
    this.usedPortIds.add(id);
    this.portIdMap.set(port, id);
    return id;
  }

  _describePort(port, id) {
    const info = port.getInfo ? port.getInfo() : {};
    const infoParts = [];
    if (info.usbVendorId) {
      infoParts.push(`VID ${info.usbVendorId.toString(16).padStart(4, "0")}`);
    }
    if (info.usbProductId) {
      infoParts.push(`PID ${info.usbProductId.toString(16).padStart(4, "0")}`);
    }
    const label = infoParts.length ? infoParts.join(" ") : `Serial Port ${id.slice(-4)}`;
    return {
      id,
      label,
      hwid: infoParts.length ? infoParts.join(" ") : "WebSerial",
      port,
    };
  }

  async _resolvePortRecord(portId) {
    if (portId) {
      const record = this.portRecords.get(portId);
      if (record) {
        return record;
      }
      const matched = Array.from(this.portRecords.values()).find(
        (item) => item.id === portId
      );
      if (matched) {
        return matched;
      }
    }
    const request = await navigator.serial.requestPort();
    if (!request) {
      return null;
    }
    const id = this._ensurePortRegistered(request);
    const record = this._describePort(request, id);
    this.portRecords.set(id, record);
    return record;
  }

  async promptPortSelection() {
    try {
      const record = await this._resolvePortRecord(null);
      if (!record) {
        return null;
      }
      const info = record.port && record.port.getInfo ? record.port.getInfo() : {};
      const hwidParts = [];
      if (info.usbVendorId) {
        hwidParts.push(`VID ${info.usbVendorId.toString(16).padStart(4, "0")}`);
      }
      if (info.usbProductId) {
        hwidParts.push(`PID ${info.usbProductId.toString(16).padStart(4, "0")}`);
      }
      return {
        id: record.id,
        label: record.label,
        hwid: hwidParts.length ? hwidParts.join(" ") : "WebSerial",
      };
    } catch (_error) {
      return null;
    }
  }

  _parsePayload(body) {
    if (!body) {
      return null;
    }
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch (_error) {
        return null;
      }
    }
    return body;
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
