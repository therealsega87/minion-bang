import { BAND_PALETTE, SINGLE_COLOR, isHexColor, colorToNumber, pickFreeColors } from "../scripts/engine/band-colors.js";

const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };
const cases = [
  ["the palette has at least 10 colours", () => BAND_PALETTE.length >= 10, true],
  ["every colour is #rrggbb", () => BAND_PALETTE.every(isHexColor), true],
  ["the colours are all different", () => new Set(BAND_PALETTE).size, BAND_PALETTE.length],
  ["the neutral colour is not in the palette", () => BAND_PALETTE.includes(SINGLE_COLOR), false],
  ["the palette can not be changed", () => { try { BAND_PALETTE.push("#000000"); } catch { return "locked"; } return BAND_PALETTE.length; }, "locked"],
  ["isHexColor accepts upper and lower case", () => [isHexColor("#AABBCC"), isHexColor("#aabbcc")], [true, true]],
  ["isHexColor rejects the rest", () => ["red", "#abc", "#gggggg", "aabbcc", "#aabbccdd", "", null, 5].map(isHexColor), Array(8).fill(false)],
  ["pickFreeColors with nothing used follows the palette order", () => pickFreeColors(3), BAND_PALETTE.slice(0, 3)],
  ["pickFreeColors skips the colours already used", () => pickFreeColors(2, [BAND_PALETTE[0], BAND_PALETTE[2]]), [BAND_PALETTE[1], BAND_PALETTE[3]]],
  ["pickFreeColors compares upper and lower case as the same", () => pickFreeColors(1, [BAND_PALETTE[0].toUpperCase()]), [BAND_PALETTE[1]]],
  ["pickFreeColors ignores values that are not palette colours", () => pickFreeColors(1, ["#123456", "red", null, "#808080"]), [BAND_PALETTE[0]]],
  ["pickFreeColors never gives the same colour twice while free ones exist", () => (() => { const got = pickFreeColors(BAND_PALETTE.length - 1, [BAND_PALETTE[4]]); return [new Set(got).size, got.includes(BAND_PALETTE[4])]; })(), [BAND_PALETTE.length - 1, false]],
  ["pickFreeColors, with the palette full, gives the least used first", () => pickFreeColors(2, [...BAND_PALETTE, BAND_PALETTE[0], BAND_PALETTE[1]]), [BAND_PALETTE[2], BAND_PALETTE[3]]],
  ["pickFreeColors with zero gives nothing", () => pickFreeColors(0, ["#e6194b"]), []],
  ["pickFreeColors rejects wrong input", () => [throws(() => pickFreeColors(-1)), throws(() => pickFreeColors(1.5)), throws(() => pickFreeColors(1, "x"))], ["throws", "throws", "throws"]],
  ["colorToNumber converts", () => [colorToNumber("#ff0000"), colorToNumber("#00ff7f"), colorToNumber("#000000")], [0xff0000, 0x00ff7f, 0]],
  ["colorToNumber rejects text that is not a colour", () => throws(() => colorToNumber("red")), "throws"]
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
