import { applyMinionDamage } from "./adapters/damage-context.js";
import { registerDamageCapture } from "./adapters/damage-capture.js";
import { initSocket } from "./net/socket.js";
import { registerSettings } from "./settings.js";
import { registerMinionCharacterFlag, registerMinionTokenHudToggle } from "./ui/minion-toggle.js";
import { MODULE_TITLE, debugLog, errorLog } from "./log.js";

Hooks.once("socketlib.ready", () => initSocket());

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("i18nInit", () => {
  registerMinionCharacterFlag();
});

Hooks.once("ready", () => {
  // Needed on every client: damage is captured where the attack is made,
  // and the overkill dialog may open on a player's client.
  initSocket();
  registerDamageCapture();

  if (!game.user.isGM) return;

  registerMinionTokenHudToggle();

  Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
    try {
      // Returning false cancels the hit point update.
      return applyMinionDamage(actor, amount, updates, options);
    } catch (err) {
      errorLog("Error while applying minion damage:", err);
    }
  });

  debugLog(`${MODULE_TITLE} ready.`);
});
