import { proposeBands } from "./band-split.js";
import { SINGLE_COLOR, isHexColor, pickFreeColors } from "./band-colors.js";
import { INITIATIVE_MODES } from "./group-initiative.js";

const VALID_MODES = new Set(Object.values(INITIATIVE_MODES));

function requireText(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name}: must be a non-empty text`);
  }
}

function escapePattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function bandNames(base, count, takenNames = []) {
  requireText("bandNames base", base);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`bandNames count: must be a whole number of at least 0 (${count})`);
  }
  const pattern = new RegExp(`^${escapePattern(base)} (\\d+)$`);
  let highest = 0;
  for (const name of takenNames) {
    const match = typeof name === "string" ? name.match(pattern) : null;
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return Array.from({ length: count }, (_, index) => `${base} ${highest + index + 1}`);
}

export function createTypeModel({ key, name, cr, maximum, members, takenNames = [], usedColors = [] }) {
  requireText("createTypeModel name", name);
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error("createTypeModel: members must be a non-empty array");
  }
  const ids = new Set();
  for (const member of members) {
    if (typeof member?.id !== "string" || member.id === "") {
      throw new Error("createTypeModel: every member needs an id");
    }
    if (ids.has(member.id)) {
      throw new Error(`createTypeModel: duplicate member id (${member.id})`);
    }
    ids.add(member.id);
  }

  const { sizes, singles } = proposeBands(members.length, maximum);
  const names = bandNames(name, sizes.length, takenNames);
  const colors = pickFreeColors(sizes.length, usedColors);
  const modes = sizes.map(() => null);
  const captains = sizes.map(() => null);
  const assignment = {};
  let cursor = 0;
  sizes.forEach((size, bandIndex) => {
    for (let i = 0; i < size; i += 1) assignment[members[cursor + i].id] = bandIndex;
    cursor += size;
  });
  for (let i = cursor; i < members.length; i += 1) assignment[members[i].id] = null;

  return { key, name, cr, maximum, members: members.map(member => ({ ...member })), expected: sizes, singles, names, colors, modes, captains, assignment };
}

export function assignMember(model, memberId, bandIndex) {
  if (!model.members.some(member => member.id === memberId)) {
    throw new Error(`assignMember: unknown member (${memberId})`);
  }
  if (bandIndex !== null && (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= model.expected.length)) {
    throw new Error(`assignMember: unknown band (${bandIndex})`);
  }
  return { ...model, assignment: { ...model.assignment, [memberId]: bandIndex } };
}

export function renameBand(model, bandIndex, name) {
  if (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= model.expected.length) {
    throw new Error(`renameBand: unknown band (${bandIndex})`);
  }
  if (typeof name !== "string") {
    throw new Error("renameBand: the name must be a text");
  }
  const names = [...model.names];
  names[bandIndex] = name;
  return { ...model, names };
}

export function setBandColor(model, bandIndex, color) {
  if (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= model.expected.length) {
    throw new Error(`setBandColor: unknown band (${bandIndex})`);
  }
  if (!isHexColor(color)) {
    throw new Error(`setBandColor: not a #rrggbb color (${color})`);
  }
  const colors = [...model.colors];
  colors[bandIndex] = color.toLowerCase();
  return { ...model, colors };
}

export function setBandMode(model, bandIndex, mode) {
  if (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= model.expected.length) {
    throw new Error(`setBandMode: unknown band (${bandIndex})`);
  }
  if (mode !== null && !VALID_MODES.has(mode)) {
    throw new Error(`setBandMode: invalid mode (${mode})`);
  }
  const modes = [...model.modes];
  modes[bandIndex] = mode;
  return { ...model, modes };
}

export function bandMembers(model, bandIndex) {
  return model.members.filter(member => model.assignment[member.id] === bandIndex);
}

export function effectiveCaptain(model, bandIndex) {
  const members = bandMembers(model, bandIndex);
  if (members.length === 0) return null;
  const chosen = model.captains[bandIndex];
  return members.some(member => member.id === chosen) ? chosen : members[0].id;
}

export function setBandCaptain(model, bandIndex, memberId) {
  if (!Number.isInteger(bandIndex) || bandIndex < 0 || bandIndex >= model.expected.length) {
    throw new Error(`setBandCaptain: unknown band (${bandIndex})`);
  }
  if (memberId !== null && model.assignment[memberId] !== bandIndex) {
    throw new Error(`setBandCaptain: the creature is not in band ${bandIndex + 1} (${memberId})`);
  }
  const captains = [...model.captains];
  captains[bandIndex] = memberId;
  return { ...model, captains };
}

export function memberColors(model) {
  const result = {};
  for (const member of model.members) {
    const band = model.assignment[member.id];
    result[member.id] = band === null ? SINGLE_COLOR : model.colors[band];
  }
  return result;
}

export function evaluateModel(model) {
  const bands = model.expected.map((expected, index) => {
    const actual = model.members.filter(member => model.assignment[member.id] === index).length;
    return { index, expected, actual, countOk: actual === expected, nameOk: model.names[index].trim() !== "" };
  });
  const errors = [];
  for (const band of bands) {
    if (!band.countOk) errors.push({ code: "count", band: band.index, expected: band.expected, actual: band.actual });
    if (!band.nameOk) errors.push({ code: "name", band: band.index });
  }
  const singles = model.members.filter(member => model.assignment[member.id] === null).length;
  return { ok: errors.length === 0, bands, errors, singles };
}

export function buildPlan(model) {
  const evaluation = evaluateModel(model);
  if (!evaluation.ok) {
    throw new Error("buildPlan: the assignment does not respect the band sizes");
  }
  return {
    key: model.key,
    bands: model.expected.map((_, index) => ({
      name: model.names[index].trim(),
      color: model.colors[index],
      mode: model.modes[index],
      captainId: effectiveCaptain(model, index),
      memberIds: model.members.filter(member => model.assignment[member.id] === index).map(member => member.id)
    })),
    singleIds: model.members.filter(member => model.assignment[member.id] === null).map(member => member.id)
  };
}
