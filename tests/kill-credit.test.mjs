import { buildKillSnapshot, creditTiming } from "../scripts/engine/kill-credit.js";

const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };
const base = { attacker: { id: "a1", name: "Akra", type: "character" }, itemName: "Mace", minion: { id: "m1", uuid: "Actor.m1" }, oldHP: 6 };

const cases = [
  ["manual mode credits before the update", () => creditTiming("midi-manual"), "before"],
  ["auto mode credits after the update", () => creditTiming("midi-auto"), "after"],
  ["native mode and anything else do nothing", () => ["native", undefined, null, "x"].map(creditTiming), [null, null, null, null]],
  ["the snapshot names the attacker", () => buildKillSnapshot(base).attacker, { id: "a1", name: "Akra", type: "character" }],
  ["the snapshot carries the item name", () => buildKillSnapshot(base).itemName, "Mace"],
  ["the snapshot is a damage, not a heal", () => { const s = buildKillSnapshot(base); return [s.isHeal, s.isTempHP, s.healingTotal]; }, [false, false, 0]],
  ["the snapshot has one entry: the minion goes from its hit points to 0", () => buildKillSnapshot(base).damageList, [{ actorId: "m1", actorUuid: "Actor.m1", oldHP: 6, newHP: 0, totalDamage: 6, appliedDamage: 6, healingAdjustedTotalDamage: 6 }]],
  ["the target is listed too", () => buildKillSnapshot(base).targetIds, ["m1"]],
  ["without item or uuid the snapshot still works", () => { const s = buildKillSnapshot({ ...base, itemName: undefined, minion: { id: "m1" } }); return [s.itemName, s.damageList[0].actorUuid]; }, [null, null]],
  ["a wrong attacker is rejected", () => [{ ...base, attacker: null }, { ...base, attacker: { id: "", name: "A", type: "character" } }, { ...base, attacker: { id: "a" } }].map(d => throws(() => buildKillSnapshot(d))), ["throws", "throws", "throws"]],
  ["a wrong minion is rejected", () => throws(() => buildKillSnapshot({ ...base, minion: {} })), "throws"],
  ["hit points that are not above 0 are rejected", () => [0, -1, NaN, "6", undefined].map(oldHP => throws(() => buildKillSnapshot({ ...base, oldHP }))), Array(5).fill("throws")]
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
