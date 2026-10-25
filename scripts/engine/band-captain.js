function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function chooseCaptain(members, preferredToken = null) {
  if (!Array.isArray(members)) {
    throw new Error("chooseCaptain: members must be an array");
  }
  const standing = members.filter(member => !member.defeated);
  if (preferredToken !== null && preferredToken !== undefined) {
    const preferred = standing.find(member => member.tokenId === preferredToken);
    if (preferred) return preferred;
  }
  return standing[0] ?? null;
}

export function replacementCaptain(members, departedId) {
  if (!Array.isArray(members)) {
    throw new Error("replacementCaptain: members must be an array");
  }
  return chooseCaptain(members.filter(member => member.id !== departedId), null);
}

export function lockDecision(lockedValue, groupInitiative) {
  if (!isNumber(lockedValue)) return "recalculate";
  if (!isNumber(groupInitiative)) return "restore";
  return groupInitiative === lockedValue ? "keep" : "restore";
}
