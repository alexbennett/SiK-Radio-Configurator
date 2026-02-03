import { BASE_RAW_COMMANDS, RAW_COMMAND_CUSTOM_VALUE } from "../constants.js";

export function createUtilitiesController({
  els,
  state,
  fetchJSON,
  runWithLoading,
  logEvent,
  showToast,
  refreshStatus,
}) {
  function buildParameterCommandOptions() {
    if (!Array.isArray(state.parameters) || !state.parameters.length) {
      return [];
    }
    return state.parameters.map((param) => {
      const rawCode = String(param.code || "").trim();
      const normalized = rawCode.toUpperCase().startsWith("S")
        ? rawCode.slice(1)
        : rawCode;
      return {
        command: `ATS${normalized}?`,
        description: `Read ${
          (param.definition && param.definition.name) || `parameter ${rawCode || normalized}`
        }`,
      };
    });
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
      if (refreshStatus) {
        await refreshStatus();
      }
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
      if (els.rawResponse) {
        els.rawResponse.textContent =
          responsePayload && responsePayload.length
            ? responsePayload.join("\n")
            : "(no response)";
      }
      showToast(`Command "${command}" sent.`);
      const responseCount = Array.isArray(responsePayload)
        ? responsePayload.length
        : 0;
      logEvent(
        `Command "${command}" completed${
          responseCount
            ? ` (${responseCount} line${responseCount === 1 ? "" : "s"})`
            : " with no response"
        }.`,
        "success"
      );
    } catch (error) {
      logEvent(
        `Command "${command}" failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast(error.message, "error");
    }
  }

  return {
    refreshRawCommandOptions,
    handleRawCommandPresetChange,
    rebootRadio,
    sendRawCommand,
  };
}
