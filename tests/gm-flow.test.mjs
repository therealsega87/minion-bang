const handlers = new Map();
let nextHookId = 1;
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    const id = nextHookId++;
    handlers.get(name).push({ id, fn });
    return id;
  },
  off(name, id) {
    handlers.set(name, (handlers.get(name) ?? []).filter(h => h.id !== id));
  },
  call(name, ...args) {
    for (const { fn } of [...(handlers.get(name) ?? [])]) fn(...args);
  },
  callAll(name, ...args) {
    for (const { fn } of [...(handlers.get(name) ?? [])]) fn(...args);
  }
};
const minionKills = [];
Hooks.on("minion-bang.minionKill", data => { minionKills.push(data); });

class FakeGraphics {
  constructor() { this.destroyed = false; this.alpha = null; }
  lineStyle(width, color, alpha) { this.alpha = alpha; }
  drawCircle() {}
  destroy() { this.destroyed = true; }
}
globalThis.PIXI = { Graphics: FakeGraphics };

globalThis.document = {
  createElement: () => {
    const el = { innerHTML: "" };
    Object.defineProperty(el, "textContent", {
      set(v) { el.innerHTML = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    });
    return el;
  }
};

const registry = new Map();
globalThis.fromUuidSync = uuid => registry.get(uuid) ?? null;
const notices = [];
const errorsShown = [];
globalThis.ui = { notifications: { warn() {}, info: text => { notices.push(text); }, error: text => { errorsShown.push(text); } } };
globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead", INVISIBLE: "invisible" } };

const chat = [];
globalThis.ChatMessage = { create: async data => { chat.push(data); }, getWhisperRecipients: () => [{ id: "gm" }] };

const scene = { id: "scene1", grid: { units: "ft", distance: 5, size: 100 } };
const canvasTokens = [];
globalThis.canvas = {
  scene,
  grid: scene.grid,
  tokens: { get placeables() { return canvasTokens; }, get: id => canvasTokens.find(t => t.id === id) }
};

const midiSettings = { singleConcentrationRoll: true, singleDamageCalculation: false, addDead: "overlay", markNonPlayerDefeated: true };
globalThis.MidiQOL = {
  configSettings: () => midiSettings,
  computeDistance: (a, b) => (Math.max(Math.abs(a.center.x - b.center.x), Math.abs(a.center.y - b.center.y)) / 100) * 5
};

const dialogState = { autoSelect: true, template: null, script: null, forced: null, cancel: false, closeWithX: false, result: null };

globalThis.game = {
  modules: { get: () => ({ active: true }) },
  settings: { get: (module, key) => (key === "autoSelectProposal" ? dialogState.autoSelect : false) },
  i18n: {
    localize: key => key,
    format: (key, data) => `${key} ${JSON.stringify(data)}`
  },
  user: { id: "gm", isGM: true },
  users: { players: [], activeGM: { id: "gm" } },
  combat: null
};

class FakeInput {
  constructor(value, checked) {
    this.value = value;
    this.checked = checked;
    this.disabled = false;
    this.listeners = [];
  }
  addEventListener(type, fn) { if (type === "change") this.listeners.push(fn); }
  click() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.listeners.forEach(fn => fn());
  }
}

class FakeRadio extends FakeInput {
  constructor(value, checked, group) {
    super(value, checked);
    this.group = group;
    group.push(this);
  }
  click() {
    this.group.forEach(r => { r.checked = false; });
    this.checked = true;
    this.listeners.forEach(fn => fn());
  }
}

let ridCounter = 0;
globalThis.foundry = {
  utils: { randomID: () => `rid${++ridCounter}`, getProperty: (o, path) => path.split(".").reduce((v, k) => v?.[k], o) },
  applications: {
    handlebars: {
      renderTemplate: async (path, data) => {
        dialogState.template = data;
        return "<div></div>";
      }
    },
    api: {
      DialogV2: {
        wait: async config => {
          const data = dialogState.template;
          const inputs = data.candidates.map(c => new FakeInput(c.id, c.checked));
          const group = [];
          const radios = data.askOpportunityAttack
            ? [new FakeRadio("no", true, group), new FakeRadio("yes", false, group)]
            : [];
          const limitLine = { textContent: data.limitText };
          const list = {
            locked: false,
            classList: { toggle: (name, on) => { list.locked = on; } }
          };
          const element = {
            querySelector: selector => {
              if (selector === ".minion-bang-limit") return limitLine;
              if (selector === ".minion-bang-candidates") return list;
              return null;
            },
            querySelectorAll: selector => (selector.includes("opportunity") ? radios : inputs)
          };
          dialogState.ringsAtOpen = canvasTokens.map(t => t.rings.filter(g => !g.destroyed).map(g => g.alpha));
          config.render(null, { element });
          dialogState.limitLine = limitLine;
          dialogState.list = list;
          dialogState.inputs = inputs;
          const press = async button => (await button.callback?.(null, { form: null }, null)) ?? button.action;
          if (dialogState.closeWithX) return null;
          if (dialogState.cancel) return press(config.buttons.find(b => b.action === "cancel"));
          if (dialogState.forced) return { selectedIds: dialogState.forced, opportunityAttack: false };
          for (const step of dialogState.script ?? []) {
            if (typeof step === "number") inputs[step].click();
            else radios.find(r => r.value === step).click();
          }
          dialogState.ringsAfterScript = Object.fromEntries(canvasTokens.map(t => [t.id, t.rings.filter(g => !g.destroyed).map(g => g.alpha)]));
          const form = {
            querySelectorAll: selector => (selector.includes(":checked") ? inputs.filter(i => i.checked) : inputs),
            querySelector: selector => (selector.includes("opportunity") ? radios.find(r => r.checked) ?? null : null)
          };
          return press({ ...config.buttons[0], callback: () => config.buttons[0].callback(null, { form }, null) });
        }
      }
    }
  }
};

const { registerDamageCapture } = await import("../scripts/adapters/damage-capture.js");
const { applyMinionDamage } = await import("../scripts/adapters/damage-context.js");
const { registerMinionDeathWatch } = await import("../scripts/adapters/minion-kill-hook.js");
registerMinionDeathWatch();
const logModule = await import("../scripts/log.js");
const { MIDI_GRACE_MS } = await import("../scripts/adapters/overkill-undo.js");

registerDamageCapture();

function makeToken(id, name, gx, gy, { type = "npc", minion = true } = {}) {
  const actor = {
    id: `A${id}`,
    name,
    type,
    uuid: `Actor.${id}`,
    flags: minion ? { "mcdm-flee-mortals-where-evil-lives": { role: "minion" } } : {},
    _stats: { compendiumSource: "Compendium.test.goblin-lackey" },
    system: { attributes: { hp: { value: 6, max: 6 } } },
    statuses: new Set(),
    updates: [],
    moduleFlags: {},
    statusCalls: [],
    async setFlag(scope, key, value) { if (scope === "minion-bang") this.moduleFlags[key] = JSON.parse(JSON.stringify(value)); },
    async unsetFlag(scope, key) { if (scope === "minion-bang") delete this.moduleFlags[key]; },
    async update(data) {
      this.updates.push(data);
      if (data["system.attributes.hp.value"] > 0) { this.system.attributes.hp.value = data["system.attributes.hp.value"]; return; }
      this.system.attributes.hp.value = 0;
      if (data["flags.minion-bang.deathId"]) this.deathId = data["flags.minion-bang.deathId"];
      Hooks.call("updateActor", this, { system: { attributes: { hp: { value: 0 } } }, flags: { "minion-bang": { deathId: data["flags.minion-bang.deathId"] } } }, {});
    },
    getFlag(scope, key) {
      if (scope !== "minion-bang") return undefined;
      return key === "deathId" ? this.deathId : this.moduleFlags[key];
    },
    async toggleStatusEffect(id, { active } = {}) {
      this.statusCalls.push([id, active]);
      if (active) this.statuses.add(id); else this.statuses.delete(id);
    },
    testUserPermission: () => false
  };
  const token = {
    id,
    name,
    actor,
    center: { x: gx * 100 + 50, y: gy * 100 + 50 },
    x: gx * 100,
    y: gy * 100,
    w: 100,
    h: 100,
    rings: [],
    addChild(graphics) { this.rings.push(graphics); }
  };
  token.document = {
    uuid: `Scene.s.Token.${id}`,
    name,
    texture: { src: "icons/token.webp" },
    parent: scene,
    actor,
    combatant: null,
    object: token
  };
  registry.set(token.document.uuid, token.document);
  canvasTokens.push(token);
  return token;
}

function storedOnCard(options) {
  const midi = JSON.parse(JSON.stringify(options.midi));
  delete midi.targetUuid;
  delete midi.sourceActorUuid;
  return { midi: { ...midi, targetUuid: options.midi.targetUuid } };
}

async function runScenario({ damage, script = [], forced = null, cancel = false, closeWithX = false, autoSelect = true, tweak = null, flow = "three", other = 0, concentration = true, applyUpdates = null }) {
  midiSettings.singleDamageCalculation = flow !== "three";
  midiSettings.singleConcentrationRoll = concentration;
  canvasTokens.length = 0;
  registry.clear();
  chat.length = 0;
  notices.length = 0;
  dialogState.cancel = cancel;
  dialogState.autoSelect = autoSelect;
  dialogState.closeWithX = closeWithX;
  dialogState.template = null;
  dialogState.script = script;
  dialogState.forced = forced;

  const attacker = makeToken("att", "Akra", 0, 0, { type: "character", minion: false });
  const hit = makeToken("g0", "Goblin Lackey", 1, 0);
  const others = [
    makeToken("g1", "Goblin Lackey", 0, 1),
    makeToken("g2", "Goblin Lackey", 1, 1),
    makeToken("g3", "Goblin Lackey", -1, 0),
    makeToken("g4", "Goblin Lackey", -1, 1)
  ];

  if (tweak) tweak({ attacker, hit, others });

  const workflow = {
    itemCardUuid: "ChatMessage.card1",
    activity: { type: "attack", getActionType: () => "mwak" },
    attackMode: "oneHanded",
    item: { name: "Longsword", uuid: "Item.longsword", system: { range: { reach: 5, value: null, units: "ft" } } },
    token: attacker,
    actor: attacker.actor,
    targets: [hit]
  };
  const options = { midi: { targetUuid: hit.document.uuid, sourceActorUuid: attacker.actor.uuid } };

  Hooks.call("midi-qol.DamageRollComplete", workflow);
  if (flow === "three") {
    Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, [{ type: "slashing", value: damage }], options);
    Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, other ? [{ type: "poison", value: other }] : [], options);
    Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, [], options);
  } else {
    const all = [{ type: "slashing", value: damage }];
    if (other) all.push({ type: "poison", value: other });
    Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, all, options);
    if (flow === "render") Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, all, { midi: { targetUuid: hit.document.uuid } });
  }

  const updates = applyUpdates ? { ...applyUpdates } : {};
  minionKills.length = 0;
  applyMinionDamage(hit.actor, -6, updates, flow === "card" ? storedOnCard(options) : options);
  if (updates["system.attributes.hp.value"] === 0) {
    hit.actor.system.attributes.hp.value = 0;
    hit.actor.deathId = updates["flags.minion-bang.deathId"];
    Hooks.call("updateActor", hit.actor, { system: { attributes: { hp: { value: 0 } } }, flags: { "minion-bang": { deathId: updates["flags.minion-bang.deathId"] } } }, {});
  }
  for (let i = 0; i < 20 && !chat.length && !dialogState.template; i += 1) await new Promise(r => setTimeout(r, 10));
  await new Promise(r => setTimeout(r, 50));

  const killed = others.filter(t => t.actor.updates.length > 0).map(t => t.id);
  return { hit, options, minionKills: [...minionKills], others, updates, killed, ringsAfterScript: dialogState.ringsAfterScript, template: dialogState.template, limitLine: dialogState.limitLine, ringsAtOpen: dialogState.ringsAtOpen, list: dialogState.list, inputs: dialogState.inputs, chat: [...chat], notices: [...notices] };
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

{
  const r = await runScenario({ damage: 10, script: [3, 2, 1] });
  check("10 damage on 6 HP: the hit minion goes to 0 HP", r.updates["system.attributes.hp.value"], 0);
  check("10 damage: dialog offers 4 candidates", r.template.candidates.length, 4);
  check("10 damage: only the nearest is preselected", r.template.candidates.filter(c => c.checked).map(c => c.id), ["g1"]);
  check("10 damage: limit line states max 1", r.template.limitText.includes('"max":1'), true);
  check("10 damage: player clicks g4, g3, g2 -> only g2 is killed", r.killed, ["g2"]);
  check("10 damage: limit line ends at 1 selected", r.limitLine.textContent.includes('"selected":1'), true);
  check("10 damage: chat announces one more enemy", r.chat.length === 1 && r.chat[0].content.includes("OneMore"), true);
}

{
  const r = await runScenario({ damage: 19, script: [3] });
  check("19 damage on 6 HP: limit line states max 3", r.template.limitText.includes('"max":3'), true);
  check("19 damage: three preselected", r.template.candidates.filter(c => c.checked).map(c => c.id), ["g1", "g2", "g3"]);
  check("19 damage: checking g4 drops the oldest (g1)", r.killed, ["g2", "g3", "g4"]);
  check("19 damage: chat announces many more", r.chat.length === 1 && r.chat[0].content.includes("ManyMore"), true);
}

{
  const r = await runScenario({ damage: 10, forced: ["g4", "g3", "g2", "g1"] });
  check("10 damage, answer forged with 4 ids: the GM accepts only 1", r.killed.length, 1);
  check("10 damage, forged answer: the nearest candidate is the one accepted", r.killed, ["g1"]);
  const warned = logModule.getRecentLogs().some(l => l.level === "warn" && l.text.includes("limit is 1"));
  check("10 damage, forged answer: a warning is logged", warned, true);
}

{
  const r = await runScenario({ damage: 19, forced: ["g3", "bogus"] });
  check("19 damage, selection below the limit with an unknown id: only g3 is killed", r.killed, ["g3"]);
}

{
  const r = await runScenario({ damage: 10, script: ["yes"] });
  check("opportunity attack Yes: the list is greyed out", r.list.locked, true);
  check("opportunity attack Yes: the limit line explains why", r.limitLine.textContent, "MINIONBANG.Overkill.Locked");
  check("opportunity attack Yes: boxes are disabled and empty", r.inputs.every(i => i.disabled && !i.checked), true);
  check("opportunity attack Yes: nobody else is killed", r.killed, []);
  check("opportunity attack Yes: the hit minion still dies", r.updates["system.attributes.hp.value"], 0);
  check("opportunity attack Yes: no chat message", r.chat.length, 0);
}

{
  const r = await runScenario({ damage: 10, script: ["yes", 2, "no"] });
  check("Yes then No: list active again", r.list.locked, false);
  check("Yes then No: original proposal restored and killed", r.killed, ["g1"]);
  check("Yes then No: limit line back to the counter", r.limitLine.textContent.includes('"selected":1'), true);
}

{
  const r = await runScenario({ damage: 19, script: [3, "yes", "no", 0] });
  check("19 damage: g4 checked, Yes, No, g1 checked -> limit 3 still holds, oldest (g2) dropped", r.killed, ["g1", "g3", "g4"]);
}

{
  const r = await runScenario({
    damage: 10,
    tweak: ({ others }) => { others[0].name = "Shadow"; others[0].document.name = "Shadow"; }
  });
  check("renamed token: the dialog shows the token name", r.template.candidates.map(c => c.name)[0], "Shadow");
  check("renamed token: the actor name is not shown", r.template.candidates.some(c => c.name === "Goblin Lackey" && c.id === "g1"), false);
}

{
  const r = await runScenario({
    damage: 10,
    tweak: ({ others }) => { others[0].document.hidden = true; }
  });
  check("hidden token: not offered", r.template.candidates.map(c => c.id), ["g2", "g3", "g4"]);
  check("hidden token: the next nearest is preselected", r.template.candidates.filter(c => c.checked).map(c => c.id), ["g2"]);
}

{
  const r = await runScenario({
    damage: 10,
    tweak: ({ others }) => { others[1].actor.statuses.add("invisible"); }
  });
  check("invisible actor: not offered", r.template.candidates.map(c => c.id), ["g1", "g3", "g4"]);
}

{
  const r = await runScenario({
    damage: 10,
    tweak: ({ others }) => { others[0].actor.statuses.add("ethereal"); }
  });
  check("ethereal actor: not offered", r.template.candidates.map(c => c.id), ["g2", "g3", "g4"]);
  const logged = logModule.getRecentLogs().some(l => l.text.includes("g1 (ethereal)"));
  check("ethereal actor: the log names the status", logged, true);
}

{
  const r = await runScenario({
    damage: 10,
    tweak: ({ others }) => { others[0].actor.statuses.add("prone"); }
  });
  check("other statuses (prone) do not exclude a candidate", r.template.candidates.map(c => c.id), ["g1", "g2", "g3", "g4"]);
}

{
  const r = await runScenario({
    damage: 19,
    tweak: ({ others }) => {
      others[0].document.hidden = true;
      others[1].actor.statuses.add("invisible");
    }
  });
  check("hidden and invisible: only the visible ones remain", r.template.candidates.map(c => c.id), ["g3", "g4"]);
  check("hidden and invisible: the shortfall counts what is missing", r.template.shortfall, 1);
}

{
  const r = await runScenario({
    damage: 10,
    forced: ["g1"],
    tweak: ({ others }) => { others[0].document.hidden = true; }
  });
  check("forged answer naming a hidden minion: ignored", r.killed, []);
}

{
  const x = await runScenario({ damage: 10, closeWithX: true });
  check("X: one chat message, the plain one", x.chat.length === 1 && x.chat[0].content.includes("MINIONBANG.Chat.NoOverkill ") && x.notices.length === 1, true);
  check("X: nobody else is killed", x.killed, []);
}

{
  const r = await runScenario({ damage: 10, cancel: true });
  check("Cancel button: the hit minion still dies", r.updates["system.attributes.hp.value"], 0);
  check("Cancel button: nobody else is killed", r.killed, []);
  check("Cancel button: one public chat message naming the attacker", r.chat.length === 1 && r.chat[0].content.includes("MINIONBANG.Chat.NoOverkill ") && r.chat[0].content.includes("Akra"), true);
  check("Cancel button: one notification for the GM", r.notices.length === 1 && r.notices[0].includes("MINIONBANG.Notify.NoOverkill ") && r.notices[0].includes("Akra"), true);
  const logged = logModule.getRecentLogs().some(l => l.text.includes("Akra decided not to overkill"));
  check("Cancel button: the log says who decided", logged, true);
}

{
  const r = await runScenario({ damage: 10, script: [0] });
  check("Confirm with no minion chosen: nobody else is killed", r.killed, []);
  check("Confirm with no minion chosen: the chat says Confirm was pressed", r.chat.length === 1 && r.chat[0].content.includes("MINIONBANG.Chat.NoOverkillConfirmed"), true);
  check("Confirm with no minion chosen: the notification says so too", r.notices.length === 1 && r.notices[0].includes("MINIONBANG.Notify.NoOverkillConfirmed"), true);
}

{
  const r = await runScenario({ damage: 10, script: ["yes"] });
  check("opportunity attack Yes: no 'decided not to overkill' message", r.chat.length === 0 && r.notices.length === 0, true);
}

{
  const calls = [];
  let fight = { combatId: "c1", characters: {}, defeated: [] };
  const savedGet = game.settings.get;
  const savedSet = game.settings.set;
  const savedUtils = foundry.utils;
  game.user.isGM = true;
  foundry.utils = { ...(savedUtils ?? {}), randomID: () => "rid" };
  game.settings.get = (module, key) => {
    if (module === "combat-stats" && key === "trackerMode") return "midi-manual";
    if (module === "combat-stats" && key === "currentCombatData") return structuredClone(fight);
    return savedGet(module, key);
  };
  game.settings.set = async (module, key, value) => { if (module === "combat-stats") fight = structuredClone(value); };
  game.combatStats = { _accKill: (current, id, name, victim) => calls.push({ id, name, victim }), _resolveAttribution: actor => actor };
  const r = await runScenario({ damage: 10, script: [3, 2, 1] });
  delete game.combatStats;
  game.settings.get = savedGet;
  game.settings.set = savedSet;
  foundry.utils = savedUtils;
  game.user.isGM = true;
  check("Combat Stats counts a kill for every extra minion killed by the overkill, with the attacker as author", [r.killed.length, calls.length, [...new Set(calls.map(c => c.name))]], [r.killed.length, r.killed.length, ["Akra"]]);
  check("the extra minions join the defeated enemies", fight.defeated.length, r.killed.length);
  check("at least one extra minion was killed in that scenario", r.killed.length > 0, true);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false, script: [0] });
  const chosen = r.template.candidates[0].id;
  const others = r.template.candidates.slice(1).map(c => r.ringsAfterScript[c.id]);
  check("checking a minion makes its ring solid, the others stay faint", [r.ringsAfterScript[chosen], others.every(rings => JSON.stringify(rings) === "[0.3]")], [[0.9], true]);
}

{
  const r = await runScenario({ damage: 10, autoSelect: true, script: [0] });
  check("unchecking a proposed minion makes its ring faint", r.ringsAfterScript[r.template.candidates[0].id], [0.3]);
}

{
  const r = await runScenario({ damage: 10, tweak: ({ attacker }) => { attacker.actor.name = "Akra <b>&</b>"; } });
  check("names in the chat are escaped", r.chat[0].content.includes("Akra &lt;b&gt;&amp;&lt;/b&gt;") && !r.chat[0].content.includes("<b>&"), true);
}

{
  errorsShown.length = 0;
  const r = await runScenario({
    damage: 18,
    forced: ["g1", "g2"],
    tweak: ({ others }) => { others[0].actor.update = async () => { throw new Error("update refused"); }; }
  });
  check("one extra minion fails: the other still dies", r.killed, ["g2"]);
  check("one extra minion fails: the chat still reports the one that fell", r.chat.length === 1 && r.chat[0].content.includes("OneMore"), true);
  check("one extra minion fails: the GM is told which one", errorsShown.length === 1 && errorsShown[0].includes("MINIONBANG.Notify.OverkillFailed") && errorsShown[0].includes("Goblin Lackey"), true);
  check("one extra minion fails: the error is logged", logModule.getRecentLogs().some(l => l.level === "error" && l.text.includes("could not be downed by the overkill")), true);
}

{
  const r = await runScenario({ damage: 10 });
  check("regular overkill: only the overkill message, no 'decided not' text", r.chat.length === 1 && r.chat[0].content.includes("OneMore") && r.notices.length === 0, true);
}

{
  const r = await runScenario({ damage: 10 });
  check("preselection on: the nearest is checked and its ring is solid", r.template.candidates.map(c => c.checked), [true, false, false, false]);
  check("preselection on: rings at open (attacker, hit, g1..g4)", r.ringsAtOpen.slice(2), [[0.9], [0.3], [0.3], [0.3]]);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false });
  check("preselection off: nothing is checked", r.template.candidates.map(c => c.checked), [false, false, false, false]);
  check("preselection off: every candidate is listed, nearest first", r.template.candidates.map(c => c.id), ["g1", "g2", "g3", "g4"]);
  check("preselection off: the limit line starts at 0 selected", r.template.limitText.includes('"selected":0') && r.template.limitText.includes('"max":1'), true);
  check("preselection off: every ring is faint", r.ringsAtOpen.slice(2), [[0.3], [0.3], [0.3], [0.3]]);
  check("preselection off: Confirm without choosing says so", r.chat.length === 1 && r.chat[0].content.includes("NoOverkillConfirmed") && r.killed.length === 0, true);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false, script: [2] });
  check("preselection off: the player picks one minion and it falls", r.killed, ["g3"]);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false, script: [2, 3] });
  check("preselection off: the limit still replaces the oldest pick", r.killed, ["g4"]);
}

{
  const r = await runScenario({ damage: 19, autoSelect: false, script: [0, 1, 2, 3] });
  check("preselection off, limit 3: four picks keep the last three", r.killed, ["g2", "g3", "g4"]);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false, script: ["yes", "no", 1] });
  check("preselection off: Yes then No restores an empty selection, then a pick works", r.killed, ["g2"]);
}

{
  const r = await runScenario({ damage: 10, autoSelect: false, script: ["yes"] });
  check("preselection off with opportunity attack Yes: no message, nobody falls", r.chat.length === 0 && r.killed.length === 0, true);
}

{
  const r = await runScenario({ damage: 6 });
  check("6 damage on 6 HP: no overkill dialog", r.template, null);
}

{
  const r = await runScenario({ damage: 19, script: [] });
  const k = r.minionKills;
  check("contract 2: hit minion and 3 by overkill make 4 events", k.length, 4);
  check("contract 2: the hit minion is direct, the others overkill", k.map(e => [e.victim.tokenUuid, e.cause]), [["Scene.s.Token.g0", "direct"], ["Scene.s.Token.g1", "overkill"], ["Scene.s.Token.g2", "overkill"], ["Scene.s.Token.g3", "overkill"]]);
  check("contract 2: four different event ids", new Set(k.map(e => e.eventId)).size, 4);
  check("contract 2: each event id is the death id saved on the minion", k.slice(1).map(e => e.eventId), r.others.slice(0, 3).map(t => t.actor.deathId));
  check("contract 1-2: same attacker on every event", k.map(e => e.attacker), Array(4).fill({ actorId: "Aatt", actorUuid: "Actor.att", tokenUuid: "Scene.s.Token.att", name: "Akra" }));
  check("contract: workflowId is the chat card of the attack, the same for all", k.map(e => e.workflowId), Array(4).fill("ChatMessage.card1"));
  check("contract: itemUuid of the weapon", k[0]?.itemUuid, "Item.longsword");
  check("contract 9: out of combat, no combat data", [k[0]?.combatId, k[0]?.round, k[0]?.turn], [null, null, null]);
  check("contract: schema version 1 and the scene", [k[0]?.schemaVersion, k[0]?.sceneId], [1, "scene1"]);
}
{
  const r = await runScenario({ damage: 6 });
  check("contract 1: a minion killed with no overkill makes one direct event", r.minionKills.map(e => [e.cause, e.attacker?.name]), [["direct", "Akra"]]);
}
{
  const r = await runScenario({ damage: 10, script: ["yes"] });
  check("contract 5: opportunity attack, only the hit minion", r.minionKills.map(e => e.cause), ["direct"]);
  const c = await runScenario({ damage: 10, cancel: true });
  check("contract 5: overkill cancelled, only the hit minion", c.minionKills.map(e => e.cause), ["direct"]);
}
{
  const r = await runScenario({ damage: 18, forced: ["g1", "g2"], tweak: ({ others }) => { others[0].actor.update = async () => { throw new Error("update refused"); }; } });
  check("contract 5: failed hit point update, no event for that minion", r.minionKills.map(e => e.victim.tokenUuid), ["Scene.s.Token.g0", "Scene.s.Token.g2"]);
}
{
  const r = await runScenario({ damage: 10, tweak: ({ hit }) => { hit.actor.system.attributes.hp.value = 0; } });
  check("contract: a minion already at 0 hit points makes no direct event", r.minionKills.filter(e => e.victim.tokenUuid === "Scene.s.Token.g0").length, 0);
}
{
  const r = await runScenario({ damage: 10, script: [], tweak: ({ others }) => { others[0].actor.system.details = { cr: 0.125 }; } });
  check("contract 8: CR 1/8 is kept, with 5 minions per standard creature", [r.minionKills[1]?.victim.cr, r.minionKills[1]?.victim.minionsPerStandard], [0.125, 5]);
  check("contract 8: unknown CR stays null", [r.minionKills[0]?.victim.cr, r.minionKills[0]?.victim.minionsPerStandard], [null, null]);
}

{
  const r = await runScenario({ damage: 19, script: [], flow: "single" });
  check("1.6.1 single damage calculation: the hit minion dies", r.updates["system.attributes.hp.value"], 0);
  check("1.6.1 single damage calculation: 19 damage allows 3 more", r.template.limitText.includes('"max":3'), true);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "render" });
  check("1.6.1 single damage calculation, Midi recalculates for the damage card: still 3 more, not 6", r.template.limitText.includes('"max":3'), true);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  check("1.6.1 damage applied from the damage card: the hit minion dies", r.updates["system.attributes.hp.value"], 0);
  check("1.6.1 damage applied from the damage card: the overkill dialog opens with 3 more", r.template?.limitText.includes('"max":3'), true);
  check("1.6.1 damage applied from the damage card: three more minions fall", r.killed, ["g1", "g2", "g3"]);
  check("1.6.1 damage applied from the damage card: the kill has its attacker", r.minionKills[0]?.attacker?.name, "Akra");
}
{
  const r = await runScenario({ damage: 3, flow: "card" });
  check("1.6.1 a 3-damage hit applied from the damage card still drops the minion", r.updates["system.attributes.hp.value"], 0);
}
{
  const r = await runScenario({ damage: 13, other: 6, script: [], concentration: false });
  check("1.6.1 other damage always counts: 13 + 6 allows 3 more", r.template.limitText.includes('"max":3'), true);
}
{
  const r = await runScenario({ damage: 19, flow: "card", applyUpdates: { "system.attributes.hp.value": 6 }, tweak: ({ hit }) => { hit.actor.system.attributes.hp.value = 0; } });
  check("1.6.1 undo from the damage card: the hit points go back up", r.updates["system.attributes.hp.value"], 6);
  check("1.6.1 undo from the damage card: no overkill", r.template, null);
}
{
  const r = await runScenario({ damage: 19, flow: "card", tweak: ({ hit }) => { hit.actor.system.attributes.hp.value = 0; } });
  check("1.6.1 a minion already at 0 hit again: no overkill", r.template, null);
  check("1.6.1 a minion already at 0 hit again: nobody else falls", r.killed, []);
}

async function undoFromCard(r, { attackId = "ChatMessage.card1", withData = true, wait = MIDI_GRACE_MS + 100 } = {}) {
  chat.length = 0;
  const stored = storedOnCard(r.options);
  if (!withData) delete stored.midi.minionBang;
  if (stored.midi.minionBang) stored.midi.minionBang.attack = { ...stored.midi.minionBang.attack, attackId };
  const updates = { "system.attributes.hp.value": 6 };
  applyMinionDamage(r.hit.actor, -6, updates, stored);
  r.hit.actor.system.attributes.hp.value = 6;
  await new Promise(res => setTimeout(res, wait));
  return { updates, chat: [...chat] };
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  check("1.6.1 overkill remembered on the hit minion", r.hit.actor.moduleFlags.overkill?.victims.map(v => v.tokenUuid), ["Scene.s.Token.g1", "Scene.s.Token.g2", "Scene.s.Token.g3"]);
  r.hit.actor.statuses.add("dead");
  r.others.slice(0, 3).forEach(t => t.actor.statuses.add("dead"));
  const u = await undoFromCard(r);
  check("1.6.1 undo: the hit minion's hit points go back up", u.updates["system.attributes.hp.value"], 6);
  check("1.6.1 undo: the overkill victims stand up again", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [6, 6, 6]);
  check("1.6.1 undo: the minion not touched by the overkill stays as it was", r.others[3].actor.updates.length, 0);
  check("1.6.1 undo: Dead removed from the victims", r.others.slice(0, 3).map(t => t.actor.statuses.has("dead")), [false, false, false]);
  check("1.6.1 undo: Dead removed from the hit minion", r.hit.actor.statuses.has("dead"), false);
  check("1.6.1 undo: one message, whispered to the GM", u.chat.length === 1 && u.chat[0].content.includes("OverkillUndone") && JSON.stringify(u.chat[0].whisper) === JSON.stringify(["gm"]), true);
  check("1.6.1 undo: the message counts 3 minions", u.chat[0]?.content.includes('"count":3'), true);
  check("1.6.1 undo: the memory is cleared", r.hit.actor.moduleFlags.overkill, undefined);
  r.hit.actor.system.attributes.hp.value = 0;
  r.others.slice(0, 3).forEach(t => { t.actor.system.attributes.hp.value = 0; });
  const again = await undoFromCard(r);
  check("1.6.1 a second undo raises nobody", again.chat.length, 0);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  const u = await undoFromCard(r, { attackId: "ChatMessage.healing" });
  check("1.6.1 healing from another item raises only the minion it heals", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [0, 0, 0]);
  check("1.6.1 healing from another item: no message", u.chat.length, 0);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.others[1].actor.deathId = "killed-later";
  await undoFromCard(r);
  check("1.6.1 undo: a victim killed again since the overkill stays down", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [6, 0, 6]);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.hit.actor.system.attributes.hp.value = 3;
  await undoFromCard(r);
  check("1.6.1 hit points raised on a minion still standing: the overkill victims stay down", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [0, 0, 0]);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  await undoFromCard(r, { withData: false });
  check("1.6.1 hit points raised by hand: the overkill victims stay down", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [0, 0, 0]);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.others.slice(0, 3).forEach(t => {
    t.actor.statuses.add("dead");
    t.actor.toggleStatusEffect = async function () { this.statuses.delete("dead"); throw new Error('ActiveEffect "dnd5edead0000000" does not exist!'); };
  });
  const u = await undoFromCard(r);
  check("1.6.1 undo while Midi-QOL removes Dead first: the victims stand up", r.others.slice(0, 3).map(t => t.actor.system.attributes.hp.value), [6, 6, 6]);
  check("1.6.1 undo while Midi-QOL removes Dead first: the message counts 3 minions", u.chat.length === 1 && u.chat[0].content.includes('"count":3'), true);
  check("1.6.1 undo while Midi-QOL removes Dead first: no warning", logModule.getRecentLogs().some(l => l.level === "warn" && l.text.includes("could not stand up")), false);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.others.slice(0, 3).forEach(t => {
    t.actor.statuses.add("dead");
    let calls = 0;
    t.actor.toggleStatusEffect = async function () { calls += 1; if (calls === 1) throw new Error("busy"); this.statuses.delete("dead"); };
  });
  await undoFromCard(r);
  await new Promise(res => setTimeout(res, 900));
  check("1.6.1 undo: a first failed attempt to remove Dead is retried", r.others.slice(0, 3).map(t => t.actor.statuses.has("dead")), [false, false, false]);
}

{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  const midiLike = actor => {
    actor.statuses.add("dead");
    const update = actor.update.bind(actor);
    actor.update = async data => { await update(data); if (data["system.attributes.hp.value"] > 0) actor.statuses.delete("dead"); };
  };
  midiLike(r.hit.actor);
  r.others.slice(0, 3).forEach(t => midiLike(t.actor));
  const u = await undoFromCard(r, { wait: 60 });
  check("1.6.1 undo with Midi-QOL handling Dead: the message arrives without waiting", u.chat.length === 1 && u.chat[0].content.includes('"count":3'), true);
  await new Promise(res => setTimeout(res, MIDI_GRACE_MS + 100));
  check("1.6.1 undo with Midi-QOL handling Dead: Minion! never touches Dead on the victims", r.others.slice(0, 3).map(t => t.actor.statusCalls.length), [0, 0, 0]);
  check("1.6.1 undo with Midi-QOL handling Dead: the victims end up without Dead", r.others.slice(0, 3).map(t => t.actor.statuses.has("dead")), [false, false, false]);
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.hit.actor.statuses.add("dead");
  r.others.slice(0, 3).forEach(t => t.actor.statuses.add("dead"));
  await undoFromCard(r, { wait: 60 });
  check("1.6.1 undo with Midi-QOL handling Dead: Minion! waits before removing it", r.others.slice(0, 3).map(t => t.actor.statusCalls.length), [0, 0, 0]);
  await new Promise(res => setTimeout(res, MIDI_GRACE_MS + 100));
  check("1.6.1 undo, Midi-QOL leaves Dead behind: Minion! removes it after the wait", [r.hit.actor.statuses.has("dead"), ...r.others.slice(0, 3).map(t => t.actor.statuses.has("dead"))], [false, false, false, false]);
}
{
  midiSettings.addDead = "none";
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.hit.actor.statuses.add("dead");
  r.others.slice(0, 3).forEach(t => t.actor.statuses.add("dead"));
  await undoFromCard(r, { wait: 60 });
  check("1.6.1 undo without Midi-QOL handling Dead: Minion! removes it at once", [r.hit.actor.statuses.has("dead"), ...r.others.slice(0, 3).map(t => t.actor.statuses.has("dead"))], [false, false, false, false]);
  midiSettings.addDead = "overlay";
}
{
  const r = await runScenario({ damage: 19, script: [], flow: "card" });
  r.hit.actor.statuses.add("dead");
  await undoFromCard(r, { attackId: "ChatMessage.healing", wait: 60 });
  check("1.6.1 healing from another item with Midi-QOL handling Dead: Minion! waits on the healed minion too", r.hit.actor.statusCalls.length, 0);
  await new Promise(res => setTimeout(res, MIDI_GRACE_MS + 100));
  check("1.6.1 healing from another item: Dead is gone from the healed minion after the wait", r.hit.actor.statuses.has("dead"), false);
}

console.log(failures === 0 ? "\nAll GM flow checks passed.\n" : `\n${failures} GM flow check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
