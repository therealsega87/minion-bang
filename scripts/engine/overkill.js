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
