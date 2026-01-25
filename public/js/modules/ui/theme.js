import { THEME_STORAGE_KEY } from "../constants.js";

export function createThemeController(els, state) {
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

  return {
    initTheme,
    toggleTheme,
  };
}
