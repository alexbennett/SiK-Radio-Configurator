export function createParametersController({
  els,
  state,
  fetchJSON,
  runWithLoading,
  logEvent,
  showToast,
  updateConfigButtonsState,
}) {
  let onParametersUpdated = null;

  function setOnParametersUpdated(handler) {
    onParametersUpdated = typeof handler === "function" ? handler : null;
  }

  function notifyParametersUpdated() {
    if (onParametersUpdated) {
      onParametersUpdated();
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
    const badgeHost = valueDisplay.querySelector(".value-main") || valueDisplay;
    const existing = badgeHost.querySelector(".unsaved-badge");
    if (unsaved) {
      if (existing) {
        return;
      }
      const badge = document.createElement("span");
      badge.className = "unsaved-badge";
      badge.textContent = "Unsaved";
      badgeHost.appendChild(badge);
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

  function stageConfigurationParameters(parameters) {
    if (!parameters) {
      return;
    }
    state.stagedParameters = {};
    const entries = Object.entries(parameters || {});
    entries.forEach(([code, value]) => {
      if (typeof code !== "string") {
        return;
      }
      state.stagedParameters[code] = normalizeParamValue(value);
    });
    reconcileStagedWithRadio();
    refreshParameterRowStates();
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
      } else if (
        normalized === "0" ||
        normalized === "false" ||
        normalized === "disabled"
      ) {
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

    if (
      valueType === "enum" &&
      Array.isArray(definition.choices) &&
      definition.choices.length
    ) {
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

  function renderParameters(parameters) {
    const previousActive = state.activeParameterCode;
    state.activeParameterCode = null;
    if (els.parameterTableBody) {
      els.parameterTableBody.innerHTML = "";
    }

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
      const valueMain = document.createElement("div");
      valueMain.className = "value-main";
      const valueChip = document.createElement("span");
      valueChip.className = "value-chip";
      valueChip.textContent = param.value != null ? String(param.value) : "?";
      valueMain.appendChild(valueChip);
      valueDisplay.appendChild(valueMain);
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

      if (els.parameterTableBody) {
        els.parameterTableBody.appendChild(row);
      }

      syncRowUnsavedState(row, param, { forceInput: true });

      if (param.code === previousActive) {
        rowToActivate = row;
      }
    });

    if (rowToActivate) {
      setRowEditing(rowToActivate, true);
    }

    notifyParametersUpdated();
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
        logEvent(
          `Parameter ${parameter.code} updated to ${parameter.value}`,
          "success"
        );
        row.classList.add("success");
        setTimeout(() => row.classList.remove("success"), 1400);
        setRowEditing(row, false);
      }
    } catch (error) {
      logEvent(
        `Failed to update ${code}: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
      const valueMain = document.createElement("div");
      valueMain.className = "value-main";
      const valueChip = document.createElement("span");
      valueChip.className = "value-chip";
      valueChip.textContent = parameter.value != null ? String(parameter.value) : "?";
      valueMain.appendChild(valueChip);
      valueDisplay.appendChild(valueMain);
      if (
        parameter.human_readable &&
        parameter.human_readable !== parameter.value
      ) {
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

  function clearParametersTable(message = "Connect to a radio to load parameters.") {
    if (els.parameterTableBody) {
      els.parameterTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">${message}</td>
        </tr>
      `;
    }
    state.parameters = [];
    state.parametersLoaded = false;
    state.loadingParameters = false;
    state.activeParameterCode = null;
    state.radioParameters = {};
    if (updateConfigButtonsState) {
      updateConfigButtonsState();
    }
    notifyParametersUpdated();
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
        `Failed to load parameters: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      showToast(error.message, "error");
      if (!Array.isArray(state.parameters) || !state.parameters.length) {
        clearParametersTable("Failed to load parameters. Click Reload to try again.");
      }
    } finally {
      state.loadingParameters = false;
      if (updateConfigButtonsState) {
        updateConfigButtonsState();
      }
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
        `Failed to save parameters: ${
          error instanceof Error ? error.message : String(error)
        }`,
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

  function bindParameterTableEvents() {
    if (!els.parameterTableBody) {
      return;
    }

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
        restoreRowOriginalValue(row);
        setRowEditing(row, false);
        row.focus();
      }
    });

    els.parameterTableBody.addEventListener("input", handleParameterInputChange);
    els.parameterTableBody.addEventListener("change", handleParameterInputChange);
  }

  return {
    bindParameterTableEvents,
    clearParametersTable,
    loadParameters,
    renderParameters,
    saveParameters,
    snapshotCurrentParameters,
    stageConfigurationParameters,
    setOnParametersUpdated,
    setRadioSnapshot,
    reconcileStagedWithRadio,
  };
}
