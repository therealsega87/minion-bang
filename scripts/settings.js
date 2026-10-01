import { MODULE_ID } from "./log.js";
import { runDiagnostics } from "./diagnostics.js";

// registerMenu expects an Application class; this one opens the
// diagnostics dialog instead of a window of its own.
class DiagnosticsMenu extends foundry.applications.api.ApplicationV2 {
  async render() {
    await runDiagnostics();
    return this;
  }
}

export function registerSettings() {
  game.settings.register(MODULE_ID, "debugLogging", {
    name: "MINIONBANG.Settings.Debug.Name",
    hint: "MINIONBANG.Settings.Debug.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.registerMenu(MODULE_ID, "runDiagnostics", {
    name: "MINIONBANG.Settings.Diagnostics.Name",
    label: "MINIONBANG.Settings.Diagnostics.Label",
    hint: "MINIONBANG.Settings.Diagnostics.Hint",
    icon: "fa-solid fa-stethoscope",
    type: DiagnosticsMenu,
    restricted: false
  });
}
