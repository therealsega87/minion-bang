import { decideWalk } from "../engine/group-walk.js";
import { groupsActive } from "../groups-status.js";
import { debugLog, errorLog } from "../log.js";

const lastStates = new Map();
const walking = new Set();

function isActiveGm() {
  return game.users?.activeGM?.isSelf === true;
}

export function snapshot(combat) {
  const turn = Number.isFinite(combat.turn) ? combat.turn : null;
  const combatant = turn === null ? null : combat.turns?.[turn];
  return { round: combat.round, turn, groupId: combatant?.group?.id ?? null };
}

export function isFirstInGroup(combat) {
  const current = snapshot(combat);
  if (current.turn === null || !current.groupId) return true;
  const skipDefeated = combat.settings?.skipDefeated === true;
  return !combat.turns.slice(0, current.turn).some(entry => entry.group?.id === current.groupId && !(skipDefeated && entry.isDefeated));
}

function decide(direction, previous, combat) {
  const current = snapshot(combat);
  if (current.turn === null) return 0;
  return decideWalk({ direction, previous, current, firstInGroup: isFirstInGroup(combat) });
}

export async function walkBand(combat, direction, startFrom) {
  if (walking.has(combat.id)) return;
  walking.add(combat.id);
  try {
    const limit = combat.turns?.length ?? 0;
    let previous = startFrom;
    for (let step = 0; step < limit; step += 1) {
      previous = snapshot(combat);
      if (direction > 0) await combat.nextTurn();
      else await combat.previousTurn();
      lastStates.set(combat.id, snapshot(combat));
      if (decide(direction, previous, combat) === 0) break;
    }
    debugLog(`Band walk of combat ${combat.id} finished (direction ${direction}).`);
  } catch (error) {
    errorLog("Band turn walk failed:", error);
    ui.notifications.warn(game.i18n.localize("MINIONBANG.BandTurns.Failed"));
  } finally {
    walking.delete(combat.id);
  }
}

export function handleCombatUpdate(combat, changes, options) {
  const previous = lastStates.get(combat.id) ?? null;
  const current = snapshot(combat);
  lastStates.set(combat.id, current);
  if (walking.has(combat.id)) return;
  if (!isActiveGm() || !groupsActive()) return;
  if (changes?.turn === undefined && changes?.round === undefined) return;
  if (!previous) return;
  if (options?.direction !== 1 && options?.direction !== -1) debugLog(`Turn change of combat ${combat.id} without a direction: no band walk.`);
  const direction = decide(options?.direction, previous, combat);
  if (direction !== 0) return walkBand(combat, direction, current);
}

export function registerBandTurns() {
  for (const combat of game.combats ?? []) lastStates.set(combat.id, snapshot(combat));
  Hooks.on("updateCombat", handleCombatUpdate);
  Hooks.on("deleteCombat", combat => lastStates.delete(combat.id));
}
