/**
 * Runs on the attacking client. Midi-QOL calculates each target's damage in
 * three passes (default, other, bonus), in that order, after resistances,
 * immunities and saving throws. The totals and the attack details are
 * attached to the default pass options, which Midi-QOL forwards to the GM.
 */

const NON_DAMAGE_TYPES = new Set(["healing", "temphp"]);
const PASSES = ["default", "other", "bonus"];

/** targetTokenUuid -> details of the latest attack against that token */
const attackByTarget = new Map();

/** targetTokenUuid -> passes calculated so far */
const passesByTarget = new Map();

function buildAttackDetails(workflow) {
  const activity = workflow?.activity;
  const attackMode = workflow?.attackMode ?? null;
  const range = workflow?.item?.system?.range ?? activity?.range ?? {};
  return {
    itemName: workflow?.item?.name ?? "unknown item",
    activityType: activity?.type ?? null,
    attackMode,
    actionType: activity?.getActionType?.(attackMode) ?? activity?.actionType ?? null,
    hasAttackRoll: activity?.type === "attack",
    hasSavingThrow: activity?.type === "save",
    reach: range.reach ?? null,
    rangeValue: range.value ?? null,
    rangeUnits: range.units ?? null,
    attackerTokenUuid: workflow?.token?.document?.uuid ?? null,
    attackerName: workflow?.actor?.name ?? null,
    attackerType: workflow?.actor?.type ?? null,
    targetUuids: Array.from(workflow?.targets ?? []).map(t => t?.document?.uuid).filter(Boolean)
  };
}

function sumDamage(damages) {
  return (damages ?? [])
    .filter(d => !NON_DAMAGE_TYPES.has(d.type))
    .reduce((total, d) => total + (Number(d.value) || 0), 0);
}

/** Healing may arrive as negative values. */
function sumOfType(damages, type) {
  return (damages ?? [])
    .filter(d => d.type === type)
    .reduce((total, d) => total + Math.abs(Number(d.value) || 0), 0);
}

export function registerDamageCapture() {
  if (!game.modules.get("midi-qol")?.active) return;

  Hooks.on("midi-qol.DamageRollComplete", (workflow) => {
    const attack = buildAttackDetails(workflow);
    for (const token of workflow?.targets ?? []) {
      const uuid = token?.document?.uuid;
      if (!uuid) continue;
      attackByTarget.set(uuid, attack);
      passesByTarget.delete(uuid);
    }
  });

  Hooks.on("midi-qol.dnd5eCalculateDamage", (actor, damages, options) => {
    const uuid = options?.midi?.targetUuid;
    if (!uuid) return;

    let entry = passesByTarget.get(uuid);
    if (!entry) {
      entry = {
        payload: {
          damage: { default: 0, other: 0, bonus: 0 },
          healing: 0,
          tempHp: 0,
          attack: attackByTarget.get(uuid) ?? null
        },
        pass: 0
      };
      options.minionBang = entry.payload;
      passesByTarget.set(uuid, entry);
    }

    entry.payload.damage[PASSES[entry.pass]] = sumDamage(damages);
    entry.payload.healing += sumOfType(damages, "healing");
    entry.payload.tempHp += sumOfType(damages, "temphp");
    entry.pass += 1;

    if (entry.pass >= PASSES.length) {
      passesByTarget.delete(uuid);
      attackByTarget.delete(uuid);
    }
  });
}
