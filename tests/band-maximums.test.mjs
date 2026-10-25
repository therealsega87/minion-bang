import { getDefaultMaximumsTable, normalizeMaximumsTable, maximumForCr, formatChallengeRating, parseMaximumsTable, serializeMaximumsTable, tableWithMaximums } from "../scripts/engine/band-maximums.js";

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };

const manual = { 0: 5, 0.125: 5, 0.25: 5, 0.5: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 8, 6: 8, 7: 8, 8: 8, 9: 10, 10: 10, 11: 10, 12: 10, 13: 10, 14: 10, 15: 10, 16: 10, 17: 10, 18: 10, 19: 10, 20: 10, 21: 10 };

const cases = [
  ["default table has the 25 rows of the manual", () => getDefaultMaximumsTable().length, 25],
  ["every default row matches the manual", () => getDefaultMaximumsTable().every(r => manual[r.cr] === r.max), true],
  ["CR 1/8 needs 5", () => maximumForCr(0.125), 5],
  ["CR 4 needs 5", () => maximumForCr(4), 5],
  ["CR 5 needs 8", () => maximumForCr(5), 8],
  ["CR 8 needs 8", () => maximumForCr(8), 8],
  ["CR 9 needs 10", () => maximumForCr(9), 10],
  ["CR 21 needs 10", () => maximumForCr(21), 10],
  ["CR above the table uses the last row", () => maximumForCr(30), 10],
  ["CR between rows uses the row below (4.5 -> 5)", () => maximumForCr(4.5), 5],
  ["CR between rows uses the row below (8.9 -> 8)", () => maximumForCr(8.9), 8],
  ["custom table is used", () => maximumForCr(3, [{ cr: 0, max: 3 }, { cr: 3, max: 6 }]), 6],
  ["custom table given out of order is sorted", () => maximumForCr(1, [{ cr: 3, max: 6 }, { cr: 0, max: 3 }]), 3],
  ["CR below the smallest row uses the first row", () => maximumForCr(0, [{ cr: 2, max: 4 }]), 4],
  ["reset returns a fresh copy that equals the manual", () => {
    const changed = getDefaultMaximumsTable();
    changed[0].max = 99;
    return getDefaultMaximumsTable()[0].max;
  }, 5],
  ["normalize does not modify its input", () => {
    const input = [{ cr: 3, max: 6 }, { cr: 0, max: 3 }];
    normalizeMaximumsTable(input);
    return input;
  }, [{ cr: 3, max: 6 }, { cr: 0, max: 3 }]],
  ["negative CR throws", () => throws(() => maximumForCr(-1)), "throws"],
  ["NaN CR throws", () => throws(() => maximumForCr(NaN)), "throws"],
  ["string CR throws", () => throws(() => maximumForCr("5")), "throws"],
  ["empty table throws", () => throws(() => normalizeMaximumsTable([])), "throws"],
  ["non-array table throws", () => throws(() => normalizeMaximumsTable({})), "throws"],
  ["zero maximum throws", () => throws(() => normalizeMaximumsTable([{ cr: 1, max: 0 }])), "throws"],
  ["a maximum of 1 throws: a band needs 2 members", () => throws(() => normalizeMaximumsTable([{ cr: 1, max: 1 }])), "throws"],
  ["a maximum of 2 is accepted", () => normalizeMaximumsTable([{ cr: 1, max: 2 }]), [{ cr: 1, max: 2 }]],
  ["fractional maximum throws", () => throws(() => normalizeMaximumsTable([{ cr: 1, max: 2.5 }])), "throws"],
  ["duplicate CR throws", () => throws(() => normalizeMaximumsTable([{ cr: 1, max: 5 }, { cr: 1, max: 6 }])), "throws"],
  ["negative CR in the table throws", () => throws(() => normalizeMaximumsTable([{ cr: -2, max: 5 }])), "throws"],
  ["row without values throws", () => throws(() => normalizeMaximumsTable([{}])), "throws"],
  ["CR 1/8 is written as a fraction", () => formatChallengeRating(0.125), "1/8"],
  ["CR 1/4 is written as a fraction", () => formatChallengeRating(0.25), "1/4"],
  ["CR 1/2 is written as a fraction", () => formatChallengeRating(0.5), "1/2"],
  ["CR 0 and whole CRs are written as numbers", () => [formatChallengeRating(0), formatChallengeRating(7)], ["0", "7"]],
  ["an empty stored value means the default table", () => parseMaximumsTable(""), getDefaultMaximumsTable()],
  ["a valid stored table is read back", () => parseMaximumsTable('[{"cr":5,"max":9},{"cr":1,"max":4}]'), [{ cr: 1, max: 4 }, { cr: 5, max: 9 }]],
  ["invalid JSON throws", () => throws(() => parseMaximumsTable("{oops")), "throws"],
  ["a stored value that is not text throws", () => throws(() => parseMaximumsTable(false)), "throws"],
  ["a stored table with a bad maximum throws", () => throws(() => parseMaximumsTable('[{"cr":1,"max":0}]')), "throws"],
  ["the default table is stored as an empty value", () => serializeMaximumsTable(getDefaultMaximumsTable()), ""],
  ["a changed table is stored as text", () => parseMaximumsTable(serializeMaximumsTable([{ cr: 1, max: 3 }])), [{ cr: 1, max: 3 }]],
  ["serialising an invalid table throws", () => throws(() => serializeMaximumsTable([{ cr: 1, max: 1.5 }])), "throws"],
  ["a table built from 25 values keeps the default CRs", () => tableWithMaximums(Array(25).fill(7)).map(r => r.cr), getDefaultMaximumsTable().map(r => r.cr)],
  ["a table built from 25 values takes the values", () => tableWithMaximums(Array(25).fill(7)).every(r => r.max === 7), true],
  ["the wrong number of values throws", () => throws(() => tableWithMaximums([5, 5])), "throws"],
  ["values that are not an array throw", () => throws(() => tableWithMaximums(null)), "throws"],
  ["25 default values build exactly the default table", () => tableWithMaximums(getDefaultMaximumsTable().map(r => r.max)), getDefaultMaximumsTable()]
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
