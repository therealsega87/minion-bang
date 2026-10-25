import { getRecentLogs } from "../scripts/log.js";

const order = [];
let mode = "midi-manual";
let moduleActive = true;
let deepActive = false;
let deepMode = "midi-manual";
const pendingMap = new Map();
const stats = {
  _midiPending: pendingMap,
  _processMidiRoll(data) { order.push(["manual", data]); pendingMap.set(data.damageList[0].actorId, data); },
  _processMidiAutoRoll(data) { order.push(["auto", data]); },
  _resolveAttribution(actor) { return actor.owner ?? actor; }
};
const attackerActor = { id: "a1", name: "Akra", type: "character" };
const tokens = { "Scene.S.Token.T1": { actor: attackerActor } };
globalThis.fromUuidSync = uuid => tokens[uuid] ?? null;
globalThis.game = {
  user: { isGM: true },
  modules: { get: id => (id === "combat-stats" ? { active: moduleActive } : id === "deep-combat-stats" && deepActive ? { active: true } : undefined) },
  settings: { get: (module, key) => { if (module === "combat-stats" && key === "trackerMode") return mode; if (module === "deep-combat-stats" && key === "trackerMode") { if (deepMode === "missing") throw new Error("no setting"); return deepMode; } throw new Error("unexpected setting"); } },
  combatStats: stats
};

const { updateWithKillCredit } = await import("../scripts/adapters/combat-stats-credit.js");
const minion = (hp = 6) => ({ id: "m1", uuid: "Actor.m1", system: { attributes: { hp: { value: hp } } } });
const record = { attackerTokenUuid: "Scene.S.Token.T1", attackerName: "Akra" };

let failed = 0, total = 0;
const check = (label, actual, expected) => {
  total++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(`${pass ? "  OK" : "FAIL"}  ${label}${pass ? "" : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`);
};
const reset = () => { order.length = 0; pendingMap.clear(); mode = "midi-manual"; moduleActive = true; deepActive = false; deepMode = "midi-manual"; game.user.isGM = true; game.combatStats = stats; delete game.deepCombatStats; };
const run = (m = minion(), rec = record) => updateWithKillCredit(m, rec, "Mace", async () => { order.push(["update"]); });

{
  reset();
  await run();
  check("manual: Combat Stats is told BEFORE the update, with the attacker of the overkill", order.map(o => o[0]), ["manual", "update"]);
  check("manual: the attacker is the character, the damage is the minion's hit points", [order[0][1].attacker, order[0][1].damageList[0].oldHP, order[0][1].itemName], [{ id: "a1", name: "Akra", type: "character" }, 6, "Mace"]);
}
{
  reset(); mode = "midi-auto";
  await run();
  check("auto: Combat Stats is told AFTER the update", order.map(o => o[0]), ["update", "auto"]);
  check("auto: the entry goes from 6 hit points to 0", [order[1][1].damageList[0].oldHP, order[1][1].damageList[0].newHP], [6, 0]);
}
{
  reset(); mode = "native";
  await run();
  check("native mode: only the update", order.map(o => o[0]), ["update"]);
}
{
  reset(); moduleActive = false;
  await run();
  check("Combat Stats not active: only the update", order.map(o => o[0]), ["update"]);
  reset(); game.combatStats = undefined;
  await run();
  check("Combat Stats without its tracker: only the update", order.map(o => o[0]), ["update"]);
  reset(); game.user.isGM = false;
  await run();
  check("not the GM: only the update", order.map(o => o[0]), ["update"]);
}
{
  reset();
  await run(minion(6), { attackerTokenUuid: "Scene.S.Token.NONE" });
  check("unknown attacker: the minion is still killed, nothing is credited", order.map(o => o[0]), ["update"]);
  reset();
  await run(minion(6), { attackerTokenUuid: null });
  check("no attacker in the record: only the update", order.map(o => o[0]), ["update"]);
  reset();
  const warnsBefore = getRecentLogs().filter(l => l.level === "warn").length;
  await run(minion(0));
  check("a minion with 0 hit points is not credited, and it is not a warning", [order.map(o => o[0]), getRecentLogs().filter(l => l.level === "warn").length - warnsBefore], [["update"], 0]);
}
{
  reset();
  const owner = { id: "p1", name: "Owner", type: "character" };
  tokens["Scene.S.Token.WOLF"] = { actor: { id: "w1", name: "Wolf", type: "npc", owner } };
  await run(minion(), { attackerTokenUuid: "Scene.S.Token.WOLF" });
  check("a summon is credited to its owner, as Combat Stats does", order[0][1].attacker.id, "p1");
}
{
  reset();
  stats._processMidiRoll = () => { throw new Error("boom"); };
  await run();
  check("if Combat Stats fails, the minion is still killed and a warning is logged", [order.map(o => o[0]), getRecentLogs().some(l => l.level === "warn" && l.text.includes("could not be passed"))], [["update"], true]);
  stats._processMidiRoll = data => { order.push(["manual", data]); pendingMap.set(data.damageList[0].actorId, data); };
}
{
  reset();
  let error = null;
  try { await updateWithKillCredit(minion(), record, "Mace", async () => { throw new Error("update failed"); }); } catch (e) { error = e.message; }
  check("if the update fails the error goes on and the pending entry is removed", [error, pendingMap.size], ["update failed", 0]);
}
{
  reset(); mode = "midi-auto";
  stats._processMidiAutoRoll = () => { throw new Error("boom"); };
  await run();
  check("auto: if Combat Stats fails after the update, nothing breaks", order.map(o => o[0]), ["update"]);
}
{
  reset();
  delete stats._processMidiRoll;
  await run();
  check("Combat Stats with other internals: nothing is credited, a warning is logged", [order.map(o => o[0]), getRecentLogs().some(l => l.level === "warn" && l.text.includes("not the ones expected"))], [["update"], true]);
}

{
  stats._processMidiRoll = data => { order.push(["manual", data]); pendingMap.set(data.damageList[0].actorId, data); };
  stats._processMidiAutoRoll = data => { order.push(["auto", data]); };
  const deepOrder = [];
  const deep = { _midiPending: new Map(), _processMidiRoll: data => deepOrder.push(["deep-manual", data.attacker.id]), _processMidiAutoRoll: data => deepOrder.push(["deep-auto", data.attacker.id]) };
  reset(); moduleActive = false; deepActive = true; game.deepCombatStats = deep;
  await run();
  check("Deep Combat Stats alone: credited before the update in manual mode", [order.map(o => o[0]), deepOrder], [["update"], [["deep-manual", "a1"]]]);
  deepOrder.length = 0; reset(); moduleActive = false; deepActive = true; deepMode = "midi-auto"; game.deepCombatStats = deep;
  await run();
  check("Deep Combat Stats alone: credited after the update in auto mode", [order.map(o => o[0]), deepOrder], [["update"], [["deep-auto", "a1"]]]);
  deepOrder.length = 0; reset(); moduleActive = true; deepActive = true; game.deepCombatStats = deep;
  await run();
  check("both modules active: each one is told once", [order.map(o => o[0]), deepOrder.length], [["manual", "update"], 1]);
  deepOrder.length = 0; reset(); moduleActive = false; deepActive = true; delete game.deepCombatStats; game.combatStats = deep;
  await run();
  check("Deep Combat Stats exposed as game.combatStats is found too", deepOrder.length, 1);
  deepOrder.length = 0; reset(); moduleActive = true; deepActive = true; game.combatStats = stats; game.deepCombatStats = stats;
  await run();
  check("the same tracker seen from two modules is told only once", order.filter(o => o[0] === "manual").length, 1);
  deepOrder.length = 0; reset(); moduleActive = false; deepActive = true; game.deepCombatStats = deep; deepMode = "missing";
  await run();
  check("Deep Combat Stats without the mode setting: nothing is credited, no error", [order.map(o => o[0]), deepOrder.length], [["update"], 0]);
  deepOrder.length = 0; reset(); moduleActive = false; deepActive = true; delete game.combatStats;
  await run();
  check("Deep Combat Stats active but no tracker found: only the update", order.map(o => o[0]), ["update"]);
}

console.log(`\n${total - failed} passed, ${failed} failed, ${total} total.\n`);
process.exit(failed === 0 ? 0 : 1);
