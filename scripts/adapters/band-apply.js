import { MODULE_ID, debugLog } from "../log.js";
import { validateApply } from "../engine/band-apply.js";
import { ALONE_FLAG, CAPTAIN_FLAG, COLOR_FLAG, MODE_FLAG } from "./group-flags.js";

export function liveState() {
  const existingIds = new Set();
  for (const token of canvas.scene?.tokens ?? []) existingIds.add(token.id);
  const busyIds = new Set();
  for (const combatant of game.combat?.combatants ?? []) {
    if (combatant.tokenId) busyIds.add(combatant.tokenId);
  }
  return { existingIds, busyIds };
}

export function checkPlan(plan) {
  return validateApply(plan, liveState());
}

function groupFlags(group) {
  const flags = { [COLOR_FLAG]: group.color, [CAPTAIN_FLAG]: group.captainId };
  if (group.mode) flags[MODE_FLAG] = group.mode;
  return flags;
}

function combatantData(scene, tokenId, extra) {
  const token = scene.tokens.get(tokenId);
  return { tokenId, sceneId: scene.id, actorId: token.actorId, hidden: token.hidden, ...extra };
}

export async function applyBandPlan(plan) {
  const scene = canvas.scene;
  if (!scene) throw new Error("There is no active scene.");
  const progress = { combatCreated: false, groups: 0, combatants: 0 };
  try {
    let combat = game.combat;
    if (!combat) {
      combat = await getDocumentClass("Combat").create({ scene: scene.id, active: true });
      progress.combatCreated = true;
      debugLog("Combat created for the bands.");
    }
    let groupDocs = [];
    if (plan.groups.length > 0) {
      groupDocs = await combat.createEmbeddedDocuments(
        "CombatantGroup",
        plan.groups.map(group => ({ name: group.name, flags: { [MODULE_ID]: groupFlags(group) } }))
      );
      progress.groups = groupDocs.length;
    }
    const data = [];
    plan.groups.forEach((group, index) => {
      for (const tokenId of group.memberIds) data.push(combatantData(scene, tokenId, { group: groupDocs[index].id }));
    });
    for (const tokenId of plan.singles) {
      data.push(combatantData(scene, tokenId, { flags: { [MODULE_ID]: { [ALONE_FLAG]: true } } }));
    }
    if (data.length > 0) {
      const created = await combat.createEmbeddedDocuments("Combatant", data);
      progress.combatants = created.length;
    }
    debugLog(`Bands applied: ${progress.groups} groups, ${progress.combatants} combatants.`);
    return { combat, ...progress };
  } catch (error) {
    error.partial = progress;
    throw error;
  }
}
