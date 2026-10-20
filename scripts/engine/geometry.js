export function filterMeleeCandidates(candidates, reach) {
  if (!Number.isFinite(reach) || reach <= 0) {
    throw new Error(`filterMeleeCandidates: invalid reach (${reach})`);
  }
  return candidates
    .filter(c => Number.isFinite(c.distanceFromAttacker) && c.distanceFromAttacker <= reach)
    .map(c => ({ id: c.id, distance: c.distanceFromAttacker }));
}

export function filterRangedLineCandidates(candidates, shortRange, lineWidth = 5) {
  if (!Number.isFinite(shortRange) || shortRange <= 0) {
    throw new Error(`filterRangedLineCandidates: invalid shortRange (${shortRange})`);
  }
  const halfWidth = lineWidth / 2;
  return candidates
    .filter(c =>
      Number.isFinite(c.alongLine) && Number.isFinite(c.perpendicular) &&
      c.alongLine >= 0 && c.alongLine <= shortRange &&
      Math.abs(c.perpendicular) <= halfWidth
    )
    .map(c => ({ id: c.id, distance: c.alongLine }));
}
