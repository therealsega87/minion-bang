const hooks = [];
globalThis.Hooks = { on: (name, fn) => hooks.push({ name, fn }) };
class FakeGraphics {
  constructor() { this.destroyed = false; this.calls = []; }
  lineStyle(width, color, alpha) { this.calls.push(["line", width, color, alpha]); }
  drawCircle(x, y, r) { this.calls.push(["circle", x, y, r]); }
  destroy() { this.destroyed = true; }
}
globalThis.PIXI = { Graphics: FakeGraphics };
const tokens = new Map();
const makeToken = (w = 100, h = 100) => ({ w, h, destroyed: false, children: [], addChild(g) { this.children.push(g); } });
globalThis.canvas = { tokens: { get: id => tokens.get(id) } };

const { showBandRings, clearBandRings } = await import("../scripts/ui/band-rings.js");

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) console.log(`      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
}
const live = t => t.children.filter(g => !g.destroyed);

tokens.set("a", makeToken());
tokens.set("b", makeToken(200, 100));
tokens.set("c", makeToken());

showBandRings([{ id: "a", color: "#ff0000" }, { id: "b", color: "#00ff00", emphasis: true }, { id: "c", color: "#9e9e9e", single: true }]);
check("one ring per token", [live(tokens.get("a")).length, live(tokens.get("b")).length, live(tokens.get("c")).length], [1, 1, 1]);
check("normal ring: width 3, colour as number", live(tokens.get("a"))[0].calls[0], ["line", 3, 0xff0000, 0.9]);
check("emphasised ring: thicker and opaque", live(tokens.get("b"))[0].calls[0], ["line", 7, 0x00ff00, 1]);
check("ring for a creature alone: thin and faint", live(tokens.get("c"))[0].calls[0], ["line", 2, 0x9e9e9e, 0.6]);
check("the circle is centred and larger than the token", live(tokens.get("b"))[0].calls[1], ["circle", 100, 50, 106]);

showBandRings([{ id: "a", color: "#0000ff" }]);
check("drawing again removes the previous rings", [live(tokens.get("a")).length, live(tokens.get("b")).length, live(tokens.get("c")).length], [1, 0, 0]);
check("the new ring has the new colour", live(tokens.get("a"))[0].calls[0][2], 0x0000ff);

showBandRings([{ id: "missing", color: "#ff0000" }, { id: "a", color: "#ff0000" }]);
check("a token that is not on the map is skipped without error", live(tokens.get("a")).length, 1);

tokens.get("c").destroyed = true;
showBandRings([{ id: "c", color: "#ff0000" }]);
check("a destroyed token is skipped", tokens.get("c").children.filter(g => !g.destroyed).length, 0);

let threw = false;
try { showBandRings([{ id: "a", color: "red" }]); } catch { threw = true; }
check("a wrong colour is refused", threw, true);

showBandRings([{ id: "a", color: "#ff0000" }, { id: "b", color: "#ff0000" }]);
clearBandRings();
check("clearing removes everything", [live(tokens.get("a")).length, live(tokens.get("b")).length], [0, 0]);
clearBandRings();
check("clearing twice is harmless", true, true);

check("the canvas teardown hook is registered once", hooks.filter(h => h.name === "canvasTearDown").length, 1);
showBandRings([{ id: "a", color: "#ff0000" }]);
hooks.find(h => h.name === "canvasTearDown").fn();
check("the canvas teardown removes the rings", live(tokens.get("a")).length, 0);

console.log(failures === 0 ? "\nAll band ring checks passed.\n" : `\n${failures} band ring check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
