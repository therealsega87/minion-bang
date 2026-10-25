import { MODULE_ID, debugLog, errorLog } from "../log.js";
import { CAPTAIN_FLAG, COLOR_FLAG, LOCK_FLAG, MODE_FLAG, readGroupFlag } from "./group-flags.js";

function allGroups(combat) {
  return Array.from(combat?.groups?.values?.() ?? combat?.groups ?? []);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function hasRolled(group) {
  if (isNumber(group.initiative) || readGroupFlag(group, LOCK_FLAG) !== undefined) return true;
  return Array.from(group.members ?? []).some(member => isNumber(member._source?.initiative));
}

export function readLiveGroups(combat = game.combat) {
  return allGroups(combat).map(group => ({
    id: group.id,
    name: group.name,
    members: Array.from(group.members ?? []).filter(member => member.tokenId).map(member => ({ id: member.tokenId, name: member.name })),
    rolled: hasRolled(group),
    color: readGroupFlag(group, COLOR_FLAG),
    mode: readGroupFlag(group, MODE_FLAG),
    captain: readGroupFlag(group, CAPTAIN_FLAG)
  }));
}

async function applyOne(group, change) {
  const rolled = hasRolled(group);
  let written = 0;
  if (change.color !== undefined) {
    await group.setFlag(MODULE_ID, COLOR_FLAG, change.color);
    written += 1;
  }
  if (rolled) return written;
  if (Object.hasOwn(change, "mode")) {
    if (change.mode === null) await group.unsetFlag(MODULE_ID, MODE_FLAG);
    else await group.setFlag(MODULE_ID, MODE_FLAG, change.mode);
    written += 1;
  }
  const isMember = Array.from(group.members ?? []).some(member => member.tokenId === change.captain);
  if (change.captain !== undefined && isMember) {
    await group.setFlag(MODULE_ID, CAPTAIN_FLAG, change.captain);
    written += 1;
  }
  return written;
}

export async function applyExistingChanges(changes, combat = game.combat) {
  const groups = new Map(allGroups(combat).map(group => [group.id, group]));
  const result = { updated: 0, missing: 0 };
  for (const change of changes) {
    const group = groups.get(change.id);
    if (!group) {
      result.missing += 1;
      continue;
    }
    try {
      if (await applyOne(group, change) > 0) result.updated += 1;
    } catch (error) {
      errorLog(`The band ${group.name} could not be updated:`, error);
      throw error;
    }
  }
  debugLog(`Existing bands: ${result.updated} updated, ${result.missing} gone.`);
  return result;
}
