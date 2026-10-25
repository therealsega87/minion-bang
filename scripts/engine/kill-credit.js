export function creditTiming(trackerMode) {
  if (trackerMode === "midi-manual") return "before";
  if (trackerMode === "midi-auto") return "after";
  return null;
}

export function buildKillSnapshot({ attacker, itemName = null, minion, oldHP }) {
  if (typeof attacker?.id !== "string" || attacker.id === "") {
    throw new Error("buildKillSnapshot: the attacker needs an id");
  }
  if (typeof attacker.name !== "string" || typeof attacker.type !== "string") {
    throw new Error("buildKillSnapshot: the attacker needs a name and a type");
  }
  if (typeof minion?.id !== "string" || minion.id === "") {
    throw new Error("buildKillSnapshot: the minion needs an id");
  }
  if (!Number.isFinite(oldHP) || oldHP <= 0) {
    throw new Error(`buildKillSnapshot: the hit points before the kill must be above 0 (${oldHP})`);
  }
  return {
    attacker: { id: attacker.id, name: attacker.name, type: attacker.type },
    itemName,
    isHeal: false,
    isTempHP: false,
    healingTotal: 0,
    damageList: [{
      actorId: minion.id,
      actorUuid: minion.uuid ?? null,
      oldHP,
      newHP: 0,
      totalDamage: oldHP,
      appliedDamage: oldHP,
      healingAdjustedTotalDamage: oldHP
    }],
    targetIds: [minion.id]
  };
}
