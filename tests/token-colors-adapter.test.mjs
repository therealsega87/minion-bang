const hooks = [];
globalThis.Hooks = { on: (name, fn) => hooks.push({ name, fn }) };
const fire = (name, ...args) => hooks.filter(h => h.name === name).forEach(h => h.fn(...args));

class FakeGraphics {
  constructor() { this.destroyed = false; this.calls = []; }
  lineStyle(w, c, a) { this.calls.push([w, c, a]); }
  drawCircle() {}
  destroy() { this.destroyed = true; }
}
globalThis.PIXI = { Graphics: FakeGraphics };

const settings = { groupsEnabled: true };
const state = { gm: true };
globalThis.game = {
  combats: [],
  settings: { get: (m, k) => settings[k] },
  modules: { get: () => ({ active: false }) },
  users: { get activeGM() { return { isSelf: state.gm }; } }
};

const written = [];
function makeScene(id, tokenSpecs) {
  const docs = tokenSpecs.map(spec => ({
    id: spec.id,
    ring: { enabled: spec.ring === undefined ? true : spec.ring },
    _source: { ring: { colors: { ring: spec.color ?? null } } },
    flags: spec.saved ? { "minion-bang": { ringOriginal: spec.saved } } : {}
  }));
  const scene = {
    id,
    tokens: docs,
    async updateEmbeddedDocuments(type, changes) { written.push([id, type, changes]); }
  };
  return scene;
}
const objects = new Map();
let scene = null;
globalThis.canvas = {
  get scene() { return scene; },
  tokens: { get: id => objects.get(id) }
};
const makeObject = () => ({ w: 100, h: 100, destroyed: false, children: [], addChild(g) { this.children.push(g); } });

function combatWith(sceneRef, entries) {
  return {
    scene: sceneRef,
    combatants: entries.map(e => ({
      tokenId: e.token,
      group: e.color === undefined ? null : { getFlag: (module, key) => (module === "minion-bang" && key === "color" ? e.color : undefined) }
    }))
  };
}

const mod = await import("../scripts/adapters/token-colors.js");
const flush = () => new Promise(resolve => setTimeout(resolve, mod.TOKEN_COLORS_DELAY_MS + 30));

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
const liveCircles = id => objects.get(id).children.filter(g => !g.destroyed).length;
function reset() {
  written.length = 0;
  hooks.length = 0;
  objects.clear();
  state.gm = true;
  settings.groupsEnabled = true;
  game.combats = [];
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#111111" }, { id: "b", ring: false }, { id: "c" }]);
  for (const id of ["a", "b", "c"]) objects.set(id, makeObject());
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }, { token: "b", color: "#00ff00" }, { token: "c" }])];
  await mod.reconcileTokenColors();
  check("GM: the ring of a token with a ring is coloured, the old colour is saved in the same update", written, [["s1", "Token", [{ _id: "a", "ring.colors.ring": "#ff0000", "flags.minion-bang.ringOriginal": { value: "#111111" } }]]]);
  check("GM: a token without ring gets the circle", [liveCircles("a"), liveCircles("b"), liveCircles("c")], [0, 1, 0]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", ring: 1, color: "#111111" }, { id: "b", ring: 0 }, { id: "c", ring: false }, { id: "d", color: "#111111" }]);
  for (const id of ["a", "b", "c", "d"]) objects.set(id, makeObject());
  game.combats = [combatWith(scene, ["a", "b", "c", "d"].map(token => ({ token, color: "#ff0000" })))];
  await mod.reconcileTokenColors();
  check("the field enabled may be a number or a boolean: 1 and true mean on, 0 and false mean off", [written[0][2].map(c => c._id), [liveCircles("a"), liveCircles("b"), liveCircles("c"), liveCircles("d")]], [["a", "d"], [0, 1, 1, 0]]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#ff0000", saved: { value: "#111111" } }]);
  objects.set("a", makeObject());
  game.combats = [];
  await mod.reconcileTokenColors();
  check("when the combat is gone the ring goes back and the saved flag is removed", written, [["s1", "Token", [{ _id: "a", "ring.colors.ring": "#111111", "flags.minion-bang.-=ringOriginal": null }]]]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#ff0000" }]);
  objects.set("a", makeObject());
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }])];
  await mod.reconcileTokenColors();
  check("nothing to write when the ring already has the colour", written.length, 0);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#111111" }, { id: "b", ring: false }]);
  for (const id of ["a", "b"]) objects.set(id, makeObject());
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }, { token: "b", color: "#00ff00" }])];
  state.gm = false;
  await mod.reconcileTokenColors();
  check("player: nothing is written, the circle is drawn", [written.length, liveCircles("b"), liveCircles("a")], [0, 1, 0]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#111111" }]);
  objects.set("a", makeObject());
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }])];
  settings.groupsEnabled = false;
  await mod.reconcileTokenColors();
  check("with the groups off nothing is coloured", [written.length, liveCircles("a")], [0, 0]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a" }]);
  const other = makeScene("s2", [{ id: "z", color: "#ff0000", saved: { value: null } }]);
  objects.set("a", makeObject());
  game.combats = [combatWith(other, [])];
  await mod.reconcileTokenColors();
  check("the scene of a combat that is not the viewed one is restored too", written, [["s2", "Token", [{ _id: "z", "ring.colors.ring": null, "flags.minion-bang.-=ringOriginal": null }]]]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a", color: "#111111" }, { id: "b" }]);
  objects.set("a", makeObject());
  objects.set("b", makeObject());
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }])];
  game.combats[0].combatants.push({ tokenId: "b", group: { flags: { "minion-bang": { color: "#00ff00" } } } });
  await mod.reconcileTokenColors();
  check("the colour is also read from the flags data of the group", written[0][2].map(c => [c._id, c["ring.colors.ring"]]), [["a", "#ff0000"], ["b", "#00ff00"]]);
}

{
  reset();
  scene = makeScene("s1", [{ id: "a" }]);
  objects.set("a", makeObject());
  mod.registerTokenColors();
  const names = hooks.map(h => h.name).sort();
  check("the hooks are registered", names, ["canvasReady", "canvasTearDown", "createCombatant", "createCombatantGroup", "deleteCombat", "deleteCombatant", "deleteCombatantGroup", "updateCombatant", "updateCombatantGroup", "updateToken"].sort());
  await flush();
  written.length = 0;
  scene = makeScene("s1", [{ id: "a", color: "#111111" }]);
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }])];
  fire("updateCombatantGroup");
  fire("updateCombatantGroup");
  fire("createCombatant");
  check("changes are collected: nothing is written immediately", written.length, 0);
  await flush();
  check("changes are collected: after the delay it is written once", written.length, 1);
  written.length = 0;
  fire("updateToken", {}, { x: 100 });
  await flush();
  check("a token that only moves does not trigger anything", written.length, 0);
  scene = makeScene("s1", [{ id: "a", color: "#111111" }]);
  game.combats = [combatWith(scene, [{ token: "a", color: "#ff0000" }])];
  fire("updateToken", {}, { ring: { enabled: false } });
  await flush();
  check("a change to the ring of a token does", written.length, 1);
  objects.get("a").children.length = 0;
  fire("canvasTearDown");
  check("leaving the scene is harmless", true, true);
}

console.log(failures === 0 ? "\nAll token colour checks passed.\n" : `\n${failures} token colour check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
