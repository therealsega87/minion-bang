const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};
const fire = (name, ...args) => (handlers.get(name) ?? []).forEach(fn => fn(...args));

const settingValues = { groupsEnabled: true, groupInitiativeMode: "average" };
const chat = [];
globalThis.ui = { notifications: { warn() {} } };
globalThis.ChatMessage = { create: async data => { chat.push(data); }, getWhisperRecipients: () => [{ id: "gm" }] };
globalThis.foundry = { applications: { handlebars: { renderTemplate: async () => "card" } } };
globalThis.game = {
  users: { get activeGM() { return { isSelf: true }; } },
  modules: { get: () => ({ active: false }) },
  settings: { get: (module, key) => settingValues[key] ?? false },
  i18n: { localize: key => key, format: key => key },
  user: { isGM: true }
};

class MockGroup {
  constructor(combat, id) {
    this.id = id;
    this.name = id;
    this.parent = combat;
    this.initiative = null;
    this.members = new Set();
    this.flags = {};
  }
  getFlag(module, key) { return this.flags[module]?.[key]; }
  async setFlag(module, key, value) { (this.flags[module] ??= {})[key] = value; }
  async unsetFlag(module, key) { if (this.flags[module]) delete this.flags[module][key]; }
  async update(data) {
    await Promise.resolve();
    this.initiative = data.initiative;
    fire("updateCombatantGroup", this, { initiative: this.initiative });
  }
}

class Combatant5e {
  constructor(combat, id, group) {
    this.id = id;
    this.name = id;
    this.tokenId = `T${id}`;
    this.parent = combat;
    this.defeated = false;
    this.group = group;
    this._source = { group: group?.id ?? null, initiative: null };
  }
  get initiative() { return this._source.initiative; }
  getInitiativeGroupingKey() {
    if (this.group) return this.group.id;
    return "same-stat-block";
  }
}

class Combat5e {
  constructor() {
    this.groups = new Map();
    this.combatants = [];
    this.started = false;
    this.script = [];
    this.rolled = [];
    this.copied = [];
  }
  addGroup(id) {
    const group = new MockGroup(this, id);
    this.groups.set(id, group);
    return group;
  }
  add(id, group = null) {
    const combatant = new Combatant5e(this, id, group);
    this.combatants.push(combatant);
    group?.members.add(combatant);
    return combatant;
  }
  get(id) { return this.combatants.find(c => c.id === id); }
  async rollInitiative(ids) {
    const toBeRolled = {};
    const toBeDerived = {};
    for (const id of ids) {
      const key = this.get(id).getInitiativeGroupingKey() ?? id;
      let deriveFrom = null;
      if (!this.started) deriveFrom = this.combatants.find(c => c.getInitiativeGroupingKey() === key && Number.isFinite(c.initiative))?.id ?? null;
      deriveFrom ??= toBeRolled[key];
      if (deriveFrom) toBeDerived[id] = deriveFrom;
      else toBeRolled[key] = id;
    }
    await Promise.resolve();
    const rolledNow = Object.values(toBeRolled);
    for (const id of rolledNow) {
      this.rolled.push(id);
      this.get(id)._source.initiative = this.script.shift();
    }
    for (const id of rolledNow) fire("updateCombatant", this.get(id), { initiative: this.get(id).initiative }, {});
    for (const [id, from] of Object.entries(toBeDerived)) {
      this.copied.push(id);
      this.get(id)._source.initiative = this.get(from).initiative;
      fire("updateCombatant", this.get(id), { initiative: this.get(from).initiative }, { turnEvents: false });
    }
    return this;
  }
}

globalThis.CONFIG = { Combat: { documentClass: Combat5e }, Combatant: { documentClass: Combatant5e } };
const mod = await import("../scripts/adapters/group-initiative.js");

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
const flush = () => new Promise(resolve => setTimeout(resolve, 40));

function band(mode, size = 5) {
  settingValues.groupInitiativeMode = mode;
  const combat = new Combat5e();
  const group = combat.addGroup("G1");
  const members = Array.from({ length: size }, (_, i) => combat.add(`m${i}`, group));
  chat.length = 0;
  return { combat, group, members };
}

{
  const { combat, members } = band("average");
  combat.script = [12, 16, 9, 14, 11];
  await combat.rollInitiative([members[0].id]);
  await combat.rollInitiative(members.slice(1).map(m => m.id));
  check("dnd5e 6 without Minion!: one roll, the other members get a copy", [combat.rolled.length, combat.copied.length, members.map(m => m.initiative)], [1, 4, [12, 12, 12, 12, 12]]);
}

mod.registerGroupInitiative();
check("the grouping key is wrapped once", [mod.wrapInitiativeGroupingKey(), mod.wrapInitiativeGroupingKey()], [true, false]);

for (const [mode, expected] of [["average", 13], ["highest", 16], ["lowest", 9], ["median", 12]]) {
  const { combat, group, members } = band(mode);
  combat.script = [12, 16, 9, 14, 11];
  await combat.rollInitiative([members[0].id]);
  await flush();
  check(`${mode} on dnd5e 6: every member rolls its own die, nobody gets a copy`, [combat.rolled.length, combat.copied.length], [5, 0]);
  check(`${mode} on dnd5e 6: the members keep their own rolls`, members.map(m => m._source.initiative), [12, 16, 9, 14, 11]);
  check(`${mode} on dnd5e 6: the band gets ${expected}`, group.initiative, expected);
}
{
  const { combat, members } = band("average");
  combat.script = [12, 16, 9, 14, 11];
  await combat.rollInitiative(members.map(m => m.id));
  await flush();
  check("average on dnd5e 6: Roll All on the whole band also rolls five dice", [combat.rolled.length, combat.copied.length], [5, 0]);
}
{
  const { members } = band("captain");
  check("captain on dnd5e 6: the key stays the band's, dnd5e's single roll is kept", members[1].getInitiativeGroupingKey(), "G1");
}
{
  const { group, members } = band("captain");
  group.flags["minion-bang"] = { mode: "median" };
  check("a band with its own mode other than captain gets a key per member", members[1].getInitiativeGroupingKey(), "m1");
}
{
  const { members } = band("average");
  settingValues.groupsEnabled = false;
  check("shared turns and bands off: dnd5e's key is untouched", members[1].getInitiativeGroupingKey(), "G1");
  settingValues.groupsEnabled = true;
}
{
  const combat = new Combat5e();
  const loner = combat.add("solo");
  check("a combatant outside any band keeps dnd5e's key", loner.getInitiativeGroupingKey(), "same-stat-block");
}
{
  const { combat, members } = band("average");
  combat.groups.clear();
  check("a band missing from the combat: dnd5e's key is untouched", members[1].getInitiativeGroupingKey(), "G1");
}
{
  const saved = globalThis.CONFIG.Combatant;
  globalThis.CONFIG.Combatant = { documentClass: class OldCombatant {} };
  check("dnd5e 5.3 has no grouping key: nothing is wrapped", mod.wrapInitiativeGroupingKey(), false);
  globalThis.CONFIG.Combatant = saved;
}

console.log(failures === 0 ? "\nAll dnd5e 6 initiative checks passed.\n" : `\n${failures} dnd5e 6 initiative check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
