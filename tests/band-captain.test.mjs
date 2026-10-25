import { chooseCaptain, replacementCaptain, lockDecision } from "../scripts/engine/band-captain.js";

const m = (id, extra = {}) => ({ id, tokenId: `t-${id}`, defeated: false, ...extra });
const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };
const members = [m("a"), m("b"), m("c")];

const cases = [
  ["the preferred captain is chosen when standing", () => chooseCaptain(members, "t-b").id, "b"],
  ["without a preference the first one", () => chooseCaptain(members).id, "a"],
  ["a preference that does not exist falls back to the first", () => chooseCaptain(members, "t-zzz").id, "a"],
  ["a defeated preferred captain is skipped", () => chooseCaptain([m("a"), m("b", { defeated: true }), m("c")], "t-b").id, "a"],
  ["a defeated first member is skipped", () => chooseCaptain([m("a", { defeated: true }), m("b")]).id, "b"],
  ["nobody standing: no captain", () => chooseCaptain([m("a", { defeated: true })]), null],
  ["no members: no captain", () => chooseCaptain([]), null],
  ["members must be an array", () => throws(() => chooseCaptain(null)), "throws"],
  ["the replacement skips the one who left", () => replacementCaptain(members, "a").id, "b"],
  ["the replacement skips the defeated too", () => replacementCaptain([m("a"), m("b", { defeated: true }), m("c")], "a").id, "c"],
  ["nobody left to replace", () => replacementCaptain([m("a")], "a"), null],
  ["the replacement must have an array", () => throws(() => replacementCaptain(undefined, "a")), "throws"],
  ["no lock yet: calculate", () => lockDecision(undefined, 12), "recalculate"],
  ["a lock and the same value: keep", () => lockDecision(12, 12), "keep"],
  ["a lock and a different value: restore the locked one", () => lockDecision(12, 7), "restore"],
  ["a lock and a group value emptied by someone else: restore the locked one", () => [lockDecision(12, null), lockDecision(12, undefined)], ["restore", "restore"]],
  ["no lock and an empty group: calculate", () => lockDecision(undefined, null), "recalculate"],
  ["a lock of zero is a real value", () => [lockDecision(0, 0), lockDecision(0, 3)], ["keep", "restore"]],
  ["a lock that is not a number is no lock", () => [lockDecision("12", 12), lockDecision(NaN, 12), lockDecision(null, 12)], ["recalculate", "recalculate", "recalculate"]]
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
