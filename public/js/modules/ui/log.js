import { MAX_LOG_ENTRIES } from "../constants.js";

export function createLogController(els, state) {
  function logEvent(message, level = "info") {
    const timestamp = new Date();
    const entry = {
      id: `log-${timestamp.getTime()}-${Math.random().toString(16).slice(2, 10)}`,
      time: timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
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

  return {
    logEvent,
    renderLog,
    toggleLogCollapse,
    clearLog,
  };
}
