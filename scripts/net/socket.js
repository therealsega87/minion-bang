/**
 * Sends the overkill decision to the right client. While a player decides,
 * the GM can take over or cancel: the first answer wins and the other
 * window is closed.
 */

import { promptOverkillDialog, closeOverkillDialog } from "../ui/overkill-dialog.js";
import { promptWaitingDialog, closeWaitingDialog } from "../ui/waiting-dialog.js";
import { MODULE_ID, debugLog, warnLog } from "../log.js";

let socket = null;

/** Registers only on the first call. */
export function initSocket() {
  if (socket) return;
  if (typeof socketlib === "undefined") {
    warnLog("socketlib not found: the overkill dialog can only be shown to the GM.");
    return;
  }
  socket = socketlib.registerModule(MODULE_ID);
  socket.register("promptOverkill", (payload) => promptOverkillDialog(payload));
  socket.register("closeOverkill", (requestId) => closeOverkillDialog(requestId));
}

/**
 * @param {string|null} userId  The player who should decide, or null if the GM decides.
 * @param {Object} payload  See promptOverkillDialog.
 * @returns {Promise<{selectedIds: string[], opportunityAttack: boolean}|null>}
 */
export async function requestOverkillConfirmation(userId, payload) {
  if (!userId || userId === game.user.id || !socket) {
    if (userId && !socket) warnLog("socketlib unavailable: the GM decides instead of the player.");
    debugLog("Overkill decided by the GM.");
    return promptOverkillDialog(payload);
  }

  const requestId = foundry.utils.randomID();
  const request = { ...payload, requestId };
  const playerName = game.users.get(userId)?.name;

  return new Promise(resolve => {
    let settled = false;
    const finish = (result, decidedBy) => {
      if (settled) return;
      settled = true;
      debugLog(`Overkill decided by ${decidedBy}.`);
      closeWaitingDialog(requestId);
      if (decidedBy === "the player") closeOverkillDialog(requestId);
      else socket.executeAsUser("closeOverkill", userId, requestId).catch(() => {});
      resolve(result);
    };

    socket.executeAsUser("promptOverkill", userId, request)
      .then(result => finish(result, "the player"))
      .catch(async err => {
        if (settled) return;
        warnLog(`Could not reach ${playerName ?? userId} (${err.message}): the GM decides.`);
        closeWaitingDialog(requestId);
        finish(await promptOverkillDialog(request), "the GM (player unreachable)");
      });

    promptWaitingDialog({ requestId, playerName, attackerName: payload.attackerName }).then(async choice => {
      if (settled) return;
      if (choice === "cancel") finish(null, "the GM (cancelled)");
      else if (choice === "decide") {
        const result = await promptOverkillDialog(request);
        finish(result, "the GM (on behalf of the player)");
      }
    });
  });
}
