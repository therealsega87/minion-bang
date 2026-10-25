import { bandNames, createTypeModel, assignMember, renameBand, evaluateModel, buildPlan, setBandColor, memberColors, setBandMode, setBandCaptain, effectiveCaptain, bandMembers } from "../scripts/engine/band-window-model.js";

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };
const people = count => Array.from({ length: count }, (_, i) => ({ id: `m${i + 1}`, name: `Goblin ${i + 1}` }));
const model = (count, extra = {}) => createTypeModel({ key: "gob", name: "Goblin Lackey", cr: 0.25, maximum: 5, members: people(count), ...extra });
const bandOf = (m, id) => m.assignment[id];
const sizesOf = m => evaluateModel(m).bands.map(b => b.actual);

const cases = [
  ["names start from 1", () => bandNames("Goblin Lackey", 3), ["Goblin Lackey 1", "Goblin Lackey 2", "Goblin Lackey 3"]],
  ["names continue after the ones already taken", () => bandNames("Goblin Lackey", 2, ["Goblin Lackey 1", "Goblin Lackey 2"]), ["Goblin Lackey 3", "Goblin Lackey 4"]],
  ["names continue after the highest number, not after the count", () => bandNames("Goblin Lackey", 1, ["Goblin Lackey 7"]), ["Goblin Lackey 8"]],
  ["names of other creatures do not count", () => bandNames("Goblin Lackey", 1, ["Orc 3", "Goblin Lackey Boss 4"]), ["Goblin Lackey 1"]],
  ["a name without a number does not count", () => bandNames("Goblin Lackey", 1, ["Goblin Lackey"]), ["Goblin Lackey 1"]],
  ["names with special characters are matched literally", () => bandNames("Orc (Big)", 1, ["Orc (Big) 2"]), ["Orc (Big) 3"]],
  ["a base with regular expression symbols does not match other text", () => bandNames("A.B", 1, ["AxB 5"]), ["A.B 1"]],
  ["zero names", () => bandNames("Goblin", 0), []],
  ["taken names that are not text are ignored", () => bandNames("Goblin", 1, [null, 4, undefined]), ["Goblin 1"]],
  ["an empty base throws", () => throws(() => bandNames("  ", 1)), "throws"],
  ["a negative count throws", () => throws(() => bandNames("Goblin", -1)), "throws"],
  ["a fractional count throws", () => throws(() => bandNames("Goblin", 1.5)), "throws"],

  ["9 creatures: bands 5 and 4, nobody alone", () => [model(9).expected, model(9).singles], [[5, 4], 0]],
  ["6 creatures: one band of 5 and one alone", () => [model(6).expected, model(6).singles], [[5], 1]],
  ["7 creatures: 5 and 2", () => model(7).expected, [5, 2]],
  ["12 creatures: 5, 5 and 2", () => model(12).expected, [5, 5, 2]],
  ["1 creature: no band, it stays alone", () => [model(1).expected, model(1).singles, bandOf(model(1), "m1")], [[], 1, null]],
  ["the proposal fills the bands in order", () => { const m = model(9); return [bandOf(m, "m1"), bandOf(m, "m5"), bandOf(m, "m6"), bandOf(m, "m9")]; }, [0, 0, 1, 1]],
  ["the creature left over is the last one", () => bandOf(model(6), "m6"), null],
  ["the proposed bands are named from 1", () => model(9).names, ["Goblin Lackey 1", "Goblin Lackey 2"]],
  ["the numbering continues after existing groups", () => model(9, { takenNames: ["Goblin Lackey 1"] }).names, ["Goblin Lackey 2", "Goblin Lackey 3"]],
  ["a maximum of 8 gives bigger bands", () => createTypeModel({ key: "k", name: "Ogre", cr: 6, maximum: 8, members: people(10) }).expected, [8, 2]],
  ["the proposal is valid", () => evaluateModel(model(9)).ok, true],
  ["the proposal of a single creature is valid", () => evaluateModel(model(1)).ok, true],
  ["the model does not share the member list", () => { const list = people(3); const m = createTypeModel({ key: "k", name: "A", cr: 1, maximum: 5, members: list }); list[0].name = "changed"; return m.members[0].name; }, "Goblin 1"],
  ["no members throws", () => throws(() => createTypeModel({ key: "k", name: "A", cr: 1, maximum: 5, members: [] })), "throws"],
  ["members that are not an array throw", () => throws(() => createTypeModel({ key: "k", name: "A", cr: 1, maximum: 5, members: null })), "throws"],
  ["a member without id throws", () => throws(() => createTypeModel({ key: "k", name: "A", cr: 1, maximum: 5, members: [{ name: "x" }, { id: "b" }] })), "throws"],
  ["a duplicate member id throws", () => throws(() => createTypeModel({ key: "k", name: "A", cr: 1, maximum: 5, members: [{ id: "a" }, { id: "a" }] })), "throws"],
  ["a missing name throws", () => throws(() => createTypeModel({ key: "k", name: "", cr: 1, maximum: 5, members: people(2) })), "throws"],
  ["a bad maximum throws", () => throws(() => createTypeModel({ key: "k", name: "A", cr: 1, maximum: 1, members: people(2) })), "throws"],

  ["moving a creature changes the counts", () => sizesOf(assignMember(model(9), "m1", 1)), [4, 5]],
  ["moving a creature makes the model invalid", () => evaluateModel(assignMember(model(9), "m1", 1)).errors, [{ code: "count", band: 0, expected: 5, actual: 4 }, { code: "count", band: 1, expected: 4, actual: 5 }]],
  ["swapping two creatures keeps the sizes valid", () => evaluateModel(assignMember(assignMember(model(9), "m1", 1), "m9", 0)).ok, true],
  ["after a swap the creatures are in the new bands", () => { const m = assignMember(assignMember(model(9), "m1", 1), "m9", 0); return [bandOf(m, "m1"), bandOf(m, "m9")]; }, [1, 0]],
  ["choosing the creature that stays alone", () => { const m = assignMember(assignMember(model(6), "m1", null), "m6", 0); return [evaluateModel(m).ok, evaluateModel(m).singles, bandOf(m, "m1")]; }, [true, 1, null]],
  ["sending a creature alone without taking another breaks the band", () => evaluateModel(assignMember(model(6), "m1", null)).errors.map(e => [e.code, e.band, e.actual]), [["count", 0, 4]]],
  ["assigning does not modify the original model", () => { const m = model(9); assignMember(m, "m1", 1); return bandOf(m, "m1"); }, 0],
  ["an unknown creature throws", () => throws(() => assignMember(model(9), "zzz", 0)), "throws"],
  ["an unknown band throws", () => throws(() => assignMember(model(9), "m1", 2)), "throws"],
  ["a negative band throws", () => throws(() => assignMember(model(9), "m1", -1)), "throws"],
  ["a fractional band throws", () => throws(() => assignMember(model(9), "m1", 0.5)), "throws"],
  ["a text band throws", () => throws(() => assignMember(model(9), "m1", "0")), "throws"],
  ["a single creature can not be put in a band", () => throws(() => assignMember(model(1), "m1", 0)), "throws"],

  ["renaming a band", () => renameBand(model(9), 1, "Archers").names, ["Goblin Lackey 1", "Archers"]],
  ["renaming does not modify the original", () => { const m = model(9); renameBand(m, 0, "X"); return m.names[0]; }, "Goblin Lackey 1"],
  ["an empty name makes the model invalid", () => evaluateModel(renameBand(model(9), 0, "   ")).errors, [{ code: "name", band: 0 }]],
  ["an empty name is reported for that band only", () => evaluateModel(renameBand(model(9), 1, "")).bands.map(b => b.nameOk), [true, false]],
  ["an unknown band can not be renamed", () => throws(() => renameBand(model(9), 5, "X")), "throws"],
  ["a name that is not a text throws", () => throws(() => renameBand(model(9), 0, 4)), "throws"],

  ["the evaluation counts every band", () => evaluateModel(model(12)).bands.map(b => [b.expected, b.actual]), [[5, 5], [5, 5], [2, 2]]],
  ["the evaluation counts the creatures alone", () => evaluateModel(model(6)).singles, 1],
  ["every band has a colour from the palette, in order", () => model(12).colors, ["#e6194b", "#3cb44b", "#4363d8"]],
  ["the colours skip the ones already used", () => createTypeModel({ key: "o", name: "Orc", cr: 1, maximum: 5, members: [{ id: "a" }, { id: "b" }], usedColors: ["#e6194b", "#3cb44b"] }).colors, ["#4363d8"]],
  ["the colours start again, least used first, when the palette is full", () => createTypeModel({ key: "o", name: "Orc", cr: 1, maximum: 5, members: [{ id: "a" }, { id: "b" }], usedColors: ["#e6194b", "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990", "#9a6324", "#800000"] }).colors, ["#3cb44b"]],
  ["changing a colour", () => setBandColor(model(9), 1, "#AABBCC").colors, ["#e6194b", "#aabbcc"]],
  ["changing a colour does not modify the original", () => { const m = model(9); setBandColor(m, 0, "#000000"); return m.colors[0]; }, "#e6194b"],
  ["a colour that is not #rrggbb throws", () => throws(() => setBandColor(model(9), 0, "red")), "throws"],
  ["an unknown band can not be coloured", () => throws(() => setBandColor(model(9), 4, "#000000")), "throws"],
  ["members take the colour of their band, those alone the neutral one", () => memberColors(model(6)), { m1: "#e6194b", m2: "#e6194b", m3: "#e6194b", m4: "#e6194b", m5: "#e6194b", m6: "#9e9e9e" }],
  ["moving a member changes its colour", () => memberColors(assignMember(model(9), "m1", 1)).m1, "#3cb44b"],
  ["a changed colour reaches the members and the plan", () => { const m = setBandColor(model(7), 1, "#112233"); return [memberColors(m).m6, buildPlan(m).bands[1].color]; }, ["#112233", "#112233"]],
  ["a new band has no mode and no captain chosen", () => [model(7).modes, model(7).captains], [[null, null], [null, null]]],
  ["the captain by default is the first member of the band", () => [effectiveCaptain(model(7), 0), effectiveCaptain(model(7), 1)], ["m1", "m6"]],
  ["choosing a captain", () => effectiveCaptain(setBandCaptain(model(7), 0, "m3"), 0), "m3"],
  ["a captain must be in the band", () => throws(() => setBandCaptain(model(7), 0, "m6")), "throws"],
  ["an unknown band can not have a captain", () => throws(() => setBandCaptain(model(7), 5, "m1")), "throws"],
  ["if the captain leaves the band the first member takes over", () => effectiveCaptain(assignMember(setBandCaptain(model(7), 0, "m3"), "m3", 1), 0), "m1"],
  ["a captain that went away and came back is the captain again", () => effectiveCaptain(assignMember(assignMember(setBandCaptain(model(7), 0, "m3"), "m3", 1), "m3", 0), 0), "m3"],
  ["a captain moved to alone is not the captain", () => effectiveCaptain(assignMember(setBandCaptain(model(7), 0, "m1"), "m1", null), 0), "m2"],
  ["a band with nobody has no captain", () => effectiveCaptain({ ...model(7), assignment: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`m${i + 1}`, null])) }, 0), null],
  ["choosing a mode", () => setBandMode(model(7), 1, "median").modes, [null, "median"]],
  ["going back to the setting", () => setBandMode(setBandMode(model(7), 1, "median"), 1, null).modes, [null, null]],
  ["a mode that does not exist throws", () => throws(() => setBandMode(model(7), 0, "fastest")), "throws"],
  ["an unknown band can not have a mode", () => throws(() => setBandMode(model(7), 3, "median")), "throws"],
  ["the members of a band", () => bandMembers(model(7), 1).map(m => m.id), ["m6", "m7"]],
  ["mode and captain reach the plan", () => { const p = buildPlan(setBandCaptain(setBandMode(model(7), 0, "lowest"), 0, "m4")); return [p.bands[0].mode, p.bands[0].captainId, p.bands[1].mode, p.bands[1].captainId]; }, ["lowest", "m4", null, "m6"]],
  ["the plan lists the members of each band", () => buildPlan(model(7)), { key: "gob", bands: [{ name: "Goblin Lackey 1", color: "#e6194b", mode: null, captainId: "m1", memberIds: ["m1", "m2", "m3", "m4", "m5"] }, { name: "Goblin Lackey 2", color: "#3cb44b", mode: null, captainId: "m6", memberIds: ["m6", "m7"] }], singleIds: [] }],
  ["the plan lists the creatures alone", () => buildPlan(model(6)).singleIds, ["m6"]],
  ["the plan uses the names without spaces around", () => buildPlan(renameBand(model(7), 0, "  Archers  ")).bands[0].name, "Archers"],
  ["the plan follows a hand-made composition", () => buildPlan(assignMember(assignMember(model(9), "m1", 1), "m9", 0)).bands.map(b => b.memberIds), [["m2", "m3", "m4", "m5", "m9"], ["m1", "m6", "m7", "m8"]]],
  ["no plan for an invalid model", () => throws(() => buildPlan(assignMember(model(9), "m1", 1))), "throws"],
  ["no plan for an empty name", () => throws(() => buildPlan(renameBand(model(9), 0, ""))), "throws"],
  ["every creature is in exactly one place in the plan", () => { const p = buildPlan(model(11)); const all = [...p.bands.flatMap(b => b.memberIds), ...p.singleIds]; return [all.length, new Set(all).size]; }, [11, 11]]
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
