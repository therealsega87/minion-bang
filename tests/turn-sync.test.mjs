class MockCollection extends Map {
  [Symbol.iterator]() { return this.values(); }
}

const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};
const fire = (name, ...args) => (handlers.get(name) ?? []).forEach(fn => fn(...args));

const settingValues = { groupsEnabled: true };
const activeModules = new Set();
const renders = [];
globalThis.ui = { combat: { render: () => renders.push("render") } };
globalThis.game = {
  combats: new MockCollection(),
  modules: { get: id => ({ active: activeModules.has(id) }) },
  settings: { get: (module, key) => settingValues[key] ?? false }
};

const { registerTurnSync, TURN_SYNC_DELAY_MS } = await import("../scripts/adapters/turn-sync.js");
registerTurnSync();

let counter = 0;
class MockCombat {
  constructor() {
    this.id = `combat${++counter}`;
    this.groups = [];
    this.combatants = [];
    this.turns = [];
    this.setupCalls = 0;
    this.failSetup = false;
    game.combats.set(this.id, this);
  }

  addGroup(initiative = null) {
    const group = { id: `G${++counter}`, parent: this, initiative };
    this.groups.push(group);
    return group;
  }

  addCombatant(name, { group = null, initiative = null } = {}) {
    const combatant = {
      id: `C${++counter}`, name, parent: this, _source: { group, initiative },
      get initiative() {
        const own = this._source.initiative;
        const grp = this.parent.groups.find(g => g.id === this._source.group);
        return grp && grp.initiative !== null ? grp.initiative : own;
      }
    };
    this.combatants.push(combatant);
    return combatant;
  }

  setupTurns() {
    this.setupCalls += 1;
    if (this.failSetup) throw new Error("setup failed");
    this.turns = [...this.combatants].sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) || a.name.localeCompare(b.name));
    return this.turns;
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const settle = () => wait(TURN_SYNC_DELAY_MS + 40);
const names = combat => combat.turns.map(t => `${t.name} (${t.initiative})`);

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
  const combat = new MockCombat();
  const bandit = combat.addCombatant("Bandit");
  const bugbear = combat.addCombatant("Bugbear");
  const riswynn = combat.addCombatant("Riswynn");
  const goblins = [1, 2, 3, 4].map(() => combat.addCombatant("Goblin Lackey"));
  const zanna = combat.addCombatant("Zanna");
  const banditGroup = combat.addGroup(3);
  [bandit, bugbear, riswynn].forEach(c => { c._source.group = banditGroup.id; });
  combat.setupTurns();
  const goblinGroup = combat.addGroup(4);
  goblins.forEach(g => { g._source.group = goblinGroup.id; });
  const stale = names(combat);

  fire("createCombatantGroup", goblinGroup);
  goblins.forEach(g => fire("updateCombatant", g, { group: goblinGroup.id }));
  fire("updateCombatantGroup", goblinGroup, { initiative: 4 });
  const before = combat.setupCalls;
  await settle();
  check("a burst of changes rebuilds the turns once", combat.setupCalls - before, 1);
  check("the turns were stale before the module rebuilt them", JSON.stringify(stale) !== JSON.stringify(names(combat)), true);
  check("the turns now follow the groups", names(combat), ["Goblin Lackey (4)", "Goblin Lackey (4)", "Goblin Lackey (4)", "Goblin Lackey (4)", "Bandit (3)", "Bugbear (3)", "Riswynn (3)", "Zanna (null)"]);
  check("the tracker is redrawn once", renders.length, 1);
}

{
  const combat = new MockCombat();
  const a = combat.addCombatant("A");
  const b = combat.addCombatant("B");
  const group = combat.addGroup(5);
  a._source.group = group.id;
  combat.setupTurns();
  const base = combat.setupCalls;
  group.initiative = 20;
  fire("updateCombatantGroup", group, { initiative: 20 });
  await settle();
  check("a change of the group initiative rebuilds the turns", [combat.setupCalls - base, names(combat)], [1, ["A (20)", "B (null)"]]);

  combat.groups.splice(0, 1);
  fire("deleteCombatantGroup", group);
  await settle();
  check("deleting a group rebuilds the turns", combat.setupCalls - base, 2);

  fire("updateCombatant", a, { group: null });
  await settle();
  check("a combatant that changes group rebuilds the turns", combat.setupCalls - base, 3);

  fire("updateCombatant", a, { initiative: 12 });
  await settle();
  check("a combatant whose initiative changes rebuilds the turns", combat.setupCalls - base, 4);

  fire("updateCombatant", a, { name: "renamed" });
  fire("updateCombatant", a, { hidden: true });
  await settle();
  check("other changes to a combatant are ignored", combat.setupCalls - base, 4);

  fire("updateCombatant", a, { group: null });
  await settle();
  check("a group set to null counts as a change", combat.setupCalls - base, 5);
}

{
  const combat = new MockCombat();
  const base = combat.setupCalls;
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  await wait(TURN_SYNC_DELAY_MS / 2);
  fire("updateCombatantGroup", combat.groups[0], { initiative: 2 });
  await wait(TURN_SYNC_DELAY_MS / 2);
  fire("updateCombatantGroup", combat.groups[0], { initiative: 3 });
  await settle();
  check("changes spaced inside the delay still make a single rebuild", combat.setupCalls - base, 1);
  fire("updateCombatantGroup", combat.groups[0], { initiative: 4 });
  await settle();
  fire("updateCombatantGroup", combat.groups[0], { initiative: 5 });
  await settle();
  check("changes spaced beyond the delay rebuild each time", combat.setupCalls - base, 3);
}

{
  settingValues.groupsEnabled = false;
  const combat = new MockCombat();
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  await settle();
  check("setting off: the turns are left alone", [combat.setupCalls, combat.turns.length], [0, 0]);
  settingValues.groupsEnabled = true;
}

{
  activeModules.add("squad-combat-initiative");
  const combat = new MockCombat();
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  await settle();
  check("blocked by Squad Combat Initiative: the turns are left alone", combat.setupCalls, 0);
  activeModules.delete("squad-combat-initiative");
}

{
  const combat = new MockCombat();
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  game.combats.delete(combat.id);
  await settle();
  check("a combat that has been deleted is left alone", combat.setupCalls, 0);
}

{
  const first = new MockCombat();
  const second = new MockCombat();
  fire("updateCombatantGroup", first.addGroup(1), { initiative: 1 });
  fire("updateCombatantGroup", second.addGroup(1), { initiative: 1 });
  await settle();
  check("two combats are rebuilt independently", [first.setupCalls, second.setupCalls], [1, 1]);
}

{
  const combat = new MockCombat();
  combat.failSetup = true;
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.join(" "));
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  await settle();
  console.error = originalError;
  check("a failing rebuild is logged", errors.some(e => e.includes("Turn synchronisation failed")), true);
  combat.failSetup = false;
  fire("updateCombatantGroup", combat.groups[0], { initiative: 2 });
  await settle();
  check("after a failure the next change still rebuilds", combat.turns.length >= 0 && combat.setupCalls, 2);
}

{
  const savedUi = globalThis.ui;
  globalThis.ui = {};
  const combat = new MockCombat();
  fire("updateCombatantGroup", combat.addGroup(1), { initiative: 1 });
  await settle();
  check("without a tracker the rebuild still works", combat.setupCalls, 1);
  globalThis.ui = savedUi;
}

check("the module listens to the right events", ["createCombatantGroup", "updateCombatantGroup", "deleteCombatantGroup", "updateCombatant"].map(n => (handlers.get(n) ?? []).length), [1, 1, 1, 1]);

console.log(failures === 0 ? "\nAll turn synchronisation checks passed.\n" : `\n${failures} turn synchronisation check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
