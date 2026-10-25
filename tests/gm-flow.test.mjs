const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  },
  call(name, ...args) {
    for (const fn of handlers.get(name) ?? []) fn(...args);
  }
};

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
globalThis.ChatMessage = { create: async data => { chat.push(data); } };

const scene = { grid: { units: "ft", distance: 5, size: 100 } };
const canvasTokens = [];
globalThis.canvas = {
  scene,
  grid: scene.grid,
  tokens: { get placeables() { return canvasTokens; }, get: id => canvasTokens.find(t => t.id === id) }
};

globalThis.MidiQOL = {
  configSettings: () => ({ singleConcentrationRoll: true, addDead: "overlay", markNonPlayerDefeated: true }),
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
  user: { id: "gm" },
  users: { players: [] },
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

globalThis.foundry = {
  utils: { randomID: () => "rid" },
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
const logModule = await import("../scripts/log.js");

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
    async update(data) {
      this.updates.push(data);
      this.system.attributes.hp.value = 0;
    },
    async toggleStatusEffect() {},
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

async function runScenario({ damage, script = [], forced = null, cancel = false, closeWithX = false, autoSelect = true, tweak = null }) {
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
    activity: { type: "attack", getActionType: () => "mwak" },
    attackMode: "oneHanded",
    item: { name: "Longsword", system: { range: { reach: 5, value: null, units: "ft" } } },
    token: attacker,
    actor: attacker.actor,
    targets: [hit]
  };
  const options = { midi: { targetUuid: hit.document.uuid, sourceActorUuid: attacker.actor.uuid } };

  Hooks.call("midi-qol.DamageRollComplete", workflow);
  Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, [{ type: "slashing", value: damage }], options);
  Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, [], options);
  Hooks.call("midi-qol.dnd5eCalculateDamage", hit.actor, [], options);

  const updates = {};
  applyMinionDamage(hit.actor, -6, updates, options);
  for (let i = 0; i < 20 && !chat.length && !dialogState.template; i += 1) await new Promise(r => setTimeout(r, 10));
  await new Promise(r => setTimeout(r, 50));

  const killed = others.filter(t => t.actor.updates.length > 0).map(t => t.id);
  return { updates, killed, ringsAfterScript: dialogState.ringsAfterScript, template: dialogState.template, limitLine: dialogState.limitLine, ringsAtOpen: dialogState.ringsAtOpen, list: dialogState.list, inputs: dialogState.inputs, chat: [...chat], notices: [...notices] };
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
  const savedSettings = game.settings.get;
  game.user.isGM = true;
  game.settings.get = (module, key) => (module === "combat-stats" && key === "trackerMode" ? "midi-manual" : savedSettings(module, key));
  game.combatStats = { _processMidiRoll: data => calls.push(data), _processMidiAutoRoll() {}, _resolveAttribution: actor => actor };
  const r = await runScenario({ damage: 10, script: [3, 2, 1] });
  delete game.combatStats;
  game.settings.get = savedSettings;
  delete game.user.isGM;
  check("Combat Stats is told about every extra minion killed by the overkill, with the attacker as author", [r.killed.length, calls.length, [...new Set(calls.map(c => c.attacker.name))]], [r.killed.length, r.killed.length, ["Akra"]]);
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

console.log(failures === 0 ? "\nAll GM flow checks passed.\n" : `\n${failures} GM flow check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
