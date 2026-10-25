const handlers = new Map();
globalThis.Hooks = {
  once(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  },
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};

class FakeApplication {}
globalThis.foundry = { applications: { api: { ApplicationV2: FakeApplication } } };
globalThis.canvas = { scene: null };
globalThis.CONFIG = { DND5E: { characterFlags: {} } };
globalThis.document = { createElement: () => ({}) };

const registered = {};
const consoleLines = [];
const originalInfo = console.info;
console.info = (...args) => consoleLines.push(args.join(" "));

const minionModule = { version: "9.9.9", active: true };
const settingValues = {};
const activeModules = new Set(["minion-bang"]);
const notifications = [];
globalThis.ui = { notifications: { warn: (text, options) => notifications.push({ text, options }) } };

globalThis.game = {
  user: { isGM: false },
  modules: { get: id => (id === "minion-bang" ? minionModule : { active: activeModules.has(id) }) },
  settings: {
    get: (module, key) => settingValues[key] ?? false,
    register: (module, key, data) => { registered[key] = { module, ...data }; },
    registerMenu: (module, key, data) => { registered[`menu:${key}`] = { module, ...data }; }
  },
  i18n: { localize: key => key, format: key => key }
};

await import("../scripts/main.js");
const { getRecentLogs } = await import("../scripts/log.js");

function startAs(isGM) {
  game.user.isGM = isGM;
  handlers.delete("dnd5e.preApplyDamage");
  handlers.delete("renderTokenHUD");
  handlers.delete("createCombatant");
  handlers.delete("updateCombatant");
  handlers.delete("createCombatantGroup");
  handlers.delete("updateCombatantGroup");
  handlers.delete("deleteCombatantGroup");
  handlers.delete("updateCombat");
  handlers.delete("deleteCombat");
  handlers.delete("renderCombatTracker");
  handlers.delete("deleteCombatant");
  handlers.delete("canvasReady");
  handlers.delete("canvasTearDown");
  handlers.delete("updateToken");
  delete minionModule.api;
  consoleLines.length = 0;
  notifications.length = 0;
  for (const fn of handlers.get("ready") ?? []) fn();
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

for (const fn of handlers.get("init") ?? []) fn();
check("settings: debug logging is per client and off", [registered.debugLogging?.scope, registered.debugLogging?.default], ["client", false]);
check("settings: preselection is a world setting, on by default", [registered.autoSelectProposal?.scope, registered.autoSelectProposal?.default, registered.autoSelectProposal?.type === Boolean], ["world", true, true]);
check("settings: preselection is shown in the configuration", registered.autoSelectProposal?.config, true);
check("settings: shared turns and bands is a world setting, off by default", [registered.groupsEnabled?.scope, registered.groupsEnabled?.default, registered.groupsEnabled?.type === Boolean, registered.groupsEnabled?.config], ["world", false, true, true]);
check("settings: the group initiative mode is a world choice, one roll per group by default", [registered.groupInitiativeMode?.scope, registered.groupInitiativeMode?.default, registered.groupInitiativeMode?.type === String, Object.keys(registered.groupInitiativeMode?.choices ?? {})], ["world", "captain", true, ["captain", "average", "highest", "lowest", "median"]]);
check("settings: the maximum table is stored for the world, hidden, empty means default", [registered.maximumsTable?.scope, registered.maximumsTable?.config, registered.maximumsTable?.default, registered.maximumsTable?.type === String], ["world", false, "", true]);
check("settings: the maximum table menu is for the GM only", [registered["menu:editMaximums"]?.restricted, typeof registered["menu:editMaximums"]?.type], [true, "function"]);
check("settings: the diagnostics menu is registered", "menu:runDiagnostics" in registered, true);

startAs(false);
check("player: the version is written to the console", consoleLines.some(l => l.includes("Minion! 9.9.9 ready (player).")), true);
check("player: no damage hook registered", handlers.has("dnd5e.preApplyDamage"), false);
check("player: no Token HUD hook registered", handlers.has("renderTokenHUD"), false);
check("player: no grouping hook; only the turn synchronisation and token colour hooks", [(handlers.get("createCombatant") ?? []).length, (handlers.get("updateCombatant") ?? []).length, (handlers.get("createCombatantGroup") ?? []).length, (handlers.get("updateCombatantGroup") ?? []).length, (handlers.get("deleteCombatantGroup") ?? []).length], [1, 2, 2, 2, 2]);

check("player: no bands button hook and no api", [handlers.has("renderCombatTracker"), minionModule.api], [false, undefined]);
check("player: no band turn hooks, only the colour one on the end of a combat", [handlers.has("updateCombat"), (handlers.get("deleteCombat") ?? []).length], [false, 1]);

startAs(true);
check("GM: the version is written to the console", consoleLines.some(l => l.includes("Minion! 9.9.9 ready (GM).")), true);
check("GM: the damage hook is registered", (handlers.get("dnd5e.preApplyDamage") ?? []).length, 1);
check("GM: the Token HUD hook is registered", (handlers.get("renderTokenHUD") ?? []).length, 1);
check("GM: the grouping hook, the group initiative hook and the turn synchronisation hooks are registered", [(handlers.get("createCombatant") ?? []).length, (handlers.get("updateCombatant") ?? []).length, (handlers.get("createCombatantGroup") ?? []).length, (handlers.get("updateCombatantGroup") ?? []).length, (handlers.get("deleteCombatantGroup") ?? []).length], [2, 3, 2, 3, 2]);
check("GM: the band turn hooks are registered, a player has none", [(handlers.get("updateCombat") ?? []).length, (handlers.get("deleteCombat") ?? []).length], [1, 2]);
check("GM: the bands button hook is registered and the api opens the window", [(handlers.get("renderCombatTracker") ?? []).length, typeof minionModule.api?.openBandsWindow], [1, "function"]);
check("the captaincy is passed on by the GM only (the colours are everybody's)", [(handlers.get("deleteCombatant") ?? []).length], [2]);
check("every client watches the changes to colour the tokens", [handlers.has("canvasReady"), handlers.has("updateToken"), handlers.has("deleteCombatant")], [true, true, true]);
check("the line also reaches the diagnostics buffer", getRecentLogs().some(l => l.level === "info" && l.text.includes("9.9.9")), true);

startAs(true);
check("groups off: the log says so", consoleLines.some(l => l.includes("Shared turns and bands: off.")), true);
check("groups off: no warning", notifications.length, 0);

activeModules.add("squad-combat-initiative");
startAs(true);
check("groups off with SCI active: no warning", notifications.length, 0);
check("groups off with SCI active: the log says off", consoleLines.some(l => l.includes("Shared turns and bands: off.")), true);

settingValues.groupsEnabled = true;
startAs(true);
check("groups on with SCI active, GM: a permanent warning is shown", notifications.map(n => [n.text, n.options?.permanent]), [["MINIONBANG.Groups.BlockedBySci", true]]);
check("groups on with SCI active, GM: the log says blocked", consoleLines.some(l => l.includes("Shared turns and bands: blocked by Squad Combat Initiative.")), true);
check("groups on with SCI active, GM: the warning reaches the diagnostics buffer", getRecentLogs().some(l => l.level === "warn" && l.text.includes("Squad Combat Initiative is active")), true);

startAs(false);
check("groups on with SCI active, player: no warning", notifications.length, 0);
check("groups on with SCI active, player: the log still says blocked", consoleLines.some(l => l.includes("blocked by Squad Combat Initiative")), true);

activeModules.delete("squad-combat-initiative");
startAs(true);
check("groups on without SCI, GM: no warning", notifications.length, 0);
check("groups on without SCI, GM: the log says on", consoleLines.some(l => l.includes("Shared turns and bands: on.")), true);

const onChange = registered.groupsEnabled.onChange;
activeModules.add("squad-combat-initiative");
notifications.length = 0;
game.user.isGM = true;
onChange(true);
check("turning the setting on with SCI active warns the GM at once", notifications.length, 1);
game.user.isGM = false;
notifications.length = 0;
onChange(true);
check("turning the setting on with SCI active does not warn a player", notifications.length, 0);
settingValues.groupsEnabled = false;
game.user.isGM = true;
onChange(false);
check("turning the setting off does not warn", notifications.length, 0);
activeModules.delete("squad-combat-initiative");
settingValues.groupsEnabled = false;

game.modules.get = () => undefined;
startAs(false);
check("module not found: the line says unknown", consoleLines.some(l => l.includes("Minion! unknown ready")), true);

console.info = originalInfo;
console.log(failures === 0 ? "\nAll startup checks passed.\n" : `\n${failures} startup check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
