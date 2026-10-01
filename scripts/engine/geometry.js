/**
 * Overkill range (Flee, Mortals!, p. 13). Melee: within the attacker's
 * reach. Ranged: inside a line one square wide that starts at the
 * attacker, passes through the hit minion and is as long as the weapon's
 * short range. Distances are measured by the caller, in scene units.
 */

/**
 * @param {Array<{id: string, distanceFromAttacker: number}>} candidates
 * @param {number} reach
 * @returns {Array<{id: string, distance: number}>}
 */
export function filterMeleeCandidates(candidates, reach) {
  if (!Number.isFinite(reach) || reach <= 0) {
    throw new Error(`filterMeleeCandidates: invalid reach (${reach})`);
  }
  return candidates
    .filter(c => Number.isFinite(c.distanceFromAttacker) && c.distanceFromAttacker <= reach)
    .map(c => ({ id: c.id, distance: c.distanceFromAttacker }));
}

/**
 * @param {Array<{id: string, alongLine: number, perpendicular: number}>} candidates
 *   alongLine: distance along the attacker-to-target line (negative = behind the attacker).
 *   perpendicular: sideways distance from that line.
 * @param {number} shortRange
 * @param {number} [lineWidth=5]
 * @returns {Array<{id: string, distance: number}>}
 */
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
