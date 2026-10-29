import { MODULE_ID, debugLog, warnLog, escapeHtml } from "../log.js";
import { DEATH_FLAG } from "./minion-kill-hook.js";

export const OVERKILL_FLAG = "overkill";

function combatantOf(tokenDocument) {
  return game.combat?.getCombatantsByToken?.(tokenDocument)?.[0] ?? null;
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function removeDead(actor) {
  const dead = CONFIG.specialStatusEffects.DEFEATED;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!actor.statuses?.has(dead)) return;
    try {
      await actor.toggleStatusEffect(dead, { active: false });
      return;
    } catch (error) {
      debugLog(`${actor.name}: the Dead status was already being removed (${error.message}).`);
      if (actor.statuses?.has(dead)) await pause(250);
    }
  }
}

export const MIDI_GRACE_MS = 1000;

function midiRemovesDead() {
  const settings = globalThis.MidiQOL?.configSettings?.() ?? {};
  return Boolean(settings.addDead) && settings.addDead !== "none";
}

async function standUpOne(tokenDocument, midiHandled) {
  const actor = tokenDocument?.actor;
  if (!actor) return;
  if (midiHandled && actor.statuses?.has(CONFIG.specialStatusEffects.DEFEATED)) {
    debugLog(`${tokenDocument.name}: Midi-QOL left the Dead status, Minion! removes it.`);
  }
  await removeDead(actor);
  const combatant = combatantOf(tokenDocument);
  if (!combatant?.defeated) return;
  try {
    await combatant.update({ defeated: false });
  } catch (error) {
    debugLog(`${tokenDocument.name}: the defeated mark was already being removed (${error.message}).`);
  }
}

export async function standUp(tokenDocuments) {
  const midiHandled = midiRemovesDead();
  if (midiHandled) await pause(MIDI_GRACE_MS);
  for (const tokenDocument of tokenDocuments) await standUpOne(tokenDocument, midiHandled);
}

export async function recordOverkill(hitTokenUuid, record) {
  const actor = hitTokenUuid ? fromUuidSync(hitTokenUuid)?.actor : null;
  if (!actor || !record.attackId || record.victims.length === 0) return;
  await actor.setFlag(MODULE_ID, OVERKILL_FLAG, record);
  debugLog(`${actor.name}: overkill remembered for undo (${record.victims.length} minions).`);
}

export async function undoOverkill(hitDocument, hitActor, capture) {
  const record = hitActor.getFlag?.(MODULE_ID, OVERKILL_FLAG);
  const attackId = capture?.attack?.attackId ?? null;
  if (!record || !attackId || record.attackId !== attackId) {
    await standUp([hitDocument]);
    return 0;
  }
  const raised = [];
  for (const victim of record.victims ?? []) {
    const document = fromUuidSync(victim.tokenUuid);
    const actor = document?.actor;
    if (!actor) continue;
    if ((actor.system?.attributes?.hp?.value ?? 0) > 0) continue;
    if (actor.getFlag(MODULE_ID, DEATH_FLAG) !== victim.deathId) {
      debugLog(`${document.name}: killed again since the overkill, left down.`);
      continue;
    }
    try {
      await actor.update({ "system.attributes.hp.value": victim.hp, "system.attributes.hp.temp": victim.temp ?? 0 });
    } catch (error) {
      warnLog(`${document.name} could not stand up again after the undo:`, error);
      continue;
    }
    raised.push(document);
  }
  await hitActor.unsetFlag(MODULE_ID, OVERKILL_FLAG);
  debugLog(`Overkill undone: ${raised.length} minions stand up again.`);
  if (raised.length > 0) {
    const text = game.i18n.format("MINIONBANG.Chat.OverkillUndone", { attacker: escapeHtml(record.attackerName ?? ""), count: raised.length });
    await ChatMessage.create({ content: `<p>${text}</p>`, whisper: ChatMessage.getWhisperRecipients("GM").map(user => user.id) });
  }
  await standUp([hitDocument, ...raised]);
  return raised.length;
}
