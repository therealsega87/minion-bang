import { buildApplyPlan, allMembersOf, validateApply, needsConfirmation, summarizeModels, modelsAreValid } from "../scripts/engine/band-apply.js";
import { createTypeModel, assignMember, renameBand, setBandColor, setBandMode, setBandCaptain } from "../scripts/engine/band-window-model.js";

const members = (prefix, count) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, name: `${prefix}${i + 1}`, img: "x" }));
const model = (prefix, count, extra = {}) => createTypeModel({ key: prefix, name: prefix.toUpperCase(), cr: 0.25, maximum: 5, members: members(prefix, count), ...extra });
const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["the plan has a group for every band, with name, colour and members", () => buildApplyPlan([model("g", 7)]), { groups: [{ typeKey: "g", name: "G 1", color: "#e6194b", mode: null, captainId: "g1", memberIds: ["g1", "g2", "g3", "g4", "g5"] }, { typeKey: "g", name: "G 2", color: "#3cb44b", mode: null, captainId: "g6", memberIds: ["g6", "g7"] }], singles: [] }],
  ["the creatures alone are listed apart", () => buildApplyPlan([model("g", 6)]).singles, ["g6"]],
  ["several types are put together, in order", () => buildApplyPlan([model("g", 3), model("o", 4, { usedColors: ["#e6194b"] })]).groups.map(g => [g.typeKey, g.name, g.color]), [["g", "G 1", "#e6194b"], ["o", "O 1", "#3cb44b"]]],
  ["a single creature type gives no group", () => buildApplyPlan([model("g", 1)]), { groups: [], singles: ["g1"] }],
  ["names are cleaned and colours follow the choice", () => { const m = setBandColor(renameBand(model("g", 3), 0, "  Archers "), 0, "#123456"); return buildApplyPlan([m]).groups[0]; }, { typeKey: "g", name: "Archers", color: "#123456", mode: null, captainId: "g1", memberIds: ["g1", "g2", "g3"] }],
  ["a hand-made composition is respected", () => buildApplyPlan([assignMember(assignMember(model("g", 9), "g1", 1), "g9", 0)]).groups.map(g => g.memberIds), [["g2", "g3", "g4", "g5", "g9"], ["g1", "g6", "g7", "g8"]]],
  ["the mode and the captain chosen reach the plan", () => { const m = setBandCaptain(setBandMode(model("g", 7), 1, "highest"), 1, "g7"); return buildApplyPlan([m]).groups.map(g => [g.mode, g.captainId]); }, [[null, "g1"], ["highest", "g7"]]],
  ["an invalid type blocks the whole plan", () => throws(() => buildApplyPlan([model("g", 3), assignMember(model("o", 9), "o1", 1)])), "throws"],
  ["no types: error", () => throws(() => buildApplyPlan([])), "throws"],
  ["not an array: error", () => throws(() => buildApplyPlan(null)), "throws"],
  ["every creature is in the plan once", () => { const ids = allMembersOf(buildApplyPlan([model("g", 11), model("o", 3)])); return [ids.length, new Set(ids).size]; }, [14, 14]],

  ["validation passes when all tokens exist and none is in the combat", () => validateApply(buildApplyPlan([model("g", 3)]), { existingIds: ["g1", "g2", "g3", "zz"], busyIds: ["zz"] }), { ok: true, missing: [], inCombat: [] }],
  ["validation reports the missing tokens", () => validateApply(buildApplyPlan([model("g", 3)]), { existingIds: ["g1", "g3"], busyIds: [] }), { ok: false, missing: ["g2"], inCombat: [] }],
  ["validation reports tokens already in the combat", () => validateApply(buildApplyPlan([model("g", 3)]), { existingIds: ["g1", "g2", "g3"], busyIds: ["g2"] }), { ok: false, missing: [], inCombat: ["g2"] }],
  ["validation looks at the creatures alone too", () => validateApply(buildApplyPlan([model("g", 6)]), { existingIds: ["g1", "g2", "g3", "g4", "g5"], busyIds: [] }).missing, ["g6"]],
  ["validation accepts sets", () => validateApply(buildApplyPlan([model("g", 2)]), { existingIds: new Set(["g1", "g2"]), busyIds: new Set() }).ok, true],

  ["one type: no confirmation", () => needsConfirmation([model("g", 3)]), false],
  ["more than one type: always a confirmation", () => needsConfirmation([model("g", 3), model("o", 3)]), true],
  ["the summary counts bands, creatures alone and creatures", () => summarizeModels([model("g", 11), model("o", 1)]), [{ name: "G", bands: 2, singles: 1, total: 11 }, { name: "O", bands: 0, singles: 1, total: 1 }]],
  ["models valid", () => modelsAreValid([model("g", 3), model("o", 4)]), true],
  ["one wrong type makes them all not valid", () => modelsAreValid([model("g", 3), assignMember(model("o", 9), "o1", 1)]), false]
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
