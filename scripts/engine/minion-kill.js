// Data of the "minion-bang.minionKill" hook, schema version 1: one event for
// each minion that really went from alive to defeated. Pure functions: no
// Foundry access, only serializable values.

export const MINION_KILL_SCHEMA_VERSION = 1;
export const MINION_KILL_CAUSES = Object.freeze(["direct", "overkill", "other"]);

const text = value => (typeof value === "string" && value !== "" ? value : null);
const index = value => (Number.isInteger(value) && value >= 0 ? value : null);

export function validChallengeRating(cr) {
  return typeof cr === "number" && Number.isFinite(cr) && cr >= 0 ? cr : null;
}

// True only for a real passage from positive hit points to zero or less.
export function isRealDeath(previousHp, newHp) {
  return typeof previousHp === "number" && Number.isFinite(previousHp) && previousHp > 0
    && typeof newHp === "number" && Number.isFinite(newHp) && newHp <= 0;
}

function attackerData(attacker) {
  if (!attacker || typeof attacker !== "object") return null;
  return {
    actorId: text(attacker.actorId),
    actorUuid: text(attacker.actorUuid),
    tokenUuid: text(attacker.tokenUuid),
    name: text(attacker.name)
  };
}

function victimData(victim) {
  if (!victim || typeof victim !== "object") throw new Error("minionKill: missing victim");
  const minionsPerStandard = victim.minionsPerStandard;
  return {
    actorId: text(victim.actorId),
    actorUuid: text(victim.actorUuid),
    tokenUuid: text(victim.tokenUuid),
    name: text(victim.name),
    cr: validChallengeRating(victim.cr),
    minionsPerStandard: Number.isInteger(minionsPerStandard) && minionsPerStandard > 0 ? minionsPerStandard : null
  };
}

export function buildMinionKillEvent({ eventId, workflowId = null, combat = null, sceneId = null, attacker = null, victim, itemUuid = null, cause }) {
  if (!text(eventId)) throw new Error("minionKill: missing eventId");
  if (!MINION_KILL_CAUSES.includes(cause)) throw new Error(`minionKill: unknown cause (${cause})`);
  const combatId = text(combat?.combatId);
  return {
    schemaVersion: MINION_KILL_SCHEMA_VERSION,
    eventId,
    workflowId: text(workflowId),
    combatId,
    sceneId: text(sceneId),
    round: combatId ? index(combat.round) : null,
    turn: combatId ? index(combat.turn) : null,
    attacker: attackerData(attacker),
    victim: victimData(victim),
    itemUuid: text(itemUuid),
    cause
  };
}
