import { buildMinionKill } from "../engine/minion-kill.js";
import { maximumForCr } from "../engine/band-maximums.js";
import { currentMaximumsTable } from "../maximums-setting.js";
import { challengeRatingOf } from "../minion-flags.js";
import { MODULE_ID, infoLog, warnLog } from "../log.js";

export const MINION_KILL_HOOK = `${MODULE_ID}.minionKill`;

const UPDATE_TIMEOUT_MS = 3000;

function bandSizeOf(cr) {
  if (cr === null) return null;
  try {
    return maximumForCr(cr, currentMaximumsTable());
  } catch {
    return null;
  }
}

// Plain description of a downed minion, read while its actor is at hand.
export function describeMinion(actor, tokenDocument) {
  const challengeRating = challengeRatingOf(actor);
  return {
    actorUuid: actor?.uuid ?? null,
    tokenUuid: tokenDocument?.uuid ?? actor?.token?.uuid ?? null,
    name: tokenDocument?.name ?? actor?.name ?? null,
    challengeRating,
    bandSize: bandSizeOf(challengeRating)
  };
}

// Resolves once the actor's hit points have been written, or after a timeout.
export function afterHpUpdate(actor, timeoutMs = UPDATE_TIMEOUT_MS) {
  return new Promise(resolve => {
    let hookId = null;
    const finish = written => {
      clearTimeout(timer);
      if (hookId != null) Hooks.off("updateActor", hookId);
      resolve(written);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    hookId = Hooks.on("updateActor", (document, changes) => {
      if (document !== actor && document?.uuid !== actor?.uuid) return;
      if (changes?.system?.attributes?.hp?.value === undefined) return;
      finish(true);
    });
  });
}

function attackerOf(attack) {
  const token = attack?.attackerTokenUuid ? fromUuidSync(attack.attackerTokenUuid) : null;
  return {
    tokenUuid: attack?.attackerTokenUuid ?? null,
    actorUuid: token?.actor?.uuid ?? null,
    name: attack?.attackerName ?? token?.actor?.name ?? null,
    type: attack?.attackerType ?? token?.actor?.type ?? null
  };
}

// kill: { actor, primary, attack, origin, record, written }
// written: promise from afterHpUpdate for the minion that was hit.
export async function announceMinionKill(kill, extras = []) {
  try {
    await kill.written;
    if ((kill.actor?.system?.attributes?.hp?.value ?? 0) > 0) return;
    const data = buildMinionKill({
      primary: kill.primary,
      extras,
      attacker: attackerOf(kill.attack),
      attack: kill.attack ?? {},
      origin: kill.origin,
      record: kill.record
    });
    infoLog(`minionKill: ${data.attacker.name ?? "unknown"} downed ${data.count} minion(s), ${data.overkillCount} by overkill.`);
    Hooks.callAll(MINION_KILL_HOOK, data);
  } catch (error) {
    warnLog(`The "${MINION_KILL_HOOK}" hook could not be called:`, error);
  }
}
