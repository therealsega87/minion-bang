import { applyMinionDamage } from "./adapters/damage-context.js";
import { registerDamageCapture } from "./adapters/damage-capture.js";
import { initSocket } from "./net/socket.js";
import { registerSettings } from "./settings.js";
import { announceGroupsStatus } from "./groups-status.js";
import { registerAutoGroups, reconcileAllCombats } from "./adapters/auto-groups.js";
import { registerGroupInitiative } from "./adapters/group-initiative.js";
import { registerTurnSync } from "./adapters/turn-sync.js";
import { registerTokenColors } from "./adapters/token-colors.js";
import { registerRingRepair } from "./adapters/ring-repair.js";
import { registerBandTurns } from "./adapters/band-turns.js";
import { registerBandsButton } from "./ui/bands-button.js";
import { openBandsWindow } from "./ui/bands-window.js";
import { registerMinionCharacterFlag, registerMinionTokenHudToggle } from "./ui/minion-toggle.js";
import { registerMinionDeathWatch, registerPreviousHpTransport } from "./adapters/minion-kill-hook.js";
import { MINION_KILL_SCHEMA_VERSION } from "./engine/minion-kill.js";
import { isMinionActor } from "./minion-flags.js";
import { MODULE_ID, MODULE_TITLE, infoLog, errorLog } from "./log.js";

Hooks.once("socketlib.ready", () => initSocket());

// Public API, on every client. Existing members are kept.
function extendApi(members) {
  const self = game.modules.get(MODULE_ID);
  if (!self) return;
  self.api = Object.assign(self.api ?? {}, members);
}

Hooks.once("init", () => {
  registerSettings();
  extendApi({
    isMinion: actor => isMinionActor(actor ?? null),
    minionKillSchemaVersion: MINION_KILL_SCHEMA_VERSION
  });
});

Hooks.once("i18nInit", () => {
  registerMinionCharacterFlag();
});

Hooks.once("ready", () => {
  initSocket();
  registerDamageCapture();

  const version = game.modules.get(MODULE_ID)?.version ?? "unknown";
  infoLog(`${MODULE_TITLE} ${version} ready (${game.user.isGM ? "GM" : "player"}).`);
  announceGroupsStatus();
  registerTurnSync();
  registerTokenColors();
  registerRingRepair();
  registerPreviousHpTransport();

  if (!game.user.isGM) return;

  registerMinionTokenHudToggle();
  registerAutoGroups();
  registerGroupInitiative();
  registerBandTurns();
  registerBandsButton();
  extendApi({ openBandsWindow });
  registerMinionDeathWatch();
  reconcileAllCombats();

  Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
    try {
      return applyMinionDamage(actor, amount, updates, options);
    } catch (err) {
      errorLog("Error while applying minion damage:", err);
    }
  });
});
