import { isHexColor } from "./band-colors.js";
import { INITIATIVE_MODES } from "./group-initiative.js";

const VALID_MODES = new Set(Object.values(INITIATIVE_MODES));

function toEntry(live) {
  const members = (live.members ?? []).map(member => ({ id: member.id, name: member.name }));
  const color = isHexColor(live.color) ? live.color.toLowerCase() : null;
  const mode = VALID_MODES.has(live.mode) ? live.mode : null;
  const captain = typeof live.captain === "string" ? live.captain : null;
  return {
    id: live.id,
    name: live.name,
    members,
    rolled: live.rolled === true,
    color,
    mode,
    captain,
    original: { color, mode, captain }
  };
}

function findGroup(model, groupId) {
  const group = model.groups.find(entry => entry.id === groupId);
  if (!group) throw new Error(`unknown band (${groupId})`);
  return group;
}

function replaceGroup(model, group) {
  return { ...model, groups: model.groups.map(entry => (entry.id === group.id ? group : entry)) };
}

export function createExistingModel(liveGroups) {
  if (!Array.isArray(liveGroups)) {
    throw new Error("createExistingModel: the bands must be an array");
  }
  return { groups: liveGroups.map(toEntry) };
}

export function syncExistingModel(model, liveGroups) {
  if (!Array.isArray(liveGroups)) {
    throw new Error("syncExistingModel: the bands must be an array");
  }
  const previous = new Map(model.groups.map(group => [group.id, group]));
  const groups = liveGroups.map(live => {
    const fresh = toEntry(live);
    const old = previous.get(fresh.id);
    if (!old) return fresh;
    const kept = { ...fresh };
    if (old.color !== old.original.color) kept.color = old.color;
    if (!fresh.rolled) {
      if (old.mode !== old.original.mode) kept.mode = old.mode;
      if (old.captain !== old.original.captain && fresh.members.some(member => member.id === old.captain)) kept.captain = old.captain;
    }
    return kept;
  });
  return { groups };
}

export function setExistingColor(model, groupId, color) {
  const group = findGroup(model, groupId);
  if (!isHexColor(color)) {
    throw new Error(`setExistingColor: not a #rrggbb color (${color})`);
  }
  return replaceGroup(model, { ...group, color: color.toLowerCase() });
}

export function setExistingMode(model, groupId, mode) {
  const group = findGroup(model, groupId);
  if (group.rolled) {
    throw new Error(`setExistingMode: the band has already rolled initiative (${groupId})`);
  }
  if (mode !== null && !VALID_MODES.has(mode)) {
    throw new Error(`setExistingMode: invalid mode (${mode})`);
  }
  return replaceGroup(model, { ...group, mode });
}

export function setExistingCaptain(model, groupId, memberId) {
  const group = findGroup(model, groupId);
  if (group.rolled) {
    throw new Error(`setExistingCaptain: the band has already rolled initiative (${groupId})`);
  }
  if (memberId !== null && !group.members.some(member => member.id === memberId)) {
    throw new Error(`setExistingCaptain: the creature is not in the band (${memberId})`);
  }
  return replaceGroup(model, { ...group, captain: memberId });
}

export function shownCaptain(group) {
  if (group.captain === null) return null;
  if (group.members.some(member => member.id === group.captain)) return group.captain;
  return group.members[0]?.id ?? null;
}

export function pendingChanges(model) {
  const changes = [];
  for (const group of model.groups) {
    const change = { id: group.id };
    if (group.color !== group.original.color && group.color !== null) change.color = group.color;
    if (!group.rolled) {
      if (group.mode !== group.original.mode) change.mode = group.mode;
      if (group.captain !== group.original.captain && group.captain !== null) change.captain = group.captain;
    }
    if (Object.keys(change).length > 1) changes.push(change);
  }
  return changes;
}

export function hasPendingChanges(model) {
  return pendingChanges(model).length > 0;
}
