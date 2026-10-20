import { applyMinionDamage } from "./adapters/damage-context.js";
import { registerDamageCapture } from "./adapters/damage-capture.js";
import { initSocket } from "./net/socket.js";
import { registerSettings } from "./settings.js";
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

  if (!game.user.isGM) return;

  registerMinionTokenHudToggle();

  Hooks.on("dnd5e.preApplyDamage", (actor, amount, updates, options) => {
    try {
      return applyMinionDamage(actor, amount, updates, options);
    } catch (err) {
      errorLog("Error while applying minion damage:", err);
    }
  });
});
