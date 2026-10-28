const handlers = new Map();
let nextHookId = 1;
const called = [];
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    const id = nextHookId++;
    handlers.get(name).push({ id, fn });
    return id;
  },
  off(name, id) { handlers.set(name, (handlers.get(name) ?? []).filter(h => h.id !== id)); },
  callAll(name, ...args) { called.push([name, ...args]); },
  call(name, ...args) { for (const { fn } of [...(handlers.get(name) ?? [])]) fn(...args); }
};
let rid = 0;
globalThis.foundry = { utils: {
  randomID: () => `death${++rid}`,
  getProperty: (o, path) => path.split(".").reduce((v, k) => v?.[k], o)
} };
let storedTable = "";
const gm1 = { id: "gm1", isGM: true };
globalThis.game = {
  user: gm1,
  users: { activeGM: gm1 },
  settings: { get: () => storedTable },
  i18n: { localize: k => k },
  combat: null
};
globalThis.ui = { notifications: { warn() {} } };
const tokens = { "Scene.S.Token.A": { actor: { id: "akra", uuid: "Actor.akra", name: "Akra", type: "character" } } };
globalThis.fromUuidSync = uuid => tokens[uuid] ?? null;

const engine = await import("../scripts/engine/minion-kill.js");
const hook = await import("../scripts/adapters/minion-kill-hook.js");
const { buildMinionKillEvent, isRealDeath, MINION_KILL_SCHEMA_VERSION } = engine;

let failed = 0, total = 0;
const check = (label, actual, expected) => {
  total++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(`${pass ? "  OK" : "FAIL"}  ${label}${pass ? "" : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`);
};
const settle = () => new Promise(r => setTimeout(r, 0));

// A minion actor. Unlinked tokens of one actor share actorId but not tokenUuid.
function minion({ token = "T1", hp = 6, cr = 0.25, isMinion = true, actorId = "gob" } = {}) {
  const flags = isMinion ? { "mcdm-flee-mortals-where-evil-lives": { role: "minion" } } : {};
  const actor = {
    id: actorId,
    uuid: `Scene.S.Token.${token}.Actor.${actorId}`,
    name: "Goblin Lackey",
    flags,
    system: { details: { cr }, attributes: { hp: { value: hp, max: 6 } } },
    token: { uuid: `Scene.S.Token.${token}`, name: `Goblin ${token}`, parent: { id: "S" } },
    updates: [],
    getFlag(scope, key) { return foundry.utils.getProperty(this.flags, `${scope}.${key}`); },
    async update(data) {
      this.updates.push(data);
      for (const [path, value] of Object.entries(data)) {
        const keys = path.split(".");
        let target = this;
        for (const key of keys.slice(0, -1)) target = target[key] ??= {};
        target[keys.at(-1)] = value;
      }
    }
  };
  return actor;
}

// ---------- engine ----------
check("schema version 1", MINION_KILL_SCHEMA_VERSION, 1);
{
  const e = buildMinionKillEvent({ eventId: "d1", victim: {}, cause: "direct" });
  check("every field of the schema is present, unknown values are null", e, {
    schemaVersion: 1, eventId: "d1", workflowId: null, combatId: null, sceneId: null, round: null, turn: null,
    attacker: null,
    victim: { actorId: null, actorUuid: null, tokenUuid: null, name: null, cr: null, minionsPerStandard: null },
    itemUuid: null, cause: "direct"
  });
  check("the event is plain data (survives JSON)", JSON.parse(JSON.stringify(e)), e);
}
{
  const crs = [0, 0.125, 0.25, 0.5, 1, 30].map(cr => buildMinionKillEvent({ eventId: "d", victim: { cr }, cause: "direct" }).victim.cr);
  check("contract 8: CR 0, 1/8, 1/4, 1/2 and whole CRs are kept", crs, [0, 0.125, 0.25, 0.5, 1, 30]);
  const bad = [null, undefined, NaN, -1, "0.25", Infinity].map(cr => buildMinionKillEvent({ eventId: "d", victim: { cr }, cause: "direct" }).victim.cr);
  check("contract 8: a missing or invalid CR stays null, never 0", bad, [null, null, null, null, null, null]);
}
{
  const inCombat = buildMinionKillEvent({ eventId: "d", victim: {}, cause: "direct", combat: { combatId: "c1", round: 1, turn: 0 } });
  check("turn 0 is kept (Foundry index)", [inCombat.combatId, inCombat.round, inCombat.turn], ["c1", 1, 0]);
  const out = buildMinionKillEvent({ eventId: "d", victim: {}, cause: "direct", combat: { combatId: null, round: 3, turn: 2 } });
  check("contract 9: no combat, round and turn are null too", [out.combatId, out.round, out.turn], [null, null, null]);
}
{
  const errors = [];
  for (const args of [{ victim: {}, cause: "direct" }, { eventId: "d", victim: {}, cause: "hit" }, { eventId: "d", cause: "direct" }]) {
    try { buildMinionKillEvent(args); } catch (e) { errors.push(e.message); }
  }
  check("missing event id, unknown cause or missing victim are refused", errors, ["minionKill: missing eventId", "minionKill: unknown cause (hit)", "minionKill: missing victim"]);
  check("the three causes", engine.MINION_KILL_CAUSES, ["direct", "overkill", "other"]);
}
check("a real death goes from positive hit points to 0 or less", [isRealDeath(6, 0), isRealDeath(1, -3), isRealDeath(0, 0), isRealDeath(-1, 0), isRealDeath(6, 2), isRealDeath(undefined, 0), isRealDeath(6, undefined)], [true, true, false, false, false, false, false]);

// ---------- victim and attacker ----------
{
  const a = hook.describeVictim(minion({ token: "T1" }));
  const b = hook.describeVictim(minion({ token: "T2" }));
  check("contract 3: two tokens of the same actor are two victims", [a.victim.actorId === b.victim.actorId, a.victim.tokenUuid, b.victim.tokenUuid], [true, "Scene.S.Token.T1", "Scene.S.Token.T2"]);
  check("the victim's scene and band size for CR 1/4", [a.sceneId, a.victim.minionsPerStandard], ["S", 5]);
  check("band sizes 8 and 10 for CR 5 and 9", [hook.describeVictim(minion({ cr: 5 })).victim.minionsPerStandard, hook.describeVictim(minion({ cr: 9 })).victim.minionsPerStandard], [8, 10]);
  storedTable = JSON.stringify([{ cr: 0, max: 3 }, { cr: 5, max: 6 }]);
  check("the band size follows the table edited by the GM", hook.describeVictim(minion()).victim.minionsPerStandard, 3);
  storedTable = "";
  check("contract 8: unknown CR, no band size", hook.describeVictim(minion({ cr: null })).victim, { actorId: "gob", actorUuid: "Scene.S.Token.T1.Actor.gob", tokenUuid: "Scene.S.Token.T1", name: "Goblin T1", cr: null, minionsPerStandard: null });
  check("the attacker is read from its token", hook.describeAttacker("Scene.S.Token.A", "Akra"), { actorId: "akra", actorUuid: "Actor.akra", tokenUuid: "Scene.S.Token.A", name: "Akra" });
  check("contract 8: no attacker token, attacker null", hook.describeAttacker(null, "Akra"), null);
}

// ---------- direct and overkill deaths ----------
const attack = { attackerTokenUuid: "Scene.S.Token.A", attackerName: "Akra", attackId: "ChatMessage.card", itemUuid: "Item.mace" };
async function dead(actor, deathId) {
  actor.system.attributes.hp.value = 0;
  actor.flags["minion-bang"] = { deathId };
  return actor;
}
{
  called.length = 0;
  game.combat = { started: true, id: "c1", round: 2, turn: 0 };
  const actor = await dead(minion(), "dX");
  await hook.announceMinionDeath({ actor, deathId: "dX", cause: "direct", attack });
  check("contract 1: one event with the attacker", called.map(c => [c[0], c[1].cause, c[1].attacker?.name, c[1].eventId]), [["minion-bang.minionKill", "direct", "Akra", "dX"]]);
  check("combat, round and turn when the death is confirmed", [called[0][1].combatId, called[0][1].round, called[0][1].turn], ["c1", 2, 0]);
  check("workflowId is the chat card, itemUuid the weapon", [called[0][1].workflowId, called[0][1].itemUuid], ["ChatMessage.card", "Item.mace"]);
  game.combat = null;
  called.length = 0;
  await hook.announceMinionDeath({ actor, deathId: "dX", cause: "direct", attack });
  check("contract 4: the same death is not sent twice", called.length, 0);
  const alive = minion();
  alive.flags["minion-bang"] = { deathId: "dY" };
  await hook.announceMinionDeath({ actor: alive, deathId: "dY", cause: "direct", attack });
  check("contract 5: a minion still alive makes no event", called.length, 0);
  const other = await dead(minion(), "dOld");
  await hook.announceMinionDeath({ actor: other, deathId: "dNew", cause: "overkill", attack });
  check("contract 5: a death id that was not written makes no event", called.length, 0);
}

// ---------- active GM and relay ----------
{
  const relayed = [];
  const registered = {};
  const socket = {
    register: (name, fn) => { registered[name] = fn; },
    executeAsUser: async (name, userId, data) => { relayed.push([name, userId, data.eventId]); }
  };
  hook.registerMinionKillRelay(socket);
  const gm2 = { id: "gm2", isGM: true };
  game.user = gm2;
  called.length = 0;
  const actor = await dead(minion({ token: "R1" }), "dR1");
  await hook.announceMinionDeath({ actor, deathId: "dR1", cause: "direct", attack });
  check("contract 6: a second GM does not call the hook, it sends the death to the active GM", [called.length, relayed], [0, [["minionKill", "gm1", "dR1"]]]);
  const event = buildMinionKillEvent({ eventId: "dR2", victim: {}, cause: "direct", attacker: hook.describeAttacker("Scene.S.Token.A") });
  check("contract 6: the relay on a GM that is not active does nothing", [registered.minionKill(event), called.length], [false, 0]);
  game.user = gm1;
  check("contract 6: the active GM calls the hook once, even if the relay arrives twice", [registered.minionKill(event), registered.minionKill(event), called.length], [true, false, 1]);
  check("contract 6: the attacker chosen by the player is kept through the relay", called[0][1].attacker.name, "Akra");
}

// ---------- other deaths: hit points set by hand ----------
hook.registerPreviousHpTransport();
hook.registerMinionDeathWatch();
async function setHp(actor, value, { dnd5eHp = true, extra = {} } = {}) {
  const changes = { system: { attributes: { hp: { value } } }, ...extra };
  const before = actor.system.attributes.hp.value;
  const options = dnd5eHp ? { dnd5e: { hp: { value: before } } } : {};
  Hooks.call("preUpdateActor", actor, changes, options);
  actor.system.attributes.hp.value = value;
  Hooks.call("updateActor", actor, changes, options);
  for (let i = 0; i < 5; i++) await settle();
}
// An update made on another client: only updateActor runs here.
async function remoteHp(actor, value, options) {
  actor.system.attributes.hp.value = value;
  Hooks.call("updateActor", actor, { system: { attributes: { hp: { value } } } }, options);
  for (let i = 0; i < 5; i++) await settle();
}
{
  called.length = 0;
  const actor = minion({ token: "M1" });
  await setHp(actor, 0);
  check("a minion set to 0 by hand: one event, cause other, no attacker", called.map(c => [c[1].cause, c[1].attacker, c[1].workflowId, c[1].itemUuid]), [["other", null, null, null]]);
  check("its death id is saved on the minion and used as event id", [actor.updates.length, called[0][1].eventId === actor.getFlag("minion-bang", "deathId")], [1, true]);
  const first = called[0][1].eventId;
  Hooks.call("updateActor", actor, { flags: { "minion-bang": { deathId: first } } }, {});
  Hooks.call("updateActor", actor, { statuses: ["dead"] }, {});
  for (let i = 0; i < 5; i++) await settle();
  check("contract 4: the flag, the Dead status and the tracker make no new event", called.length, 1);
  await setHp(actor, 0);
  check("already at 0: no event", called.length, 1);
  await setHp(actor, 6);
  await setHp(actor, 0);
  check("contract 7: revived and killed again, a new event id", [called.length, called[1]?.[1].eventId !== first], [2, true]);
}
{
  called.length = 0;
  const actor = minion({ token: "M2" });
  await setHp(actor, 0, { extra: { flags: { "minion-bang": { deathId: "byMinionBang" } } } });
  check("a death already sent by the direct or overkill path is not repeated", called.length, 0);
  await setHp(minion({ token: "M3", isMinion: false }), 0);
  check("a creature that is not a minion makes no event", called.length, 0);
  await setHp(minion({ token: "M4" }), 3);
  check("damage that leaves the minion alive makes no event", called.length, 0);
  await setHp(minion({ token: "M5" }), 0, { dnd5eHp: false });
  check("without dnd5e's previous value, the one Minion! sends with the update is used", called.map(c => c[1].victim.tokenUuid), ["Scene.S.Token.M5"]);
  called.length = 0;
  const transported = {};
  Hooks.call("preUpdateActor", minion({ token: "M8" }), { system: { attributes: { hp: { value: 0 } } } }, transported);
  check("before an update, Minion! adds the previous hit points to it", transported, { "minion-bang": { previousHp: 6 } });
  await remoteHp(minion({ token: "M9" }), 0, { "minion-bang": { previousHp: 6 } });
  check("manual change on another client without dnd5e's value: the event is sent", called.map(c => [c[1].victim.tokenUuid, c[1].cause]), [["Scene.S.Token.M9", "other"]]);
  await remoteHp(minion({ token: "M10" }), 0, {});
  check("no previous hit points known at all: no event (a real death cannot be confirmed)", called.length, 1);
  called.length = 0;
  game.user = { id: "gm2", isGM: true };
  const watched = minion({ token: "M6" });
  await setHp(watched, 0);
  check("contract 6: only the active GM watches these deaths (no event, no death id written)", [called.length, watched.updates.length], [0, 0]);
  game.user = gm1;
  const failing = minion({ token: "M7" });
  failing.update = async () => { throw new Error("refused"); };
  await setHp(failing, 0);
  check("the death id cannot be saved: no event", called.length, 0);
}

// ---------- deaths expected by Minion!: no time limit ----------
{
  called.length = 0;
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  const slow = minion({ token: "E1" });
  hook.expectMinionDeath("dE1", { cause: "direct", attack });
  now += 60 * 1000;
  slow.system.attributes.hp.value = 0;
  slow.flags["minion-bang"] = { deathId: "dE1" };
  Hooks.call("updateActor", slow, { system: { attributes: { hp: { value: 0 } } }, flags: { "minion-bang": { deathId: "dE1" } } }, {});
  for (let i = 0; i < 5; i++) await settle();
  check("a death confirmed a minute later still makes its event", called.map(c => [c[1].eventId, c[1].cause, c[1].attacker?.name]), [["dE1", "direct", "Akra"]]);
  Hooks.call("updateActor", slow, { system: { attributes: { hp: { value: 0 } } }, flags: { "minion-bang": { deathId: "dE1" } } }, {});
  for (let i = 0; i < 5; i++) await settle();
  check("the same update arriving again makes no second event", called.length, 1);
  const lost = minion({ token: "E2" });
  hook.expectMinionDeath("dE2", { cause: "overkill", attack });
  now += 11 * 60 * 1000;
  hook.expectMinionDeath("dE3", { cause: "overkill", attack });
  lost.system.attributes.hp.value = 0;
  lost.flags["minion-bang"] = { deathId: "dE2" };
  Hooks.call("updateActor", lost, { system: { attributes: { hp: { value: 0 } } }, flags: { "minion-bang": { deathId: "dE2" } } }, {});
  for (let i = 0; i < 5; i++) await settle();
  check("an expected death not arriving for 10 minutes is forgotten, and makes no event", called.length, 1);
  Date.now = realNow;
}

console.log(`\n${total - failed} passed, ${failed} failed, ${total} total.\n`);
process.exit(failed === 0 ? 0 : 1);
