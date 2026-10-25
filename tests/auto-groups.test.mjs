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

const settingValues = { groupsEnabled: true, maximumsTable: "" };
const activeModules = new Set();
const state = { activeGmIsMe: true };

globalThis.game = {
  combats: new MockCollection(),
  users: { get activeGM() { return { isSelf: state.activeGmIsMe }; } },
  modules: { get: id => ({ active: activeModules.has(id) }) },
  settings: { get: (module, key) => settingValues[key] ?? false },
  user: { isGM: true },
  i18n: { localize: key => key }
};
const notices = [];
globalThis.ui = { notifications: { warn: text => notices.push(text) } };

const MCDM = "mcdm-flee-mortals-where-evil-lives";
const log = [];

class MockCombat {
  constructor(id) {
    this.id = id;
    this.combatants = [];
    this.groups = [];
    this.calls = [];
  }

  async createEmbeddedDocuments(type, data) {
    this.calls.push(["create", type, data]);
    await Promise.resolve();
    if (type !== "CombatantGroup") throw new Error(`unexpected type ${type}`);
    return data.map(d => {
      const group = { id: `G${this.groups.length + 1}`, name: d.name };
      this.groups.push(group);
      return group;
    });
  }

  async updateEmbeddedDocuments(type, updates) {
    this.calls.push(["update", type, updates]);
    await Promise.resolve();
    if (type !== "Combatant") throw new Error(`unexpected type ${type}`);
    for (const update of updates) {
      const combatant = this.combatants.find(c => c.id === update._id);
      combatant._source.group = update.group;
    }
  }

  groupOf(id) {
    return this.combatants.find(c => c.id === id)._source.group;
  }
}

let counter = 0;
function minionActor(name, source = null, cr = 1) {
  return { name, _stats: { compendiumSource: source }, system: { details: { cr } }, flags: { [MCDM]: { role: "minion" } } };
}
function plainActor(name, source = null) {
  return { name, _stats: { compendiumSource: source }, system: { details: { cr: 1 } }, flags: {} };
}
const sizesOf = (combat, ids) => {
  const counts = new Map();
  for (const id of ids) {
    const group = combat.groupOf(id) ?? `alone:${id}`;
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.values()].sort((a, b) => b - a);
};
function addCombatant(combat, actor, { initiative = null, group = null, quiet = false, alone = false } = {}) {
  const combatant = { id: `C${++counter}`, name: actor.name, actor, initiative, _source: { group }, parent: combat, flags: alone ? { "minion-bang": { alone: true } } : {} };
  combat.combatants.push(combatant);
  if (!quiet) fire("createCombatant", combatant);
  return combatant;
}
const flush = () => new Promise(resolve => setTimeout(resolve, 20));
function freshCombat() {
  const combat = new MockCombat(`combat${++counter}`);
  game.combats.set(combat.id, combat);
  return combat;
}

const { registerAutoGroups, reconcileAllCombats } = await import("../scripts/adapters/auto-groups.js");
registerAutoGroups();

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
const creates = combat => combat.calls.filter(c => c[0] === "create").length;

{
  const combat = freshCombat();
  const goblins = [1, 2, 3, 4].map(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  const bugbear = addCombatant(combat, plainActor("Bugbear Warrior", "Compendium.x.bugbear"));
  await flush();
  check("four goblins and a bugbear: one group, with the four goblins", [creates(combat), new Set(goblins.map(g => combat.groupOf(g.id))).size, combat.groupOf(goblins[0].id) !== null], [1, 1, true]);
  check("the bugbear stays out", combat.groupOf(bugbear.id), null);
  check("the group takes the name of the actor", combat.groups[0].name, "Goblin Lackey");
  const fifth = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("a fifth goblin before the roll joins the same group", [creates(combat), combat.groupOf(fifth.id) === combat.groupOf(goblins[0].id)], [1, true]);

  goblins[0].initiative = 12;
  const late = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("after the initiative roll a newcomer stays out", combat.groupOf(late.id), null);
  const lateOrc = addCombatant(combat, minionActor("Orc", "Compendium.x.orc"));
  const lateOrc2 = addCombatant(combat, minionActor("Orc", "Compendium.x.orc"));
  await flush();
  check("after the initiative roll no new group is created either", [creates(combat), combat.groupOf(lateOrc.id), combat.groupOf(lateOrc2.id)], [1, null, null]);
}

{
  const combat = freshCombat();
  const lone = addCombatant(combat, minionActor("Ogre", "Compendium.x.ogre"));
  await flush();
  check("a lone minion makes no group", [creates(combat), combat.groupOf(lone.id)], [0, null]);
}

{
  const combat = freshCombat();
  const bandits = [1, 2].map(() => addCombatant(combat, plainActor("Bandit", "Compendium.x.bandit")));
  await flush();
  check("two creatures that are not minions make no group", [creates(combat), bandits.map(b => combat.groupOf(b.id))], [0, [null, null]]);
}

{
  const combat = freshCombat();
  const first = [1, 2].map(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  const second = [1, 2].map(() => addCombatant(combat, minionActor("Orc Grunt", "Compendium.x.orc")));
  await flush();
  check("two stat blocks make two groups", [creates(combat), combat.groupOf(first[0].id) !== combat.groupOf(second[0].id)], [2, true]);
}

{
  const combat = freshCombat();
  const a = addCombatant(combat, minionActor("Goblin", "Compendium.x.goblinA"));
  const b = addCombatant(combat, minionActor("Goblin", "Compendium.x.goblinB"));
  await flush();
  check("same name but different compendium source: not the same stat block", [creates(combat), combat.groupOf(a.id), combat.groupOf(b.id)], [0, null, null]);
}

{
  const combat = freshCombat();
  const a = addCombatant(combat, minionActor("Zombie"));
  const b = addCombatant(combat, minionActor("Zombie"));
  await flush();
  check("without a compendium source the name decides", [creates(combat), combat.groupOf(a.id) === combat.groupOf(b.id), combat.groupOf(a.id) !== null], [1, true, true]);
}

{
  const combat = freshCombat();
  const manual = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { group: "MANUAL", quiet: true });
  const other = addCombatant(combat, plainActor("Riswynn"), { group: "MANUAL", quiet: true });
  const a = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  const b = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("members of a manual group are not moved", [combat.groupOf(manual.id), combat.groupOf(other.id)], ["MANUAL", "MANUAL"]);
  check("newcomers do not join a manual mixed group but form their own", [creates(combat), combat.groupOf(a.id) === combat.groupOf(b.id), combat.groupOf(a.id) !== "MANUAL"], [1, true, true]);
}

{
  const combat = freshCombat();
  const ids = [];
  for (let i = 0; i < 8; i++) ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("a burst of eight creations makes two groups (5 and 3), not eight", [creates(combat), sizesOf(combat, ids)], [2, [5, 3]]);
}

{
  const combat = freshCombat();
  settingValues.groupsEnabled = false;
  [1, 2, 3].forEach(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  await flush();
  check("setting off: nothing happens", creates(combat), 0);
  settingValues.groupsEnabled = true;
  reconcileAllCombats();
  await flush();
  check("turning the setting on groups the creatures already in the combat", creates(combat), 1);
}

{
  const combat = freshCombat();
  activeModules.add("squad-combat-initiative");
  [1, 2, 3].forEach(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  await flush();
  check("blocked by Squad Combat Initiative: nothing happens", creates(combat), 0);
  activeModules.delete("squad-combat-initiative");
}

{
  const combat = freshCombat();
  state.activeGmIsMe = false;
  [1, 2, 3].forEach(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  await flush();
  check("a GM who is not the active one does nothing", creates(combat), 0);
  state.activeGmIsMe = true;
}

{
  const combat = freshCombat();
  [1, 2].forEach(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  game.combats.delete(combat.id);
  await flush();
  check("a combat that has been deleted is left alone", creates(combat), 0);
}

{
  const combat = freshCombat();
  const original = combat.createEmbeddedDocuments.bind(combat);
  combat.createEmbeddedDocuments = async () => { throw new Error("boom"); };
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.join(" "));
  [1, 2].forEach(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")));
  await flush();
  console.error = originalError;
  check("a failure is logged and does not stop later grouping", errors.some(e => e.includes("Automatic grouping failed")), true);
  combat.createEmbeddedDocuments = original;
  addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("after the failure the next creation still works", creates(combat), 1);
}

{
  const combat = freshCombat();
  const projected = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { initiative: 7 });
  const b = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  const c = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("an initiative already present (even projected) blocks the grouping", [creates(combat), combat.groupOf(b.id), combat.groupOf(c.id), combat.groupOf(projected.id)], [0, null, null, null]);
}


{
  settingValues.maximumsTable = JSON.stringify([{ cr: 0, max: 3 }]);
  const combat = freshCombat();
  const ids = [];
  for (let i = 0; i < 7; i++) ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("a table edited by the GM is used for the group size (3)", sizesOf(combat, ids), [3, 3, 1]);
  settingValues.maximumsTable = "{broken";
  const broken = freshCombat();
  const brokenIds = [];
  for (let i = 0; i < 7; i++) brokenIds.push(addCombatant(broken, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("an unreadable stored table falls back to the default (5)", sizesOf(broken, brokenIds), [5, 2]);
  check("the GM is warned once about the unreadable table", notices, ["MINIONBANG.Maximums.Corrupt"]);
  const { getRecentLogs } = await import("../scripts/log.js");
  check("the unreadable table is written to the log", getRecentLogs().filter(l => l.level === "error" && l.text.includes("stored maximums table")).length, 1);
  settingValues.maximumsTable = "";
}

{
  const combat = freshCombat();
  const ids = [];
  for (let i = 0; i < 7; i++) ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("7 identical minions CR 1: a group of 5 and a group of 2", [creates(combat), sizesOf(combat, ids)], [2, [5, 2]]);
  for (let i = 0; i < 3; i++) ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("three more before the roll fill the group of 2 up to 5", [creates(combat), sizesOf(combat, ids)], [2, [5, 5]]);
  ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("an eleventh stays alone", [creates(combat), sizesOf(combat, ids)], [2, [5, 5, 1]]);
  ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("a twelfth joins the one left alone", [creates(combat), sizesOf(combat, ids)], [3, [5, 5, 2]]);
  for (let i = 0; i < 8; i++) ids.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin")).id);
  await flush();
  check("eight more: the group of 2 fills to 5 and the rest forms new groups", sizesOf(combat, ids), [5, 5, 5, 5]);
  combat.combatants[0].initiative = 11;
  const late = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("after the roll the groups are fixed", combat.groupOf(late.id), null);
}

{
  const combat = freshCombat();
  const mid = [];
  for (let i = 0; i < 10; i++) mid.push(addCombatant(combat, minionActor("Ogre Brute", "Compendium.x.ogre", 6)).id);
  await flush();
  check("CR 6 uses groups of 8", sizesOf(combat, mid), [8, 2]);
}

{
  const combat = freshCombat();
  const big = [];
  for (let i = 0; i < 12; i++) big.push(addCombatant(combat, minionActor("Giant Thrall", "Compendium.x.giant", 9)).id);
  await flush();
  check("CR 9 uses groups of 10", sizesOf(combat, big), [10, 2]);
}

{
  const combat = freshCombat();
  const small = [];
  for (let i = 0; i < 6; i++) small.push(addCombatant(combat, minionActor("Rat Swarmling", "Compendium.x.rat", 0.125)).id);
  await flush();
  check("CR 1/8 uses groups of 5", sizesOf(combat, small), [5, 1]);
}

{
  const combat = freshCombat();
  const boundary = [];
  for (let i = 0; i < 9; i++) boundary.push(addCombatant(combat, minionActor("Knight Thrall", "Compendium.x.knight", 4.5)).id);
  await flush();
  check("CR 4.5 sits between table rows and uses the row below (5)", sizesOf(combat, boundary), [5, 4]);
}

{
  const combat = freshCombat();
  const none = [];
  for (let i = 0; i < 6; i++) none.push(addCombatant(combat, minionActor("Mystery Thrall", "Compendium.x.mystery", null)).id);
  await flush();
  check("minions without a CR are never grouped", [creates(combat), none.map(id => combat.groupOf(id))], [0, [null, null, null, null, null, null]]);
}

{
  const combat = freshCombat();
  const text = [];
  for (let i = 0; i < 6; i++) text.push(addCombatant(combat, minionActor("Textual Thrall", "Compendium.x.text", "1/2")).id);
  await flush();
  check("a CR that is not a number is not trusted", creates(combat), 0);
}

{
  const combat = freshCombat();
  const negative = [];
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.join(" "));
  for (let i = 0; i < 3; i++) negative.push(addCombatant(combat, minionActor("Odd Thrall", "Compendium.x.odd", -1)).id);
  await flush();
  console.error = originalError;
  check("a negative CR is not trusted: nothing grouped and no error", [creates(combat), errors.length], [0, 0]);
}

{
  const combat = freshCombat();
  const gob = [];
  const ogre = [];
  for (let i = 0; i < 6; i++) gob.push(addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin", 1)).id);
  for (let i = 0; i < 9; i++) ogre.push(addCombatant(combat, minionActor("Ogre Brute", "Compendium.x.ogre", 6)).id);
  await flush();
  check("two stat blocks with different CRs are grouped on their own tables", [sizesOf(combat, gob), sizesOf(combat, ogre)], [[5, 1], [8, 1]]);
}

{
  const combat = freshCombat();
  const first = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { group: "OLD", quiet: true });
  const second = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { group: "OLD", quiet: true });
  const third = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("a newcomer fills an existing group made only of the same stat block", [combat.groupOf(first.id), combat.groupOf(third.id)], ["OLD", "OLD"]);
}

{
  const combat = freshCombat();
  const alone = [1, 2, 3].map(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { alone: true }));
  await flush();
  check("goblins marked as alone are never grouped", [creates(combat), alone.map(c => combat.groupOf(c.id))], [0, [null, null, null]]);
}

{
  const combat = freshCombat();
  const members = [1, 2, 3].map(() => addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { quiet: true }));
  const grouped = await (async () => { for (const m of members) fire("createCombatant", m); await flush(); return combat.groupOf(members[0].id); })();
  const lone = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"), { alone: true });
  await flush();
  check("a goblin marked as alone does not join a group with room", [grouped !== null, combat.groupOf(lone.id)], [true, null]);
  const loose = addCombatant(combat, minionActor("Goblin Lackey", "Compendium.x.goblin"));
  await flush();
  check("a goblin not marked still joins it", combat.groupOf(loose.id) === grouped, true);
}

console.log(failures === 0 ? "\nAll automatic grouping checks passed.\n" : `\n${failures} automatic grouping check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
