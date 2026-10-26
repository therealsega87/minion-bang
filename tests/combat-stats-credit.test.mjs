import { getRecentLogs } from "../scripts/log.js";

const order = [];
const store = new Map();
let modes = {};
let active = new Set();
let failWrite = false;

function makeTracker(label) {
  return {
    label,
    _accKill(current, actorId, actorName, victimName, bucket) {
      order.push([`${label}-kill`, actorId, victimName, bucket]);
      current.characters ??= {};
      current.characters[actorId] ??= { id: actorId, name: actorName, kills: 0, damageDealt: 0 };
      current.characters[actorId].kills += 1;
    },
    _resolveAttribution(actor) { return actor.owner ?? actor; },
    _isPlayerSummon(actor) { return actor.summon === true; }
  };
}

const stats = makeTracker("cs");
const deeper = makeTracker("deeper");
const pc = { id: "a1", name: "Akra", type: "character" };
const tokens = { "Scene.S.Token.T1": { actor: pc } };
let randomCounter = 0;
globalThis.fromUuidSync = uuid => tokens[uuid] ?? null;
globalThis.foundry = { utils: { randomID: () => `r${++randomCounter}` } };
globalThis.game = {
  user: { isGM: true },
  modules: { get: id => (active.has(id) ? { active: true } : undefined) },
  settings: {
    get(module, key) {
      if (key === "trackerMode") {
        if (modes[module] === "missing") throw new Error("no setting");
        return modes[module];
      }
      if (key === "currentCombatData") return structuredClone(store.get(module));
      throw new Error("unexpected setting");
    },
    async set(module, key, value) {
      if (failWrite) throw new Error("write failed");
      order.push([`${module}-save`]);
      store.set(module, structuredClone(value));
    }
  }
};

const { updateWithKillCredit } = await import("../scripts/adapters/combat-stats-credit.js");
const minion = (extra = {}) => ({ id: "m1", name: "Goblin Lackey", ...extra });
const record = { attackerTokenUuid: "Scene.S.Token.T1", attackerName: "Akra" };
const fight = () => ({ combatId: "c1", characters: { a1: { id: "a1", name: "Akra", kills: 1, damageDealt: 7 } }, defeated: [{ name: "Goblin Lackey", id: "m0" }] });

let failed = 0, total = 0;
const check = (label, actual, expected) => {
  total++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(`${pass ? "  OK" : "FAIL"}  ${label}${pass ? "" : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`);
};
const reset = () => {
  order.length = 0; store.clear(); randomCounter = 0; failWrite = false;
  modes = { "combat-stats": "midi-manual", "deeper-combat-stats": "midi-manual" };
  active = new Set(["combat-stats"]);
  game.user.isGM = true;
  game.combatStats = stats;
  delete game.deeperCombatStats;
  store.set("combat-stats", fight());
  store.set("deeper-combat-stats", fight());
};
const run = (m = minion(), rec = record) => updateWithKillCredit(m, rec, async () => { order.push(["update"]); });

{
  reset();
  await run();
  check("the minion is updated first, then the kill is counted and saved", order.map(o => o[0]), ["update", "cs-kill", "combat-stats-save"]);
  const saved = store.get("combat-stats");
  check("one more kill for the character who made the overkill", saved.characters.a1.kills, 2);
  check("no damage is added: the damage dealt stays the roll", saved.characters.a1.damageDealt, 7);
  check("the kill goes to the characters, with the minion's name", order[1].slice(1), ["a1", "Goblin Lackey", "characters"]);
  check("the minion joins the defeated enemies", saved.defeated, [{ name: "Goblin Lackey", id: "m0" }, { name: "Goblin Lackey", id: "m1", tokenUuid: "r1", killedBy: "a1" }]);
}
{
  reset(); modes["combat-stats"] = "midi-auto";
  await run();
  check("auto mode: the same kill, no damage", [order.map(o => o[0]), store.get("combat-stats").characters.a1], [["update", "cs-kill", "combat-stats-save"], { id: "a1", name: "Akra", kills: 2, damageDealt: 7 }]);
}
{
  reset(); modes["combat-stats"] = "native";
  await run();
  check("native mode: only the update (Combat Stats counts the kill on its own)", order.map(o => o[0]), ["update"]);
}
{
  reset(); store.set("combat-stats", { combatId: null, characters: {} });
  await run();
  check("no fight being recorded: only the update", order.map(o => o[0]), ["update"]);
  reset(); store.set("combat-stats", { combatId: "c1", characters: {} });
  await run();
  check("a fight without a defeated list gets one", store.get("combat-stats").defeated.length, 1);
}
{
  reset(); active = new Set();
  await run();
  check("Combat Stats not active: only the update", order.map(o => o[0]), ["update"]);
  reset(); delete game.combatStats;
  await run();
  check("Combat Stats without its tracker: only the update", order.map(o => o[0]), ["update"]);
  reset(); game.user.isGM = false;
  await run();
  check("not the GM: only the update", order.map(o => o[0]), ["update"]);
}
{
  reset();
  await run(minion(), { attackerTokenUuid: "Scene.S.Token.NONE" });
  check("unknown attacker: only the update", order.map(o => o[0]), ["update"]);
  reset();
  await run(minion(), { attackerTokenUuid: null });
  check("no attacker in the record: only the update", order.map(o => o[0]), ["update"]);
}
{
  reset();
  tokens["Scene.S.Token.WOLF"] = { actor: { id: "w1", name: "Wolf", type: "npc", owner: { id: "p1", name: "Owner", type: "character" } } };
  await run(minion(), { attackerTokenUuid: "Scene.S.Token.WOLF" });
  check("a summon's overkill is credited to its owner", order[1]?.[1], "p1");
  reset();
  tokens["Scene.S.Token.NPC"] = { actor: { id: "n1", name: "Bandit", type: "npc" } };
  await run(minion(), { attackerTokenUuid: "Scene.S.Token.NPC" });
  check("an attacker that is not a player character gets nothing", order.map(o => o[0]), ["update"]);
  reset();
  await run(minion({ summon: true }));
  check("a minion summoned by a player is not a kill", order.map(o => o[0]), ["update"]);
}
{
  reset();
  let error = null;
  try { await updateWithKillCredit(minion(), record, async () => { throw new Error("update failed"); }); } catch (e) { error = e.message; }
  check("if the update fails the error goes on and nothing is credited", [error, order.length], ["update failed", 0]);
}
{
  reset(); failWrite = true;
  await run();
  check("if the save fails, the minion is still down and a warning is logged", [order.map(o => o[0]), getRecentLogs().some(l => l.level === "warn" && l.text.includes("could not be passed"))], [["update", "cs-kill"], true]);
}
{
  reset();
  const saved = stats._accKill;
  delete stats._accKill;
  await run();
  stats._accKill = saved;
  check("Combat Stats with other internals: nothing is credited, a warning is logged", [order.map(o => o[0]), getRecentLogs().some(l => l.level === "warn" && l.text.includes("not the ones expected"))], [["update"], true]);
}
{
  reset(); active = new Set(["deeper-combat-stats"]); delete game.combatStats; game.deeperCombatStats = deeper;
  await run();
  check("Deeper Combat Stats alone: the kill goes there", order.map(o => o[0]), ["update", "deeper-kill", "deeper-combat-stats-save"]);
  reset(); active = new Set(["combat-stats", "deeper-combat-stats"]); game.deeperCombatStats = deeper;
  await run();
  check("both modules active: each one counts the kill once", order.map(o => o[0]), ["update", "cs-kill", "combat-stats-save", "deeper-kill", "deeper-combat-stats-save"]);
  reset(); active = new Set(["deeper-combat-stats"]); delete game.combatStats; game.combatStats = deeper;
  await run();
  check("Deeper Combat Stats exposed as game.combatStats is found too", order.map(o => o[0]), ["update", "deeper-kill", "deeper-combat-stats-save"]);
  reset(); active = new Set(["combat-stats", "deeper-combat-stats"]); game.deeperCombatStats = stats;
  await run();
  check("the same tracker seen from two modules counts the kill once", order.filter(o => o[0] === "cs-kill").length, 1);
  reset(); active = new Set(["deeper-combat-stats"]); delete game.combatStats; game.deeperCombatStats = deeper; modes["deeper-combat-stats"] = "missing";
  await run();
  check("Deeper Combat Stats without the mode setting: nothing, no error", order.map(o => o[0]), ["update"]);
  reset(); active = new Set(["deeper-combat-stats"]); delete game.combatStats;
  await run();
  check("Deeper Combat Stats active but no tracker found: only the update", order.map(o => o[0]), ["update"]);
}

console.log(`\n${total - failed} passed, ${failed} failed, ${total} total.\n`);
process.exit(failed === 0 ? 0 : 1);
