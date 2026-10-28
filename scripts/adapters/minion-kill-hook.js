import { buildMinionKillEvent, isRealDeath, validChallengeRating } from "../engine/minion-kill.js";
import { maximumForCr } from "../engine/band-maximums.js";
import { currentMaximumsTable } from "../maximums-setting.js";
import { isMinionActor } from "../minion-flags.js";
import { MODULE_ID, debugLog, infoLog, warnLog } from "../log.js";

export const MINION_KILL_HOOK = `${MODULE_ID}.minionKill`;
export const DEATH_FLAG = "deathId";
export const DEATH_FLAG_PATH = `flags.${MODULE_ID}.${DEATH_FLAG}`;

const RELAY_NAME = "minionKill";
const PENDING_TTL_MS = 10 * 60 * 1000;
const EMITTED_MEMORY = 500;

let relaySocket = null;
const emitted = new Set();
const pendingDeaths = new Map();
const TRANSPORT_KEY = MODULE_ID;

export function newDeathId() {
  return foundry.utils.randomID(16);
}

function isActiveGM() {
  const active = game.users?.activeGM;
  return Boolean(game.user?.isGM && active && active.id === game.user.id);
}

function minionsPerStandard(cr) {
  if (cr === null) return null;
  try {
    return maximumForCr(cr, currentMaximumsTable());
  } catch {
    return null;
  }
}

function combatSnapshot() {
  const combat = game.combat?.started ? game.combat : null;
  return combat ? { combatId: combat.id, round: combat.round, turn: combat.turn } : null;
}

// Plain description of a downed minion, read from the victim itself.
export function describeVictim(actor, tokenDocument = null) {
  const token = tokenDocument ?? actor?.token ?? null;
  const cr = validChallengeRating(actor?.system?.details?.cr);
  return {
    sceneId: token?.parent?.id ?? null,
    victim: {
      actorId: actor?.id ?? null,
      actorUuid: actor?.uuid ?? null,
      tokenUuid: token?.uuid ?? null,
      name: token?.name ?? actor?.name ?? null,
      cr,
      minionsPerStandard: minionsPerStandard(cr)
    }
  };
}

// The attacker as recorded by the attack. Null when it cannot be determined.
export function describeAttacker(attackerTokenUuid, attackerName = null) {
  if (!attackerTokenUuid) return null;
  const actor = fromUuidSync(attackerTokenUuid)?.actor ?? null;
  return {
    actorId: actor?.id ?? null,
    actorUuid: actor?.uuid ?? null,
    tokenUuid: attackerTokenUuid,
    name: actor?.name ?? attackerName ?? null
  };
}

// The death is confirmed when the minion is at 0 hit points and carries the
// death id written together with them.
function deathConfirmed(actor, deathId) {
  const hp = actor?.system?.attributes?.hp?.value;
  return typeof hp === "number" && hp <= 0 && actor.getFlag?.(MODULE_ID, DEATH_FLAG) === deathId;
}

function remember(eventId) {
  emitted.add(eventId);
  if (emitted.size > EMITTED_MEMORY) emitted.delete(emitted.values().next().value);
}

// Calls the hook on this client. Only the active GM gets here.
export function emitMinionKill(event) {
  if (emitted.has(event.eventId)) {
    debugLog(`minionKill ${event.eventId} already sent, not repeated.`);
    return false;
  }
  remember(event.eventId);
  infoLog(`minionKill: ${event.victim.name ?? "a minion"} (${event.cause}) by ${event.attacker?.name ?? "unknown"}.`);
  Hooks.callAll(MINION_KILL_HOOK, event);
  return true;
}

// Sends the event to the active GM, or calls the hook here if this is it.
export async function deliverMinionKill(event) {
  if (isActiveGM()) return emitMinionKill(event);
  const active = game.users?.activeGM;
  if (!active || !relaySocket) {
    warnLog(`minionKill for ${event.victim.name ?? "a minion"} not sent: no active GM can be reached.`);
    return false;
  }
  await relaySocket.executeAsUser(RELAY_NAME, active.id, event);
  return true;
}

export function registerMinionKillRelay(socket) {
  relaySocket = socket;
  socket.register(RELAY_NAME, event => {
    if (!isActiveGM()) return false;
    return emitMinionKill(event);
  });
}

// Death by Minion!: the hit minion ("direct") or one taken down by the
// overkill ("overkill"). Minion! writes the death id together with the hit
// points and announces the death when that update arrives, however long the
// server takes. Entries for updates that never arrive expire.
export function expectMinionDeath(deathId, context) {
  const now = Date.now();
  for (const [id, entry] of pendingDeaths) if (now - entry.at > PENDING_TTL_MS) pendingDeaths.delete(id);
  pendingDeaths.set(deathId, { ...context, at: now });
}

export async function announceMinionDeath({ actor, tokenDocument = null, deathId, cause, attack = null }) {
  try {
    if (!deathConfirmed(actor, deathId)) {
      debugLog(`${actor?.name ?? "A minion"}: death not confirmed, no minionKill.`);
      return false;
    }
    const { sceneId, victim } = describeVictim(actor, tokenDocument);
    const event = buildMinionKillEvent({
      eventId: deathId,
      workflowId: attack?.attackId ?? null,
      combat: combatSnapshot(),
      sceneId,
      attacker: describeAttacker(attack?.attackerTokenUuid, attack?.attackerName),
      victim,
      itemUuid: attack?.itemUuid ?? null,
      cause
    });
    return await deliverMinionKill(event);
  } catch (error) {
    warnLog(`The "${MINION_KILL_HOOK}" hook could not be called:`, error);
    return false;
  }
}

// Deaths outside Minion!'s rules (hit points set by hand, damage without
// Midi-QOL data): "other", with no attacker. Only the active GM handles them.
async function onMinionUpdate(actor, changes, options = {}) {
  const writtenId = foundry.utils.getProperty(changes, DEATH_FLAG_PATH);
  const expected = writtenId !== undefined ? pendingDeaths.get(writtenId) : null;
  if (expected) {
    pendingDeaths.delete(writtenId);
    await announceMinionDeath({ ...expected, actor, deathId: writtenId });
    return;
  }
  const newHp = changes?.system?.attributes?.hp?.value;
  if (newHp === undefined) return;
  const before = options.dnd5e?.hp?.value ?? options[TRANSPORT_KEY]?.previousHp;
  if (!isActiveGM() || !isMinionActor(actor)) return;
  if (writtenId !== undefined) return;
  if (!isRealDeath(before, newHp)) return;
  const deathId = newDeathId();
  try {
    await actor.update({ [DEATH_FLAG_PATH]: deathId });
  } catch (error) {
    warnLog(`${actor.name}: the death id could not be saved, no minionKill.`, error);
    return;
  }
  await announceMinionDeath({ actor, deathId, cause: "other" });
}

// Every client: the hit points before a change travel with the update, so the
// active GM knows them even when another client made the change.
export function registerPreviousHpTransport() {
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if (changes?.system?.attributes?.hp?.value === undefined) return;
    const hp = actor.system?.attributes?.hp?.value;
    if (typeof hp !== "number") return;
    if (options && typeof options === "object") options[TRANSPORT_KEY] = { ...(options[TRANSPORT_KEY] ?? {}), previousHp: hp };
  });
}

// GM clients: announces the deaths Minion! expects and watches the others.
export function registerMinionDeathWatch() {
  Hooks.on("updateActor", (actor, changes, options) => {
    onMinionUpdate(actor, changes, options).catch(error => warnLog("minionKill check failed:", error));
  });
}
