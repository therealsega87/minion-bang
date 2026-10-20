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
globalThis.CONFIG = { DND5E: { characterFlags: {} } };
globalThis.document = { createElement: () => ({}) };

const registered = {};
const consoleLines = [];
const originalInfo = console.info;
console.info = (...args) => consoleLines.push(args.join(" "));

globalThis.game = {
  user: { isGM: false },
  modules: { get: id => (id === "minion-bang" ? { version: "9.9.9", active: true } : { active: false }) },
  settings: {
    get: () => false,
    register: (module, key, data) => { registered[key] = { module, ...data }; },
    registerMenu: (module, key, data) => { registered[`menu:${key}`] = { module, ...data }; }
  },
  i18n: { localize: key => key }
};

await import("../scripts/main.js");
const { getRecentLogs } = await import("../scripts/log.js");

function startAs(isGM) {
  game.user.isGM = isGM;
  handlers.delete("dnd5e.preApplyDamage");
  handlers.delete("renderTokenHUD");
  consoleLines.length = 0;
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
check("settings: the diagnostics menu is registered", "menu:runDiagnostics" in registered, true);

startAs(false);
check("player: the version is written to the console", consoleLines.some(l => l.includes("Minion! 9.9.9 ready (player).")), true);
check("player: no damage hook registered", handlers.has("dnd5e.preApplyDamage"), false);
check("player: no Token HUD hook registered", handlers.has("renderTokenHUD"), false);

startAs(true);
check("GM: the version is written to the console", consoleLines.some(l => l.includes("Minion! 9.9.9 ready (GM).")), true);
check("GM: the damage hook is registered", (handlers.get("dnd5e.preApplyDamage") ?? []).length, 1);
check("GM: the Token HUD hook is registered", (handlers.get("renderTokenHUD") ?? []).length, 1);
check("the line also reaches the diagnostics buffer", getRecentLogs().some(l => l.level === "info" && l.text.includes("9.9.9")), true);

game.modules.get = () => undefined;
startAs(false);
check("module not found: the line says unknown", consoleLines.some(l => l.includes("Minion! unknown ready")), true);

console.info = originalInfo;
console.log(failures === 0 ? "\nAll startup checks passed.\n" : `\n${failures} startup check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
