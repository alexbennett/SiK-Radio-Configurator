from __future__ import annotations

from http import HTTPStatus
from typing import Any, Dict

from flask import Blueprint, jsonify, render_template, request

from .services.parameters import DEFAULT_BAUDRATE, PARAMETER_DEFINITIONS
from .services.radio import SiKRadioError, radio_service

bp = Blueprint("main", __name__)


@bp.get("/")
def index():
    """Serve the main configuration interface."""
    return render_template("index.html")


@bp.get("/api/ports")
def api_list_ports():
    ports = radio_service.list_available_ports()
    return jsonify({"ports": ports})


@bp.get("/api/status")
def api_status():
    return jsonify({"status": radio_service.status()})


@bp.post("/api/connect")
def api_connect():
    payload = _get_json_payload()
    port = payload.get("port")
    baudrate = payload.get("baudrate", DEFAULT_BAUDRATE)

    if not port:
        return _error_response("Serial port is required.", HTTPStatus.BAD_REQUEST)

    try:
        baudrate_int = int(baudrate)
    except (TypeError, ValueError):
        return _error_response("Baud rate must be an integer.", HTTPStatus.BAD_REQUEST)

    try:
        status = radio_service.connect(port, baudrate_int)
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)

    return jsonify({"status": status})


@bp.post("/api/disconnect")
def api_disconnect():
    radio_service.disconnect()
    return jsonify({"status": radio_service.status()})


@bp.get("/api/info")
def api_info():
    try:
        info = radio_service.get_device_info()
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"info": info})


@bp.get("/api/settings")
def api_settings():
    try:
        parameters = radio_service.get_parameters()
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"parameters": parameters})


@bp.get("/api/parameter-definitions")
def api_parameter_definitions():
    return jsonify({"definitions": PARAMETER_DEFINITIONS})


@bp.get("/api/settings/<string:parameter_code>")
def api_get_setting(parameter_code: str):
    try:
        parameter = radio_service.query_parameter(parameter_code)
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"parameter": parameter})


@bp.post("/api/settings/<string:parameter_code>")
def api_set_setting(parameter_code: str):
    payload = _get_json_payload()
    value = payload.get("value")
    if value is None:
        return _error_response("Value is required.", HTTPStatus.BAD_REQUEST)

    try:
        parameter = radio_service.set_parameter(parameter_code, str(value))
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"parameter": parameter})


@bp.post("/api/settings/save")
def api_save_settings():
    try:
        radio_service.save_parameters()
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"status": "saved"})


@bp.post("/api/reboot")
def api_reboot():
    try:
        radio_service.reboot()
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"status": "rebooting"})


@bp.post("/api/raw")
def api_raw_command():
    payload = _get_json_payload()
    command = payload.get("command")
    if not command:
        return _error_response("Command must not be empty.", HTTPStatus.BAD_REQUEST)
    try:
        response = radio_service.send_raw_command(str(command))
    except SiKRadioError as exc:
        return _error_response(str(exc), HTTPStatus.BAD_REQUEST)
    return jsonify({"response": response})


def _get_json_payload() -> Dict[str, Any]:
    return request.get_json(silent=True) or {}


def _error_response(message: str, status: HTTPStatus):
    return jsonify({"error": message}), status
