import { planTokenColors } from "../scripts/engine/token-color-plan.js";

const token = (id, extra = {}) => ({ id, ringEnabled: true, current: null, saved: undefined, ...extra });
const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["a token with the ring on gets the colour of its band, keeping the old one", () => planTokenColors([token("a", { current: "#111111" })], { a: "#FF0000" }), { updates: [{ id: "a", color: "#ff0000", save: { value: "#111111" } }], restores: [], circles: [] }],
  ["a ring without a colour saves null", () => planTokenColors([token("a")], { a: "#ff0000" }).updates[0].save, { value: null }],
  ["an already saved original is not overwritten", () => planTokenColors([token("a", { current: "#222222", saved: { value: "#111111" } })], { a: "#ff0000" }).updates[0].save, null],
  ["a ring that already has the colour is left alone, whatever the case", () => planTokenColors([token("a", { current: "#FF0000" })], { a: "#ff0000" }), { updates: [], restores: [], circles: [] }],
  ["a token with the ring off gets a circle", () => planTokenColors([token("a", { ringEnabled: false })], { a: "#00ff00" }), { updates: [], restores: [], circles: [{ id: "a", color: "#00ff00" }] }],
  ["a token that leaves the band gets its original ring back", () => planTokenColors([token("a", { current: "#ff0000", saved: { value: "#111111" } })], {}), { updates: [], restores: [{ id: "a", value: "#111111" }], circles: [] }],
  ["a saved null is restored as null", () => planTokenColors([token("a", { saved: { value: null } })], {}).restores, [{ id: "a", value: null }]],
  ["a token never touched stays untouched", () => planTokenColors([token("a", { current: "#111111" })], {}), { updates: [], restores: [], circles: [] }],
  ["a token not in the band, with the ring off, does nothing", () => planTokenColors([token("a", { ringEnabled: false })], {}), { updates: [], restores: [], circles: [] }],
  ["a ring turned off while a colour was saved gets the circle and the restore", () => planTokenColors([token("a", { ringEnabled: false, saved: { value: "#111111" } })], { a: "#ff0000" }), { updates: [], restores: [{ id: "a", value: "#111111" }], circles: [{ id: "a", color: "#ff0000" }] }],
  ["a wrong colour is ignored as if the token was not in a band", () => planTokenColors([token("a")], { a: "red" }), { updates: [], restores: [], circles: [] }],
  ["several tokens are planned independently", () => planTokenColors([token("a"), token("b", { ringEnabled: false }), token("c")], { a: "#ff0000", b: "#00ff00" }), { updates: [{ id: "a", color: "#ff0000", save: { value: null } }], restores: [], circles: [{ id: "b", color: "#00ff00" }] }],
  ["without a desired table nothing happens", () => planTokenColors([token("a")]), { updates: [], restores: [], circles: [] }],
  ["tokens must be an array", () => throws(() => planTokenColors(null, {})), "throws"]
];

let failed = 0;
for (const [label, run, expected] of cases) {
  let actual;
  try { actual = run(); } catch (error) { actual = `threw: ${error.message}`; }
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(`${pass ? "  OK" : "FAIL"}  ${label}${pass ? "" : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`);
}
console.log(`\n${cases.length - failed} passed, ${failed} failed, ${cases.length} total.\n`);
process.exit(failed === 0 ? 0 : 1);
