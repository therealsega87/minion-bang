import { computeGroupInitiative, describeGroupInitiative, INITIATIVE_MODES } from "../engine/group-initiative.js";
import { groupsActive } from "../groups-status.js";
import { chooseCaptain, lockDecision, replacementCaptain } from "../engine/band-captain.js";
import { CAPTAIN_FLAG, LOCK_FLAG, MODE_FLAG, readGroupFlag } from "./group-flags.js";
import { MODULE_ID, debugLog, infoLog, warnLog, errorLog } from "../log.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/group-initiative-card.hbs`;
const VALID_MODES = new Set(Object.values(INITIATIVE_MODES));

const queues = new Map();
const busy = new Set();
const dirty = new Set();
const ownRolls = new Set();
const lastCards = new Map();

function isActiveGm() {
  return game.users?.activeGM?.isSelf === true;
}

export function currentInitiativeMode() {
  let mode = INITIATIVE_MODES.CAPTAIN;
  try {
    mode = game.settings.get(MODULE_ID, "groupInitiativeMode");
  } catch {
    mode = INITIATIVE_MODES.CAPTAIN;
  }
  return VALID_MODES.has(mode) ? mode : INITIATIVE_MODES.CAPTAIN;
}

export function groupMode(group) {
  const chosen = readGroupFlag(group, MODE_FLAG);
  return VALID_MODES.has(chosen) ? chosen : currentInitiativeMode();
}

function isDefeated(member) {
  return member.defeated === true || member.isDefeated === true;
}

function memberInfo(member) {
  return { id: member.id, tokenId: member.tokenId, defeated: isDefeated(member) };
}

async function writeGroupInitiative(group, value) {
  if (group.initiative !== value) await group.update({ initiative: value });
  if (group.initiative !== value) await group.update({ initiative: value });
}

function ownRoll(member) {
  const value = member._source?.initiative;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function postSummaryCard(group, mode, members, rolls, result) {
  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, {
    title: game.i18n.format("MINIONBANG.GroupCard.Title", { group: group.name }),
    modeLabel: game.i18n.localize(`MINIONBANG.GroupMode.${mode}`),
    members: members.map((member, index) => ({ name: member.name, img: member.img, initiative: rolls[index] })),
    expression: describeGroupInitiative(mode, rolls),
    result,
    resultLabel: game.i18n.localize("MINIONBANG.GroupCard.Result")
  });
  await ChatMessage.create({
    content,
    whisper: ChatMessage.getWhisperRecipients("GM").map(user => user.id),
    flags: { [MODULE_ID]: { groupInitiative: group.id } }
  });
}

export async function resetGroupInitiatives(combat) {
  if (!game.user?.isGM || !groupsActive()) return;
  for (const group of Array.from(combat?.groups?.values?.() ?? [])) {
    if (readGroupFlag(group, LOCK_FLAG) !== undefined) await group.unsetFlag(MODULE_ID, LOCK_FLAG);
    if (group.initiative !== null && group.initiative !== undefined) await group.update({ initiative: null });
    debugLog(`Group ${group.name}: initiative reset.`);
  }
}

function wrapCombatMethod(name, build) {
  let proto = globalThis.CONFIG?.Combat?.documentClass?.prototype ?? null;
  while (proto && !Object.hasOwn(proto, name)) proto = Object.getPrototypeOf(proto);
  if (!proto || proto[name].minionBangWrapped) return false;
  const wrapped = build(proto[name]);
  wrapped.minionBangWrapped = true;
  proto[name] = wrapped;
  return true;
}

export function wrapResetAll() {
  return wrapCombatMethod("resetAll", original => async function (...args) {
    const result = await original.apply(this, args);
    try {
      await resetGroupInitiatives(this);
    } catch (error) {
      errorLog("The group initiative could not be reset:", error);
    }
    return result;
  });
}

export function captainsInsteadOfMembers(combat, ids) {
  const everyone = Array.from(combat?.combatants?.values?.() ?? combat?.combatants ?? []);
  const chosen = [];
  for (const id of ids) {
    let use = id;
    const groupId = everyone.find(combatant => combatant.id === id)?._source?.group;
    const group = groupId ? combat.groups?.get(groupId) : null;
    const captainToken = group ? readGroupFlag(group, CAPTAIN_FLAG) : undefined;
    if (group && captainToken !== undefined && groupMode(group) === INITIATIVE_MODES.CAPTAIN && readGroupFlag(group, LOCK_FLAG) === undefined) {
      const captain = chooseCaptain(Array.from(group.members ?? []).map(memberInfo), captainToken);
      if (captain) use = captain.id;
    }
    if (!chosen.includes(use)) chosen.push(use);
  }
  return chosen;
}

export function wrapRollInitiative() {
  return wrapCombatMethod("rollInitiative", original => function (ids, ...rest) {
    if (game.user?.isGM && groupsActive() && ids !== undefined && ids !== null) {
      try {
        ids = captainsInsteadOfMembers(this, [].concat(ids));
      } catch (error) {
        errorLog("The captain could not be chosen for the roll:", error);
      }
    }
    return original.call(this, ids, ...rest);
  });
}

async function completeCaptainGroup(combat, group) {
  const captainToken = readGroupFlag(group, CAPTAIN_FLAG);
  if (captainToken === undefined) return;
  const members = Array.from(group.members ?? []);
  if (members.length === 0) return;

  const locked = readGroupFlag(group, LOCK_FLAG);
  const anyRolled = members.some(member => ownRoll(member) !== null);
  if (!anyRolled) {
    if (locked !== undefined) await group.unsetFlag(MODULE_ID, LOCK_FLAG);
    return;
  }

  const decision = lockDecision(locked, group.initiative);
  if (decision === "keep") return;
  if (decision === "restore") {
    await group.update({ initiative: locked });
    debugLog(`Group ${group.name}: initiative kept at ${locked}.`);
    return;
  }

  const chosen = chooseCaptain(members.map(memberInfo), captainToken);
  if (!chosen) return;
  const captain = members.find(member => member.id === chosen.id);
  let roll = ownRoll(captain);
  if (roll === null) {
    ownRolls.add(group.id);
    try {
      await combat.rollInitiative([captain.id]);
    } finally {
      ownRolls.delete(group.id);
    }
    roll = ownRoll(captain);
  }
  if (roll === null) {
    warnLog(`Group ${group.name}: the captain has not rolled initiative, the group value was not set.`);
    ui.notifications.warn(game.i18n.format("MINIONBANG.GroupInitiative.Incomplete", { group: group.name }));
    return;
  }

  await writeGroupInitiative(group, roll);
  await group.setFlag(MODULE_ID, LOCK_FLAG, roll);
  infoLog(`Group ${group.name} (captain ${captain.name}): initiative ${roll}.`);
}

async function completeGroup(combat, groupId) {
  if (!isActiveGm() || !groupsActive()) return;

  const group = combat.groups?.get(groupId);
  if (!group) return;
  const mode = groupMode(group);
  if (mode === INITIATIVE_MODES.CAPTAIN) {
    await completeCaptainGroup(combat, group);
    return;
  }
  let members = Array.from(group.members ?? []);
  if (members.length === 0) return;

  const missing = members.filter(member => ownRoll(member) === null);
  if (missing.length > 0) {
    ownRolls.add(groupId);
    try {
      await combat.rollInitiative(missing.map(member => member.id));
    } finally {
      ownRolls.delete(groupId);
    }
    members = Array.from(group.members ?? []);
  }

  const rolls = members.map(ownRoll);
  if (rolls.some(roll => roll === null)) {
    warnLog(`Group ${group.name}: not every member has rolled initiative, the group value was not calculated.`);
    ui.notifications.warn(game.i18n.format("MINIONBANG.GroupInitiative.Incomplete", { group: group.name }));
    return;
  }

  const result = computeGroupInitiative(mode, rolls);
  const changed = group.initiative !== result;
  await writeGroupInitiative(group, result);

  if (missing.length > 0 || changed) infoLog(`Group ${group.name} (${mode}): ${describeGroupInitiative(mode, rolls)}.`);
  const cardKey = JSON.stringify([mode, rolls, result]);
  if (missing.length > 0 || (changed && lastCards.get(groupId) !== cardKey)) {
    lastCards.set(groupId, cardKey);
    await postSummaryCard(group, mode, members, rolls, result);
  }
}

async function processGroup(combat, groupId) {
  if (busy.has(groupId)) {
    dirty.add(groupId);
    return;
  }
  busy.add(groupId);
  try {
    do {
      dirty.delete(groupId);
      await completeGroup(combat, groupId);
    } while (dirty.has(groupId));
  } catch (error) {
    errorLog("Group initiative failed:", error);
    const name = combat.groups?.get(groupId)?.name ?? groupId;
    ui.notifications.warn(game.i18n.format("MINIONBANG.GroupInitiative.Failed", { group: name }));
  } finally {
    busy.delete(groupId);
    dirty.delete(groupId);
  }
}

export function scheduleGroupInitiative(combat, groupId) {
  if (!combat || !groupId) return;
  if (busy.has(groupId)) {
    dirty.add(groupId);
    return;
  }
  const previous = queues.get(groupId) ?? Promise.resolve();
  const next = previous.then(() => processGroup(combat, groupId));
  queues.set(groupId, next);
  return next;
}

async function passCaptaincy(combatant) {
  if (!isActiveGm() || !groupsActive()) return;
  const combat = combatant.parent;
  const groupId = combatant._source?.group;
  const group = groupId ? combat?.groups?.get(groupId) : null;
  if (!group) return;
  const captainToken = readGroupFlag(group, CAPTAIN_FLAG);
  if (captainToken === undefined || captainToken !== combatant.tokenId) return;
  const next = replacementCaptain(Array.from(group.members ?? []).map(memberInfo), combatant.id);
  if (!next) {
    infoLog(`Group ${group.name}: the captain is out and no member is left to replace the captain.`);
    return;
  }
  await group.setFlag(MODULE_ID, CAPTAIN_FLAG, next.tokenId);
  const name = Array.from(group.members ?? []).find(member => member.id === next.id)?.name ?? next.id;
  infoLog(`Group ${group.name}: the captain is out, the new captain is ${name}.`);
}

function passCaptaincySafely(combatant) {
  passCaptaincy(combatant).catch(error => errorLog("The captain could not be replaced:", error));
}

export function registerGroupInitiative() {
  wrapResetAll();
  wrapRollInitiative();
  Hooks.on("deleteCombatant", combatant => passCaptaincySafely(combatant));
  Hooks.on("updateCombatant", (combatant, changes) => {
    if (changes?.defeated === true) passCaptaincySafely(combatant);
    if (changes?.initiative === undefined || changes.initiative === null) return;
    const groupId = combatant._source?.group;
    if (!groupId || ownRolls.has(groupId)) return;
    scheduleGroupInitiative(combatant.parent, groupId);
  });
  Hooks.on("updateCombatantGroup", (group, changes) => {
    if (changes?.initiative === undefined) return;
    if (changes.initiative === null && !Array.from(group.members ?? []).some(member => ownRoll(member) !== null)) return;
    scheduleGroupInitiative(group.parent, group.id);
  });
}
