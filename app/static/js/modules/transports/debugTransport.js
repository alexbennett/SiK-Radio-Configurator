import { DEBUG_MODE, SIMULATED_DATA } from "../constants.js";

export class DebugTransport {
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

    await this._delay(150 + Math.random() * 300);

    if (path === "/api/status") {
      return { status: this._getStatus() };
    }

    if (path === "/api/ports") {
      return {
        ports: [
          { device: "debug://simulated-radio", description: "Simulated Radio (Demo)" },
        ],
      };
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
        const param = this.parameters.find((p) => p.code === normalizedCode);
        if (param) {
          return { parameter: param };
        }
        throw new Error(`Unknown parameter: ${normalizedCode}`);
      }

      if (method === "POST") {
        const body = options.body ? JSON.parse(options.body) : {};
        const param = this.parameters.find((p) => p.code === normalizedCode);
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
      const response =
        SIMULATED_DATA.rawCommands[cmd] || [`Unknown command: ${cmd}`, "ERROR"];
      return { response };
    }

    if (path === "/api/parameter-definitions") {
      const definitions = {};
      SIMULATED_DATA.parameters.forEach((p) => {
        definitions[p.code] = p.definition;
      });
      return { definitions };
    }

    if (
      !this.connected &&
      ["/api/info", "/api/settings", "/api/raw", "/api/reboot"].some((p) =>
        path.startsWith(p)
      )
    ) {
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createDebugTransport() {
  return DEBUG_MODE ? new DebugTransport() : null;
}
