# SiK Radio Configurator

Web-based interface for connecting to and configuring SiK telemetry radios. The app exposes a fast, modern UI that runs locally and communicates with the radio over a serial connection.

## Features

- Detect available serial ports and connect with a configurable baud rate (default `57600`).
- Automatically enter AT command mode and surface firmware, hardware, and register information.
- Inspect, edit, and persist the entire SiK parameter table with helpful descriptions.
- Issue raw AT commands, save settings to flash, and reboot the radio without leaving the browser.
- Designed for quick field use: responsive layout, dark-friendly theming, and instant feedback.

## Getting Started

1. **Install dependencies** *(Python 3.9+ recommended)*:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the app**:

   ```bash
    python run.py
   ```

   The server listens on `http://localhost:8000`.

3. **Configure your radio**:

   - Plug in the local SiK radio using USB or a serial adapter.
   - Open the app in a browser and click **Choose Port** to grant access to your radio.
   - Press **Connect**; parameters and information load automatically.
   - Adjust values, click **Apply** for each change, then **Save to Flash** to persist.
   - Reboot the radio to apply settings and repeat for the remote partner radio.

## Browser-Direct Web Serial Mode

When the configurator is served over HTTPS and opened in a compatible browser (Chrome, Edge, or any browser with the [Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API)), the UI can talk to your locally connected radio directly—no Python backend access to USB is required.

- Click **Choose Port**, then grant the browser permission to use your radio when prompted.
- Once authorised, the selected device name appears in the read-only field next to the button.
- All other features work exactly the same: edit parameters, save to flash, reboot, or send raw AT commands.
- If you decline access or no ports appear, click **Choose Port** again to reopen the permission dialog.

## Notes & Tips

- The app expects the radio to accept the standard SiK AT command guard sequence (`+++`).
- If you use unusual firmware that returns unrecognised parameter values, the app still shows and preserves the raw value. You can always use the **Raw Command** panel for advanced operations.
- Disconnect via the UI before unplugging the device to avoid lingering file handles.

## Development

- Static assets live in `app/static/` and templates in `app/templates/`.
- API routes are implemented in `app/routes.py`; serial communication lives in `app/services/radio.py`.
- For hot-reload while developing, run with Flask's reloader:

  ```bash
  FLASK_APP=run.py FLASK_ENV=development flask run
  ```

  *(Disables auto entry into command mode between reloads; reconnect after changes.)*

## Troubleshooting

- **Permission denied** when opening a port: add your user to the appropriate serial group (e.g. `dialout` on Linux) or run with elevated privileges.
- **Radio does not respond to “+++”**: ensure there's at least one second of radio silence before clicking connect. If another tool is streaming data, disconnect it first.
- **Stuck parameters**: some firmware builds require a reboot of both radios after saving. Use the **Reboot Radio** button and reconnect.
