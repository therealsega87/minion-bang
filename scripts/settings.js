import { MODULE_ID } from "./log.js";
import { runDiagnostics } from "./diagnostics.js";
import { announceGroupsStatus } from "./groups-status.js";
import { reconcileAllCombats } from "./adapters/auto-groups.js";
import { openMaximumsDialog } from "./ui/maximums-dialog.js";

class DiagnosticsMenu extends foundry.applications.api.ApplicationV2 {
  async render() {
    await runDiagnostics();
    return this;
  }
}

class MaximumsMenu extends foundry.applications.api.ApplicationV2 {
  async render() {
    await openMaximumsDialog();
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

  game.settings.register(MODULE_ID, "autoSelectProposal", {
    name: "MINIONBANG.Settings.AutoSelect.Name",
    hint: "MINIONBANG.Settings.AutoSelect.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "groupsEnabled", {
    name: "MINIONBANG.Settings.Groups.Name",
    hint: "MINIONBANG.Settings.Groups.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      announceGroupsStatus();
      reconcileAllCombats();
    }
  });

  game.settings.register(MODULE_ID, "groupInitiativeMode", {
    name: "MINIONBANG.Settings.GroupMode.Name",
    hint: "MINIONBANG.Settings.GroupMode.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "captain",
    choices: {
      captain: "MINIONBANG.GroupMode.captain",
      average: "MINIONBANG.GroupMode.average",
      highest: "MINIONBANG.GroupMode.highest",
      lowest: "MINIONBANG.GroupMode.lowest",
      median: "MINIONBANG.GroupMode.median"
    }
  });

  game.settings.register(MODULE_ID, "maximumsTable", {
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => reconcileAllCombats()
  });

  game.settings.registerMenu(MODULE_ID, "editMaximums", {
    name: "MINIONBANG.Settings.Maximums.Name",
    label: "MINIONBANG.Settings.Maximums.Label",
    hint: "MINIONBANG.Settings.Maximums.Hint",
    icon: "fa-solid fa-table-list",
    type: MaximumsMenu,
    restricted: true
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
