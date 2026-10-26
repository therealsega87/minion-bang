import { creditsOverkillKills, defeatedEntry } from "../scripts/engine/kill-credit.js";

const throws = fn => { try { fn(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["the Midi-QOL modes credit the extra kills", () => [creditsOverkillKills("midi-manual"), creditsOverkillKills("midi-auto")], [true, true]],
  ["native mode and anything else credit nothing", () => ["native", undefined, null, "x"].map(creditsOverkillKills), [false, false, false, false]],
  ["the defeated entry has the shape Combat Stats uses", () => defeatedEntry({ minion: { id: "m1", name: "Goblin" }, attackerId: "a1", uniqueId: "u1" }), { name: "Goblin", id: "m1", tokenUuid: "u1", killedBy: "a1" }],
  ["a minion without a name still gets an entry", () => defeatedEntry({ minion: { id: "m1" }, attackerId: "a1", uniqueId: "u1" }).name, null],
  ["a minion without an id is rejected", () => throws(() => defeatedEntry({ minion: {}, attackerId: "a1", uniqueId: "u1" })), "throws"],
  ["an attacker without an id is rejected", () => [undefined, ""].map(attackerId => throws(() => defeatedEntry({ minion: { id: "m1" }, attackerId, uniqueId: "u1" }))), ["throws", "throws"]]
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
