/**
 * An actor is a minion if the Flee, Mortals! module gave it the "minion"
 * role, or if the "Minion" box is checked in its Special Traits.
 *
 * The Flee, Mortals! flag is read from the raw data: getFlag() throws when
 * the module that owns the flag is not active.
 */

const MCDM_MODULE_ID = "mcdm-flee-mortals-where-evil-lives";

// dnd5e stores Special Traits checkboxes under flags.dnd5e.
export const MINION_FLAG_SCOPE = "dnd5e";
export const MINION_FLAG_KEY = "minionBangMinion";

export function hasManualMinionFlag(actor) {
  return actor?.flags?.[MINION_FLAG_SCOPE]?.[MINION_FLAG_KEY] === true;
}

export function isMinionActor(actor) {
  if (!actor) return false;
  if (actor.flags?.[MCDM_MODULE_ID]?.role === "minion") return true;
  return hasManualMinionFlag(actor);
}

export async function toggleManualMinionFlag(actor) {
  await actor.setFlag(MINION_FLAG_SCOPE, MINION_FLAG_KEY, !hasManualMinionFlag(actor));
}
