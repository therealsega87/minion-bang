import { creditsOverkillKills, defeatedEntry } from "../engine/kill-credit.js";
import { debugLog, warnLog } from "../log.js";

const TRACKERS = Object.freeze([
  { moduleId: "combat-stats", instanceKeys: ["combatStats"] },
  { moduleId: "deeper-combat-stats", instanceKeys: ["deeperCombatStats", "combatStats"] }
]);
const CURRENT_KEY = "currentCombatData";

function readTrackers() {
  if (!game.user?.isGM) return [];
  const found = [];
  const seen = new Set();
  for (const { moduleId, instanceKeys } of TRACKERS) {
    if (!game.modules?.get(moduleId)?.active) continue;
    const stats = instanceKeys.map(key => game[key]).find(Boolean);
    if (!stats) {
      debugLog(`${moduleId} is active but its tracker was not found (looked for game.${instanceKeys.join(", game.")}).`);
      continue;
    }
    if (seen.has(stats)) continue;
    let mode;
    try {
      mode = game.settings.get(moduleId, "trackerMode");
    } catch {
      debugLog(`${moduleId} has no "trackerMode" setting: nothing to credit.`);
      continue;
    }
    if (!creditsOverkillKills(mode)) continue;
    if (typeof stats._accKill !== "function") {
      warnLog(`${moduleId} is active but its internals are not the ones expected: the extra kills are not credited.`);
      continue;
    }
    seen.add(stats);
    found.push({ moduleId, stats });
  }
  return found;
}

function attackerOf(record) {
  const token = record?.attackerTokenUuid ? fromUuidSync(record.attackerTokenUuid) : null;
  return token?.actor ?? null;
}

async function creditKill({ moduleId, stats }, minion, record) {
  const actor = attackerOf(record);
  if (!actor) {
    debugLog(`${moduleId}: the attacker of the overkill is unknown, the extra kill is not credited.`);
    return;
  }
  const credited = stats._resolveAttribution?.(actor) ?? actor;
  if (credited.type !== "character") {
    debugLog(`${moduleId}: ${credited.name} is not a player character, the extra kill is not credited.`);
    return;
  }
  if (stats._isPlayerSummon?.(minion)) return;
  const current = game.settings.get(moduleId, CURRENT_KEY);
  if (!current?.combatId) {
    debugLog(`${moduleId}: no fight is being recorded, the extra kill is not credited.`);
    return;
  }
  stats._accKill(current, credited.id, credited.name, minion.name, "characters");
  if (!Array.isArray(current.defeated)) current.defeated = [];
  current.defeated.push(defeatedEntry({ minion, attackerId: credited.id, uniqueId: foundry.utils.randomID() }));
  await game.settings.set(moduleId, CURRENT_KEY, current);
}

export async function updateWithKillCredit(minion, record, update) {
  await update();
  let trackers = [];
  try {
    trackers = readTrackers();
  } catch (error) {
    warnLog("The extra kill could not be passed to Combat Stats:", error);
  }
  for (const tracker of trackers) {
    try {
      await creditKill(tracker, minion, record);
    } catch (error) {
      warnLog("The extra kill could not be passed to Combat Stats:", error);
    }
  }
}
