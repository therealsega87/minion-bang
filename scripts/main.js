import { applyMinionDamage } from "./adapters/damage-context.js";
import { registerDamageCapture } from "./adapters/damage-capture.js";
import { initSocket } from "./net/socket.js";
import { registerSettings } from "./settings.js";
import { announceGroupsStatus } from "./groups-status.js";
import { registerAutoGroups, reconcileAllCombats } from "./adapters/auto-groups.js";
import { registerGroupInitiative } from "./adapters/group-initiative.js";
import { registerTurnSync } from "./adapters/turn-sync.js";
import { registerTokenColors } from "./adapters/token-colors.js";
import { registerBandTurns } from "./adapters/band-turns.js";
import { registerBandsButton } from "./ui/bands-button.js";
import { openBandsWindow } from "./ui/bands-window.js";
import { registerMinionCharacterFlag, registerMinionTokenHudToggle } from "./ui/minion-toggle.js";
import { MODULE_ID, MODULE_TITLE, infoLog, errorLog } from "./log.js";

Hooks.once("socketlib.ready", () => initSocket());

Hooks.once("init", () => {
  registerSettings();
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

  if (!game.user.isGM) return;

  registerMinionTokenHudToggle();
  registerAutoGroups();
  registerGroupInitiative();
  registerBandTurns();
  registerBandsButton();
  const self = game.modules.get(MODULE_ID);
  if (self) self.api = { openBandsWindow };
  reconcileAllCombats();

  Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
    try {
      return applyMinionDamage(actor, amount, updates, options);
    } catch (err) {
      errorLog("Error while applying minion damage:", err);
    }
  });
});
