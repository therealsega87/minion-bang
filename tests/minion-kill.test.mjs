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
let storedTable = "";
globalThis.game = { settings: { get: () => storedTable }, user: { isGM: true }, i18n: { localize: k => k } };
globalThis.ui = { notifications: { warn() {} } };
const tokens = { "Scene.S.Token.A": { actor: { uuid: "Actor.akra", name: "Akra", type: "character" } } };
globalThis.fromUuidSync = uuid => tokens[uuid] ?? null;

const { buildMinionKill } = await import("../scripts/engine/minion-kill.js");
const { MINION_KILL_HOOK, describeMinion, afterHpUpdate, announceMinionKill } = await import("../scripts/adapters/minion-kill-hook.js");

let failed = 0, total = 0;
const check = (label, actual, expected) => {
  total++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(`${pass ? "  OK" : "FAIL"}  ${label}${pass ? "" : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`);
};

const goblin = (id, cr = 0.25, hp = 0) => ({
  uuid: `Actor.${id}`, name: "Goblin Lackey",
  system: { details: { cr }, attributes: { hp: { value: hp, max: 6 } } }
});
const tokenOf = id => ({ uuid: `Scene.S.Token.${id}`, name: `Goblin ${id}` });

check("the hook is called minion-bang.minionKill", MINION_KILL_HOOK, "minion-bang.minionKill");

{
  const data = buildMinionKill({ primary: { name: "a" }, extras: [{ name: "b" }, { name: "c" }] });
  check("count includes the hit minion and the overkill ones", [data.count, data.overkillCount], [3, 2]);
  check("only the extra minions are marked as overkill", data.kills.map(k => k.overkill), [false, true, true]);
  check("missing fields become null", [data.attacker, data.item, data.combatId, data.kills[0].challengeRating], [{ tokenUuid: null, actorUuid: null, name: null, type: null }, null, null, null]);
  let error = null;
  try { buildMinionKill({}); } catch (e) { error = e.message; }
  check("no hit minion: an error", error, "minionKill: missing minion");
}

{
  check("a minion of CR 1/4 belongs to bands of 5", describeMinion(goblin("g1", 0.25), tokenOf("g1")), { actorUuid: "Actor.g1", tokenUuid: "Scene.S.Token.g1", name: "Goblin g1", challengeRating: 0.25, bandSize: 5 });
  check("CR 5: bands of 8", describeMinion(goblin("g1", 5), tokenOf("g1")).bandSize, 8);
  check("CR 9: bands of 10", describeMinion(goblin("g1", 9), tokenOf("g1")).bandSize, 10);
  check("no challenge rating: no band size", describeMinion(goblin("g1", null), tokenOf("g1")).bandSize, null);
  storedTable = JSON.stringify([{ cr: 0, max: 3 }, { cr: 5, max: 6 }]);
  check("the band size follows the table edited by the GM", describeMinion(goblin("g1", 0.25), tokenOf("g1")).bandSize, 3);
  storedTable = "";
}

{
  const actor = goblin("g1");
  const waiting = afterHpUpdate(actor, 1000);
  Hooks.call("updateActor", goblin("other"), { system: { attributes: { hp: { value: 0 } } } });
  Hooks.call("updateActor", actor, { name: "x" });
  Hooks.call("updateActor", actor, { system: { attributes: { hp: { value: 0 } } } });
  check("waits for the hit points of that minion", await waiting, true);
  check("the listener is removed afterwards", (handlers.get("updateActor") ?? []).length, 0);
  check("no update in time: gives up", await afterHpUpdate(actor, 20), false);
  const otherMinion = afterHpUpdate(actor, 30);
  Hooks.call("updateActor", goblin("other"), { system: { attributes: { hp: { value: 0 } } } });
  check("another minion's hit points do not count", await otherMinion, false);
  const noHp = afterHpUpdate(actor, 30);
  Hooks.call("updateActor", actor, { name: "x" });
  check("an update without hit points does not count", await noHp, false);
  check("the listener is removed after giving up too", (handlers.get("updateActor") ?? []).length, 0);
}

const kill = (hp = 0) => ({
  actor: goblin("g0", 0.25, hp),
  primary: describeMinion(goblin("g0"), tokenOf("g0")),
  attack: { attackerTokenUuid: "Scene.S.Token.A", attackerName: "Akra", attackerType: "character", itemName: "Mace", actionType: "mwak" },
  origin: "attackHit",
  record: { combatId: "c1", round: 2, turn: 1 },
  written: Promise.resolve(true)
});

{
  called.length = 0;
  await announceMinionKill(kill(), [describeMinion(goblin("g1"), tokenOf("g1")), describeMinion(goblin("g2"), tokenOf("g2"))]);
  check("one call of the hook", called.map(c => c[0]), ["minion-bang.minionKill"]);
  const data = called[0][1];
  check("the call counts 3 minions, 2 by overkill", [data.count, data.overkillCount], [3, 2]);
  check("attacker and fight are passed", [data.attacker, data.item, data.combatId, data.round, data.turn], [{ tokenUuid: "Scene.S.Token.A", actorUuid: "Actor.akra", name: "Akra", type: "character" }, "Mace", "c1", 2, 1]);
  called.length = 0;
  await announceMinionKill(kill(6));
  check("the hit minion still has hit points: no call", called.length, 0);
}

console.log(`\n${total - failed} passed, ${failed} failed, ${total} total.\n`);
process.exit(failed === 0 ? 0 : 1);
