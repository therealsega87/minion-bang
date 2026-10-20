import { debugLog, warnLog } from "./log.js";

function combatantFor(tokenDocument) {
  const combat = game.combat;
  if (!combat || !tokenDocument) return null;
  return combat.getCombatantsByToken?.(tokenDocument)?.[0] ?? null;
}

export function opportunityAttackQuestion(attackerTokenDocument) {
  const combat = game.combat;
  const combatant = combatantFor(attackerTokenDocument);
  if (!combat?.started || !combatant) return { ask: true, reason: "attacker not in an active combat" };
  if (combat.combatant?.id !== combatant.id) return { ask: true, reason: "not the attacker's turn" };
  return { ask: false, reason: "attacker's own turn" };
}

export function killRecord(attackerTokenUuid, attackerName) {
  const combat = game.combat?.started ? game.combat : null;
  return {
    attackerTokenUuid: attackerTokenUuid ?? null,
    attackerName: attackerName ?? null,
    combatId: combat?.id ?? null,
    round: combat?.round ?? null,
    turn: combat?.turn ?? null
  };
}

function midiDefeatHandling() {
  const settings = globalThis.MidiQOL?.configSettings?.() ?? {};
  const deadStatus = !!settings.addDead && settings.addDead !== "none";
  return { deadStatus, defeated: deadStatus && settings.markNonPlayerDefeated === true };
}

export async function markDefeated(tokenDocument) {
  const actor = tokenDocument?.actor;
  if (!actor) return;
  const midi = midiDefeatHandling();
  const deadId = CONFIG.specialStatusEffects.DEFEATED;
  const combatant = combatantFor(tokenDocument);
  let statusBy = "Midi-QOL";
  let defeatedBy = "Midi-QOL";

  try {
    if (!midi.deadStatus) {
      statusBy = "Minion!";
      if (!actor.statuses?.has(deadId)) await actor.toggleStatusEffect(deadId, { active: true, overlay: true });
    }
    if (!combatant) defeatedBy = null;
    else if (!midi.defeated) {
      defeatedBy = "Minion!";
      if (!combatant.defeated) await combatant.update({ defeated: true });
    }
    const defeatedText = defeatedBy ? `defeated mark by ${defeatedBy}` : "no combat";
    debugLog(`${tokenDocument.name}: Dead status by ${statusBy}, ${defeatedText}.`);
  } catch (err) {
    warnLog(`${tokenDocument.name}: could not be marked as defeated.`, err);
  }
}
