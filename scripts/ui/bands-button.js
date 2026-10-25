import { groupsActive } from "../groups-status.js";
import { errorLog } from "../log.js";
import { openBandsWindow } from "./bands-window.js";

const BUTTON_CLASS = "minion-bang-bands-button";

export function insertBandsButton(root) {
  if (!root?.querySelector) return null;
  for (const old of root.querySelectorAll(`.${BUTTON_CLASS}`)) old.remove();
  const host = root.querySelector(".combat-tracker-header") ?? root.querySelector("header") ?? root;
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.innerHTML = `<i class="fa-solid fa-people-group"></i> ${game.i18n.localize("MINIONBANG.Bands.Button")}`;
  button.addEventListener("click", () => {
    openBandsWindow().catch(error => errorLog("The bands button failed:", error));
  });
  host.append(button);
  return button;
}

export function registerBandsButton() {
  Hooks.on("renderCombatTracker", (app, html) => {
    if (!game.user?.isGM || !groupsActive()) return;
    insertBandsButton(html?.querySelector ? html : html?.[0]);
  });
}
