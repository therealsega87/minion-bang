import { resolveGroupsStatus, GROUPS_STATUS } from "../scripts/groups-status.js";

globalThis.game = { settings: { get: () => false }, modules: { get: () => undefined }, user: { isGM: true } };

const throws = run => { try { run(); return "no throw"; } catch { return "throws"; } };

const cases = [
  ["off and no conflict is off", () => resolveGroupsStatus({ enabled: false, conflictActive: false }), GROUPS_STATUS.OFF],
  ["off with conflict is still off", () => resolveGroupsStatus({ enabled: false, conflictActive: true }), GROUPS_STATUS.OFF],
  ["on and no conflict is on", () => resolveGroupsStatus({ enabled: true, conflictActive: false }), GROUPS_STATUS.ON],
  ["on with conflict is blocked", () => resolveGroupsStatus({ enabled: true, conflictActive: true }), GROUPS_STATUS.BLOCKED],
  ["non-boolean enabled throws", () => throws(() => resolveGroupsStatus({ enabled: "yes", conflictActive: false })), "throws"],
  ["missing conflict flag throws", () => throws(() => resolveGroupsStatus({ enabled: true })), "throws"]
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
