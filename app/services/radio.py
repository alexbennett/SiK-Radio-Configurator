from __future__ import annotations

import threading
import time
from typing import Any, Dict, List, Optional, Sequence

import serial
from serial import SerialException
from serial.tools import list_ports

from .parameters import DEFAULT_BAUDRATE, PARAMETER_DEFINITIONS, interpret_value


class SiKRadioError(RuntimeError):
    """Domain specific exception for radio operations."""


class SiKRadioService:
    """Manage a single shared connection to a SiK telemetry radio."""

    _STOP_TOKENS: Sequence[str] = ("OK", "ERROR", "ERR")

    def __init__(self) -> None:
        self._serial: Optional[serial.Serial] = None
        self._lock = threading.RLock()
        self._port: Optional[str] = None
        self._baudrate: int = DEFAULT_BAUDRATE
        self._connected_at: Optional[float] = None

    # ------------------------------------------------------------------ #
    # Connection management
    # ------------------------------------------------------------------ #
    def list_available_ports(self) -> List[Dict[str, str]]:
        """Return a list of available serial ports and human readable info."""
        ports = list_ports.comports()
        return [
            {
                "device": port.device,
                "description": port.description or "",
                "hwid": port.hwid or "",
            }
            for port in ports
        ]

    def connect(self, port: str, baudrate: int = DEFAULT_BAUDRATE) -> Dict[str, Any]:
        """Open a serial connection and enter AT command mode."""
        with self._lock:
            if self._serial and self._serial.is_open:
                if port == self._port and baudrate == self._baudrate:
                    return self.status()
                raise SiKRadioError(
                    f"Already connected to {self._port}. Disconnect before connecting elsewhere."
                )

            try:
                ser = serial.Serial(
                    port=port,
                    baudrate=baudrate,
                    timeout=1.0,
                    write_timeout=1.0,
                )
            except SerialException as exc:
                raise SiKRadioError(f"Unable to open serial port {port}: {exc}") from exc

            try:
                self._enter_command_mode(ser)
            except SiKRadioError:
                ser.close()
                raise

            self._serial = ser
            self._port = port
            self._baudrate = baudrate
            self._connected_at = time.time()
            return self.status()

    def disconnect(self) -> None:
        """Close the serial port if open."""
        with self._lock:
            if self._serial and self._serial.is_open:
                try:
                    # Attempt to exit command mode gracefully.
                    self._serial.write(b"ATO\r\n")
                    self._serial.flush()
                except SerialException:
                    pass
                try:
                    self._serial.close()
                finally:
                    self._serial = None
                    self._port = None
                    self._connected_at = None

    def status(self) -> Dict[str, Any]:
        """Return basic connection status."""
        with self._lock:
            connected = bool(self._serial and self._serial.is_open)
            return {
                "connected": connected,
                "port": self._port if connected else None,
                "baudrate": self._baudrate if connected else None,
                "connected_at": self._connected_at,
            }

    # ------------------------------------------------------------------ #
    # High-level radio operations
    # ------------------------------------------------------------------ #
    def get_device_info(self) -> Dict[str, Any]:
        """Fetch general information (firmware, board, frequencies)."""
        info: Dict[str, Any] = {}
        commands = {
            "firmware": "ATI",
            "hardware": "ATI2",
            "registers": "ATI3",
            "board_frequencies": "ATI4",
        }
        for key, command in commands.items():
            lines = self._execute_command(command)
            info[key] = [line for line in lines if line not in self._STOP_TOKENS]
        return info

    def get_parameters(self) -> List[Dict[str, Any]]:
        """Return the parsed parameter table with metadata."""
        lines = self._execute_command("ATI5")
        parameters: List[Dict[str, Any]] = []

        for line in lines:
            if not line or line in self._STOP_TOKENS:
                continue
            if ":" not in line:
                continue
            code_part, value_part = line.split(":", 1)
            code = code_part.strip().upper()
            raw_value = value_part.strip()
            value = self._extract_value_token(raw_value)
            definition = PARAMETER_DEFINITIONS.get(code, {})
            rendered = interpret_value(code, value)
            param_entry = {
                "code": code,
                "value": value,
                "raw": raw_value,
                "human_readable": rendered,
                "definition": definition,
            }
            parameters.append(param_entry)

        return parameters

    def query_parameter(self, parameter: str) -> Dict[str, Any]:
        """Fetch a single parameter via ATSn?."""
        normalized = self._normalize_parameter(parameter)
        lines = self._execute_command(f"ATS{normalized}?")
        value: Optional[str] = None
        raw_value: Optional[str] = None
        for line in lines:
            if not line or line in self._STOP_TOKENS:
                continue
            if ":" in line:
                _, payload = line.split(":", 1)
                raw_payload = payload.strip()
                raw_value = raw_payload
                value = self._extract_value_token(raw_payload)
                break
        if value is None:
            raise SiKRadioError(f"Failed to read parameter S{normalized}")
        definition = PARAMETER_DEFINITIONS.get(f"S{normalized}", {})
        return {
            "code": f"S{normalized}",
            "value": value,
            "raw": raw_value,
            "human_readable": interpret_value(f"S{normalized}", value),
            "definition": definition,
        }

    def set_parameter(self, parameter: str, value: str) -> Dict[str, Any]:
        """Write a parameter via ATSn=<value> and return updated data."""
        normalized = self._normalize_parameter(parameter)
        response = self._execute_command(f"ATS{normalized}={value}")
        if not self._did_command_succeed(response):
            raise SiKRadioError("Radio rejected the parameter update.")
        # Return the fresh value to the caller.
        return self.query_parameter(normalized)

    def save_parameters(self) -> bool:
        """Persist parameters with AT&W."""
        response = self._execute_command("AT&W")
        if not self._did_command_succeed(response):
            raise SiKRadioError("Failed to write parameters to flash.")
        return True

    def reboot(self) -> bool:
        """Reboot the radio (ATZ)."""
        response = self._execute_command("ATZ")
        if not self._did_command_succeed(response):
            raise SiKRadioError("Radio did not acknowledge reboot.")
        # Reboot closes the connection.
        self.disconnect()
        return True

    def send_raw_command(self, command: str) -> List[str]:
        """Send an arbitrary AT command and return the raw response lines."""
        return self._execute_command(command, sanitize=False)

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _extract_value_token(payload: str) -> str:
        token = payload.strip()
        if not token:
            return ""
        if "=" in token:
            token = token.split("=", 1)[1].strip()
        return token

    def _normalize_parameter(self, parameter: str) -> str:
        normalized = parameter.strip().upper()
        if normalized.startswith("S"):
            normalized = normalized[1:]
        if not normalized.isdigit():
            raise SiKRadioError(f"Invalid parameter identifier: {parameter}")
        return normalized

    def _ensure_connected(self) -> serial.Serial:
        ser = self._serial
        if not ser or not ser.is_open:
            raise SiKRadioError("No radio is currently connected.")
        return ser

    def _enter_command_mode(self, ser: serial.Serial) -> None:
        # Guard time before entering command mode as required by SiK firmware.
        time.sleep(1.2)
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        ser.write(b"+++")
        ser.flush()
        # Wait for response without sending CR/LF.
        lines = self._read_response(ser, timeout=2.5, stop_tokens=("OK",))
        if "OK" not in lines:
            raise SiKRadioError("Radio did not acknowledge command mode request ('+++').")
        time.sleep(0.2)

    def _execute_command(self, command: str, sanitize: bool = True) -> List[str]:
        """Send a command string and collect its response."""
        with self._lock:
            ser = self._ensure_connected()
            prepared = command.strip()
            if not prepared:
                raise SiKRadioError("Command must not be empty.")

            if sanitize:
                ser.reset_input_buffer()

            encoded = prepared.encode("ascii") + b"\r\n"

            try:
                ser.write(encoded)
                ser.flush()
            except SerialException as exc:
                raise SiKRadioError(f"Failed to write command '{command}': {exc}") from exc

            return self._read_response(ser)

    def _read_response(
        self,
        ser: serial.Serial,
        timeout: float = 1.5,
        stop_tokens: Optional[Sequence[str]] = None,
    ) -> List[str]:
        """Read lines until timeout or a stop token is observed."""
        deadline = time.monotonic() + timeout
        lines: List[str] = []
        markers = tuple(stop_tokens or self._STOP_TOKENS)

        while time.monotonic() < deadline:
            try:
                raw = ser.readline()
            except SerialException as exc:
                raise SiKRadioError(f"Serial read failed: {exc}") from exc

            if raw:
                decoded = raw.decode("utf-8", errors="replace").strip()
                if decoded:
                    lines.append(decoded)
                    if decoded in markers:
                        break
            else:
                time.sleep(0.05)

        return lines

    @staticmethod
    def _did_command_succeed(response: Sequence[str]) -> bool:
        return any(line == "OK" for line in response)


# Shared singleton instance used by the Flask routes.
radio_service = SiKRadioService()
