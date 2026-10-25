import { planGrouping } from "../engine/group-plan.js";
import { maximumForCr } from "../engine/band-maximums.js";
import { currentMaximumsTable } from "../maximums-setting.js";
import { groupsActive } from "../groups-status.js";
import { challengeRatingOf, isMinionActor, statBlockKey } from "../minion-flags.js";
import { debugLog, errorLog } from "../log.js";
import { isMarkedAlone } from "./group-flags.js";

const queues = new Map();
const pending = new Set();

function isActiveGm() {
  return game.users?.activeGM?.isSelf === true;
}

function describeForGrouping(combatant) {
  const actor = combatant.actor;
  if (isMarkedAlone(combatant)) return { key: null, capacity: null };
  if (!isMinionActor(actor)) return { key: null, capacity: null };
  const cr = challengeRatingOf(actor);
  if (cr === null) {
    debugLog(`${actor.name} is a minion without a challenge rating: not grouped.`);
    return { key: null, capacity: null };
  }
  return { key: statBlockKey(actor), capacity: maximumForCr(cr, currentMaximumsTable()) };
}

export function initiativeRolled(combat) {
  return Array.from(combat.combatants).some(combatant => Number.isFinite(combatant.initiative));
}

async function applyPlan(combat, plan, nameByKey) {
  for (const { key, memberIds } of plan.create) {
    const [group] = await combat.createEmbeddedDocuments("CombatantGroup", [{ name: nameByKey.get(key) ?? String(key) }]);
    await combat.updateEmbeddedDocuments("Combatant", memberIds.map(id => ({ _id: id, group: group.id })));
    debugLog(`Auto-grouped ${memberIds.length} combatants (${nameByKey.get(key) ?? key}) into a new group.`);
  }
  for (const { groupId, memberIds } of plan.add) {
    await combat.updateEmbeddedDocuments("Combatant", memberIds.map(id => ({ _id: id, group: groupId })));
    debugLog(`Added ${memberIds.length} combatants to the existing group ${groupId}.`);
  }
}

export async function reconcileGroups(combat) {
  if (!combat || !game.combats?.has(combat.id)) return;
  if (!isActiveGm() || !groupsActive()) return;

  if (initiativeRolled(combat)) return;

  const combatants = Array.from(combat.combatants);
  const nameByKey = new Map();
  const capacities = {};
  const items = combatants.map(combatant => {
    const { key, capacity } = describeForGrouping(combatant);
    if (key !== null && !nameByKey.has(key)) {
      nameByKey.set(key, combatant.actor?.name ?? combatant.name);
      capacities[key] = capacity;
    }
    return { id: combatant.id, key, groupId: combatant._source?.group ?? combatant.group?.id ?? null };
  });

  const plan = planGrouping(items, capacities);
  if (plan.create.length === 0 && plan.add.length === 0) return;
  await applyPlan(combat, plan, nameByKey);
}

export function scheduleReconcile(combat) {
  if (!combat || pending.has(combat.id)) return;
  pending.add(combat.id);
  const previous = queues.get(combat.id) ?? Promise.resolve();
  const next = previous
    .then(() => {
      pending.delete(combat.id);
      return reconcileGroups(combat);
    })
    .catch(error => errorLog("Automatic grouping failed:", error));
  queues.set(combat.id, next);
  return next;
}

export function reconcileAllCombats() {
  if (!isActiveGm()) return;
  for (const combat of game.combats ?? []) scheduleReconcile(combat);
}

export function registerAutoGroups() {
  Hooks.on("createCombatant", combatant => {
    scheduleReconcile(combatant.parent);
  });
}
