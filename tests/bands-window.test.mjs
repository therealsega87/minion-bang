import { readFileSync } from "node:fs";
import { FakeElement } from "./helpers/fake-dom.mjs";

globalThis.document = { createElement: tag => new FakeElement({ tag }) };

const settings = { groupsEnabled: true, maximumsTable: "" };
const notices = { info: [], warn: [], error: [] };
const rendered = [];
let confirmAnswer = true;
const questions = [];
const closed = [];

const combatants = [];
const groups = [];
class TokenList extends Array {
  get(id) { return this.find(t => t.id === id); }
}
const tokenList = new TokenList();
const combatCalls = [];
const answers = [];
const fakeCombat = {
  combatants,
  groups,
  async createEmbeddedDocuments(type, data) {
    combatCalls.push([type, data]);
    return data.map((d, i) => ({ id: `${type}${combatCalls.length}-${i}`, ...d }));
  }
};
const selected = [];

globalThis.game = {
  settings: { get: (module, key) => settings[key] },
  modules: { get: () => ({ active: false }) },
  i18n: {
    localize: key => key,
    format: (key, data) => `${key}|${Object.entries(data).map(([k, v]) => `${k}=${v}`).join(",")}`
  },
  user: { isGM: true },
  get combat() { return fakeCombat; }
};
globalThis.ui = { notifications: { info: t => notices.info.push(t), warn: t => notices.warn.push(t), error: t => notices.error.push(t) } };
const drawn = [];
class FakeGraphics {
  constructor() { this.destroyed = false; this.style = null; }
  lineStyle(width, color, alpha) { this.style = { width, color, alpha }; }
  drawCircle() {}
  destroy() { this.destroyed = true; }
}
globalThis.PIXI = { Graphics: FakeGraphics };
const mapTokens = new Map();
const hookList = [];
let hookCounter = 0;
globalThis.Hooks = { on: (name, fn) => { hookCounter += 1; hookList.push({ id: hookCounter, name, fn }); return hookCounter; }, off: (name, id) => { const i = hookList.findIndex(h => h.id === id); if (i >= 0) hookList.splice(i, 1); } };
globalThis.getDocumentClass = () => ({ create: async data => ({ data }) });
globalThis.canvas = { scene: { tokens: tokenList }, tokens: { controlled: selected, get: id => mapTokens.get(id) } };

function buildRoot(context) {
  const root = new FakeElement({ tag: "root" });
  for (const type of context.types) {
    root.append(new FakeElement({ tag: "button", dataset: { tab: String(type.index), action: "tab" }, className: type.active ? "active" : "" }));
    const panel = new FakeElement({ dataset: { panel: String(type.index) } });
    panel.hidden = !type.active;
    root.append(panel);
    for (const band of type.bands) {
      const input = new FakeElement({ tag: "input", dataset: { bandName: "", type: String(band.typeIndex), band: String(band.index) } });
      input.value = band.name;
      root.append(input);
      root.append(new FakeElement({ dataset: { count: "", type: String(band.typeIndex), band: String(band.index) } }));
      const color = new FakeElement({ tag: "input", dataset: { bandColor: "", type: String(band.typeIndex), band: String(band.index) } });
      color.value = band.color;
      root.append(color);
      const modeSelect = new FakeElement({ tag: "select", dataset: { bandMode: "", type: String(band.typeIndex), band: String(band.index) } });
      modeSelect.value = band.modeOptions.find(o => o.selected).value;
      root.append(modeSelect);
      const captainSelect = new FakeElement({ tag: "select", dataset: { bandCaptain: "", type: String(band.typeIndex), band: String(band.index) } });
      captainSelect.value = band.captainOptions.find(o => o.selected)?.value ?? "";
      captainSelect.disabled = band.captainDisabled;
      root.append(captainSelect);
    }
    for (const row of type.rows) {
      root.append(new FakeElement({ dataset: { memberRow: "", type: String(type.index), member: row.id } }));
      for (const cell of row.cells) {
        const radio = new FakeElement({ tag: "input", dataset: { assign: "", type: String(cell.typeIndex), member: cell.memberId } });
        radio.value = cell.value;
        radio.checked = cell.checked;
        root.append(radio);
      }
    }
    root.append(new FakeElement({ dataset: { status: String(type.index) } }));
  }
  if (context.existing) {
    root.append(new FakeElement({ tag: "button", dataset: { tab: String(context.existing.index), action: "tab" }, className: context.existing.active ? "active" : "" }));
    const panel = new FakeElement({ dataset: { panel: String(context.existing.index) } });
    panel.hidden = !context.existing.active;
    root.append(panel);
    for (const group of context.existing.groups) {
      root.append(new FakeElement({ dataset: { existingRow: group.id } }));
      const lock = new FakeElement({ tag: "i", dataset: { existingLock: "", group: group.id } });
      lock.hidden = !group.rolled;
      root.append(lock);
      const color = new FakeElement({ tag: "input", dataset: { existingColor: "", group: group.id } });
      color.value = group.color;
      root.append(color);
      const mode = new FakeElement({ tag: "select", dataset: { existingMode: "", group: group.id } });
      mode.value = group.modeOptions.find(o => o.selected)?.value ?? "";
      mode.disabled = group.rolled;
      root.append(mode);
      const captain = new FakeElement({ tag: "select", dataset: { existingCaptain: "", group: group.id } });
      captain.value = group.captainOptions.find(o => o.selected)?.value ?? "";
      captain.disabled = group.captainDisabled;
      root.append(captain);
    }
  }
  root.append(new FakeElement({ dataset: { globalStatus: "" } }));
  root.append(new FakeElement({ tag: "button", dataset: { apply: "", action: "apply" } }));
  return root;
}

class FakeApplication {
  constructor(options = {}) { this.options = options; this.rendered = false; }
  async render() {
    this.context = await this._prepareContext();
    this.element = buildRoot(this.context);
    this.rendered = true;
    rendered.push(this);
    this._onRender();
    return this;
  }
  async close() { closed.push(this); this.rendered = false; this._onClose?.({}); }
}

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: FakeApplication,
      HandlebarsApplicationMixin: Base => class extends Base {},
      DialogV2: { confirm: async config => { questions.push(config); return answers.length > 0 ? answers.shift() : confirmAnswer; } }
    }
  }
};

const win = await import("../scripts/ui/bands-window.js");
const { createTypeModel } = await import("../scripts/engine/band-window-model.js");
const { getRecentLogs } = await import("../scripts/log.js");

let counter = 0;
function token(name, { minion = true, cr = 0.25, source = "Compendium.x.goblin" } = {}) {
  counter += 1;
  return {
    id: `T${counter}`,
    actorId: `A${counter}`,
    hidden: false,
    name: `${name} ${counter}`,
    texture: { src: "tok.png" },
    actor: { name, flags: minion ? { dnd5e: { minionBangMinion: true } } : {}, system: { details: { cr } }, _stats: { compendiumSource: source } }
  };
}
const addTokens = (count, opts) => { const list = Array.from({ length: count }, () => token(opts?.name ?? "Goblin", opts)); tokenList.push(...list); return list; };

function reset() {
  combatCalls.length = 0;
  answers.length = 0;
  hookList.length = 0;
  mapTokens.clear();
  tokenList.length = 0;
  selected.length = 0;
  combatants.length = 0;
  groups.length = 0;
  notices.info.length = 0;
  notices.warn.length = 0;
  notices.error.length = 0;
  rendered.length = 0;
  closed.length = 0;
  questions.length = 0;
  confirmAnswer = true;
  settings.groupsEnabled = true;
  settings.maximumsTable = "";
  game.user.isGM = true;
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

const members = count => Array.from({ length: count }, (_, i) => ({ id: `m${i + 1}`, name: `Goblin ${i + 1}`, img: "x.png" }));
const type = (count, extra = {}) => ({ key: "gob", name: "Goblin Lackey", cr: 0.25, maximum: 5, members: members(count), ...extra });

{
  const models = win.buildModels([type(9), type(7, { key: "gob2", name: "Goblin Lackey" }), type(3, { key: "orc", name: "Orc", cr: 5, maximum: 8 })], ["Goblin Lackey 1"]);
  check("names continue across types with the same name and the existing groups", models.map(m => m.names), [["Goblin Lackey 2", "Goblin Lackey 3"], ["Goblin Lackey 4", "Goblin Lackey 5"], ["Orc 1"]]);
}

{
  reset();
  const [model] = win.buildModels([type(9)]);
  const context = win.buildContext([model], 0);
  const t = context.types[0];
  check("the context has the labels", Object.keys(context.labels).sort(), ["apply", "bandName", "captain", "close", "color", "existingTab", "member", "mode", "single"]);
  check("the context has one tab per type, the first one active", [context.types.length, t.active], [1, true]);
  check("the header shows count, CR as a fraction and maximum", t.header, "MINIONBANG.Bands.Header|count=9,cr=1/4,maximum=5");
  check("the plan shows the sizes", t.plan, "MINIONBANG.Bands.Plan|sizes=5 + 4");
  check("the grid has a column for each band and one for the creatures alone", t.columns, 3);
  check("there is a band entry with name and counters for every band", t.bands.map(b => [b.name, b.actual, b.expected]), [["Goblin Lackey 1", 5, 5], ["Goblin Lackey 2", 4, 4]]);
  check("every creature has a cell for each band and one for alone", t.rows.map(r => r.cells.length), Array(9).fill(3));
  check("the first creature is checked in band 1, the sixth in band 2", [t.rows[0].cells.map(c => c.checked), t.rows[5].cells.map(c => c.checked)], [[true, false, false], [false, true, false]]);
  check("the radio buttons of a creature share the same name", new Set(t.rows[0].cells.map(c => c.radio)).size, 1);
  check("the radio names differ between creatures and types", new Set([...t.rows.map(r => r.cells[0].radio)]).size, 9);
  check("the value of the cell alone is 'single'", t.rows[0].cells[2].value, "single");
}

{
  const [model] = win.buildModels([type(6)]);
  const t = win.buildContext([model], 0).types[0];
  check("a creature left over is mentioned in the plan", t.plan, "MINIONBANG.Bands.Plan|sizes=5 MINIONBANG.Bands.PlanSingles|count=1");
  check("the last creature is checked in alone", t.rows[5].cells.map(c => c.checked), [false, true]);
}

{
  const [model] = win.buildModels([type(1)]);
  const t = win.buildContext([model], 0).types[0];
  check("a single creature: no band and a plan that says so", [t.bands.length, t.plan, t.columns], [0, "MINIONBANG.Bands.PlanNone", 1]);
  check("a single creature is checked in alone", t.rows[0].cells.map(c => c.checked), [true]);
}

{
  const models = win.buildModels([type(9), type(4, { key: "orc", name: "Orc" })]);
  const context = win.buildContext(models, 1);
  check("the active tab follows the argument", context.types.map(t => t.active), [false, true]);
}

{
  const [model] = win.buildModels([type(9)]);
  check("status of a valid model", win.statusText(model), { ok: true, text: "MINIONBANG.Bands.Ok" });
}

{
  reset();
  const models = win.buildModels([type(9), type(4, { key: "orc", name: "Orc" })]);
  const root = buildRoot(win.buildContext(models, 0));
  const state = { models, activeTab: 0 };
  win.wireWindow(root, state);
  const apply = root.querySelector("[data-apply]");
  check("a valid proposal: apply enabled and no global message", [apply.disabled, root.querySelector("[data-global-status]").textContent], [false, ""]);
  check("the counters show the proposal", root.querySelectorAll("[data-count]").map(s => s.textContent), ["5 / 5", "4 / 4", "4 / 4"]);
  check("the status line shows everything in order", root.querySelector('[data-status="0"]').textContent, "MINIONBANG.Bands.Ok");

  const radio = root.querySelectorAll("[data-assign]").find(r => r.dataset.member === "m1" && r.value === "1");
  radio.checked = true;
  radio.fire("change");
  check("moving a creature updates the counters", root.querySelectorAll("[data-count]").slice(0, 2).map(s => s.textContent), ["4 / 5", "5 / 4"]);
  check("the counters out of order are marked", root.querySelectorAll("[data-count]").slice(0, 2).map(s => s.classList.contains("minion-bang-bad")), [true, true]);
  check("the status line explains what is wrong", root.querySelector('[data-status="0"]').textContent, "MINIONBANG.Bands.Error.Count|band=1,expected=5,actual=4 MINIONBANG.Bands.Error.Count|band=2,expected=4,actual=5");
  check("apply is disabled and a global message appears", [apply.disabled, root.querySelector("[data-global-status]").textContent], [true, "MINIONBANG.Bands.FixErrors"]);
  check("the tab of the wrong type is marked and the other is not", root.querySelectorAll("[data-tab]").map(t => t.classList.contains("minion-bang-bad")), [true, false]);
  check("the other type is not touched", root.querySelector('[data-status="1"]').textContent, "MINIONBANG.Bands.Ok");
  check("the model of the first type changed, the second did not", [state.models[0].assignment.m1, state.models[1].assignment.m1], [1, 0]);

  const swap = root.querySelectorAll("[data-assign]").find(r => r.dataset.member === "m9" && r.value === "0" && r.dataset.type === "0");
  swap.fire("change");
  check("the swap restores the sizes and enables apply", [apply.disabled, root.querySelector('[data-status="0"]').textContent, root.querySelector("[data-global-status]").textContent], [false, "MINIONBANG.Bands.Ok", ""]);
  check("the marks disappear after the swap", root.querySelectorAll("[data-count]").map(s => s.classList.contains("minion-bang-bad")), [false, false, false]);

  const lone = root.querySelectorAll("[data-assign]").find(r => r.dataset.member === "m2" && r.value === "single" && r.dataset.type === "0");
  lone.fire("change");
  check("sending a creature alone is stored as alone", state.models[0].assignment.m2, null);
  check("sending a creature alone breaks the band count", apply.disabled, true);

  const nameInput = root.querySelectorAll("[data-band-name]")[0];
  nameInput.value = "  ";
  nameInput.fire("input");
  check("an empty name is reported and marked", [root.querySelector('[data-status="0"]').textContent.includes("Error.Name|band=1"), nameInput.classList.contains("minion-bang-bad")], [true, true]);
  nameInput.value = "Archers";
  nameInput.fire("input");
  check("a new name is stored", state.models[0].names[0], "Archers");
  check("the empty-name mark is removed", nameInput.classList.contains("minion-bang-bad"), false);
}

{
  reset();
  const models = win.buildModels([type(9), type(4, { key: "orc", name: "Orc" })]);
  const root = buildRoot(win.buildContext(models, 0));
  win.wireWindow(root, { models, activeTab: 0 });
  win.showTab(root, 1);
  check("showing a tab hides the other panels", root.querySelectorAll("[data-panel]").map(p => p.hidden), [true, false]);
  check("showing a tab marks its button", root.querySelectorAll("[data-tab]").map(t => t.classList.contains("active")), [false, true]);
  win.showTab(root, 0);
  check("showing the first tab again", root.querySelectorAll("[data-panel]").map(p => p.hidden), [false, true]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  const applyButton = () => app.element.querySelector("[data-apply]");
  const action = app.constructor.DEFAULT_OPTIONS.actions.apply;
  check("a single type: apply enabled and the window watches the world", [applyButton().disabled, hookList.length], [false, 7]);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("a single type: applied at once, without confirmation", [questions.length, combatCalls.map(c => c[0]), combatCalls[1][1].length], [0, ["CombatantGroup", "Combatant"], 7]);
  check("the success message says groups and creatures alone", notices.info, ["MINIONBANG.Bands.Applied|groups=2,singles=0"]);
  check("the window closes after applying and stops watching", [closed.length, hookList.length], [1, 0]);
}

{
  reset();
  addTokens(7);
  addTokens(4, { name: "Orc", source: "Compendium.x.orc", cr: 1 });
  await win.openBandsWindow();
  const app = rendered[0];
  const action = app.constructor.DEFAULT_OPTIONS.actions.apply;
  answers.push(false);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("more types: the confirmation is asked even with everything in order", [questions.length, combatCalls.length], [1, 0]);
  check("the confirmation lists every type and asks to check the bands", [questions[0].content.includes("MINIONBANG.Bands.Confirm.Line|name=Goblin,bands=2,singles=0,total=7"), questions[0].content.includes("name=Orc,bands=1,singles=0,total=4"), questions[0].content.includes("Confirm.Content|count=2")], [true, true, true]);
  check("answering no changes nothing and keeps the window open", [closed.length, notices.info.length, notices.error.length], [0, 0, 0]);
  answers.push(null);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("closing the confirmation changes nothing", [questions.length, combatCalls.length, closed.length], [2, 0, 0]);
  answers.push(true);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("answering yes applies all the types together", [combatCalls.map(c => c[0]), combatCalls[0][1].length, combatCalls[1][1].length, closed.length], [["CombatantGroup", "Combatant"], 3, 11, 1]);
}

{
  reset();
  addTokens(9);
  addTokens(4, { name: "Orc", source: "Compendium.x.orc", cr: 1 });
  await win.openBandsWindow();
  const app = rendered[0];
  const radio = app.element.querySelectorAll("[data-assign]").find(r => r.dataset.member === tokenList[0].id && r.value === "1" && r.dataset.type === "0");
  radio.fire("change");
  const action = app.constructor.DEFAULT_OPTIONS.actions.apply;
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("a wrong type blocks everything, with no question and no change", [questions.length, combatCalls.length, notices.warn], [0, 0, ["MINIONBANG.Bands.FixErrors"]]);
}

{
  reset();
  addTokens(7);
  addTokens(4, { name: "Orc", source: "Compendium.x.orc", cr: 1 });
  await win.openBandsWindow();
  const app = rendered[0];
  const gone = tokenList[2];
  tokenList.splice(tokenList.indexOf(gone), 1);
  hookList.find(h => h.name === "deleteToken").fn();
  check("a deleted token disables apply by itself and says who", [app.element.querySelector("[data-apply]").disabled, app.element.querySelector("[data-global-status]").textContent.includes(gone.name)], [true, true]);
  const action = app.constructor.DEFAULT_OPTIONS.actions.apply;
  answers.push(true);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("applying with a missing token does nothing", [combatCalls.length, questions.length, notices.warn.length], [0, 0, 1]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  combatants.push({ tokenId: tokenList[0].id });
  hookList.find(h => h.name === "createCombatant").fn();
  check("a token that enters the combat disables apply", app.element.querySelector("[data-apply]").disabled, true);
  combatants.length = 0;
  hookList.find(h => h.name === "createCombatant").fn();
  check("when the situation is back to normal apply is enabled again", [app.element.querySelector("[data-apply]").disabled, app.element.querySelector("[data-global-status]").textContent], [false, ""]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  closed.length = 0;
  const original = fakeCombat.createEmbeddedDocuments;
  fakeCombat.createEmbeddedDocuments = async type => { if (type === "Combatant") throw Object.assign(new Error("boom"), {}); return original.call(fakeCombat, type, [{}, {}]); };
  app.constructor.DEFAULT_OPTIONS.actions.apply.call(app);
  await new Promise(r => setTimeout(r, 20));
  fakeCombat.createEmbeddedDocuments = original;
  check("an error while applying: message with what was created, window kept open", [notices.error, closed.length], [["MINIONBANG.Bands.ApplyFailed|groups=2,combatants=0"], 0]);
  check("after an error the window can try again", [app.applying, app.element.querySelector("[data-apply]").disabled], [false, false]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  const action = app.constructor.DEFAULT_OPTIONS.actions.apply;
  action.call(app);
  action.call(app);
  await new Promise(r => setTimeout(r, 20));
  check("pressing apply twice applies once, without noise", [combatCalls.filter(c => c[0] === "CombatantGroup").length, notices.warn.length], [1, 0]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  const original = fakeCombat.createEmbeddedDocuments;
  let seen = null;
  fakeCombat.createEmbeddedDocuments = async function (type, data) {
    const result = await original.call(fakeCombat, type, data);
    if (type === "Combatant") {
      for (const d of data) combatants.push({ tokenId: d.tokenId });
      hookList.find(h => h.name === "createCombatant")?.fn();
      seen = [app.element.querySelector("[data-global-status]").textContent, app.element.querySelector("[data-apply]").disabled];
    }
    return result;
  };
  app.constructor.DEFAULT_OPTIONS.actions.apply.call(app);
  await new Promise(r => setTimeout(r, 20));
  fakeCombat.createEmbeddedDocuments = original;
  check("the combatants created by apply itself do not block the window", seen, ["", false]);
}

{
  reset();
  const models = win.buildModels([type(7)]);
  const t = win.buildContext(models, 0).types[0];
  check("every band has a captain list with its members, the first one chosen", t.bands.map(b => b.captainOptions.map(o => [o.value, o.selected])), [[["m1", true], ["m2", false], ["m3", false], ["m4", false], ["m5", false]], [["m6", true], ["m7", false]]]);
  check("the mode list starts with the setting and offers the five modes", t.bands[0].modeOptions.map(o => o.value), ["", "captain", "average", "highest", "lowest", "median"]);
  check("the default mode names the one of the settings", t.bands[0].modeOptions[0].label, "MINIONBANG.Bands.ModeDefault|mode=MINIONBANG.Bands.ModeShort.captain");
  check("the default is the one selected", t.bands[0].modeOptions.map(o => o.selected), [true, false, false, false, false, false]);
  check("with the mode of the settings on captain the captain list is active", t.bands[0].captainDisabled, false);
  settings.groupInitiativeMode = "average";
  check("with the mode of the settings on average the captain list is disabled", win.buildContext(models, 0).types[0].bands[0].captainDisabled, true);
  check("the default label follows the settings", win.buildContext(models, 0).types[0].bands[0].modeOptions[0].label, "MINIONBANG.Bands.ModeDefault|mode=MINIONBANG.Bands.ModeShort.average");
  settings.groupInitiativeMode = undefined;
}

{
  reset();
  const models = win.buildModels([type(7)]);
  const root = buildRoot(win.buildContext(models, 0));
  const state = { models, activeTab: 0 };
  win.wireWindow(root, state);
  const captains = () => root.querySelectorAll("[data-band-captain]");
  const modes = () => root.querySelectorAll("[data-band-mode]");
  check("the captain lists are filled with the members of the band", captains().map(c => c.children.map(o => o.value)), [["m1", "m2", "m3", "m4", "m5"], ["m6", "m7"]]);
  check("the first member is selected", captains().map(c => c.value), ["m1", "m6"]);

  captains()[0].value = "m3";
  captains()[0].fire("change");
  check("choosing a captain is stored and kept after the redraw", [state.models[0].captains[0], captains()[0].value], ["m3", "m3"]);

  const radio = root.querySelectorAll("[data-assign]").find(r => r.dataset.member === "m3" && r.value === "1");
  radio.fire("change");
  check("a captain moved to another band is replaced by the first one of the band", [captains()[0].value, captains()[0].children.map(o => o.value).includes("m3"), captains()[1].children.map(o => o.value).includes("m3")], ["m1", false, true]);
  root.querySelectorAll("[data-assign]").find(r => r.dataset.member === "m3" && r.value === "0").fire("change");
  check("and comes back as the captain if it goes back", captains()[0].value, "m3");

  modes()[1].value = "highest";
  modes()[1].fire("change");
  check("choosing a mode is stored", state.models[0].modes, [null, "highest"]);
  check("with a mode other than captain the captain list of that band is disabled, the other not", captains().map(c => c.disabled), [false, true]);
  modes()[1].value = "captain";
  modes()[1].fire("change");
  check("choosing captain enables it again", captains()[1].disabled, false);
  modes()[1].value = "";
  modes()[1].fire("change");
  check("going back to the setting stores nothing", state.models[0].modes, [null, null]);
  modes()[0].value = "median";
  modes()[0].fire("change");
  check("the other band is not touched", [state.models[0].modes, captains().map(c => c.disabled)], [["median", null], [true, false]]);
}

{
  reset();
  addTokens(7);
  await win.openBandsWindow();
  const app = rendered[0];
  const captain = app.element.querySelectorAll("[data-band-captain]")[0];
  captain.value = tokenList[2].id;
  captain.fire("change");
  const mode = app.element.querySelectorAll("[data-band-mode]")[1];
  mode.value = "lowest";
  mode.fire("change");
  app.constructor.DEFAULT_OPTIONS.actions.apply.call(app);
  await new Promise(r => setTimeout(r, 20));
  const flags = combatCalls[0][1].map(g => g.flags["minion-bang"]);
  check("applying stores captain and mode on each group", [flags[0].captain, flags[0].mode, flags[1].mode], [tokenList[2].id, undefined, "lowest"]);
  check("the second band keeps the first member as captain", flags[1].captain, tokenList[5].id);
}

{
  reset();
  game.user.isGM = false;
  addTokens(5);
  check("a player can not open the window", [await win.openBandsWindow(), rendered.length], [false, 0]);
}

{
  reset();
  settings.groupsEnabled = false;
  addTokens(5);
  check("with the groups off the window does not open and the GM is told", [await win.openBandsWindow(), rendered.length, notices.warn], [false, 0, ["MINIONBANG.Bands.GroupsOff"]]);
}

{
  reset();
  check("no minion in the scene: no window and a message", [await win.openBandsWindow(), rendered.length, notices.info], [false, 0, ["MINIONBANG.Bands.NoCandidates"]]);
}

{
  reset();
  addTokens(9);
  addTokens(4, { name: "Orc", source: "Compendium.x.orc", cr: 5 });
  groups.push({ name: "Goblin 1" }, { name: "Orc 1" });
  check("the window opens with the minions of the scene", await win.openBandsWindow(), true);
  const app = rendered[0];
  check("one tab per type", app.context.types.map(t => t.name), ["Goblin", "Orc"]);
  check("the bands continue the numbering of the groups already in the combat", app.context.types.map(t => t.bands.map(b => b.name)), [["Goblin 2", "Goblin 3"], ["Orc 2"]]);
  check("the window is wired: the counters are filled", app.element.querySelectorAll("[data-count]").map(s => s.textContent), ["5 / 5", "4 / 4", "4 / 4"]);
  check("the first tab is shown (the existing bands have their own tab, hidden)", app.element.querySelectorAll("[data-panel]").map(p => p.hidden), [false, true, true]);
  check("the window options give it an id, a title and a template", [app.constructor.DEFAULT_OPTIONS.id, app.constructor.DEFAULT_OPTIONS.window.title, app.constructor.PARTS.body.template], ["minion-bang-bands", "MINIONBANG.Bands.Title", "modules/minion-bang/templates/bands-window.hbs"]);
  check("the window carries the class the style relies on", app.constructor.DEFAULT_OPTIONS.classes.includes("minion-bang-bands-window"), true);
  check("the window can be resized and opens near the top", [app.constructor.DEFAULT_OPTIONS.window.resizable, app.constructor.DEFAULT_OPTIONS.position.top <= 60], [true, true]);

  app.element.querySelectorAll("[data-tab]")[1].fire("click");
  check("clicking the second tab shows it", [app.activeTab, app.element.querySelectorAll("[data-panel]").map(p => p.hidden)], [1, [true, false, true]]);
  check("the window watches tokens, combatants and bands", hookList.map(h => h.name).sort(), ["createCombatant", "createCombatantGroup", "deleteCombatant", "deleteCombatantGroup", "deleteToken", "updateCombatant", "updateCombatantGroup"]);

  check("opening again closes the previous window", await win.openBandsWindow(), true);
  check("the previous window was closed and a new one opened", [closed.length, rendered.length, closed[0] === app], [1, 2, true]);
}

{
  reset();
  const [a] = addTokens(6);
  selected.push({ document: a });
  confirmAnswer = false;
  await win.openBandsWindow();
  check("the selection question leads to the window with all the tokens when answered no", [questions.length, rendered[0].context.types[0].header], [1, "MINIONBANG.Bands.Header|count=6,cr=1/4,maximum=5"]);
}

{
  reset();
  const [a] = addTokens(6);
  selected.push({ document: a });
  confirmAnswer = null;
  check("closing the selection question opens nothing and says nothing", [await win.openBandsWindow(), rendered.length, notices.info.length, notices.error.length], [false, 0, 0, 0]);
}

{
  reset();
  addTokens(6);
  const saved = foundry.applications.api.HandlebarsApplicationMixin;
  foundry.applications.api.HandlebarsApplicationMixin = () => { throw new Error("no mixin"); };
  const result = await win.openBandsWindow();
  foundry.applications.api.HandlebarsApplicationMixin = saved;
  check("a failure while opening is logged and the GM is told", [result, notices.error, getRecentLogs().some(l => l.level === "error" && l.text.includes("bands window could not be opened"))], [false, ["MINIONBANG.Bands.OpenFailed"], true]);
}

{
  reset();
  const models = win.buildModels([type(9), type(3, { key: "orc", name: "Orc" })], [], ["#e6194b", "#4363d8"]);
  check("new bands skip the colours of the bands already in the combat, across types too", models.map(m => m.colors), [["#3cb44b", "#f58231"], ["#911eb4"]]);
}

{
  reset();
  addTokens(7);
  addGroup("g1", "Alpha", { color: "#e6194b" });
  addGroup("g2", "Beta", { color: "#3CB44B" });
  addGroup("g3", "Gamma", {});
  await win.openBandsWindow();
  check("opening the window gives the new bands colours the existing bands do not use", rendered[0].models[0].colors, ["#4363d8", "#f58231"]);
}

{
  reset();
  const models = win.buildModels([type(7), type(3, { key: "orc", name: "Orc" })]);
  check("the colours continue from one type to the next", models.map(m => m.colors), [["#e6194b", "#3cb44b"], ["#4363d8"]]);
  const entries = win.ringEntries(models, "m6");
  check("a ring entry for every creature of every type", entries.length, 10);
  check("the creatures of a band take its colour", entries.slice(0, 5).map(e => e.color), Array(5).fill("#e6194b"));
  check("the creatures alone are marked and neutral", [entries[4].single, entries[5].single], [false, false]);
  check("only the hovered creature is emphasised", entries.filter(e => e.emphasis).map(e => e.id), ["m6"]);
  check("nothing is emphasised without a hovered creature", win.ringEntries(models).some(e => e.emphasis), false);
  const alone = win.ringEntries(win.buildModels([type(6)]));
  check("a creature left alone has the neutral colour and the single mark", [alone[5].color, alone[5].single], ["#9e9e9e", true]);
}

{
  reset();
  addTokens(7);
  addTokens(3, { name: "Orc", source: "Compendium.x.orc", cr: 1 });
  for (const t of tokenList) mapTokens.set(t.id, { w: 100, h: 100, children: [], destroyed: false, addChild(g) { this.children.push(g); } });
  await win.openBandsWindow();
  const app = rendered[0];
  const ringsNow = () => tokenList.map(t => mapTokens.get(t.id).children.filter(g => !g.destroyed).map(g => g.style));
  check("opening the window draws one ring for every creature", ringsNow().map(r => r.length), Array(10).fill(1));
  check("the rings have the colour of the band", ringsNow()[0][0].color, 0xe6194b);

  const colorInput = app.element.querySelectorAll("[data-band-color]")[0];
  colorInput.value = "#112233";
  colorInput.fire("input");
  check("changing a colour redraws the rings of that band, once", [ringsNow()[0].length, ringsNow()[0][0].color, ringsNow()[5][0].color], [1, 0x112233, 0x3cb44b]);
  check("the colour is kept in the model", app.models[0].colors[0], "#112233");

  const row = app.element.querySelectorAll("[data-member-row]")[2];
  row.fire("mouseenter");
  check("hovering a row emphasises that token only", ringsNow().map(r => r[0].width), [3, 3, 7, ...Array(7).fill(3)]);
  row.fire("mouseleave");
  check("leaving the row restores the ring", ringsNow().map(r => r[0].width), Array(10).fill(3));

  const radio = app.element.querySelectorAll("[data-assign]").find(r => r.dataset.member === tokenList[0].id && r.value === "1" && r.dataset.type === "0");
  radio.fire("change");
  check("moving a creature to another band changes its ring", ringsNow()[0][0].color, 0x3cb44b);
  const lone = app.element.querySelectorAll("[data-assign]").find(r => r.dataset.member === tokenList[0].id && r.value === "single" && r.dataset.type === "0");
  lone.fire("change");
  check("a creature alone gets the thin neutral ring", [ringsNow()[0][0].color, ringsNow()[0][0].width], [0x9e9e9e, 2]);

  await app.close();
  check("closing the window removes all the rings", ringsNow().map(r => r.length), Array(10).fill(0));
}

{
  reset();
  addTokens(6);
  for (const t of tokenList) mapTokens.set(t.id, { w: 100, h: 100, children: [], destroyed: false, addChild(g) { this.children.push(g); } });
  await win.openBandsWindow();
  await win.openBandsWindow();
  check("opening the window again leaves only one set of rings", tokenList.map(t => mapTokens.get(t.id).children.filter(g => !g.destroyed).length), Array(6).fill(1));
}

{
  reset();
  addTokens(6);
  const saved = globalThis.PIXI;
  globalThis.PIXI = { Graphics: class { constructor() { throw new Error("no pixi"); } } };
  for (const t of tokenList) mapTokens.set(t.id, { w: 100, h: 100, children: [], destroyed: false, addChild() {} });
  const opened = await win.openBandsWindow();
  globalThis.PIXI = saved;
  check("a failure drawing the rings does not stop the window", [opened, rendered.length, notices.error.length], [true, 1, 0]);
}

function addGroup(id, name, flags = {}, count = 3) {
  const group = {
    id, name, initiative: null, flags: { "minion-bang": { ...flags } }, members: new Set(), writes: [], failOn: null,
    getFlag(module, key) { return this.flags[module]?.[key]; },
    async setFlag(module, key, value) { if (this.failOn === key) throw new Error("write failed"); this.flags[module][key] = value; this.writes.push(["set", key, value]); },
    async unsetFlag(module, key) { delete this.flags[module][key]; this.writes.push(["unset", key]); }
  };
  for (let i = 1; i <= count; i += 1) group.members.add({ tokenId: `${id}-t${i}`, name: `${name} ${i}`, _source: { initiative: null } });
  groups.push(group);
  return group;
}
const fireWorld = name => hookList.filter(h => h.name === name).forEach(h => h.fn());
const settle = () => new Promise(r => setTimeout(r, 20));
const existingOf = app => app.element.querySelectorAll("[data-existing-color]").length;
const applyOf = app => () => app.constructor.DEFAULT_OPTIONS.actions.apply.call(app);

{
  reset();
  const [model] = win.buildModels([type(9)]);
  check("no existing bands: the context has no existing tab", win.buildContext([model], 0, null).existing, null);
}

{
  reset();
  addGroup("g1", "Alpha", { color: "#ff0000", mode: "average", captain: "g1-t2" });
  addGroup("g2", "Beta", {});
  groups[1].initiative = 14;
  const [model] = win.buildModels([type(9)]);
  const { createExistingModel } = await import("../scripts/engine/existing-bands.js");
  const { readLiveGroups } = await import("../scripts/adapters/existing-bands.js");
  const existing = createExistingModel(readLiveGroups());
  const e = win.buildContext([model], 0, existing).existing;
  check("the existing tab comes after the type tabs and is not active yet", [e.index, e.active], [1, false]);
  check("every band is listed with name, colour and member count", e.groups.map(g => [g.id, g.name, g.color, g.count]), [["g1", "Alpha", "#ff0000", 3], ["g2", "Beta", "#808080", 3]]);
  check("a band that has not rolled can change mode and captain, one that has rolled can not", e.groups.map(g => [g.rolled, g.captainDisabled]), [[false, true], [true, true]]);
  check("the captain shown is the saved one, or 'no captain' for a band without one", e.groups.map(g => g.captainOptions.find(o => o.selected).value), ["g1-t2", ""]);
  check("'no captain' is offered only to the band without one", e.groups.map(g => g.captainOptions.map(o => o.value)), [["g1-t1", "g1-t2", "g1-t3"], ["", "g2-t1", "g2-t2", "g2-t3"]]);
  check("the mode shown is the saved one, or the one from the settings", e.groups.map(g => g.modeOptions.find(o => o.selected).value), ["average", ""]);
  const alone = win.buildContext([], 0, existing).existing;
  check("with no new minion the existing tab is the first one, and active", [alone.index, alone.active], [0, true]);
}

{
  reset();
  addGroup("g1", "Alpha", { color: "#ff0000", mode: "captain" });
  await win.openBandsWindow();
  const app = rendered[0];
  check("only existing bands and nothing new: the window opens, with no 'nothing available' message", [rendered.length, notices.info, existingOf(app)], [1, [], 1]);
  check("it opens on the existing tab", [app.activeTab, app.element.querySelectorAll("[data-panel]").map(p => p.hidden)], [0, [false]]);
  check("the captain list is on for a band in captain mode that has not rolled", app.element.querySelector("[data-existing-captain]").disabled, false);
  check("with nothing to change the apply button is off", app.element.querySelector("[data-apply]").disabled, true);
  const base = closed.length;
  applyOf(app)();
  await settle();
  check("applying with nothing to change writes nothing and keeps the window open", [groups[0].writes, closed.length - base, notices.info], [[], 0, []]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { mode: "captain" });
  await win.openBandsWindow();
  const app = rendered[0];
  const captain = app.element.querySelector("[data-existing-captain]");
  check("a band without captain shows 'no captain' and nothing to apply", [captain.value, app.element.querySelector("[data-apply]").disabled], ["", true]);
  captain.value = "g1-t1";
  captain.fire("change");
  check("choosing the first member is a change to apply", app.element.querySelector("[data-apply]").disabled, false);
  captain.value = "";
  captain.fire("change");
  check("going back to 'no captain' leaves nothing to apply", app.element.querySelector("[data-apply]").disabled, true);
  captain.value = "g1-t1";
  captain.fire("change");
  applyOf(app)();
  await settle();
  check("the first member is saved as captain", group.flags["minion-bang"].captain, "g1-t1");
}

{
  reset();
  const group = addGroup("g1", "Alpha", { color: "#ff0000", mode: "captain", captain: "g1-t1" });
  await win.openBandsWindow();
  const app = rendered[0];
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#00ff00";
  color.fire("input");
  check("changing a colour turns the apply button on", app.element.querySelector("[data-apply]").disabled, false);
  const base = closed.length;
  applyOf(app)();
  await settle();
  check("applying writes the colour, tells the GM and closes the window", [group.flags["minion-bang"].color, group.writes.length, notices.info, closed.length - base, combatCalls.length], ["#00ff00", 1, ["MINIONBANG.Bands.ExistingApplied|count=1"], 1, 0]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { mode: "average", captain: "g1-t1" });
  await win.openBandsWindow();
  const app = rendered[0];
  const captain = app.element.querySelector("[data-existing-captain]");
  check("a band that is not in captain mode has its captain list off", captain.disabled, true);
  const mode = app.element.querySelector("[data-existing-mode]");
  mode.value = "captain";
  mode.fire("change");
  check("choosing the captain's roll enables the captain list", captain.disabled, false);
  captain.value = "g1-t3";
  captain.fire("change");
  applyOf(app)();
  await settle();
  check("the mode and the captain are written together", [group.flags["minion-bang"].mode, group.flags["minion-bang"].captain], ["captain", "g1-t3"]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { mode: "average" });
  await win.openBandsWindow();
  const app = rendered[0];
  const mode = app.element.querySelector("[data-existing-mode]");
  mode.value = "";
  mode.fire("change");
  applyOf(app)();
  await settle();
  check("going back to the module settings removes the saved mode", [group.flags["minion-bang"].mode, group.writes], [undefined, [["unset", "mode"]]]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { color: "#ff0000", mode: "average" });
  group.initiative = 12;
  await win.openBandsWindow();
  const app = rendered[0];
  check("a band that has rolled: mode and captain lists are off", [app.element.querySelector("[data-existing-mode]").disabled, app.element.querySelector("[data-existing-captain]").disabled], [true, true]);
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#00ff00";
  color.fire("input");
  applyOf(app)();
  await settle();
  check("a band that has rolled can still change colour", [group.flags["minion-bang"].color, group.writes.length], ["#00ff00", 1]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { mode: "average" });
  await win.openBandsWindow();
  const app = rendered[0];
  const mode = app.element.querySelector("[data-existing-mode]");
  mode.value = "highest";
  mode.fire("change");
  check("a mode chosen makes the apply button available", app.element.querySelector("[data-apply]").disabled, false);
  check("the lock is hidden while the band has not rolled", app.element.querySelector("[data-existing-lock]").hidden, true);
  group.initiative = 12;
  fireWorld("updateCombatantGroup");
  const after = app.element.querySelector("[data-existing-mode]");
  check("the band rolls while the window is open: mode and captain are locked, the mode chosen is dropped, nothing left to apply", [after.disabled, after.value, app.element.querySelector("[data-apply]").disabled], [true, "average", true]);
  check("the lock appears on the band that rolled, without redrawing the window", [app.element.querySelector("[data-existing-lock]").hidden, rendered.length], [false, 1]);
}

{
  reset();
  const group = addGroup("g1", "Alpha", { color: "#ff0000", mode: "captain", captain: "g1-t1" });
  await win.openBandsWindow();
  const app = rendered[0];
  const first = [...group.members][0];
  group.members.delete(first);
  fireWorld("deleteCombatant");
  const select = app.element.querySelector("[data-existing-captain]");
  check("a member leaves the band while the window is open: the captain list follows", [select.children.map(option => option.value), select.value], [["g1-t2", "g1-t3"], "g1-t2"]);
}

{
  reset();
  addGroup("g1", "Alpha", { color: "#ff0000" });
  await win.openBandsWindow();
  addGroup("g2", "Beta", {});
  fireWorld("createCombatantGroup");
  await settle();
  check("a band added while the window is open: the window redraws with it", [rendered.length, rendered[rendered.length - 1].element.querySelectorAll("[data-existing-color]").length], [2, 2]);
}

{
  reset();
  addTokens(7);
  const group = addGroup("g1", "Alpha", { color: "#ff0000" });
  await win.openBandsWindow();
  const app = rendered[0];
  check("new minions and existing bands: the new tab is first and active", [app.activeTab, app.element.querySelectorAll("[data-panel]").map(p => p.hidden)], [0, [false, true]]);
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#00ff00";
  color.fire("input");
  const base = closed.length;
  applyOf(app)();
  await settle();
  check("one apply does both: the existing band and the new groups", [group.flags["minion-bang"].color, combatCalls.map(c => c[0]), notices.info.length, closed.length - base], ["#00ff00", ["CombatantGroup", "Combatant"], 2, 1]);
}

{
  reset();
  addTokens(7);
  const group = addGroup("g1", "Alpha", { color: "#ff0000" });
  group.failOn = "color";
  await win.openBandsWindow();
  const app = rendered[0];
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#00ff00";
  color.fire("input");
  const originalError = console.error;
  console.error = () => {};
  const base = closed.length;
  applyOf(app)();
  await settle();
  console.error = originalError;
  check("if the existing bands can not be updated nothing new is created and the window stays", [combatCalls.length, notices.error, closed.length - base], [0, ["MINIONBANG.Bands.ExistingFailed"], 0]);
  group.failOn = null;
  applyOf(app)();
  await settle();
  check("after the failure it can be tried again", [group.flags["minion-bang"].color, combatCalls.length > 0, closed.length - base], ["#00ff00", true, 1]);
}

{
  reset();
  addTokens(9);
  const group = addGroup("g1", "Alpha", {});
  await win.openBandsWindow();
  const app = rendered[0];
  const radio = app.element.querySelectorAll("[data-assign]").find(r => r.dataset.member === tokenList[0].id && r.value === "single");
  radio.fire("change");
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#00ff00";
  color.fire("input");
  applyOf(app)();
  await settle();
  check("new bands with an error block the whole apply, existing edits included", [group.writes.length, combatCalls.length, notices.warn], [0, 0, ["MINIONBANG.Bands.FixErrors"]]);
}


function ringMap(ids) {
  for (const id of ids) mapTokens.set(id, { w: 100, h: 100, children: [], destroyed: false, addChild(g) { this.children.push(g); } });
  return id => mapTokens.get(id).children.filter(g => !g.destroyed).map(g => g.style);
}

{
  reset();
  addGroup("g1", "Alpha", { color: "#ff0000" });
  addGroup("g2", "Beta", { color: "#00ff00" });
  const { createExistingModel, setExistingColor } = await import("../scripts/engine/existing-bands.js");
  const { readLiveGroups } = await import("../scripts/adapters/existing-bands.js");
  const base = createExistingModel(readLiveGroups());
  check("existing bands with no change and no hover draw no ring", win.ringEntries([], null, base, null), []);
  const edited = setExistingColor(base, "g1", "#112233");
  check("a band whose colour was edited gets a ring on every member in the new colour", win.ringEntries([], null, edited, null).map(e => [e.id, e.color, e.emphasis]), [["g1-t1", "#112233", false], ["g1-t2", "#112233", false], ["g1-t3", "#112233", false]]);
  check("the colour put back to the old one draws nothing", win.ringEntries([], null, setExistingColor(edited, "g1", "#ff0000"), null), []);
  check("hovering a band row emphasises all its members, in the colour it has", win.ringEntries([], null, base, "g2").map(e => [e.id, e.color, e.emphasis]), [["g2-t1", "#00ff00", true], ["g2-t2", "#00ff00", true], ["g2-t3", "#00ff00", true]]);
}

{
  reset();
  addGroup("g1", "Alpha", { color: "#ff0000" });
  addGroup("g2", "Beta", { color: "#00ff00" });
  const rings = ringMap(["g1-t1", "g1-t2", "g1-t3", "g2-t1", "g2-t2", "g2-t3"]);
  await win.openBandsWindow();
  const app = rendered[0];
  check("opening on the existing tab draws no ring", ["g1-t1", "g2-t1"].map(id => rings(id).length), [0, 0]);
  const color = app.element.querySelector("[data-existing-color]");
  color.value = "#112233";
  color.fire("input");
  check("changing the colour of an existing band previews it on its tokens only", [rings("g1-t1").map(r => r.color), rings("g2-t1").length], [[0x112233], 0]);
  const rows = app.element.querySelectorAll("[data-existing-row]");
  rows[1].fire("mouseenter");
  check("hovering another band row emphasises it, the edited one stays", [rings("g2-t2").map(r => r.width), rings("g1-t2").map(r => r.color)], [[7], [0x112233]]);
  rows[1].fire("mouseleave");
  check("leaving the row removes the emphasis", rings("g2-t2").length, 0);
  groups[0].flags["minion-bang"].color = "#112233";
  fireWorld("updateCombatantGroup");
  check("the colour chosen becomes the saved one while the window is open: the preview goes away", rings("g1-t1").length, 0);
  await app.close();
  check("closing the window removes the previews", rings("g1-t1").length, 0);
}

{
  const template = readFileSync(new URL("../templates/bands-window.hbs", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles/minion-bang.css", import.meta.url), "utf8");
  for (const hook of ["data-existing-color", "data-existing-mode", "data-existing-captain", "data-band-mode", "data-band-captain", "data-band-color", "data-member-row", "data-assign", "data-band-name", "data-count", "data-status", "data-global-status", "data-apply", 'data-action="apply"', 'data-action="close"', "data-panel", "data-tab"]) {
    check(`the template has ${hook}, used by the window code`, template.includes(hook), true);
  }
  check("the template has the tab and the panel of the existing bands, tied to the same number", template.includes('data-tab="{{existing.index}}"') && template.includes('data-panel="{{existing.index}}"'), true);
  check("the existing bands have their own scrolling list and a row marker", template.includes("minion-bang-bands-list-existing") && template.includes("data-existing-row"), true);
  check("the existing tab and the lock note are read from the context", template.includes("labels.existingTab") && template.includes("existing.lockedTitle") && template.includes("data-existing-lock"), true);
  check("the existing list takes the free space and the names are cut with dots", /\.minion-bang-bands-list-existing\s*\{[^}]*flex:\s*1 1 auto[^}]*max-height:\s*none/.test(css) && /\.minion-bang-bands-existing-name\s*\{[^}]*text-overflow:\s*ellipsis/.test(css), true);
  check("the template reads the labels of the context", ["labels.member", "labels.single", "labels.apply", "labels.close"].every(name => template.includes(name)), true);
  check("the tab buttons do not depend on Foundry actions", template.includes('data-action="tab"'), false);
  check("a hidden panel stays hidden whatever the display rules", /\.minion-bang-bands-panel\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css), true);
  check("the name and the two lists of a band share the row in three equal parts", /\.minion-bang-bands-band\s*\{[^}]*grid-template-columns:\s*4\.5rem 2\.5rem repeat\(3, minmax\(0, 1fr\)\) 3\.5rem/.test(css), true);
check("the closed lists show the start of the text and open in full", /\.minion-bang-bands-band select\s*\{[^}]*text-overflow:\s*ellipsis/.test(css) || /\.minion-bang-bands-band input\[type="text"\],\s*\.minion-bang-bands-band select\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/.test(css), true);
check("the titles of the three columns are above the list and do not scroll", template.indexOf("minion-bang-bands-list-head") > 0 && template.indexOf("minion-bang-bands-list-head") < template.indexOf('class="minion-bang-bands-list"'), true);
    check("the header of the grid is outside the scrolling area", template.indexOf("minion-bang-bands-head") < template.indexOf("minion-bang-bands-body"), true);
  check("the header does not rely on sticky positioning", css.includes("position: sticky"), false);
  check("the window can use the whole screen height but never more, so the buttons stay in view", /\.minion-bang-bands-window\.application\s*\{[^}]*max-height:\s*calc\(100vh - 40px\)/.test(css), true);
  check("the window itself does not scroll, so the buttons stay in view", /\.minion-bang-bands-window \.window-content\s*\{[^}]*overflow:\s*hidden/.test(css), true);
  check("the area with the creatures to assign takes the space left and scrolls", /\.minion-bang-bands-body\s*\{[^}]*flex:\s*1 1 auto[^}]*overflow-y:\s*auto/.test(css), true);
  check("the list of the bands has its own height limit and scrolls", /\.minion-bang-bands-list\s*\{[^}]*max-height:\s*30vh[^}]*overflow-y:\s*auto/.test(css), true);
  check("the panel and the container are flex columns that can shrink", [/\.minion-bang-bands\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*min-height:\s*0/.test(css), /\.minion-bang-bands-panel\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*min-height:\s*0/.test(css)], [true, true]);
  check("the footer, the tabs, the column headers and the messages never shrink", /\.minion-bang-bands-footer,\s*\.minion-bang-bands-tabs,\s*\.minion-bang-bands-list-head,\s*\.minion-bang-bands-head,\s*\.minion-bang-bands-status,\s*\.minion-bang-bands-global\s*\{[^}]*flex:\s*0 0 auto/.test(css), true);
  check("the old fixed height calculation is gone", css.includes("calc(100vh - 480px)"), false);
  check("the template wraps the bands in the list that scrolls", template.indexOf("minion-bang-bands-list") > 0 && template.indexOf("minion-bang-bands-list") < template.indexOf("data-band-name"), true);
  check("the header and the rows share the same columns", /\.minion-bang-bands-columns\s*\{[^}]*grid-template-columns:\s*2fr repeat\(var\(--minion-bang-columns\), 1fr\)/.test(css), true);
  check("the wrong values are marked in red", css.includes(".minion-bang-bad"), true);
}

console.log(failures === 0 ? "\nAll bands window checks passed.\n" : `\n${failures} bands window check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
