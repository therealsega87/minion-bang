import { groupsActive } from "../groups-status.js";
import { debugLog, errorLog } from "../log.js";

export const TURN_SYNC_DELAY_MS = 50;

const timers = new Map();

export function resyncTurns(combat) {
  if (!combat || !game.combats?.has(combat.id)) return false;
  if (!groupsActive()) return false;
  combat.setupTurns();
  ui.combat?.render();
  debugLog(`Turns of combat ${combat.id} rebuilt after a change to the groups.`);
  return true;
}

export function scheduleTurnSync(combat) {
  if (!combat) return;
  if (timers.has(combat.id)) clearTimeout(timers.get(combat.id));
  const timer = setTimeout(() => {
    timers.delete(combat.id);
    try {
      resyncTurns(combat);
    } catch (error) {
      errorLog("Turn synchronisation failed:", error);
    }
  }, TURN_SYNC_DELAY_MS);
  timers.set(combat.id, timer);
}

export function registerTurnSync() {
  for (const name of ["createCombatantGroup", "updateCombatantGroup", "deleteCombatantGroup"]) {
    Hooks.on(name, group => scheduleTurnSync(group.parent));
  }
  Hooks.on("updateCombatant", (combatant, changes) => {
    if (changes?.group === undefined && changes?.initiative === undefined) return;
    scheduleTurnSync(combatant.parent);
  });
}
