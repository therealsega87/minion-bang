import { buildKillSnapshot, creditTiming } from "../engine/kill-credit.js";
import { debugLog, warnLog } from "../log.js";

const TRACKERS = Object.freeze([
  { moduleId: "combat-stats", instanceKeys: ["combatStats"] },
  { moduleId: "deep-combat-stats", instanceKeys: ["deepCombatStats", "combatStats"] }
]);

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
    let timing = null;
    try {
      timing = creditTiming(game.settings.get(moduleId, "trackerMode"));
    } catch {
      debugLog(`${moduleId} has no "trackerMode" setting: nothing to credit.`);
      continue;
    }
    if (!timing) continue;
    if (typeof stats._processMidiRoll !== "function" || typeof stats._processMidiAutoRoll !== "function") {
      warnLog(`${moduleId} is active but its internals are not the ones expected: the extra kills are not credited.`);
      continue;
    }
    seen.add(stats);
    found.push({ stats, timing });
  }
  return found;
}

function buildSnapshot(stats, minion, record, itemName) {
  const token = record?.attackerTokenUuid ? fromUuidSync(record.attackerTokenUuid) : null;
  const actor = token?.actor ?? null;
  if (!actor) {
    debugLog("Combat Stats: the attacker of the overkill is unknown, the extra kill is not credited.");
    return null;
  }
  const credited = stats._resolveAttribution?.(actor) ?? actor;
  const oldHP = minion.system?.attributes?.hp?.value ?? 0;
  if (!(oldHP > 0)) return null;
  return buildKillSnapshot({
    attacker: { id: credited.id, name: credited.name, type: credited.type },
    itemName,
    minion: { id: minion.id, uuid: minion.uuid },
    oldHP
  });
}

function forgetPending(stats, actorId) {
  try {
    stats._midiPending?.delete(actorId);
  } catch (error) {
    debugLog("Combat Stats: a pending kill could not be removed:", error);
  }
}

export async function updateWithKillCredit(minion, record, itemName, update) {
  let prepared = [];
  try {
    for (const found of readTrackers()) {
      const snapshot = buildSnapshot(found.stats, minion, record, itemName);
      if (snapshot) prepared.push({ ...found, snapshot });
    }
    for (const entry of prepared) {
      if (entry.timing === "before") entry.stats._processMidiRoll(entry.snapshot);
    }
  } catch (error) {
    warnLog("The extra kill could not be passed to Combat Stats:", error);
    prepared = [];
  }

  try {
    await update();
  } catch (error) {
    for (const entry of prepared) forgetPending(entry.stats, minion.id);
    throw error;
  }

  for (const entry of prepared) {
    if (entry.timing !== "after") continue;
    try {
      entry.stats._processMidiAutoRoll(entry.snapshot);
    } catch (error) {
      warnLog("The extra kill could not be passed to Combat Stats:", error);
    }
  }
}
