/** Shown to the GM while a player resolves an overkill. */

import { escapeHtml } from "../log.js";

const openWaitingDialogs = new Map();

/** @returns {Promise<"decide"|"cancel"|null>} */
export async function promptWaitingDialog({ requestId, playerName, attackerName }) {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: "MINIONBANG.Overkill.Title", icon: "fa-solid fa-hourglass-half" },
    position: { width: 360 },
    content: `<p>${game.i18n.format("MINIONBANG.Waiting.Text", {
      player: escapeHtml(playerName ?? game.i18n.localize("MINIONBANG.Waiting.APlayer")),
      attacker: escapeHtml(attackerName ?? "")
    })}</p>`,
    buttons: [
      { action: "decide", label: "MINIONBANG.Waiting.Decide", icon: "fa-solid fa-user-shield", callback: () => "decide" },
      { action: "cancel", label: "MINIONBANG.Waiting.Cancel", icon: "fa-solid fa-xmark", callback: () => "cancel" }
    ],
    rejectClose: false,
    render: (event, dialog) => openWaitingDialogs.set(requestId, dialog)
  });
  openWaitingDialogs.delete(requestId);
  return result ?? null;
}

export function closeWaitingDialog(requestId) {
  openWaitingDialogs.get(requestId)?.close();
}
