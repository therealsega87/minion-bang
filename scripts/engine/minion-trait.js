export function resolveMinionTrait(input) {
  const { origin, effectiveDamage, hpMax } = input;

  if (!Number.isFinite(effectiveDamage) || effectiveDamage < 0) {
    throw new Error(`resolveMinionTrait: invalid effectiveDamage (${effectiveDamage})`);
  }
  if (!Number.isFinite(hpMax) || hpMax <= 0) {
    throw new Error(`resolveMinionTrait: invalid hpMax (${hpMax})`);
  }

  if (effectiveDamage === 0) {
    return { dies: false, hpAfter: hpMax, reason: "Effective damage is 0 (total immunity): no effect." };
  }

  if (origin === "attackHit" || origin === "failedSave") {
    return {
      dies: true,
      hpAfter: 0,
      reason: origin === "attackHit"
        ? "Damage from a successful attack: the Minion trait always drops it to 0 HP."
        : "Damage from a failed saving throw: the Minion trait always drops it to 0 HP."
    };
  }

  if (origin === "otherEffect") {
    const dies = effectiveDamage >= hpMax;
    return {
      dies,
      hpAfter: dies ? 0 : hpMax,
      reason: dies
        ? `Damage from another effect (${effectiveDamage}) >= hit point maximum (${hpMax}): the minion dies.`
        : `Damage from another effect (${effectiveDamage}) < hit point maximum (${hpMax}): no damage taken.`
    };
  }

  throw new Error(`resolveMinionTrait: unknown origin ("${origin}")`);
}

export function toHpInstruction(traitResult) {
  if (traitResult.dies) {
    return { cancel: false, hpValue: 0, hpTemp: 0 };
  }
  return { cancel: true };
}
