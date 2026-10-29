import { isMinionActor } from "../minion-flags.js";
import { debugLog } from "../log.js";

export const RING_REPAIR_DELAY_MS = 1800;

const timers = new Map();

function tokensOf(actor) {
  if (actor.isToken) return actor.token ? [actor.token] : [];
  return actor.getActiveTokens?.(true, true) ?? [];
}

function repair(document) {
  const token = document.object;
  if (!token || token.destroyed || !document.ring?.enabled) return;
  token.renderFlags?.set({ refreshRingVisuals: true });
  debugLog(`${document.name}: ring redrawn after the flash.`);
}

export function scheduleRingRepair(actor) {
  if (!actor || !isMinionActor(actor)) return;
  for (const document of tokensOf(actor)) {
    if (!document?.ring?.enabled) continue;
    const key = document.uuid ?? document.id;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      repair(document);
    }, RING_REPAIR_DELAY_MS));
  }
}

function touchesHitPoints(changes) {
  return changes?.system?.attributes?.hp !== undefined;
}

function deadActor(effect) {
  if (!effect?.statuses?.has?.(CONFIG.specialStatusEffects.DEFEATED)) return null;
  const parent = effect.parent;
  return parent?.documentName === "Actor" ? parent : null;
}

export function registerRingRepair() {
  Hooks.on("updateActor", (actor, changes) => {
    if (touchesHitPoints(changes)) scheduleRingRepair(actor);
  });
  Hooks.on("createActiveEffect", effect => scheduleRingRepair(deadActor(effect)));
  Hooks.on("deleteActiveEffect", effect => scheduleRingRepair(deadActor(effect)));
}
