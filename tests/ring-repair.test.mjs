const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};
const fire = (name, ...args) => (handlers.get(name) ?? []).forEach(fn => fn(...args));

let now = 0;
let nextTimer = 1;
const timers = new Map();
globalThis.setTimeout = (fn, ms) => { const id = nextTimer++; timers.set(id, { at: now + ms, fn }); return id; };
globalThis.clearTimeout = id => { timers.delete(id); };
function advance(ms) {
  const target = now + ms;
  for (;;) {
    const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    timers.delete(due[0]);
    now = due[1].at;
    due[1].fn();
  }
  now = target;
}

globalThis.CONFIG = { specialStatusEffects: { DEFEATED: "dead" } };
globalThis.game = { settings: { get: () => false }, modules: { get: () => ({ active: true }) } };

const { registerRingRepair, RING_REPAIR_DELAY_MS } = await import("../scripts/adapters/ring-repair.js");
registerRingRepair();

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}

function makeToken(id, { ring = true, destroyed = false, noObject = false } = {}) {
  const object = { destroyed, refreshes: [], renderFlags: { set(flags) { object.refreshes.push(flags); } } };
  return { id, uuid: `Scene.s.Token.${id}`, name: id, ring: { enabled: ring }, object: noObject ? null : object, refreshes: () => object.refreshes };
}
function syntheticActor(token, { minion = true } = {}) {
  const actor = { documentName: "Actor", isToken: true, token, flags: minion ? { "mcdm-flee-mortals-where-evil-lives": { role: "minion" } } : {} };
  return actor;
}
function linkedActor(tokens) {
  return { documentName: "Actor", isToken: false, flags: { dnd5e: { minionBangMinion: true } }, getActiveTokens: () => tokens };
}
const hpChange = { system: { attributes: { hp: { value: 0 } } } };
const deadEffect = actor => ({ statuses: new Set(["dead"]), parent: actor });

{
  const token = makeToken("a");
  fire("updateActor", syntheticActor(token), hpChange);
  advance(RING_REPAIR_DELAY_MS - 1);
  check("no redraw while the flash may still be running", token.refreshes().length, 0);
  advance(1);
  check("hit points changed on a minion: the ring is redrawn once after the flash", token.refreshes(), [{ refreshRingVisuals: true }]);
}
{
  const token = makeToken("b");
  const actor = syntheticActor(token);
  fire("updateActor", actor, hpChange);
  advance(500);
  fire("createActiveEffect", deadEffect(actor));
  advance(RING_REPAIR_DELAY_MS - 1);
  check("Dead arrives during the wait: the countdown starts again", token.refreshes().length, 0);
  advance(1);
  check("Dead arrives during the wait: still a single redraw", token.refreshes().length, 1);
}
{
  const token = makeToken("c");
  const actor = syntheticActor(token);
  fire("deleteActiveEffect", deadEffect(actor));
  advance(RING_REPAIR_DELAY_MS);
  check("Dead removed from a minion: the ring is redrawn", token.refreshes().length, 1);
}
{
  const token = makeToken("d");
  const actor = syntheticActor(token);
  fire("createActiveEffect", { statuses: new Set(["prone"]), parent: actor });
  fire("updateActor", actor, { name: "Renamed" });
  advance(RING_REPAIR_DELAY_MS * 2);
  check("another status or a change without hit points: no redraw", token.refreshes().length, 0);
}
{
  const token = makeToken("e");
  fire("updateActor", syntheticActor(token, { minion: false }), hpChange);
  advance(RING_REPAIR_DELAY_MS);
  check("a creature that is not a minion: no redraw", token.refreshes().length, 0);
}
{
  const token = makeToken("f", { ring: false });
  fire("updateActor", syntheticActor(token), hpChange);
  advance(RING_REPAIR_DELAY_MS);
  check("a minion without the dynamic ring: no redraw", token.refreshes().length, 0);
}
{
  const one = makeToken("g1");
  const two = makeToken("g2");
  fire("updateActor", linkedActor([one, two]), hpChange);
  advance(RING_REPAIR_DELAY_MS);
  check("a linked minion with two tokens on the scene: both rings are redrawn", [one.refreshes().length, two.refreshes().length], [1, 1]);
}
{
  const gone = makeToken("h", { destroyed: true });
  const none = makeToken("i", { noObject: true });
  let error = null;
  try {
    fire("updateActor", syntheticActor(gone), hpChange);
    fire("updateActor", syntheticActor(none), hpChange);
    advance(RING_REPAIR_DELAY_MS);
  } catch (e) { error = e.message; }
  check("a token removed from the canvas in the meantime: nothing breaks", [error, gone.refreshes().length], [null, 0]);
}
{
  const token = makeToken("j");
  const actor = syntheticActor(token);
  fire("updateActor", actor, hpChange);
  token.ring.enabled = false;
  advance(RING_REPAIR_DELAY_MS);
  check("the ring turned off during the wait: no redraw", token.refreshes().length, 0);
}
{
  let error = null;
  try {
    fire("createActiveEffect", { statuses: new Set(["dead"]), parent: { documentName: "Item" } });
    fire("createActiveEffect", {});
    fire("updateActor", null, hpChange);
  } catch (e) { error = e.message; }
  check("Dead on an item, an effect without statuses, no actor: ignored without errors", error, null);
}
check("the wait outlasts the longest flash of dnd5e (1.6 seconds)", RING_REPAIR_DELAY_MS > 1600, true);

console.log(failures === 0 ? "\nAll ring repair checks passed.\n" : `\n${failures} ring repair check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
