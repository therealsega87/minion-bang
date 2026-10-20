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
  constructor() { this.destroyed = false; }
  lineStyle() {}
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
globalThis.ui = { notifications: { warn() {}, info() {} } };
globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead" } };

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

const dialogState = { template: null, script: null, forced: null, result: null };

globalThis.game = {
  modules: { get: () => ({ active: true }) },
  settings: { get: () => false },
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
          config.render(null, { element });
          dialogState.limitLine = limitLine;
          dialogState.list = list;
          dialogState.inputs = inputs;
          if (dialogState.forced) return { selectedIds: dialogState.forced, opportunityAttack: false };
          for (const step of dialogState.script ?? []) {
            if (typeof step === "number") inputs[step].click();
            else radios.find(r => r.value === step).click();
          }
          const form = {
            querySelectorAll: selector => (selector.includes(":checked") ? inputs.filter(i => i.checked) : inputs),
            querySelector: selector => (selector.includes("opportunity") ? radios.find(r => r.checked) ?? null : null)
          };
          return config.buttons[0].callback(null, { button: { form }, form });
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
    addChild() {}
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

async function runScenario({ damage, script = [], forced = null }) {
  canvasTokens.length = 0;
  registry.clear();
  chat.length = 0;
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
  return { updates, killed, template: dialogState.template, limitLine: dialogState.limitLine, list: dialogState.list, inputs: dialogState.inputs, chat: [...chat] };
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
  const r = await runScenario({ damage: 6 });
  check("6 damage on 6 HP: no overkill dialog", r.template, null);
}

console.log(failures === 0 ? "\nAll GM flow checks passed.\n" : `\n${failures} GM flow check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
