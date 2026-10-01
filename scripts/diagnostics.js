/**
 * Diagnostics report for bug reports: versions, settings, engine
 * self-test results and recent log entries.
 */

import { runEngineSelfTests } from "./engine/self-test.js";
import { getRecentLogs, MODULE_ID, MODULE_TITLE } from "./log.js";

const MCDM_MODULE_ID = "mcdm-flee-mortals-where-evil-lives";

function gatherVersions() {
  return {
    "Minion! version": game.modules.get(MODULE_ID)?.version ?? "unknown",
    "Foundry VTT version": game.version,
    "Game system": `${game.system.id} ${game.system.version}`,
    "Midi-QOL active": game.modules.get("midi-qol")?.active ?? false,
    "Midi-QOL version": game.modules.get("midi-qol")?.version ?? "n/a",
    "socketlib active": game.modules.get("socketlib")?.active ?? false,
    "socketlib version": game.modules.get("socketlib")?.version ?? "n/a",
    "Flee, Mortals! module active": game.modules.get(MCDM_MODULE_ID)?.active ?? false
  };
}

function gatherSettings() {
  try {
    return { "Debug logging": game.settings.get(MODULE_ID, "debugLogging") };
  } catch {
    return {};
  }
}

function buildReportText(versions, settings, selfTest, logs) {
  const lines = [];
  lines.push(`${MODULE_TITLE} diagnostics report`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("== Versions ==");
  for (const [key, value] of Object.entries(versions)) lines.push(`${key}: ${value}`);
  lines.push("");

  lines.push("== Settings ==");
  for (const [key, value] of Object.entries(settings)) lines.push(`${key}: ${value}`);
  lines.push("");

  lines.push(`== Engine self-test: ${selfTest.passed}/${selfTest.total} passed ==`);
  for (const c of selfTest.cases) {
    lines.push(`[${c.pass ? "OK" : "FAIL"}] ${c.label}${c.error ? ` (threw: ${c.error})` : ""}`);
  }
  lines.push("");

  lines.push(`== Recent log entries (${logs.length}) ==`);
  for (const entry of logs) lines.push(`[${entry.time}] [${entry.level}] ${entry.text}`);

  return lines.join("\n");
}

/** Shows a summary and offers the full report as a .log file. */
export async function runDiagnostics() {
  const versions = gatherVersions();
  const settings = gatherSettings();
  const selfTest = runEngineSelfTests();
  const logs = getRecentLogs();
  const report = buildReportText(versions, settings, selfTest, logs);

  const failedCases = selfTest.cases.filter(c => !c.pass);
  const counts = { passed: selfTest.passed, total: selfTest.total, failed: failedCases.length };
  const summaryKey = failedCases.length === 0 ? "MINIONBANG.Diagnostics.Passed" : "MINIONBANG.Diagnostics.Failed";
  const summary = `<p>${game.i18n.format(summaryKey, counts)}</p>`;

  await foundry.applications.api.DialogV2.wait({
    window: { title: "MINIONBANG.Diagnostics.Title", icon: "fa-solid fa-stethoscope" },
    position: { width: 420 },
    content: `${summary}<p>${game.i18n.localize("MINIONBANG.Diagnostics.SaveHint")}</p>`,
    buttons: [
      {
        action: "save",
        label: "MINIONBANG.Diagnostics.Save",
        icon: "fa-solid fa-download",
        default: true,
        callback: () => {
          foundry.utils.saveDataToFile(report, "text/plain", `minion-bang-diagnostics-${Date.now()}.log`);
          return true;
        }
      },
      { action: "close", label: "MINIONBANG.Diagnostics.Close", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
}
