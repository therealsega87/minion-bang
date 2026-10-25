const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};
const fire = (name, ...args) => (handlers.get(name) ?? []).forEach(fn => fn(...args));

const settingValues = { groupsEnabled: true, groupInitiativeMode: "average" };
const activeModules = new Set();
const state = { activeGmIsMe: true };
const notices = [];
const chat = [];
const rendered = [];

globalThis.ui = { notifications: { warn: text => notices.push(text) } };
globalThis.ChatMessage = {
  create: async data => { chat.push(data); },
  getWhisperRecipients: kind => (kind === "GM" ? [{ id: "gm1" }, { id: "gm2" }] : [])
};
globalThis.foundry = { applications: { handlebars: { renderTemplate: async (path, data) => { rendered.push({ path, data }); return `card:${data.title}`; } } } };
globalThis.game = {
  users: { get activeGM() { return { isSelf: state.activeGmIsMe }; } },
  modules: { get: id => ({ active: activeModules.has(id) }) },
  settings: { get: (module, key) => settingValues[key] ?? false },
  i18n: {
    localize: key => key,
    format: (key, data) => `${key}|${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(",")}`
  },
  user: { isGM: true }
};

class MockGroup {
  constructor(combat, id, name) {
    this.combat = combat;
    this.id = id;
    this.name = name;
    this.initiative = null;
    this.members = new Set();
    this.lateOverwrite = null;
    this.updates = 0;
    this.parent = combat;
    this.flags = {};
  }

  getFlag(module, key) {
    return this.flags[module]?.[key];
  }

  async setFlag(module, key, value) {
    (this.flags[module] ??= {})[key] = value;
  }

  async unsetFlag(module, key) {
    if (this.flags[module]) delete this.flags[module][key];
  }

  externalWrite(value) {
    this.initiative = value;
    fire("updateCombatantGroup", this, { initiative: value });
  }

  async update(data) {
    this.updates += 1;
    await Promise.resolve();
    this.initiative = data.initiative;
    if (this.lateOverwrite !== null) {
      this.initiative = this.lateOverwrite;
      this.lateOverwrite = null;
    }
    fire("updateCombatantGroup", this, { initiative: this.initiative });
  }
}

class MockCombat {
  constructor() {
    this.groups = new Map();
    this.combatants = [];
    this.script = [];
    this.rollCalls = [];
    this.unrollable = new Set();
    this.failOnRoll = false;
    this.counter = 0;
  }

  addGroup(name) {
    const group = new MockGroup(this, `G${++this.counter}`, name);
    this.groups.set(group.id, group);
    return group;
  }

  addMember(group, name) {
    const combatant = {
      id: `C${++this.counter}`,
      name,
      img: `img/${name}.png`,
      tokenId: `T-${name}`,
      defeated: false,
      parent: this,
      _source: { group: group.id, initiative: null },
      get initiative() {
        return group.initiative ?? this._source.initiative;
      }
    };
    this.combatants.push(combatant);
    group.members.add(combatant);
    return combatant;
  }

  async resetAll() {
    for (const c of this.combatants) {
      if (c._source.initiative === null) continue;
      c._source.initiative = null;
      fire("updateCombatant", c, { initiative: null });
    }
    return this;
  }

  async rollInitiative(ids) {
    this.rollCalls.push([...ids]);
    if (this.failOnRoll) throw new Error("roll failed");
    for (const id of ids) {
      const combatant = this.combatants.find(c => c.id === id);
      await Promise.resolve();
      if (this.unrollable.has(id)) continue;
      const value = this.script.shift();
      combatant._source.initiative = value;
      fire("updateCombatant", combatant, { initiative: value });
      const group = this.groups.get(combatant._source.group);
      if (group) group.initiative = value;
    }
    return this;
  }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 30));
globalThis.CONFIG = { Combat: { documentClass: MockCombat } };
const { registerGroupInitiative, wrapResetAll } = await import("../scripts/adapters/group-initiative.js");
registerGroupInitiative();
const wrappedTwice = wrapResetAll();

function scenario(names, mode = "average") {
  settingValues.groupInitiativeMode = mode;
  const combat = new MockCombat();
  const group = combat.addGroup("Goblin Lackey");
  const members = names.map(name => combat.addMember(group, name));
  chat.length = 0;
  notices.length = 0;
  rendered.length = 0;
  return { combat, group, members };
}

async function pressRoll(combat, member, value) {
  combat.script.unshift(value);
  await combat.rollInitiative([member.id]);
  await flush();
}

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
const rollsOf = members => members.map(m => m._source.initiative);

{
  const { combat, group, members } = scenario(["a", "b", "c", "d", "e"], "average");
  combat.script = [16, 9, 14, 11];
  await pressRoll(combat, members[0], 12);
  check("average: the missing members rolled by themselves", [combat.rollCalls.length, combat.rollCalls[1]], [2, members.slice(1).map(m => m.id)]);
  check("average: every member has its own roll", rollsOf(members), [12, 16, 9, 14, 11]);
  check("average: the group takes the average rounded up (12.4 → 13)", group.initiative, 13);
  check("average: every member shows the group value", members.map(m => m.initiative), [13, 13, 13, 13, 13]);
  check("average: one summary card, whispered to the GMs", [chat.length, chat[0]?.whisper, chat[0]?.content], [1, ["gm1", "gm2"], "card:MINIONBANG.GroupCard.Title|group=Goblin Lackey"]);
  const data = rendered[0]?.data;
  check("the card lists every roll and the calculation", [data.members.map(m => m.initiative), data.expression, data.result, data.modeLabel], [[12, 16, 9, 14, 11], "12 + 16 + 9 + 14 + 11 = 62 ÷ 5 = 12.4 → 13", 13, "MINIONBANG.GroupMode.average"]);
  check("the card uses the template of the module", rendered[0]?.path, "modules/minion-bang/templates/group-initiative-card.hbs");
  check("the card carries the first portrait", data.members[0].img, "img/a.png");
}

for (const [mode, expected] of [["highest", 16], ["lowest", 9], ["median", 12]]) {
  const { combat, group, members } = scenario(["a", "b", "c", "d", "e"], mode);
  combat.script = [16, 9, 14, 11];
  await pressRoll(combat, members[0], 12);
  check(`${mode}: the group value is ${expected}`, [group.initiative, chat.length], [expected, 1]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "captain");
  combat.script = [];
  await pressRoll(combat, members[0], 8);
  check("one roll per group: nobody else rolls, no card, the native value stands", [combat.rollCalls.length, rollsOf(members), group.initiative, chat.length], [1, [8, null, null], 8, 0]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "bogus");
  await pressRoll(combat, members[0], 8);
  check("an unknown mode behaves like one roll per group", [combat.rollCalls.length, chat.length], [1, 0]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c", "d"], "average");
  members[1]._source.initiative = 10;
  members[3]._source.initiative = 14;
  combat.script = [6];
  await pressRoll(combat, members[0], 12);
  const second = combat.rollCalls[1];
  check("a member that had already rolled is not rolled again", second, [members[2].id]);
  check("the group uses every roll, old and new", [rollsOf(members), group.initiative], [[12, 10, 6, 14], 11]);
}

{
  settingValues.groupsEnabled = false;
  const { combat, members } = scenario(["a", "b", "c"], "average");
  await pressRoll(combat, members[0], 8);
  check("setting off: nothing happens", [combat.rollCalls.length, chat.length], [1, 0]);
  settingValues.groupsEnabled = true;
}

{
  activeModules.add("squad-combat-initiative");
  const { combat, members } = scenario(["a", "b", "c"], "average");
  await pressRoll(combat, members[0], 8);
  check("blocked by Squad Combat Initiative: nothing happens", [combat.rollCalls.length, chat.length], [1, 0]);
  activeModules.delete("squad-combat-initiative");
}

{
  state.activeGmIsMe = false;
  const { combat, members } = scenario(["a", "b", "c"], "average");
  await pressRoll(combat, members[0], 8);
  check("a GM who is not the active one does nothing", [combat.rollCalls.length, chat.length], [1, 0]);
  state.activeGmIsMe = true;
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "average");
  combat.unrollable.add(members[2].id);
  combat.script = [9];
  await pressRoll(combat, members[0], 12);
  check("a member that cannot roll: no calculation, no card, a warning", [group.initiative === 12 || group.initiative === 9, chat.length, notices.length], [true, 0, 1]);
  check("the warning names the group", notices[0], "MINIONBANG.GroupInitiative.Incomplete|group=Goblin Lackey");
  check("no endless loop on a member that cannot roll", combat.rollCalls.length <= 3, true);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "average");
  combat.script = [9, 12];
  group.lateOverwrite = 7;
  await pressRoll(combat, members[0], 11);
  check("a late write of the native roll over the group is corrected", [group.initiative, group.updates], [11, 2]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "average");
  combat.script = [9, 10];
  await pressRoll(combat, members[0], 11);
  const cards = chat.length;
  const updates = group.updates;
  fire("updateCombatant", members[1], { initiative: members[1]._source.initiative });
  await flush();
  check("an event with nothing new neither writes nor posts again", [group.updates, chat.length], [updates, cards]);
  combat.script = [20];
  members[1]._source.initiative = null;
  await combat.rollInitiative([members[1].id]);
  await flush();
  check("a later re-roll of one member recalculates and posts a new card", [group.initiative, chat.length], [14, cards + 1]);
}

check("the reset is wrapped only once", wrappedTwice, false);

for (const mode of ["average", "highest", "lowest", "captain"]) {
  const { combat, group, members } = scenario(["a", "b", "c"], mode);
  if (mode === "captain") group.flags = { "minion-bang": { captain: members[0].tokenId } };
  combat.script = [9, 10, 12, 13];
  await pressRoll(combat, members[0], 11);
  const rolled = group.initiative !== null;
  const callsBefore = combat.rollCalls.length;
  await combat.resetAll();
  await flush();
  check(`reset (${mode}): group cleared, nobody re-rolled, lock released`,
    [rolled, group.initiative, combat.rollCalls.length, group.getFlag("minion-bang", "lockedInitiative")],
    [true, null, callsBefore, undefined]);
}

{
  const { combat, group } = scenario(["a", "b"], "average");
  group.initiative = 9;
  await combat.resetAll();
  await flush();
  check("reset: a group whose members were already empty is cleared too", group.initiative, null);
}

{
  const { combat, group, members } = scenario(["a", "b"], "average");
  combat.script = [8, 12];
  await pressRoll(combat, members[0], 8);
  const before = group.initiative;
  members[1]._source.initiative = null;
  fire("updateCombatant", members[1], { initiative: null });
  await flush();
  check("one member reset alone does not re-roll or touch the group", [group.initiative, combat.rollCalls.length], [before, 2]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "average");
  combat.failOnRoll = true;
  combat.script = [];
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args.join(" "));
  members[0]._source.initiative = 5;
  fire("updateCombatant", members[0], { initiative: 5 });
  await flush();
  console.error = originalError;
  check("a failing roll is logged, warns the GM and posts nothing", [errors.some(e => e.includes("Group initiative failed")), notices.length, chat.length], [true, 1, 0]);
  combat.failOnRoll = false;
  members[0]._source.initiative = null;
  combat.script = [4, 5, 6];
  await pressRoll(combat, members[0], 4);
  check("after a failure the next roll works", group.initiative, 5);
}

{
  settingValues.groupInitiativeMode = "average";
  const combat = new MockCombat();
  const first = combat.addGroup("Goblin");
  const second = combat.addGroup("Orc");
  const g1 = [combat.addMember(first, "g1"), combat.addMember(first, "g2")];
  const g2 = [combat.addMember(second, "o1"), combat.addMember(second, "o2")];
  chat.length = 0;
  combat.script = [8, 20];
  await combat.rollInitiative([g1[0].id]);
  await flush();
  combat.script = [10, 4];
  await combat.rollInitiative([g2[0].id]);
  await flush();
  check("two groups are calculated independently", [first.initiative, second.initiative, chat.length], [14, 7, 2]);
}

{
  const { combat, group, members } = scenario(["a", "b"], "average");
  combat.script = [3];
  fire("updateCombatant", members[0], { name: "renamed" });
  await flush();
  check("a change that is not an initiative is ignored", combat.rollCalls.length, 0);
  const loose = { id: "X", parent: combat, _source: { group: null, initiative: null } };
  fire("updateCombatant", loose, { initiative: 4 });
  await flush();
  check("a combatant without a group is ignored", combat.rollCalls.length, 0);
}

{
  const { combat, group, members } = scenario(["a", "b", "c", "d", "e"], "average");
  const values = [16, 10, 3, 7, 15];
  for (let i = 0; i < members.length; i += 1) {
    await pressRoll(combat, members[i], values[i]);
  }
  check("setup: the average of five rolls is 11", group.initiative, 11);
  const cards = chat.length;
  await pressRoll(combat, members[1], 4);
  group.externalWrite(4);
  await flush();
  check("the native copy arriving after the end of the calculation is corrected", group.initiative, 9);
  check("the correction does not post a second identical card", chat.length, cards + 1);
  group.externalWrite(2);
  await flush();
  check("any later external write on the group is corrected too", group.initiative, 9);
  check("no card for a pure correction", chat.length, cards + 1);
}

{
  const { group, members } = scenario(["a", "b"], "captain");
  members.forEach((m, i) => { m._source.initiative = [5, 9][i]; });
  group.externalWrite(9);
  await flush();
  check("captain mode: the group value is left alone", [group.initiative, group.updates], [9, 0]);
}


function captainScenario(names, { captain = null, mode = "captain", groupMode = null } = {}) {
  const result = scenario(names, mode);
  if (captain !== null) result.group.flags["minion-bang"] = { captain: `T-${captain}` };
  if (groupMode !== null) (result.group.flags["minion-bang"] ??= {}).mode = groupMode;
  return result;
}
const lockOf = group => group.getFlag("minion-bang", "lockedInitiative");
const captainOf = group => group.getFlag("minion-bang", "captain");
const byName = (members, name) => members.find(m => m.name === name);

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  const fresh = byName(members, "c");
  const calls = combat.rollCalls.length;
  const b = byName(members, "b");
  b.defeated = true;
  fire("updateCombatant", b, { defeated: true });
  group.externalWrite(null);
  await flush();
  check("the captain dies and dnd5e empties the group: the value stays, the new captain does not roll", [group.initiative, lockOf(group), captainOf(group), combat.rollCalls.length, fresh._source.initiative], [10, 10, "T-a", calls, null]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  group.externalWrite(null);
  await flush();
  check("captain: something empties the group value (a member dies): the locked value comes back", [group.initiative, lockOf(group)], [10, 10]);
}

for (const [mode, expected] of [["average", 10], ["highest", 11], ["lowest", 9], ["median", 10]]) {
  const { combat, group, members } = scenario(["a", "b", "c"], mode);
  combat.script = [9, 10, 12];
  await pressRoll(combat, members[0], 11);
  const value = group.initiative;
  const calls = combat.rollCalls.length;
  const dead = members[1];
  dead.defeated = true;
  fire("updateCombatant", dead, { defeated: true });
  group.externalWrite(null);
  await flush();
  check(`${mode}: a member dies and dnd5e empties the group: the value comes back, nobody is re-rolled`, [value, group.initiative, combat.rollCalls.length], [expected, expected, calls]);
}

{
  const { combat, group, members } = scenario(["a", "b", "c"], "average");
  combat.script = [9, 10, 12];
  await pressRoll(combat, members[0], 11);
  const calls = combat.rollCalls.length;
  await combat.resetAll();
  await flush();
  check("average: a reset empties the group for good and nobody is re-rolled", [group.initiative, combat.rollCalls.length], [null, calls]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  const other = combat.addGroup("Second");
  const x = combat.addMember(other, "x");
  const y = combat.addMember(other, "y");
  other.flags["minion-bang"] = { captain: "T-y" };
  const loner = { id: "L1", name: "loner", tokenId: "T-loner", defeated: false, parent: combat, _source: { group: null, initiative: null } };
  combat.combatants.push(loner);
  combat.script = [4, 5, 6];
  await combat.rollInitiative([byName(members, "a").id, byName(members, "c").id, x.id, loner.id]);
  await flush();
  check("several ids: each band is rolled once through its captain, loners are untouched", combat.rollCalls[0], [byName(members, "b").id, y.id, loner.id]);
  void group; void y;
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  const before = combat.rollCalls.length;
  combat.script = [3];
  await combat.rollInitiative([byName(members, "a").id]);
  await flush();
  check("a band that already has its value is not redirected (the roll is undone later)", [combat.rollCalls[before], group.initiative], [[byName(members, "a").id], 10]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  game.user.isGM = false;
  await pressRoll(combat, byName(members, "a"), 8);
  game.user.isGM = true;
  check("a player client does not redirect the roll", combat.rollCalls[0], [byName(members, "a").id]);
  void group;
}

{
  const { combat, members } = captainScenario(["a", "b", "c"], { captain: "b", groupMode: "average" });
  await pressRoll(combat, byName(members, "a"), 8);
  check("a band that is not in captain mode is not redirected", combat.rollCalls[0], [byName(members, "a").id]);
}


{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "a"), 8);
  check("captain: a roll asked for a member is made by the captain instead, nobody else rolls", [combat.rollCalls, rollsOf(members)], [[[byName(members, "b").id]], [null, 8, null]]);
  check("captain: the group takes the roll of the captain", [group.initiative, lockOf(group)], [8, 8]);
  check("captain: no summary card", chat.length, 0);
  combat.script = [];
  await pressRoll(combat, byName(members, "c"), 3);
  check("captain: a later roll of another member does not change the group", [group.initiative, lockOf(group), combat.rollCalls.length], [8, 8, 2]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  check("captain: the captain rolls first, nobody else is rolled", [combat.rollCalls.length, group.initiative, lockOf(group)], [1, 10, 10]);
  await pressRoll(combat, byName(members, "a"), 4);
  check("captain: a roll of another member (the native value would be 4) is undone", [group.initiative, lockOf(group)], [10, 10]);
  const before = group.updates;
  await pressRoll(combat, byName(members, "c"), 18);
  check("captain: every later roll is undone, whatever it is", [group.initiative, group.updates - before], [10, 1]);
}

{
  const { combat, group, members } = captainScenario(["a", "b"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  await combat.resetAll();
  await flush();
  check("a reset of the initiative clears the lock", lockOf(group), undefined);
  await pressRoll(combat, byName(members, "b"), 5);
  check("after a reset the new roll of the captain is the group value", [group.initiative, lockOf(group)], [5, 5]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  await pressRoll(combat, byName(members, "b"), 10);
  const b = byName(members, "b");
  b.defeated = true;
  fire("updateCombatant", b, { defeated: true });
  await flush();
  check("the captain dies: the first member standing takes over", captainOf(group), "T-a");
  check("the captain dies after the roll: the group value stays", [group.initiative, lockOf(group)], [10, 10]);
  await pressRoll(combat, byName(members, "a"), 2);
  check("the new captain rolling later does not change the group", group.initiative, 10);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  const b = byName(members, "b");
  b.defeated = true;
  fire("updateCombatant", b, { defeated: true });
  await flush();
  combat.script = [];
  await pressRoll(combat, byName(members, "a"), 6);
  check("the captain dies before the roll: the new captain is the one who counts", [captainOf(group), combat.rollCalls.length, group.initiative], ["T-a", 1, 6]);
}

{
  const { group, members, combat } = captainScenario(["a", "b", "c"], { captain: "a" });
  const a = byName(members, "a");
  group.members.delete(a);
  fire("deleteCombatant", a);
  await flush();
  check("the captain leaves the combat: the next one takes over", captainOf(group), "T-b");
  void combat;
}

{
  const { group, members } = captainScenario(["a", "b", "c"], { captain: "c" });
  const a = byName(members, "a");
  a.defeated = true;
  fire("updateCombatant", a, { defeated: true });
  await flush();
  check("a member who is not the captain dying changes nothing", captainOf(group), "T-c");
}

{
  const { group, members } = captainScenario(["a"], { captain: "a" });
  const a = byName(members, "a");
  a.defeated = true;
  fire("updateCombatant", a, { defeated: true });
  await flush();
  check("nobody left to take over: the flag stays and nothing breaks", captainOf(group), "T-a");
}

{
  const { group, members } = captainScenario(["a", "b"]);
  const a = byName(members, "a");
  a.defeated = true;
  fire("updateCombatant", a, { defeated: true });
  await flush();
  check("a group without a captain chosen is not touched when someone dies", captainOf(group), undefined);
}

{
  state.activeGmIsMe = false;
  const { group, members } = captainScenario(["a", "b"], { captain: "a" });
  const a = byName(members, "a");
  a.defeated = true;
  fire("updateCombatant", a, { defeated: true });
  await flush();
  check("a GM who is not the active one does not pass the captaincy", captainOf(group), "T-a");
  state.activeGmIsMe = true;
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  byName(members, "b").defeated = true;
  await pressRoll(combat, byName(members, "a"), 6);
  check("a captain already dead but still in the flag: the first standing counts", [group.initiative, combat.rollCalls.length], [6, 1]);
}

{
  const { combat, group, members } = captainScenario(["a", "b"], { captain: "zzz" });
  await pressRoll(combat, byName(members, "b"), 9);
  check("a captain that is not in the group: the first member counts, and is rolled instead", [group.initiative, lockOf(group), combat.rollCalls], [9, 9, [[byName(members, "a").id]]]);
  void members;
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b" });
  combat.unrollable.add(byName(members, "b").id);
  await pressRoll(combat, byName(members, "a"), 8);
  check("a captain that cannot roll: nothing is rolled and there is no lock", [combat.rollCalls.length, lockOf(group)], [1, undefined]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "b", mode: "captain", groupMode: "average" });
  combat.script = [10, 12];
  await pressRoll(combat, byName(members, "a"), 8);
  check("a band with its own mode (average) ignores the one in the settings (captain)", [group.initiative, chat.length, lockOf(group)], [10, 1, undefined]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { captain: "c", mode: "average", groupMode: "captain" });
  combat.script = [14];
  await pressRoll(combat, byName(members, "a"), 8);
  check("a band with its own mode (captain) ignores the one in the settings (average)", [group.initiative, chat.length, lockOf(group)], [8, 0, 8]);
}

{
  const { combat, group, members } = captainScenario(["a", "b", "c"], { mode: "captain", groupMode: "bogus" });
  await pressRoll(combat, byName(members, "a"), 8);
  check("an invalid mode in the band falls back to the setting", [group.initiative, combat.rollCalls.length], [8, 1]);
}

{
  settingValues.groupsEnabled = false;
  const { combat, group, members } = captainScenario(["a", "b"], { captain: "b" });
  await pressRoll(combat, byName(members, "a"), 8);
  settingValues.groupsEnabled = true;
  check("groups off: the captain is not rolled", [combat.rollCalls.length, lockOf(group)], [1, undefined]);
}

{
  const { readFileSync } = await import("node:fs");
  const template = readFileSync(new URL("../templates/group-initiative-card.hbs", import.meta.url), "utf8");
  const { combat, members } = scenario(["a", "b"], "average");
  combat.script = [9];
  await pressRoll(combat, members[0], 5);
  const data = rendered[0].data;
  const topLevel = Object.keys(data).filter(key => key !== "members");
  check("the template uses every field the module passes", topLevel.filter(key => !template.includes(`{{${key}}}`)), []);
  check("the template uses the fields of each member", ["name", "initiative"].filter(key => !template.includes(`{{${key}}}`)), []);
  check("the template lists the members with a loop", template.includes("{{#each members}}"), true);
}

console.log(failures === 0 ? "\nAll group initiative checks passed.\n" : `\n${failures} group initiative check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
