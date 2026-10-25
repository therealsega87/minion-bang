import { planGrouping } from "../scripts/engine/group-plan.js";

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };
const it = (id, key, groupId = null) => ({ id, key, groupId });

const cases = [
  ["four of one kind and one of another: one group of four", () => planGrouping([it("a", "gob"), it("b", "gob"), it("c", "gob"), it("d", "gob"), it("e", "bug")]), { create: [{ key: "gob", memberIds: ["a", "b", "c", "d"] }], add: [] }],
  ["a lone creature makes no group", () => planGrouping([it("a", "gob")]), { create: [], add: [] }],
  ["two of one kind make a group", () => planGrouping([it("a", "gob"), it("b", "gob")]), { create: [{ key: "gob", memberIds: ["a", "b"] }], add: [] }],
  ["creatures without a key are never grouped", () => planGrouping([it("a", null), it("b", null), it("c", undefined)]), { create: [], add: [] }],
  ["two kinds make two groups", () => planGrouping([it("a", "gob"), it("b", "gob"), it("c", "orc"), it("d", "orc")]).create.length, 2],
  ["a newcomer joins the existing group of its kind", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob")]), { create: [], add: [{ groupId: "G1", memberIds: ["c"] }] }],
  ["several newcomers join together", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob"), it("d", "gob")]).add, [{ groupId: "G1", memberIds: ["c", "d"] }]],
  ["a group left with one member still takes newcomers", () => planGrouping([it("a", "gob", "G1"), it("b", "gob")]), { create: [], add: [{ groupId: "G1", memberIds: ["b"] }] }],
  ["a manual group with mixed kinds is never joined", () => planGrouping([it("a", "gob", "M"), it("b", "orc", "M"), it("c", "gob"), it("d", "gob")]), { create: [{ key: "gob", memberIds: ["c", "d"] }], add: [] }],
  ["a manual group with a non-groupable member is never joined", () => planGrouping([it("a", "gob", "M"), it("b", null, "M"), it("c", "gob")]), { create: [], add: [] }],
  ["a group of non-groupable members is ignored", () => planGrouping([it("a", null, "M"), it("b", null, "M"), it("c", "gob"), it("d", "gob")]).create.length, 1],
  ["two groups of the same kind without a limit: the fullest takes the newcomers", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G2"), it("c", "gob", "G2"), it("d", "gob")]), { create: [], add: [{ groupId: "G2", memberIds: ["d"] }] }],
  ["grouped creatures are never moved", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1")]), { create: [], add: [] }],
  ["planning twice on the result is a no-op (idempotent)", () => {
    const first = planGrouping([it("a", "gob"), it("b", "gob"), it("c", "gob")]);
    const applied = [it("a", "gob", "N"), it("b", "gob", "N"), it("c", "gob", "N")];
    return [first.create.length, JSON.stringify(planGrouping(applied))];
  }, [1, JSON.stringify({ create: [], add: [] })]],
  ["7 creatures with capacity 5: a group of 5 and a group of 2", () => planGrouping(["a", "b", "c", "d", "e", "f", "g"].map(id => it(id, "gob")), { gob: 5 }), { create: [{ key: "gob", memberIds: ["a", "b", "c", "d", "e"] }, { key: "gob", memberIds: ["f", "g"] }], add: [] }],
  ["10 creatures with capacity 5: two full groups", () => planGrouping(Array.from({ length: 10 }, (_, i) => it(`m${i}`, "gob")), { gob: 5 }).create.map(g => g.memberIds.length), [5, 5]],
  ["11 creatures with capacity 5: 5, 5 and one left alone", () => {
    const plan = planGrouping(Array.from({ length: 11 }, (_, i) => it(`m${i}`, "gob")), { gob: 5 });
    return [plan.create.map(g => g.memberIds.length), plan.add.length];
  }, [[5, 5], 0]],
  ["4 creatures with capacity 5: one group of 4", () => planGrouping(Array.from({ length: 4 }, (_, i) => it(`m${i}`, "gob")), { gob: 5 }).create.map(g => g.memberIds.length), [4]],
  ["the group of 2 is filled up to 5 by 3 newcomers", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob"), it("d", "gob"), it("e", "gob")], { gob: 5 }), { create: [], add: [{ groupId: "G1", memberIds: ["c", "d", "e"] }] }],
  ["a single creature left after filling stays alone", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob", "G1"), it("d", "gob", "G1"), it("e", "gob", "G1"), it("f", "gob", "G2"), it("g", "gob", "G2"), it("h", "gob"), it("i", "gob"), it("j", "gob"), it("k", "gob")], { gob: 5 }), { create: [], add: [{ groupId: "G2", memberIds: ["h", "i", "j"] }] }],
  ["7 newcomers on a group of 2 (capacity 5): fill it with 3, then a group of 4", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), ...["c", "d", "e", "f", "g", "h", "i"].map(id => it(id, "gob"))], { gob: 5 }), { create: [{ key: "gob", memberIds: ["f", "g", "h", "i"] }], add: [{ groupId: "G1", memberIds: ["c", "d", "e"] }] }],
  ["a lone creature left over joins the next newcomer", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob", "G1"), it("d", "gob", "G1"), it("e", "gob", "G1"), it("x", "gob"), it("y", "gob")], { gob: 5 }), { create: [{ key: "gob", memberIds: ["x", "y"] }], add: [] }],
  ["a full group takes nobody", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob")], { gob: 2 }), { create: [], add: [] }],
  ["a manual group above the capacity counts as full", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G1"), it("c", "gob", "G1"), it("d", "gob")], { gob: 2 }), { create: [], add: [] }],
  ["the fullest partial group is filled first", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G2"), it("c", "gob", "G2"), it("d", "gob")], { gob: 5 }).add, [{ groupId: "G2", memberIds: ["d"] }]],
  ["two partial groups share the newcomers in order of fullness", () => planGrouping([it("a", "gob", "G1"), it("b", "gob", "G2"), it("c", "gob", "G2"), it("d", "gob"), it("e", "gob"), it("f", "gob"), it("g", "gob")], { gob: 4 }).add, [{ groupId: "G2", memberIds: ["d", "e"] }, { groupId: "G1", memberIds: ["f", "g"] }]],
  ["each kind has its own capacity", () => planGrouping([...["a", "b", "c", "d", "e", "f"].map(id => it(id, "gob")), ...["g", "h", "i", "j", "k", "l", "m", "n", "o"].map(id => it(id, "orc"))], { gob: 5, orc: 8 }).create.map(g => `${g.key}:${g.memberIds.length}`), ["gob:5", "orc:8"]],
  ["a kind without a capacity is unlimited", () => planGrouping(Array.from({ length: 30 }, (_, i) => it(`m${i}`, "gob")), {}).create.map(g => g.memberIds.length), [30]],
  ["capacity 1 never makes groups of one", () => planGrouping([it("a", "gob"), it("b", "gob")], { gob: 1 }), { create: [], add: [] }],
  ["invalid capacity throws", () => throws(() => planGrouping([it("a", "gob"), it("b", "gob")], { gob: 0 })), "throws"],
  ["fractional capacity throws", () => throws(() => planGrouping([it("a", "gob"), it("b", "gob")], { gob: 2.5 })), "throws"],
  ["planning again after filling is a no-op", () => {
    const grouped = [it("a", "gob", "N1"), it("b", "gob", "N1"), it("c", "gob", "N1"), it("d", "gob", "N1"), it("e", "gob", "N1"), it("f", "gob", "N2"), it("g", "gob", "N2")];
    return planGrouping(grouped, { gob: 5 });
  }, { create: [], add: [] }],
  ["empty list", () => planGrouping([]), { create: [], add: [] }],
  ["input is not modified", () => {
    const input = [it("a", "gob"), it("b", "gob")];
    planGrouping(input);
    return input;
  }, [it("a", "gob"), it("b", "gob")]],
  ["non-array throws", () => throws(() => planGrouping(null)), "throws"],
  ["missing id throws", () => throws(() => planGrouping([{ key: "gob" }])), "throws"],
  ["duplicate id throws", () => throws(() => planGrouping([it("a", "gob"), it("a", "gob")])), "throws"]
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
