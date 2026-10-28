import { resolveMinionTrait, toHpInstruction } from "../engine/minion-trait.js";
import { computeOverkill, proposeOverkillTargets } from "../engine/overkill.js";
import { filterMeleeCandidates, filterRangedLineCandidates } from "../engine/geometry.js";
import { clampSelection } from "../engine/selection-limit.js";
import { requestOverkillConfirmation } from "../net/socket.js";
import { MODULE_ID, debugLog, warnLog, errorLog, escapeHtml } from "../log.js";
import { isMinionActor, statBlockKey } from "../minion-flags.js";
import { opportunityAttackQuestion, killRecord, markDefeated } from "../combat-state.js";
import { updateWithKillCredit } from "./combat-stats-credit.js";
import { afterHpUpdate, announceMinionKill, describeMinion } from "./minion-kill-hook.js";

const DEFAULT_IMAGE = "icons/svg/mystery-man.svg";

function autoSelectEnabled() {
  try {
    return game.settings.get(MODULE_ID, "autoSelectProposal") !== false;
  } catch {
    return true;
  }
}

const round1 = value => Math.round(value * 10) / 10;
const listOrNone = items => (items.length ? items.join(", ") : "(none)");
const describeKill = record => `killed by ${record?.attackerName ?? "unknown"}, `
  + `round ${record?.round ?? "-"}, turn ${record?.turn ?? "-"}`;

function classifyOrigin(capture, options) {
  const attack = capture.attack;
  const saved = options?.midi?.saved === true;
  let origin = "otherEffect";
  if (attack?.hasAttackRoll) origin = "attackHit";
  else if (attack?.hasSavingThrow) origin = saved ? "otherEffect" : "failedSave";
  debugLog(`Classification: activity ${attack?.activityType ?? "unknown"}, `
    + `attack roll ${attack?.hasAttackRoll === true}, saving throw ${attack?.hasSavingThrow === true}, `
    + `saved ${saved} -> ${origin}.`);
  return origin;
}

function computeEffectiveDamage(capture) {
  const { default: base = 0, other = 0, bonus = 0 } = capture.damage ?? {};
  const includeOther = globalThis.MidiQOL?.configSettings?.()?.singleConcentrationRoll === true;
  const total = base + bonus + (includeOther ? other : 0);
  debugLog(`Damage passes: default ${base}, other ${other}${includeOther ? "" : " (not applied)"}, `
    + `bonus ${bonus} -> effective ${Math.floor(total)}. Healing ${capture.healing ?? 0}, temp HP ${capture.tempHp ?? 0}.`);
  return Math.max(0, Math.floor(total));
}

function isWeaponAttack(context) {
  return context?.actionType === "mwak" || context?.actionType === "rwak";
}

const UNIT_ALIASES = {
  ft: "ft", "ft.": "ft", feet: "ft", foot: "ft",
  m: "m", "m.": "m", meter: "m", meters: "m", metre: "m", metres: "m", metro: "m", metri: "m"
};

function normalizeUnits(units) {
  return UNIT_ALIASES[String(units ?? "").trim().toLowerCase()] ?? null;
}

function sceneUnits() {
  return normalizeUnits(canvas.scene?.grid?.units);
}

function toSceneUnits(value, fromUnits) {
  const from = normalizeUnits(fromUnits) ?? "ft";
  const to = sceneUnits();
  if (!Number.isFinite(value) || !to || from === to) return value;
  return globalThis.dnd5e?.utils?.convertLength?.(value, from, to, { strict: false }) ?? value;
}

function tokenDistance(attackerToken, token) {
  const distance = globalThis.MidiQOL?.computeDistance?.(attackerToken, token, { wallsBlock: false, includeCover: false });
  if (Number.isFinite(distance) && distance >= 0) return distance;
  const measured = canvas.grid?.measurePath?.([attackerToken.center, token.center]);
  return measured?.distance ?? Infinity;
}

function tokenCenter(token) {
  return { x: token.center?.x ?? token.x, y: token.center?.y ?? token.y };
}

const EXCLUDED_STATUS_IDS = ["invisible", "ethereal"];

function excludingStatus(token) {
  const statuses = token.actor?.statuses;
  if (!statuses?.has) return null;
  const ids = new Set(EXCLUDED_STATUS_IDS);
  if (CONFIG.specialStatusEffects?.INVISIBLE) ids.add(CONFIG.specialStatusEffects.INVISIBLE);
  return [...ids].find(id => statuses.has(id)) ?? null;
}

function concealmentReason(token) {
  if (token.document?.hidden === true) return "hidden";
  return excludingStatus(token);
}

function findSameStatBlockCandidates(hitToken, hitActor, excludedUuids = []) {
  const key = statBlockKey(hitActor);
  if (!key || !canvas.tokens) return [];
  const excluded = new Set(excludedUuids);
  const concealed = [];
  const found = canvas.tokens.placeables.filter(t => {
    if (t.id === hitToken?.id) return false;
    if (excluded.has(t.document?.uuid)) return false;
    if (!t.actor) return false;
    if (t.document?.combatant?.isDefeated) return false;
    if ((t.actor.system?.attributes?.hp?.value ?? 0) <= 0) return false;
    if (!isMinionActor(t.actor)) return false;
    if (statBlockKey(t.actor) !== key) return false;
    const reason = concealmentReason(t);
    if (reason) {
      concealed.push(`${t.id} (${reason})`);
      return false;
    }
    return true;
  });
  if (concealed.length) debugLog(`Minions left out of the overkill (hidden or with an excluding status): ${concealed.join(", ")}.`);
  return found;
}

function meleeCandidatesForToken(attackerToken, otherTokens) {
  return otherTokens.map(t => ({
    id: t.id,
    name: t.name,
    distanceFromAttacker: tokenDistance(attackerToken, t)
  }));
}

function rangedCandidatesForToken(attackerToken, hitToken, otherTokens) {
  const origin = tokenCenter(attackerToken);
  const target = tokenCenter(hitToken);
  const lineX = target.x - origin.x;
  const lineY = target.y - origin.y;
  const lineLenPixels = Math.hypot(lineX, lineY) || 1;
  const ux = lineX / lineLenPixels;
  const uy = lineY / lineLenPixels;
  const grid = canvas.scene?.grid;
  const unitsPerPixel = grid ? grid.distance / grid.size : 0;

  return otherTokens.map(t => {
    const c = tokenCenter(t);
    const vx = c.x - origin.x;
    const vy = c.y - origin.y;
    return {
      id: t.id,
      name: t.name,
      alongLine: (vx * ux + vy * uy) * unitsPerPixel,
      perpendicular: Math.abs(vx * uy - vy * ux) * unitsPerPixel
    };
  });
}

export function applyMinionDamage(actor, amount, updates, options) {
  if (!isMinionActor(actor)) return;

  const capture = options?.minionBang;
  if (!capture) {
    debugLog(`${actor.name}: hit point change without Midi-QOL damage data (likely a manual edit), ignored.`);
    return;
  }

  const hpMax = actor.system?.attributes?.hp?.max;
  if (!Number.isFinite(hpMax) || hpMax <= 0) {
    warnLog(`${actor.name}: invalid hit point maximum, skipping.`);
    return;
  }

  const effectiveDamage = computeEffectiveDamage(capture);
  if (effectiveDamage === 0 && ((capture.healing ?? 0) > 0 || (capture.tempHp ?? 0) > 0)) {
    debugLog(`${actor.name}: healing or temporary hit points with no damage, update left untouched.`);
    return;
  }

  const origin = classifyOrigin(capture, options);

  const trait = resolveMinionTrait({ origin, effectiveDamage, hpMax });
  const instruction = toHpInstruction(trait);

  debugLog(`${actor.name}: origin ${origin}, effective damage ${effectiveDamage}, max HP ${hpMax}, `
    + `${trait.dies ? "dies" : "survives"}.`);
  debugLog(trait.reason);

  if (instruction.cancel) {
    debugLog("Update cancelled: the minion takes no damage.");
  } else {
    updates["system.attributes.hp.value"] = instruction.hpValue;
    updates["system.attributes.hp.temp"] = instruction.hpTemp;
    const record = killRecord(capture.attack?.attackerTokenUuid, capture.attack?.attackerName);
    updates[`flags.${MODULE_ID}.killedBy`] = record;
    debugLog(`Hit points set to 0, ${describeKill(record)}.`);
  }

  const hitDocument = (options?.midi?.targetUuid && fromUuidSync(options.midi.targetUuid))
    ?? canvas.tokens?.placeables.find(t => t.actor?.uuid === actor.uuid)?.document
    ?? null;
  if (!instruction.cancel && hitDocument) Promise.resolve().then(() => markDefeated(hitDocument));

  if (instruction.cancel) return false;

  const kill = {
    actor,
    primary: describeMinion(actor, hitDocument),
    attack: capture.attack ?? null,
    origin,
    record: killRecord(capture.attack?.attackerTokenUuid, capture.attack?.attackerName),
    written: afterHpUpdate(actor)
  };
  const overkill = prepareOverkill(actor, capture, options, effectiveDamage, hpMax, hitDocument);
  if (overkill) enqueueOverkill(overkill.decidingUserId, overkill.payload, kill);
  else announceMinionKill(kill);
}

function prepareOverkill(actor, capture, options, effectiveDamage, hpMax, hitDocument) {
  const context = capture.attack;
  if (!context) {
    warnLog("No attack details were captured for this target: skipping overkill.");
    return null;
  }

  if (!isWeaponAttack(context)) {
    debugLog(`No overkill: the attack isn't mwak/rwak (actionType: ${context.actionType ?? "unknown"}).`);
    return null;
  }

  const { excess, additionalCount } = computeOverkill(effectiveDamage, hpMax);
  if (additionalCount === 0) {
    debugLog("No overkill: damage matches the hit point maximum exactly, no excess.");
    return null;
  }

  if (context.attackerType !== "character") {
    debugLog(`No overkill: ${context.attackerName ?? "the attacker"} is not a player character `
      + `(${context.attackerType ?? "unknown type"}).`);
    return null;
  }

  if (!hitDocument?.object || hitDocument.parent !== canvas.scene) {
    warnLog("Overkill skipped: the GM is not viewing the scene where the attack happened.");
    ui.notifications?.warn(game.i18n.localize("MINIONBANG.Notify.SceneNotViewed"));
    return null;
  }
  const hitToken = hitDocument.object;

  const attackerToken = (context.attackerTokenUuid && fromUuidSync(context.attackerTokenUuid)?.object)
    ?? canvas.tokens?.placeables.find(t => t.actor?.uuid === options?.midi?.sourceActorUuid);
  if (!attackerToken) {
    warnLog("Overkill skipped: the attacker's token is not on the scene.");
    return null;
  }

  const others = findSameStatBlockCandidates(hitToken, actor, context.targetUuids);
  const excludedTargets = (context.targetUuids ?? []).filter(u => u !== hitDocument.uuid);
  if (excludedTargets.length) debugLog(`Other targets of the same attack, excluded: ${excludedTargets.join(", ")}.`);
  debugLog(`Same stat block on the scene: ${listOrNone(others.map(o => o.id))}.`);

  const units = canvas.scene?.grid?.units || "ft";
  let eligible = [];
  if (context.actionType === "mwak") {
    const reach = toSceneUnits(context.reach ?? 5, context.reach != null ? context.rangeUnits : "ft");
    debugLog(`Overkill geometry: ${context.attackerName}, ${context.itemName}, mode ${context.attackMode ?? "default"}, `
      + `mwak, reach ${reach} ${units}.`);
    const measured = meleeCandidatesForToken(attackerToken, others);
    debugLog(`Distance from the attacker: ${listOrNone(measured.map(c => `${c.id} ${round1(c.distanceFromAttacker)}`))}.`);
    eligible = filterMeleeCandidates(measured, reach);
  } else {
    const shortRange = toSceneUnits(context.rangeValue, context.rangeUnits);
    if (!Number.isFinite(shortRange)) {
      warnLog("Ranged overkill detected but the weapon's short range is unknown.");
      return null;
    }
    const lineWidth = canvas.scene?.grid?.distance ?? 5;
    debugLog(`Overkill geometry: ${context.attackerName}, ${context.itemName}, mode ${context.attackMode ?? "default"}, `
      + `rwak, short range ${shortRange} ${units}, line width ${lineWidth} ${units}.`);
    const measured = rangedCandidatesForToken(attackerToken, hitToken, others);
    const positions = measured.map(c => `${c.id} ${round1(c.alongLine)} / ${round1(c.perpendicular)}`);
    debugLog(`Position along / off the line: ${listOrNone(positions)}.`);
    eligible = filterRangedLineCandidates(measured, shortRange, lineWidth);
  }
  debugLog(`In range: ${listOrNone(eligible.map(c => c.id))}.`);

  const byProximityToHit = eligible.map(c => {
    const token = others.find(o => o.id === c.id);
    return { id: c.id, distance: token ? tokenDistance(hitToken, token) : Infinity };
  });
  debugLog(`Distance from the hit minion: ${listOrNone(byProximityToHit.map(c => `${c.id} ${round1(c.distance)}`))}.`);
  const { proposed, shortfall } = proposeOverkillTargets(byProximityToHit, additionalCount);
  const proposedIds = new Set(proposed.map(p => p.id));
  const otherEligible = byProximityToHit
    .filter(e => !proposedIds.has(e.id))
    .sort((a, b) => a.distance - b.distance);
  const withNames = list => list.map(c => {
    const token = others.find(o => o.id === c.id);
    return {
      id: c.id,
      uuid: token?.document?.uuid ?? null,
      distance: c.distance,
      name: token?.name ?? token?.actor?.name ?? c.id,
      img: token?.document?.texture?.src ?? token?.actor?.img ?? DEFAULT_IMAGE
    };
  });

  debugLog(`Overkill: excess ${excess}, up to ${additionalCount} more minions.`);
  debugLog(`Proposed: ${listOrNone(proposed.map(c => c.id))}. Shortfall: ${shortfall}. Preselected: ${autoSelectEnabled() ? "yes" : "no (setting off)"}.`);
  if (eligible.length === 0) return null;

  const attackerActor = attackerToken.actor;
  const decidingUserId = resolveDecidingUserId(attackerActor);
  const opportunity = opportunityAttackQuestion(attackerToken.document);
  debugLog(`Opportunity attack question: ${opportunity.ask ? "asked" : "not asked"} (${opportunity.reason}).`);
  const payload = {
    askOpportunityAttack: opportunity.ask,
    killRecord: killRecord(context.attackerTokenUuid, context.attackerName),
    attackerName: attackerActor?.name ?? game.i18n.localize("MINIONBANG.Unknown"),
    hitTokenName: hitToken.name,
    hitTokenImg: hitToken.document?.texture?.src ?? hitToken.actor?.img ?? DEFAULT_IMAGE,
    weaponName: context.itemName,
    proposed: withNames(proposed),
    others: withNames(otherEligible),
    distanceUnits: units,
    shortfall,
    maxSelectable: additionalCount,
    autoSelect: autoSelectEnabled()
  };

  return { decidingUserId, payload };
}

let overkillQueue = Promise.resolve();
let pendingOverkills = 0;

function enqueueOverkill(decidingUserId, payload, kill) {
  if (pendingOverkills > 0) debugLog(`Overkill dialog queued behind ${pendingOverkills} other(s).`);
  pendingOverkills += 1;
  overkillQueue = overkillQueue
    .then(() => runOverkillConfirmation(decidingUserId, payload))
    .catch(err => {
      errorLog("Error while confirming overkill:", err);
      return [];
    })
    .then(extras => announceMinionKill(kill, extras))
    .finally(() => { pendingOverkills -= 1; });
}

function resolveDecidingUserId(attackerActor) {
  if (!attackerActor) return null;
  const owner = game.users.players.find(u => u.active && attackerActor.testUserPermission(u, "OWNER"));
  return owner?.id ?? null;
}

async function announceNoOverkill(payload, emptyConfirm) {
  const suffix = emptyConfirm ? "NoOverkillConfirmed" : "NoOverkill";
  const attacker = payload.attackerName;
  ui.notifications?.info(game.i18n.format(`MINIONBANG.Notify.${suffix}`, { attacker }));
  await ChatMessage.create({
    content: `<p>${game.i18n.format(`MINIONBANG.Chat.${suffix}`, { attacker: escapeHtml(attacker) })}</p>`
  });
}

async function runOverkillConfirmation(decidingUserId, payload) {
  const answer = await requestOverkillConfirmation(decidingUserId, payload);
  if (!answer || typeof answer !== "object") {
    debugLog(`Overkill cancelled: ${payload.attackerName} decided not to overkill.`);
    await announceNoOverkill(payload, false);
    return [];
  }
  if (answer.opportunityAttack) {
    debugLog("Opportunity attack: no overkill.");
    return [];
  }
  if (!Array.isArray(answer.selectedIds) || !answer.selectedIds.length) {
    debugLog(`No minion selected: ${payload.attackerName} pressed Confirm without choosing any minion.`);
    await announceNoOverkill(payload, true);
    return [];
  }

  const allowed = new Map([...payload.proposed, ...payload.others].map(c => [c.id, c]));
  const limit = Number.isFinite(payload.maxSelectable) ? payload.maxSelectable : allowed.size;
  const { accepted, excess, unknown } = clampSelection(answer.selectedIds, [...allowed.keys()], limit);
  for (const id of unknown) warnLog(`Ignored a selected token that wasn't an overkill candidate: ${id}.`);
  if (excess.length) {
    warnLog(`${answer.selectedIds.length} minions selected but the limit is ${limit}: ignored ${excess.join(", ")}.`);
  }
  const killedNames = [];
  const downed = [];
  const failedNames = [];
  for (const id of accepted) {
    const candidate = allowed.get(id);
    const document = candidate.uuid ? fromUuidSync(candidate.uuid) : null;
    const minion = document?.actor;
    if (!minion) continue;
    if ((minion.system?.attributes?.hp?.value ?? 0) <= 0) {
      debugLog(`${candidate.name} (${id}) is already down, skipped.`);
      continue;
    }
    try {
      await updateWithKillCredit(minion, payload.killRecord, () => minion.update({
        "system.attributes.hp.value": 0,
        "system.attributes.hp.temp": 0,
        [`flags.${MODULE_ID}.killedBy`]: payload.killRecord
      }));
    } catch (error) {
      errorLog(`${candidate.name} (${id}) could not be downed by the overkill:`, error);
      failedNames.push(candidate.name);
      continue;
    }
    await markDefeated(document);
    killedNames.push(minion.name);
    downed.push(describeMinion(minion, document));
  }
  if (failedNames.length > 0) {
    ui.notifications?.error(game.i18n.format("MINIONBANG.Notify.OverkillFailed", { names: failedNames.join(", ") }));
  }

  debugLog(`Overkill confirmed: ${killedNames.length} more down, ${describeKill(payload.killRecord)}.`);

  if (killedNames.length > 0) {
    const data = {
      attacker: escapeHtml(payload.attackerName),
      target: escapeHtml(payload.hitTokenName),
      count: killedNames.length
    };
    const key = killedNames.length === 1 ? "MINIONBANG.Chat.OneMore" : "MINIONBANG.Chat.ManyMore";
    await ChatMessage.create({ content: `<p>${game.i18n.format(key, data)}</p>` });
  }
  return downed;
}
