import {
  createExistingModel, syncExistingModel, setExistingColor, setExistingMode, setExistingCaptain,
  shownCaptain, pendingChanges, hasPendingChanges
} from "../scripts/engine/existing-bands.js";

const members = (...names) => names.map(name => ({ id: `t-${name}`, name }));
const live = (id, extra = {}) => ({ id, name: `Band ${id}`, members: members("a", "b", "c"), rolled: false, color: "#ff0000", mode: "average", captain: "t-b", ...extra });
const err = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };
const model = (...groups) => createExistingModel(groups.length ? groups : [live("g1")]);
const get = (m, id = "g1") => m.groups.find(g => g.id === id);

const cases = [
  ["a model keeps the bands it is given", () => model(live("g1"), live("g2")).groups.map(g => g.id), ["g1", "g2"]],
  ["the bands must be an array", () => err(() => createExistingModel(null)), "throws"],
  ["colour, mode and captain are read from the band", () => { const g = get(model()); return [g.color, g.mode, g.captain, g.rolled]; }, ["#ff0000", "average", "t-b", false]],
  ["a colour is stored in lower case", () => get(model(live("g1", { color: "#AABBCC" }))).color, "#aabbcc"],
  ["a band made by hand has no colour, mode or captain", () => { const g = get(model(live("g1", { color: undefined, mode: undefined, captain: undefined }))); return [g.color, g.mode, g.captain]; }, [null, null, null]],
  ["an unknown mode or a bad colour in the band are ignored", () => { const g = get(model(live("g1", { color: "red", mode: "bogus" }))); return [g.color, g.mode]; }, [null, null]],

  ["nothing changed: nothing to apply", () => [pendingChanges(model()), hasPendingChanges(model())], [[], false]],
  ["the colour can be changed", () => pendingChanges(setExistingColor(model(), "g1", "#00FF00")), [{ id: "g1", color: "#00ff00" }]],
  ["the colour can be changed even after the band has rolled", () => pendingChanges(setExistingColor(model(live("g1", { rolled: true })), "g1", "#00ff00")), [{ id: "g1", color: "#00ff00" }]],
  ["a bad colour is refused", () => err(() => setExistingColor(model(), "g1", "green")), "throws"],
  ["an unknown band is refused", () => err(() => setExistingColor(model(), "zzz", "#00ff00")), "throws"],
  ["the colour set back to the old one is no change", () => hasPendingChanges(setExistingColor(setExistingColor(model(), "g1", "#00ff00"), "g1", "#ff0000")), false],

  ["the mode can be changed before the roll", () => pendingChanges(setExistingMode(model(), "g1", "highest")), [{ id: "g1", mode: "highest" }]],
  ["the mode can go back to the setting (null)", () => pendingChanges(setExistingMode(model(), "g1", null)), [{ id: "g1", mode: null }]],
  ["the mode can not be changed after the roll", () => err(() => setExistingMode(model(live("g1", { rolled: true })), "g1", "highest")), "throws"],
  ["a mode that does not exist is refused", () => err(() => setExistingMode(model(), "g1", "bogus")), "throws"],

  ["the captain can be changed before the roll", () => pendingChanges(setExistingCaptain(model(), "g1", "t-c")), [{ id: "g1", captain: "t-c" }]],
  ["the captain can not be changed after the roll", () => err(() => setExistingCaptain(model(live("g1", { rolled: true })), "g1", "t-c")), "throws"],
  ["the captain must be a member of the band", () => err(() => setExistingCaptain(model(), "g1", "t-zzz")), "throws"],
  ["the shown captain is the saved one", () => shownCaptain(get(model())), "t-b"],
  ["with no captain no member is shown as captain", () => shownCaptain(get(model(live("g1", { captain: undefined })))), null],
  ["a saved captain that left the band: the first member is shown", () => shownCaptain(get(model(live("g1", { captain: "t-gone" })))), "t-a"],
  ["a band without members shows no captain", () => shownCaptain(get(model(live("g1", { members: [], captain: undefined })))), null],
  ["a band that has rolled never lists a mode or captain change, even if the model was edited by hand", () => {
    const g = { ...get(model(live("g1", { rolled: true }))), mode: "highest", captain: "t-c", color: "#00ff00" };
    return pendingChanges({ groups: [g] });
  }, [{ id: "g1", color: "#00ff00" }]],
  ["only the changed fields are listed", () => pendingChanges(setExistingColor(setExistingCaptain(model(live("g1"), live("g2")), "g1", "t-c"), "g2", "#00ff00")), [{ id: "g1", captain: "t-c" }, { id: "g2", color: "#00ff00" }]],

  ["syncing keeps a colour already chosen", () => get(syncExistingModel(setExistingColor(model(), "g1", "#00ff00"), [live("g1")])).color, "#00ff00"],
  ["syncing keeps a mode and a captain chosen before the roll", () => { const m = setExistingCaptain(setExistingMode(model(), "g1", "highest"), "g1", "t-c"); const g = get(syncExistingModel(m, [live("g1")])); return [g.mode, g.captain]; }, ["highest", "t-c"]],
  ["when the band rolls, the mode and captain chosen are dropped but the colour stays", () => {
    const m = setExistingColor(setExistingCaptain(setExistingMode(model(), "g1", "highest"), "g1", "t-c"), "g1", "#00ff00");
    const g = get(syncExistingModel(m, [live("g1", { rolled: true })]));
    return [g.mode, g.captain, g.color, g.rolled, pendingChanges({ groups: [g] })];
  }, ["average", "t-b", "#00ff00", true, [{ id: "g1", color: "#00ff00" }]]],
  ["syncing adds new bands and drops the ones that are gone", () => syncExistingModel(model(live("g1"), live("g2")), [live("g2"), live("g3")]).groups.map(g => g.id), ["g2", "g3"]],
  ["syncing takes what the world says as the new starting point", () => pendingChanges(syncExistingModel(setExistingColor(model(), "g1", "#00ff00"), [live("g1", { color: "#00ff00" })])), []],
  ["a captain chosen who left the band is dropped when syncing", () => get(syncExistingModel(setExistingCaptain(model(), "g1", "t-c"), [live("g1", { members: members("a", "b") })])).captain, "t-b"],
  ["syncing needs an array", () => err(() => syncExistingModel(model(), undefined)), "throws"]
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
