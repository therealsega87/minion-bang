/**
 * The Minion trait (Flee, Mortals!, p. 13). Damage from an attack or a
 * failed saving throw drops a minion to 0 HP. Damage from any other effect
 * (a successful save, magic missile, an aura) kills it only if the damage
 * is at least its hit point maximum; otherwise it takes no damage.
 */

/**
 * @typedef {"attackHit"|"failedSave"|"otherEffect"} DamageOrigin
 *
 * @typedef {Object} MinionTraitInput
 * @property {DamageOrigin} origin
 * @property {number} effectiveDamage  Damage after resistances, immunities and saves (>= 0).
 * @property {number} hpMax            The minion's hit point maximum (> 0).
 *
 * @typedef {Object} MinionTraitResult
 * @property {boolean} dies
 * @property {number} hpAfter
 * @property {string} reason
 */

/**
 * @param {MinionTraitInput} input
 * @returns {MinionTraitResult}
 */
export function resolveMinionTrait(input) {
  const { origin, effectiveDamage, hpMax } = input;

  if (!Number.isFinite(effectiveDamage) || effectiveDamage < 0) {
    throw new Error(`resolveMinionTrait: invalid effectiveDamage (${effectiveDamage})`);
  }
  if (!Number.isFinite(hpMax) || hpMax <= 0) {
    throw new Error(`resolveMinionTrait: invalid hpMax (${hpMax})`);
  }

  // Total immunity: unaffected whatever the origin.
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

/**
 * Turns a verdict into what to write: 0 HP and 0 temp HP when the minion
 * dies, or a cancelled update when it survives.
 * @param {MinionTraitResult} traitResult
 * @returns {{cancel: true} | {cancel: false, hpValue: number, hpTemp: number}}
 */
export function toHpInstruction(traitResult) {
  if (traitResult.dies) {
    return { cancel: false, hpValue: 0, hpTemp: 0 };
  }
  return { cancel: true };
}
