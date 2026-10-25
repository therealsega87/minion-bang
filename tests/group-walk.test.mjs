import { decideWalk } from "../scripts/engine/group-walk.js";

let failures = 0;
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(`${pass ? "  OK " : "FAIL "} ${label}`);
  if (!pass) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

const at = (round, turn, groupId = null) => ({ round, turn, groupId });

check("forward inside the same group continues", decideWalk({ direction: 1, previous: at(1, 1, "A"), current: at(1, 2, "A") }), 1);
check("forward entering a group from outside stops", decideWalk({ direction: 1, previous: at(1, 0), current: at(1, 1, "A") }), 0);
check("forward entering a group from another group stops", decideWalk({ direction: 1, previous: at(1, 3, "B"), current: at(1, 4, "A") }), 0);
check("forward leaving a group stops", decideWalk({ direction: 1, previous: at(1, 5, "A"), current: at(1, 6) }), 0);
check("forward wrapping to the next round stops even in the same group", decideWalk({ direction: 1, previous: at(1, 2, "A"), current: at(2, 0, "A") }), 0);
check("forward with a later round stops even when the turn index is higher", decideWalk({ direction: 1, previous: at(1, 0, "A"), current: at(2, 1, "A") }), 0);
check("backward outside any group stops without the first-member information", decideWalk({ direction: -1, previous: at(1, 2, "A"), current: at(1, 1) }), 0);
check("forward with a turn that does not increase stops", decideWalk({ direction: 1, previous: at(1, 2, "A"), current: at(1, 2, "A") }), 0);
check("forward with a turn that goes back stops", decideWalk({ direction: 1, previous: at(1, 3, "A"), current: at(1, 1, "A") }), 0);
check("backward landing on a member that is not the first continues", decideWalk({ direction: -1, previous: at(1, 6), current: at(1, 5, "A"), firstInGroup: false }), -1);
check("backward landing on the first member stops", decideWalk({ direction: -1, previous: at(1, 2, "A"), current: at(1, 1, "A"), firstInGroup: true }), 0);
check("backward outside any group stops", decideWalk({ direction: -1, previous: at(1, 2, "A"), current: at(1, 1), firstInGroup: true }), 0);
check("backward without the first-member information keeps walking", decideWalk({ direction: -1, previous: at(1, 6), current: at(1, 5, "A") }), -1);
check("backward across a round boundary continues inside a group", decideWalk({ direction: -1, previous: at(2, 0), current: at(1, 8, "B"), firstInGroup: false }), -1);
check("no direction (manual jump) never walks", decideWalk({ direction: undefined, previous: at(1, 1, "A"), current: at(1, 4, "A"), firstInGroup: false }), 0);
check("direction 0 never walks", decideWalk({ direction: 0, previous: at(1, 1, "A"), current: at(1, 2, "A") }), 0);
check("direction 2 never walks", decideWalk({ direction: 2, previous: at(1, 1, "A"), current: at(1, 2, "A") }), 0);
check("missing previous position never walks", decideWalk({ direction: 1, previous: null, current: at(1, 2, "A") }), 0);
check("missing current position never walks", decideWalk({ direction: -1, previous: at(1, 2, "A"), current: undefined }), 0);
check("position without numbers never walks", decideWalk({ direction: 1, previous: { round: "1", turn: 1, groupId: "A" }, current: at(1, 2, "A") }), 0);
check("no turn yet never walks", decideWalk({ direction: 1, previous: { round: 1, turn: NaN, groupId: "A" }, current: at(1, 2, "A") }), 0);

console.log(failures === 0 ? "\nAll group walk checks passed.\n" : `\n${failures} group walk check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
