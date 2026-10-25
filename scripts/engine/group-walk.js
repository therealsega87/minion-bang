function isPosition(value) {
  return value !== null && typeof value === "object" && Number.isFinite(value.round) && Number.isFinite(value.turn);
}

export function decideWalk({ direction, previous, current, firstInGroup }) {
  if (direction !== 1 && direction !== -1) return 0;
  if (!isPosition(previous) || !isPosition(current)) return 0;
  if (!current.groupId) return 0;
  if (direction === 1) {
    if (previous.groupId !== current.groupId) return 0;
    if (previous.round !== current.round) return 0;
    return current.turn > previous.turn ? 1 : 0;
  }
  return firstInGroup === true ? 0 : -1;
}
