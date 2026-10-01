/**
 * Logging helpers. debugLog prints only when "Enable Debug" is on;
 * warnLog and errorLog always print. Every entry is also kept in a small
 * buffer that "Run Diagnostics" attaches to its report.
 */

export const MODULE_ID = "minion-bang";
export const MODULE_TITLE = "Minion!";

const BUFFER_SIZE = 200;
const buffer = [];

function describe(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function remember(level, args) {
  buffer.push({ level, time: new Date().toISOString(), text: args.map(describe).join(" ") });
  if (buffer.length > BUFFER_SIZE) buffer.shift();
}

function isDebugEnabled() {
  try {
    return game.settings.get(MODULE_ID, "debugLogging") === true;
  } catch {
    return false;
  }
}

export function debugLog(...args) {
  remember("debug", args);
  if (isDebugEnabled()) console.log(`%c[${MODULE_TITLE}]`, "color:#c77;font-weight:bold", ...args);
}

export function warnLog(...args) {
  remember("warn", args);
  console.warn(`[${MODULE_TITLE}]`, ...args);
}

export function errorLog(...args) {
  remember("error", args);
  console.error(`[${MODULE_TITLE}]`, ...args);
}

/** Recent log entries, oldest first. */
export function getRecentLogs() {
  return [...buffer];
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}
