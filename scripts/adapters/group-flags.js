import { MODULE_ID } from "../log.js";

export const ALONE_FLAG = "alone";
export const COLOR_FLAG = "color";
export const MODE_FLAG = "mode";
export const CAPTAIN_FLAG = "captain";
export const LOCK_FLAG = "lockedInitiative";

export function readGroupFlag(group, key) {
  return group?.getFlag?.(MODULE_ID, key) ?? group?.flags?.[MODULE_ID]?.[key];
}

export function isMarkedAlone(combatant) {
  return readGroupFlag(combatant, ALONE_FLAG) === true;
}
