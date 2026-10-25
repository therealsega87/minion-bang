import { computeGroupInitiative, describeGroupInitiative, INITIATIVE_MODES as M } from "../scripts/engine/group-initiative.js";

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["average 52,7,4 = 21", () => computeGroupInitiative(M.AVERAGE, [52, 7, 4]), 21],
  ["average 7,4 = 5.5 rounds up to 6", () => computeGroupInitiative(M.AVERAGE, [7, 4]), 6],
  ["average 10,10,11 = 10.33 rounds up to 11", () => computeGroupInitiative(M.AVERAGE, [10, 10, 11]), 11],
  ["average of negatives -3,-4 = -3.5 rounds up to -3", () => computeGroupInitiative(M.AVERAGE, [-3, -4]), -3],
  ["highest 52,7,4 = 52", () => computeGroupInitiative(M.HIGHEST, [52, 7, 4]), 52],
  ["lowest 52,7,4 = 4", () => computeGroupInitiative(M.LOWEST, [52, 7, 4]), 4],
  ["median odd 52,7,4 = 7", () => computeGroupInitiative(M.MEDIAN, [52, 7, 4]), 7],
  ["median even 1,4,7,52 = 5.5 rounds up to 6", () => computeGroupInitiative(M.MEDIAN, [52, 1, 7, 4]), 6],
  ["median single value", () => computeGroupInitiative(M.MEDIAN, [9]), 9],
  ["zero is a valid roll", () => computeGroupInitiative(M.LOWEST, [0, 0]), 0],
  ["captain uses the captain only", () => computeGroupInitiative(M.CAPTAIN, [52, 7, 4], 4), 4],
  ["captain does not need the other members", () => computeGroupInitiative(M.CAPTAIN, [], 12), 12],
  ["captain ignores unrolled members", () => computeGroupInitiative(M.CAPTAIN, [null, undefined], 12), 12],
  ["captain without a roll throws", () => throws(() => computeGroupInitiative(M.CAPTAIN, [52, 7], null)), "throws"],
  ["captain NaN throws", () => throws(() => computeGroupInitiative(M.CAPTAIN, [52], NaN)), "throws"],
  ["a member without a roll throws (average)", () => throws(() => computeGroupInitiative(M.AVERAGE, [10, null, 20])), "throws"],
  ["a member without a roll throws (lowest)", () => throws(() => computeGroupInitiative(M.LOWEST, [10, undefined, 20])), "throws"],
  ["a member with NaN throws (highest)", () => throws(() => computeGroupInitiative(M.HIGHEST, [10, NaN])), "throws"],
  ["a numeric string throws", () => throws(() => computeGroupInitiative(M.MEDIAN, [10, "12"])), "throws"],
  ["empty list throws", () => throws(() => computeGroupInitiative(M.HIGHEST, [])), "throws"],
  ["non-array throws", () => throws(() => computeGroupInitiative(M.AVERAGE, 5)), "throws"],
  ["invalid mode throws", () => throws(() => computeGroupInitiative("bogus", [1])), "throws"],
  ["describe average, exact: 11 + 16 + 9 + 14 + 11 = 61 ÷ 5 is not exact, rounds up", () => describeGroupInitiative(M.AVERAGE, [11, 16, 9, 14, 11]), "11 + 16 + 9 + 14 + 11 = 61 ÷ 5 = 12.2 → 13"],
  ["describe average with an exact result has no arrow", () => describeGroupInitiative(M.AVERAGE, [10, 14, 12]), "10 + 14 + 12 = 36 ÷ 3 = 12"],
  ["describe average of 7 and 4 shows 5.5 → 6", () => describeGroupInitiative(M.AVERAGE, [7, 4]), "7 + 4 = 11 ÷ 2 = 5.5 → 6"],
  ["describe highest", () => describeGroupInitiative(M.HIGHEST, [12, 16, 9]), "max(12, 16, 9) = 16"],
  ["describe lowest", () => describeGroupInitiative(M.LOWEST, [12, 16, 9]), "min(12, 16, 9) = 9"],
  ["describe median sorts the rolls", () => describeGroupInitiative(M.MEDIAN, [12, 16, 9, 14, 11]), "9 · 11 · 12 · 14 · 16 → 12"],
  ["describe median with an even number rounds up", () => describeGroupInitiative(M.MEDIAN, [1, 4, 7, 52]), "1 · 4 · 7 · 52 → 6"],
  ["describe captain throws", () => throws(() => describeGroupInitiative(M.CAPTAIN, [1, 2])), "throws"],
  ["describe with an unrolled member throws", () => throws(() => describeGroupInitiative(M.AVERAGE, [1, null])), "throws"],
  ["input is not modified", () => {
    const input = [52, 7, 4];
    computeGroupInitiative(M.MEDIAN, input);
    return input;
  }, [52, 7, 4]]
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
