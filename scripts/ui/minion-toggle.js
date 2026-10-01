/**
 * The "Minion" checkbox in Special Traits and the Token HUD button share
 * the same flag. On an unlinked token the HUD button changes that token's
 * own actor data, not the base actor.
 */

import { MINION_FLAG_KEY, hasManualMinionFlag, toggleManualMinionFlag } from "../minion-flags.js";

/** Runs on "i18nInit" so the labels can be localized. */
export function registerMinionCharacterFlag() {
  CONFIG.DND5E.characterFlags[MINION_FLAG_KEY] = {
    name: game.i18n.localize("MINIONBANG.Flag.Name"),
    hint: game.i18n.localize("MINIONBANG.Flag.Hint"),
    section: game.i18n.localize("MINIONBANG.Flag.Section"),
    type: Boolean
  };
}

export function registerMinionTokenHudToggle() {
  Hooks.on("renderTokenHUD", (app, html) => {
    if (!game.user.isGM) return;
    const actor = app.object?.actor;
    if (!actor) return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    const container = root?.querySelector(".col.right") ?? root;
    if (!container) return;

    const button = document.createElement("div");
    button.classList.add("control-icon", "minion-bang-toggle");
    if (hasManualMinionFlag(actor)) button.classList.add("active");
    button.dataset.tooltip = game.i18n.localize("MINIONBANG.Hud.Toggle");
    button.innerHTML = '<i class="fa-solid fa-skull"></i>';
    button.addEventListener("click", async () => {
      await toggleManualMinionFlag(actor);
      button.classList.toggle("active", hasManualMinionFlag(actor));
    });

    container.appendChild(button);
  });
}
