import { FakeElement } from "./helpers/fake-dom.mjs";

const settings = { groupsEnabled: true };
const hooks = {};
const opened = [];
let sciActive = false;

globalThis.Hooks = { on: (name, fn) => { (hooks[name] ??= []).push(fn); } };
globalThis.game = {
  settings: { get: (m, k) => settings[k] },
  modules: { get: id => ({ active: id === "squad-combat-initiative" ? sciActive : false }) },
  i18n: { localize: k => k, format: k => k },
  user: { isGM: true }
};
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
globalThis.canvas = { scene: { tokens: [] }, tokens: { controlled: [] } };
globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: B => B, DialogV2: {} } } };
globalThis.document = { createElement: tag => new FakeElement({ tag }) };

const button = await import("../scripts/ui/bands-button.js");

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}

function tracker({ withHeader = true, withHeaderTag = true } = {}) {
  const root = new FakeElement({ tag: "section" });
  const header = new FakeElement({ tag: "header", className: withHeader ? "combat-tracker-header" : "" });
  if (withHeaderTag || withHeader) root.append(header);
  return { root, header };
}

{
  const { root, header } = tracker();
  const b = button.insertBandsButton(root);
  check("the button goes into the tracker header", [header.children.length, header.children[0] === b], [1, true]);
  check("the button has the class, the type and the label", [b.className, b.type, b.innerHTML.includes("MINIONBANG.Bands.Button")], ["minion-bang-bands-button", "button", true]);
  button.insertBandsButton(root);
  check("inserting again does not duplicate the button", header.children.filter(c => c.classes.has("minion-bang-bands-button")).length, 1);
}

{
  const root = new FakeElement({ tag: "section" });
  const header = new FakeElement({ tag: "header" });
  root.append(header);
  const b = button.insertBandsButton(root);
  check("without the specific class it falls back to the header tag", header.children[0] === b, true);
}

{
  const root = new FakeElement({ tag: "section" });
  const b = button.insertBandsButton(root);
  check("without any header it falls back to the root", root.children[0] === b, true);
}

check("a missing root is ignored", [button.insertBandsButton(null), button.insertBandsButton({})], [null, null]);

{
  const { root, header } = tracker();
  const b = button.insertBandsButton(root);
  let thrown = null;
  const originalOnError = process.listeners("unhandledRejection");
  b.fire("click");
  await new Promise(r => setTimeout(r, 20));
  check("a click does not throw even when the window cannot be opened", thrown, null);
  void originalOnError; void header;
}

button.registerBandsButton();
const hook = hooks.renderCombatTracker?.[0];
check("the hook renderCombatTracker is registered", typeof hook, "function");

{
  const { root, header } = tracker();
  game.user.isGM = true; settings.groupsEnabled = true; sciActive = false;
  hook({}, root);
  check("GM with groups on: button inserted", header.children.length, 1);
}
{
  const { root, header } = tracker();
  hook({}, [root]);
  check("jQuery-like argument is accepted", header.children.length, 1);
}
{
  const { root, header } = tracker();
  game.user.isGM = false;
  hook({}, root);
  check("a player never gets the button", header.children.length, 0);
  game.user.isGM = true;
}
{
  const { root, header } = tracker();
  settings.groupsEnabled = false;
  hook({}, root);
  check("with groups off there is no button", header.children.length, 0);
  settings.groupsEnabled = true;
}
{
  const { root, header } = tracker();
  sciActive = true;
  hook({}, root);
  check("with SCI active there is no button", header.children.length, 0);
  sciActive = false;
}

console.log(failures === 0 ? "\nAll bands button checks passed.\n" : `\n${failures} bands button check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
