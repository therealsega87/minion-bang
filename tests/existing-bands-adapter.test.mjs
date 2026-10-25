globalThis.game = { combat: null };

class MockGroup {
  constructor(id, name, flags = {}) {
    this.id = id;
    this.name = name;
    this.initiative = null;
    this.flags = { "minion-bang": { ...flags } };
    this.members = new Set();
    this.log = [];
    this.failOn = null;
  }

  getFlag(module, key) { return this.flags[module]?.[key]; }

  async setFlag(module, key, value) {
    if (this.failOn === key) throw new Error("write failed");
    (this.flags[module] ??= {})[key] = value;
    this.log.push(["set", key, value]);
  }

  async unsetFlag(module, key) {
    delete this.flags[module]?.[key];
    this.log.push(["unset", key]);
  }

  add(token, name, initiative = null) {
    const member = { tokenId: token, name, _source: { initiative } };
    this.members.add(member);
    return member;
  }
}

class Collection extends Map {
  [Symbol.iterator]() { return this.values(); }
}

function combatWith(...groups) {
  const combat = { groups: new Collection() };
  for (const group of groups) combat.groups.set(group.id, group);
  return combat;
}

const { readLiveGroups, applyExistingChanges, hasRolled } = await import("../scripts/adapters/existing-bands.js");

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

{
  const g = new MockGroup("g1", "Alpha", { color: "#ff0000", mode: "average", captain: "t-b" });
  g.add("t-a", "A"); g.add("t-b", "B");
  const live = readLiveGroups(combatWith(g));
  check("a live band is read with colour, mode, captain and members", live, [{ id: "g1", name: "Alpha", members: [{ id: "t-a", name: "A" }, { id: "t-b", name: "B" }], rolled: false, color: "#ff0000", mode: "average", captain: "t-b" }]);
}

{
  const g = new MockGroup("g1", "Alpha");
  g.add("t-a", "A");
  g.members.add({ name: "no token", _source: { initiative: null } });
  check("a member without a token is not listed", readLiveGroups(combatWith(g))[0].members, [{ id: "t-a", name: "A" }]);
}

check("no combat: no bands", [readLiveGroups(null), readLiveGroups({})], [[], []]);
check("bands in a plain array work too", readLiveGroups({ groups: [new MockGroup("g9", "Z")] }).map(g => g.id), ["g9"]);

{
  const empty = new MockGroup("e", "E"); empty.add("t-a", "A");
  const byGroup = new MockGroup("g", "G"); byGroup.add("t-a", "A"); byGroup.initiative = 12;
  const byLock = new MockGroup("l", "L"); byLock.add("t-a", "A"); byLock.flags["minion-bang"].lockedInitiative = 9;
  const byMember = new MockGroup("m", "M"); byMember.add("t-a", "A", 0);
  check("a band has rolled when the group has a value, a lock or a member with a roll (zero counts)", [hasRolled(empty), hasRolled(byGroup), hasRolled(byLock), hasRolled(byMember)], [false, true, true, true]);
}

{
  const g = new MockGroup("g1", "Alpha", { mode: "average", captain: "t-a" });
  g.add("t-a", "A"); g.add("t-b", "B");
  const result = await applyExistingChanges([{ id: "g1", color: "#00ff00", mode: "highest", captain: "t-b" }], combatWith(g));
  check("changes are written as flags", [g.flags["minion-bang"].color, g.flags["minion-bang"].mode, g.flags["minion-bang"].captain, result], ["#00ff00", "highest", "t-b", { updated: 1, missing: 0 }]);
}

{
  const g = new MockGroup("g1", "Alpha", { mode: "average" });
  g.add("t-a", "A");
  await applyExistingChanges([{ id: "g1", mode: null }], combatWith(g));
  check("a mode set back to the settings removes the flag", [g.flags["minion-bang"].mode, g.log], [undefined, [["unset", "mode"]]]);
}

{
  const g = new MockGroup("g1", "Alpha", { mode: "average", captain: "t-a" });
  g.add("t-a", "A", 7); g.add("t-b", "B");
  const result = await applyExistingChanges([{ id: "g1", color: "#00ff00", mode: "highest", captain: "t-b" }], combatWith(g));
  check("a band that rolled in the meantime takes the colour only", [g.flags["minion-bang"], result.updated], [{ mode: "average", captain: "t-a", color: "#00ff00" }, 1]);
}

{
  const g = new MockGroup("g1", "Alpha", { captain: "t-a" });
  g.add("t-a", "A");
  await applyExistingChanges([{ id: "g1", captain: "t-zzz" }], combatWith(g));
  check("a captain that is not in the band is not written", g.flags["minion-bang"].captain, "t-a");
}

{
  const result = await applyExistingChanges([{ id: "gone", color: "#00ff00" }], combatWith(new MockGroup("g1", "Alpha")));
  check("a band that is gone is counted and skipped", result, { updated: 0, missing: 1 });
}

{
  const a = new MockGroup("a", "A"); a.add("t-a", "A");
  const b = new MockGroup("b", "B"); b.add("t-b", "B");
  const result = await applyExistingChanges([{ id: "a", color: "#111111" }, { id: "b", color: "#222222" }], combatWith(a, b));
  check("several bands are all updated", [a.flags["minion-bang"].color, b.flags["minion-bang"].color, result.updated], ["#111111", "#222222", 2]);
}

{
  const g = new MockGroup("g1", "Alpha"); g.add("t-a", "A");
  g.failOn = "color";
  const originalError = console.error;
  console.error = () => {};
  let thrown = "no throw";
  try { await applyExistingChanges([{ id: "g1", color: "#00ff00" }], combatWith(g)); } catch { thrown = "throws"; }
  console.error = originalError;
  check("a failed write is reported to the caller", thrown, "throws");
}

check("no changes: nothing is written", await applyExistingChanges([], combatWith(new MockGroup("g1", "Alpha"))), { updated: 0, missing: 0 });

if (failures > 0) {
  console.log(`\n${failures} existing bands adapter check(s) failed.`);
  process.exit(1);
}
console.log("\nAll existing bands adapter checks passed.");
