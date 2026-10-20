import { resolveMinionTrait, toHpInstruction } from "./minion-trait.js";
import { computeOverkill, proposeOverkillTargets } from "./overkill.js";
import { filterMeleeCandidates, filterRangedLineCandidates } from "./geometry.js";
import { applySelectionChange, clampSelection } from "./selection-limit.js";

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

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

  check(
    "10 damage on 6 HP -> 1 more minion, selection limit is 1",
    () => computeOverkill(10, 6).additionalCount,
    1
  );

  check(
    "limit 1, one checked, a second is checked -> the older one is dropped",
    () => applySelectionChange(["a"], "b", true, 1),
    { order: ["b"], dropped: ["a"] }
  );

  check(
    "limit 2, a and b checked, c is checked -> a is dropped, order b, c",
    () => applySelectionChange(["a", "b"], "c", true, 2),
    { order: ["b", "c"], dropped: ["a"] }
  );

  check(
    "limit 2, one checked, a second is checked -> nothing dropped",
    () => applySelectionChange(["a"], "b", true, 2),
    { order: ["a", "b"], dropped: [] }
  );

  check(
    "unchecking a box removes it from the order",
    () => applySelectionChange(["a", "b"], "a", false, 2),
    { order: ["b"], dropped: [] }
  );

  check(
    "GM clamp: 4 selected, limit 1 -> only the nearest candidate is accepted",
    () => clampSelection(["d", "c", "b", "a"], ["a", "b", "c", "d"], 1),
    { accepted: ["a"], excess: ["b", "c", "d"], unknown: [] }
  );

  check(
    "GM clamp: unknown and duplicate ids are ignored",
    () => clampSelection(["a", "a", "zz"], ["a", "b"], 2),
    { accepted: ["a"], excess: [], unknown: ["zz"] }
  );

  check(
    "GM clamp: selection within the limit is untouched",
    () => clampSelection(["b"], ["a", "b", "c"], 2),
    { accepted: ["b"], excess: [], unknown: [] }
  );

  check(
    "no limit (Infinity) never drops a selection",
    () => applySelectionChange(["a", "b", "c"], "d", true, Infinity),
    { order: ["a", "b", "c", "d"], dropped: [] }
  );

  const passed = cases.filter(c => c.pass).length;
  return { passed, failed: cases.length - passed, total: cases.length, cases };
}
