class MockCollection extends Map {
  [Symbol.iterator]() { return this.values(); }
}

const calls = [];
let failOn = null;
let idCounter = 0;

class MockCombat {
  constructor(data = {}) {
    this.id = `combat${++idCounter}`;
    this.data = data;
    this.combatants = [];
    this.groups = [];
  }

  async createEmbeddedDocuments(type, data) {
    calls.push([type, JSON.parse(JSON.stringify(data))]);
    if (failOn === type) throw new Error(`boom on ${type}`);
    return data.map(d => {
      const doc = { id: `${type[0]}${++idCounter}`, ...d, tokenId: d.tokenId };
      if (type === "Combatant") this.combatants.push(doc);
      else this.groups.push(doc);
      return doc;
    });
  }
}

const created = [];
globalThis.getDocumentClass = name => ({
  create: async data => {
    if (name !== "Combat") throw new Error("wrong class");
    const combat = new MockCombat(data);
    created.push(combat);
    game.combat = combat;
    return combat;
  }
});

const sceneTokens = new MockCollection();
globalThis.canvas = { scene: { id: "scene1", tokens: sceneTokens } };
globalThis.game = { combat: null, settings: { get: () => false }, modules: { get: () => ({}) } };

const addToken = (id, hidden = false) => sceneTokens.set(id, { id, actorId: `actor-${id}`, hidden });
const { applyBandPlan, checkPlan, liveState } = await import("../scripts/adapters/band-apply.js");
const { isMarkedAlone } = await import("../scripts/adapters/group-flags.js");

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
function reset() {
  calls.length = 0;
  created.length = 0;
  sceneTokens.clear();
  game.combat = null;
  failOn = null;
  idCounter = 0;
}

const plan = {
  groups: [
    { typeKey: "g", name: "Goblin 1", color: "#ff0000", mode: "highest", captainId: "t2", memberIds: ["t1", "t2"] },
    { typeKey: "g", name: "Goblin 2", color: "#00ff00", mode: null, captainId: "t3", memberIds: ["t3", "t4"] }
  ],
  singles: ["t5"]
};
for (const id of ["t1", "t2", "t3", "t4", "t5"]) addToken(id);
sceneTokens.get("t3").hidden = true;

{
  const result = await applyBandPlan(plan);
  check("no combat: it is created for the active scene, as the active one", [created.length, created[0].data], [1, { scene: "scene1", active: true }]);
  check("the result says the combat was created", [result.combatCreated, result.groups, result.combatants], [true, 2, 5]);
  check("groups are created first, with name, colour, captain and (only if chosen) mode", calls[0], ["CombatantGroup", [{ name: "Goblin 1", flags: { "minion-bang": { color: "#ff0000", captain: "t2", mode: "highest" } } }, { name: "Goblin 2", flags: { "minion-bang": { color: "#00ff00", captain: "t3" } } }]]);
  const groupIds = created[0].groups.map(g => g.id);
  const combatants = created[0].combatants;
  check("combatants are created in a single call, after the groups", [calls.length, calls[1][0], calls[1][1].length], [2, "Combatant", 5]);
  check("every combatant has token, scene and actor", combatants.map(c => [c.tokenId, c.sceneId, c.actorId]), ["t1", "t2", "t3", "t4", "t5"].map(id => [id, "scene1", `actor-${id}`]));
  check("members are put in the group of their band", combatants.slice(0, 4).map(c => c.group), [groupIds[0], groupIds[0], groupIds[1], groupIds[1]]);
  check("the creature alone has no group and is marked", [combatants[4].group, combatants[4].flags], [undefined, { "minion-bang": { alone: true } }]);
  check("members are not marked as alone", combatants.slice(0, 4).every(c => c.flags === undefined), true);
  check("the hidden state of the token is kept", combatants.map(c => c.hidden), [false, false, true, false, false]);
  check("no initiative is sent", combatants.some(c => "initiative" in c), false);
}

{
  reset();
  for (const id of ["t1", "t2", "t3", "t4", "t5"]) addToken(id);
  const existing = new MockCombat();
  game.combat = existing;
  existing.groups.push({ id: "old" });
  existing.combatants.push({ id: "oldC", tokenId: "other", initiative: 14 });
  const result = await applyBandPlan(plan);
  check("existing combat: nothing is created and it is reused", [created.length, result.combatCreated, result.combat === existing], [0, false, true]);
  check("the old group and combatant are untouched", [existing.groups[0], existing.combatants[0]], [{ id: "old" }, { id: "oldC", tokenId: "other", initiative: 14 }]);
  check("only new documents are added", [existing.groups.length, existing.combatants.length], [3, 6]);
}

{
  reset();
  addToken("t1"); addToken("t2");
  await applyBandPlan({ groups: [], singles: ["t1", "t2"] });
  check("only creatures alone: no group call at all", calls.map(c => c[0]), ["Combatant"]);
}

{
  reset();
  addToken("t1"); addToken("t2");
  await applyBandPlan({ groups: [{ typeKey: "g", name: "A", color: "#ff0000", captainId: "t1", mode: null, memberIds: ["t1", "t2"] }], singles: [] });
  check("only bands: one call each", calls.map(c => c[0]), ["CombatantGroup", "Combatant"]);
}

{
  reset();
  for (const id of ["t1", "t2", "t3", "t4", "t5"]) addToken(id);
  failOn = "Combatant";
  let error = null;
  try { await applyBandPlan(plan); } catch (e) { error = e; }
  check("an error while adding the combatants reports what was already created", [error?.message, error?.partial], ["boom on Combatant", { combatCreated: true, groups: 2, combatants: 0 }]);
}

{
  reset();
  failOn = "CombatantGroup";
  for (const id of ["t1", "t2"]) addToken(id);
  let error = null;
  try { await applyBandPlan({ groups: [{ typeKey: "g", name: "A", color: "#ff0000", memberIds: ["t1", "t2"] }], singles: [] }); } catch (e) { error = e; }
  check("an error on the groups: the combat created is reported", error?.partial, { combatCreated: true, groups: 0, combatants: 0 });
}

{
  reset();
  canvas.scene = null;
  let message = null;
  try { await applyBandPlan(plan); } catch (e) { message = e.message; }
  canvas.scene = { id: "scene1", tokens: sceneTokens };
  check("without an active scene nothing is done", [message, created.length, calls.length], ["There is no active scene.", 0, 0]);
}

{
  reset();
  for (const id of ["t1", "t2", "t3", "t4", "t5"]) addToken(id);
  check("the check passes with all the tokens free", checkPlan(plan).ok, true);
  sceneTokens.delete("t2");
  check("the check reports a token that disappeared", [checkPlan(plan).ok, checkPlan(plan).missing], [false, ["t2"]]);
  addToken("t2");
  game.combat = { combatants: [{ tokenId: "t4" }, { tokenId: null }] };
  check("the check reports a token that entered the combat", [checkPlan(plan).ok, checkPlan(plan).inCombat], [false, ["t4"]]);
  check("the live state lists scene and combat tokens", [liveState().existingIds.size, [...liveState().busyIds]], [5, ["t4"]]);
}

check("a combatant marked alone is recognised, through getFlag", isMarkedAlone({ getFlag: (scope, key) => scope === "minion-bang" && key === "alone" }), true);
check("a combatant marked alone is recognised, through the data", isMarkedAlone({ flags: { "minion-bang": { alone: true } } }), true);
check("an ordinary combatant is not", [isMarkedAlone({ flags: {} }), isMarkedAlone({}), isMarkedAlone(null)], [false, false, false]);

console.log(failures === 0 ? "\nAll band apply adapter checks passed.\n" : `\n${failures} band apply adapter check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
