export function creditsOverkillKills(trackerMode) {
  return trackerMode === "midi-manual" || trackerMode === "midi-auto";
}

export function defeatedEntry({ minion, attackerId, uniqueId }) {
  if (typeof minion?.id !== "string" || minion.id === "") {
    throw new Error("defeatedEntry: the minion needs an id");
  }
  if (typeof attackerId !== "string" || attackerId === "") {
    throw new Error("defeatedEntry: the attacker needs an id");
  }
  return { name: minion.name ?? null, id: minion.id, tokenUuid: uniqueId, killedBy: attackerId };
}
