import { creditsOverkillKills, defeatedEntry } from "../engine/kill-credit.js";
import { debugLog, warnLog } from "../log.js";

const MODULE_ID = "combat-stats";
const CURRENT_KEY = "currentCombatData";

// Combat Stats fixes its mode when the world loads: a change to the setting
// applies only after a reload. Read the mode it is running with, so the extra
// kills are not counted twice when the setting was changed without reloading.
function runningMode(stats) {
  let saved;
  try {
    saved = game.settings.get(MODULE_ID, "trackerMode");
  } catch {
    saved = undefined;
  }
  const running = typeof stats._mode === "string" ? stats._mode : saved;
  if (running === undefined) {
    debugLog(`${MODULE_ID} has no "trackerMode" setting: nothing to credit.`);
    return undefined;
  }
  if (saved !== undefined && saved !== running) {
    debugLog(`${MODULE_ID} is set to "${saved}" but still runs in "${running}" mode until the world is reloaded.`);
  }
  return running;
}

function readTracker() {
  if (!game.user?.isGM) return null;
  if (!game.modules?.get(MODULE_ID)?.active) return null;
  const stats = game.combatStats;
  if (!stats) {
    debugLog(`${MODULE_ID} is active but its tracker was not found (looked for game.combatStats).`);
    return null;
  }
  if (Number.isInteger(stats.minionKillSchemaVersion) && stats.minionKillSchemaVersion >= 1) {
    debugLog(`${MODULE_ID} reads the minion kills from the minion-bang.minionKill hook: no direct credit.`);
    return null;
  }
  if (!creditsOverkillKills(runningMode(stats))) return null;
  if (typeof stats._accKill !== "function") {
    warnLog(`${MODULE_ID} is active but its internals are not the ones expected: the extra kills are not credited.`);
    return null;
  }
  return stats;
}

function attackerOf(record) {
  const token = record?.attackerTokenUuid ? fromUuidSync(record.attackerTokenUuid) : null;
  return token?.actor ?? null;
}

async function creditKill(stats, minion, record) {
  const actor = attackerOf(record);
  if (!actor) {
    debugLog(`${MODULE_ID}: the attacker of the overkill is unknown, the extra kill is not credited.`);
    return;
  }
  const credited = stats._resolveAttribution?.(actor) ?? actor;
  if (credited.type !== "character") {
    debugLog(`${MODULE_ID}: ${credited.name} is not a player character, the extra kill is not credited.`);
    return;
  }
  if (stats._isPlayerSummon?.(minion)) return;
  const current = game.settings.get(MODULE_ID, CURRENT_KEY);
  if (!current?.combatId) {
    debugLog(`${MODULE_ID}: no fight is being recorded, the extra kill is not credited.`);
    return;
  }
  stats._accKill(current, credited.id, credited.name, minion.name, "characters");
  if (!Array.isArray(current.defeated)) current.defeated = [];
  current.defeated.push(defeatedEntry({ minion, attackerId: credited.id, uniqueId: foundry.utils.randomID() }));
  await game.settings.set(MODULE_ID, CURRENT_KEY, current);
}

export async function updateWithKillCredit(minion, record, update) {
  await update();
  try {
    const stats = readTracker();
    if (stats) await creditKill(stats, minion, record);
  } catch (error) {
    warnLog("The extra kill could not be passed to Combat Stats:", error);
  }
}
