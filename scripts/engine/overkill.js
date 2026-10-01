/**
 * Overkill (Flee, Mortals!, pp. 13-14). Every candidate shares the hit
 * minion's stat block, so the number of extra minions taken down is
 * ceil(excess / hpMax), where excess = damage - hpMax.
 *
 * Book examples: Lady Ulnock, 19 damage on 6 HP -> 3 more; Perigold,
 * 14 damage on 6 HP -> 2 more.
 */

/**
 * @param {number} effectiveDamage
 * @param {number} hpMax
 * @returns {{excess: number, additionalCount: number}}
 */
export function computeOverkill(effectiveDamage, hpMax) {
  if (!Number.isFinite(effectiveDamage) || effectiveDamage < 0) {
    throw new Error(`computeOverkill: invalid effectiveDamage (${effectiveDamage})`);
  }
  if (!Number.isFinite(hpMax) || hpMax <= 0) {
    throw new Error(`computeOverkill: invalid hpMax (${hpMax})`);
  }

  const excess = effectiveDamage - hpMax;
  if (excess <= 0) return { excess: Math.max(0, excess), additionalCount: 0 };

  const additionalCount = Math.ceil(excess / hpMax);
  return { excess, additionalCount };
}

/**
 * Proposes the nearest candidates, up to the number needed.
 * @param {Array<{id: string, distance: number}>} eligibleCandidates
 * @param {number} additionalCount
 * @returns {{proposed: Array<{id: string, distance: number}>, shortfall: number}}
 *   shortfall: how many more minions the excess could have taken down.
 */
export function proposeOverkillTargets(eligibleCandidates, additionalCount) {
  if (!Array.isArray(eligibleCandidates)) {
    throw new Error("proposeOverkillTargets: eligibleCandidates must be an array");
  }
  if (!Number.isFinite(additionalCount) || additionalCount < 0) {
    throw new Error(`proposeOverkillTargets: invalid additionalCount (${additionalCount})`);
  }

  const sorted = [...eligibleCandidates].sort((a, b) => a.distance - b.distance);
  const proposed = sorted.slice(0, additionalCount);
  const shortfall = Math.max(0, additionalCount - sorted.length);

  return { proposed, shortfall };
}
