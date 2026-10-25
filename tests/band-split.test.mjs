import { MIN_BAND_SIZE, proposeBands } from "../scripts/engine/band-split.js";

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["a band has at least 2 members", () => MIN_BAND_SIZE, 2],
  ["7 with maximum 5: 5 and 2", () => proposeBands(7, 5), { sizes: [5, 2], singles: 0 }],
  ["10 with maximum 5: 5 and 5", () => proposeBands(10, 5), { sizes: [5, 5], singles: 0 }],
  ["5 with maximum 5: one band of 5", () => proposeBands(5, 5), { sizes: [5], singles: 0 }],
  ["6 with maximum 5: 5 and one alone", () => proposeBands(6, 5), { sizes: [5], singles: 1 }],
  ["11 with maximum 5: 5, 5 and one alone", () => proposeBands(11, 5), { sizes: [5, 5], singles: 1 }],
  ["12 with maximum 5: 5, 5 and 2", () => proposeBands(12, 5), { sizes: [5, 5, 2], singles: 0 }],
  ["20 with maximum 8: 8, 8 and 4", () => proposeBands(20, 8), { sizes: [8, 8, 4], singles: 0 }],
  ["3 with maximum 10: one band of 3", () => proposeBands(3, 10), { sizes: [3], singles: 0 }],
  ["2 with maximum 5: one band of 2", () => proposeBands(2, 5), { sizes: [2], singles: 0 }],
  ["1 alone forms no band", () => proposeBands(1, 5), { sizes: [], singles: 1 }],
  ["0 creatures: nothing", () => proposeBands(0, 5), { sizes: [], singles: 0 }],
  ["maximum 2: pairs", () => proposeBands(5, 2), { sizes: [2, 2], singles: 1 }],
  ["the proposal never exceeds the maximum", () => [3, 4, 5, 6, 7, 8, 9, 13, 21, 40].every(n => proposeBands(n, 5).sizes.every(s => s <= 5)), true],
  ["the proposal never makes a band below 2", () => [2, 3, 4, 5, 6, 7, 8, 9, 13, 21, 40].every(n => proposeBands(n, 5).sizes.every(s => s >= 2)), true],
  ["the proposal places everyone", () => [0, 1, 2, 3, 6, 7, 12, 13, 40].every(n => { const p = proposeBands(n, 5); return p.sizes.reduce((a, b) => a + b, 0) + p.singles === n; }), true],
  ["at most one creature is left alone", () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 21, 40].every(n => proposeBands(n, 5).singles <= 1), true],
  ["negative total throws", () => throws(() => proposeBands(-1, 5)), "throws"],
  ["fractional total throws", () => throws(() => proposeBands(3.5, 5)), "throws"],
  ["maximum 1 throws", () => throws(() => proposeBands(5, 1)), "throws"],
  ["text maximum throws", () => throws(() => proposeBands(5, "5")), "throws"],


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
