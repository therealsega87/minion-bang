import { MODULE_ID, debugLog, errorLog } from "../log.js";
import { groupsActive } from "../groups-status.js";
import { planTokenColors } from "../engine/token-color-plan.js";
import { clearBandMarkers, showBandMarkers } from "../ui/band-markers.js";
import { COLOR_FLAG, readGroupFlag } from "./group-flags.js";

export const TOKEN_COLORS_DELAY_MS = 100;
export const RING_SAVED_FLAG = "ringOriginal";

let timer = null;

function isActiveGm() {
  return game.users?.activeGM?.isSelf === true;
}

export function desiredColors() {
  const desired = {};
  if (!groupsActive()) return desired;
  for (const combat of game.combats ?? []) {
    for (const combatant of combat.combatants ?? []) {
      const color = readGroupFlag(combatant.group, COLOR_FLAG);
      if (combatant.tokenId && typeof color === "string") desired[combatant.tokenId] = color;
    }
  }
  return desired;
}

function scenesInUse() {
  const scenes = new Set();
  if (canvas.scene) scenes.add(canvas.scene);
  for (const combat of game.combats ?? []) {
    if (combat.scene) scenes.add(combat.scene);
  }
  return scenes;
}

function describeToken(document) {
  const source = document._source ?? {};
  return {
    id: document.id,
    ringEnabled: Boolean(document.ring?.enabled),
    current: source.ring?.colors?.ring ?? null,
    saved: document.flags?.[MODULE_ID]?.[RING_SAVED_FLAG]
  };
}

export function planForScene(scene, desired) {
  return planTokenColors(Array.from(scene.tokens ?? []).map(describeToken), desired);
}

async function writeScene(scene, plan) {
  const changes = [];
  for (const update of plan.updates) {
    const data = { _id: update.id, "ring.colors.ring": update.color };
    if (update.save) data[`flags.${MODULE_ID}.${RING_SAVED_FLAG}`] = update.save;
    changes.push(data);
  }
  for (const restore of plan.restores) {
    changes.push({ _id: restore.id, "ring.colors.ring": restore.value, [`flags.${MODULE_ID}.-=${RING_SAVED_FLAG}`]: null });
  }
  if (changes.length === 0) return;
  await scene.updateEmbeddedDocuments("Token", changes);
  debugLog(`Token colors: ${plan.updates.length} set, ${plan.restores.length} restored on scene ${scene.id}.`);
}

export async function reconcileTokenColors() {
  const desired = desiredColors();
  const gm = isActiveGm();
  for (const scene of scenesInUse()) {
    const plan = planForScene(scene, desired);
    if (scene === canvas.scene) {
      showBandMarkers(plan.circles);
    }
    if (gm) await writeScene(scene, plan);
  }
  if (!canvas.scene) clearBandMarkers();
}

export function scheduleTokenColors() {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    reconcileTokenColors().catch(error => errorLog("Token colors failed:", error));
  }, TOKEN_COLORS_DELAY_MS);
}

export function registerTokenColors() {
  const names = [
    "createCombatant", "updateCombatant", "deleteCombatant",
    "createCombatantGroup", "updateCombatantGroup", "deleteCombatantGroup",
    "deleteCombat", "canvasReady"
  ];
  for (const name of names) Hooks.on(name, () => scheduleTokenColors());
  Hooks.on("updateToken", (document, changes) => {
    if (changes?.ring !== undefined) scheduleTokenColors();
  });
  Hooks.on("canvasTearDown", () => clearBandMarkers());
  scheduleTokenColors();
}
