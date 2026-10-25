const MCDM_MODULE_ID = "mcdm-flee-mortals-where-evil-lives";

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

export function challengeRatingOf(actor) {
  const cr = actor?.system?.details?.cr;
  return typeof cr === "number" && Number.isFinite(cr) && cr >= 0 ? cr : null;
}

export function statBlockKey(actor) {
  return actor?._stats?.compendiumSource ?? actor?.name ?? null;
}

export async function toggleManualMinionFlag(actor) {
  await actor.setFlag(MINION_FLAG_SCOPE, MINION_FLAG_KEY, !hasManualMinionFlag(actor));
}
