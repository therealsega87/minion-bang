/**
 * Rules engine test cases, shared by tests/engine.test.mjs and the
 * "Run Diagnostics" tool. No Foundry or Node.js dependencies.
 */

import { resolveMinionTrait, toHpInstruction } from "./minion-trait.js";
import { computeOverkill, proposeOverkillTargets } from "./overkill.js";
import { filterMeleeCandidates, filterRangedLineCandidates } from "./geometry.js";

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * A case that throws is reported as a failure instead of stopping the run.
 * @returns {{passed: number, failed: number, total: number, cases: Array<Object>}}
 */
export function runEngineSelfTests() {
  const cases = [];

  function check(label, actualFn, expected) {
    try {
      const actual = actualFn();
      cases.push({ label, pass: deepEqual(actual, expected), expected, actual });
    } catch (err) {
      cases.push({ label, pass: false, expected, actual: undefined, error: err.message });
    }
  }

  // Minion trait

  check(
    "attackHit with 1 damage kills the minion",
    () => resolveMinionTrait({ origin: "attackHit", effectiveDamage: 1, hpMax: 6 }).dies,
    true
  );

  check(
    "failedSave with 2 damage on hpMax 8 kills the minion",
    () => resolveMinionTrait({ origin: "failedSave", effectiveDamage: 2, hpMax: 8 }).dies,
    true
  );

  check(
    "otherEffect, 5 damage on hpMax 6, minion survives",
    () => resolveMinionTrait({ origin: "otherEffect", effectiveDamage: 5, hpMax: 6 }).dies,
    false
  );

  check(
    "otherEffect, 6 damage on hpMax 6 (threshold), minion dies",
    () => resolveMinionTrait({ origin: "otherEffect", effectiveDamage: 6, hpMax: 6 }).dies,
    true
  );

  check(
    "attackHit with 0 effective damage (total immunity), minion survives",
    () => resolveMinionTrait({ origin: "attackHit", effectiveDamage: 0, hpMax: 6 }).dies,
    false
  );

  check(
    "dies -> instruction to write 0/0",
    () => toHpInstruction(resolveMinionTrait({ origin: "attackHit", effectiveDamage: 5, hpMax: 6 })),
    { cancel: false, hpValue: 0, hpTemp: 0 }
  );

  check(
    "survives -> instruction to cancel the update",
    () => toHpInstruction(resolveMinionTrait({ origin: "otherEffect", effectiveDamage: 3, hpMax: 6 })),
    { cancel: true }
  );

  // Overkill, including the book's worked examples

  check(
    "Lady Ulnock: D=19, hpMax=6 -> 3 additional minions",
    () => computeOverkill(19, 6),
    { excess: 13, additionalCount: 3 }
  );

  check(
    "Perigold: D=14, hpMax=6 -> 2 additional minions",
    () => computeOverkill(14, 6),
    { excess: 8, additionalCount: 2 }
  );

  check(
    "Sidebar example B: D=13, hpMax=6 -> 2 additional minions",
    () => computeOverkill(13, 6),
    { excess: 7, additionalCount: 2 }
  );

  check(
    "D=6, hpMax=6 -> no overkill",
    () => computeOverkill(6, 6),
    { excess: 0, additionalCount: 0 }
  );

  check(
    "D=4, hpMax=6 -> no overkill (excess clamped to 0)",
    () => computeOverkill(4, 6),
    { excess: 0, additionalCount: 0 }
  );

  check(
    "3 candidates available, 3 needed -> all proposed, no shortfall",
    () => proposeOverkillTargets(
      [{ id: "c", distance: 15 }, { id: "a", distance: 3 }, { id: "b", distance: 8 }],
      3
    ),
    { proposed: [{ id: "a", distance: 3 }, { id: "b", distance: 8 }, { id: "c", distance: 15 }], shortfall: 0 }
  );

  check(
    "only 1 candidate available, 3 needed -> 1 proposed, shortfall 2",
    () => proposeOverkillTargets([{ id: "a", distance: 5 }], 3),
    { proposed: [{ id: "a", distance: 5 }], shortfall: 2 }
  );

  check(
    "no candidates available -> none proposed (Lady Ulnock with no other goblins nearby)",
    () => proposeOverkillTargets([], 3),
    { proposed: [], shortfall: 3 }
  );

  // Overkill range

  check(
    "Lady Ulnock: reach 5, three goblins within 5, one at 10 -> only the three nearby",
    () => filterMeleeCandidates(
      [
        { id: "g1", distanceFromAttacker: 5 },
        { id: "g2", distanceFromAttacker: 5 },
        { id: "g3", distanceFromAttacker: 0 },
        { id: "g4", distanceFromAttacker: 10 }
      ],
      5
    ),
    [
      { id: "g1", distance: 5 },
      { id: "g2", distance: 5 },
      { id: "g3", distance: 0 }
    ]
  );

  check(
    "Perigold: light crossbow, short range 80, line 5 wide -> only those inside the line and range",
    () => filterRangedLineCandidates(
      [
        { id: "z1", alongLine: 20, perpendicular: 0 },
        { id: "z2", alongLine: 79, perpendicular: 2 },
        { id: "z3", alongLine: 79, perpendicular: 3 },
        { id: "z4", alongLine: 90, perpendicular: 0 },
        { id: "z5", alongLine: -5, perpendicular: 0 }
      ],
      80
    ),
    [
      { id: "z1", distance: 20 },
      { id: "z2", distance: 79 }
    ]
  );

  const passed = cases.filter(c => c.pass).length;
  return { passed, failed: cases.length - passed, total: cases.length, cases };
}
