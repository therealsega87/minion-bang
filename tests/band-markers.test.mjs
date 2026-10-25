class FakeGraphics {
  constructor() { this.destroyed = false; this.calls = []; }
  lineStyle(w, c, a) { this.calls.push(["line", w, c, a]); }
  drawCircle(x, y, r) { this.calls.push(["circle", x, y, r]); }
  destroy() { this.destroyed = true; }
}
globalThis.PIXI = { Graphics: FakeGraphics };
const tokens = new Map();
const makeToken = (w = 100, h = 100) => ({ w, h, destroyed: false, children: [], addChild(g) { this.children.push(g); } });
globalThis.canvas = { tokens: { get: id => tokens.get(id) } };
const { showBandMarkers, clearBandMarkers } = await import("../scripts/ui/band-markers.js");

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

showBandMarkers([{ id: "a", color: "#ff0000" }, { id: "b", color: "#00ff00" }]);
check("a circle for every token, with the colour", [live(tokens.get("a")).length, live(tokens.get("a"))[0].calls[0], live(tokens.get("b"))[0].calls[0][2]], [1, ["line", 3, 0xff0000, 0.9], 0x00ff00]);
check("the circle is around the token", live(tokens.get("b"))[0].calls[1], ["circle", 100, 50, 106]);
showBandMarkers([{ id: "a", color: "#0000ff" }]);
check("drawing again replaces the circles, it never piles them up", [live(tokens.get("a")).length, live(tokens.get("a"))[0].calls[0][2], live(tokens.get("b")).length], [1, 0x0000ff, 0]);
showBandMarkers([{ id: "missing", color: "#ff0000" }]);
check("a token that is not on the canvas is skipped", [live(tokens.get("a")).length], [0]);
tokens.get("a").destroyed = true;
showBandMarkers([{ id: "a", color: "#ff0000" }]);
check("a destroyed token is skipped", tokens.get("a").children.filter(g => !g.destroyed).length, 0);
tokens.get("a").destroyed = false;
showBandMarkers([{ id: "a", color: "#ff0000" }]);
clearBandMarkers();
clearBandMarkers();
check("clearing removes everything and can be repeated", live(tokens.get("a")).length, 0);
let threw = false;
try { showBandMarkers([{ id: "a", color: "red" }]); } catch { threw = true; }
check("a wrong colour is refused", threw, true);

console.log(failures === 0 ? "\nAll band marker checks passed.\n" : `\n${failures} band marker check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
