// Builds the data passed with the "minion-bang.minionKill" hook: one call for
// each minion downed by Minion!, counting it together with the minions its
// overkill took down. Pure function: no Foundry access.

function killEntry(minion, overkill) {
  if (!minion || typeof minion !== "object") throw new Error("minionKill: missing minion");
  return {
    actorUuid: minion.actorUuid ?? null,
    tokenUuid: minion.tokenUuid ?? null,
    name: minion.name ?? null,
    challengeRating: Number.isFinite(minion.challengeRating) ? minion.challengeRating : null,
    bandSize: Number.isFinite(minion.bandSize) ? minion.bandSize : null,
    overkill
  };
}

export function buildMinionKill({ primary, extras = [], attacker = {}, attack = {}, origin = null, record = {} }) {
  const kills = [killEntry(primary, false), ...extras.map(minion => killEntry(minion, true))];
  return {
    count: kills.length,
    overkillCount: kills.length - 1,
    attacker: {
      tokenUuid: attacker.tokenUuid ?? null,
      actorUuid: attacker.actorUuid ?? null,
      name: attacker.name ?? null,
      type: attacker.type ?? null
    },
    item: attack.itemName ?? null,
    actionType: attack.actionType ?? null,
    attackId: attack.attackId ?? null,
    origin,
    combatId: record.combatId ?? null,
    round: record.round ?? null,
    turn: record.turn ?? null,
    kills
  };
}
