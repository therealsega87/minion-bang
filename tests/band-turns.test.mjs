const handlers = new Map();
globalThis.Hooks = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
  }
};
const fire = (name, ...args) => (handlers.get(name) ?? []).forEach(fn => fn(...args));

const settingValues = { groupsEnabled: true };
const activeModules = new Set();
const state = { activeGmIsMe: true };
const notices = [];
const combats = [];

globalThis.ui = { notifications: { warn: text => notices.push(text) } };
globalThis.game = {
  users: { get activeGM() { return { isSelf: state.activeGmIsMe }; } },
  modules: { get: id => ({ active: activeModules.has(id) }) },
  settings: { get: (module, key) => settingValues[key] ?? false },
  i18n: { localize: key => key, format: key => key },
  combats
};

class MockCombat {
  constructor(id, layout, skipDefeated = false) {
    this.id = id;
    this.turns = layout.map((entry, index) => ({ id: `${id}-${index}`, group: entry.group ? { id: entry.group } : null, isDefeated: entry.defeated === true }));
    this.round = 1;
    this.turn = 0;
    this.settings = { skipDefeated };
    this.visited = [];
    this.nextCalls = 0;
    this.previousCalls = 0;
    this.failAtCall = null;
    this.onStep = null;
  }

  skipped(index) {
    return this.settings.skipDefeated && this.turns[index].isDefeated;
  }

  async step(direction) {
    await Promise.resolve();
    const changes = {};
    if (direction > 0) {
      let next = this.turn + 1;
      while (next < this.turns.length && this.skipped(next)) next += 1;
      if (next >= this.turns.length) {
        this.round += 1;
        next = 0;
        while (next < this.turns.length && this.skipped(next)) next += 1;
        changes.round = this.round;
      }
      this.turn = next;
    } else {
      if (this.turn === 0 && this.round <= 1) return this;
      let previous = this.turn - 1;
      while (previous >= 0 && this.skipped(previous)) previous -= 1;
      if (previous < 0) {
        this.round -= 1;
        previous = this.turns.length - 1;
        while (previous > 0 && this.skipped(previous)) previous -= 1;
        changes.round = this.round;
      }
      this.turn = previous;
    }
    changes.turn = this.turn;
    this.visited.push(this.turn);
    fire("updateCombat", this, changes, { direction });
    if (this.onStep) this.onStep(this);
    return this;
  }

  async nextTurn() {
    this.nextCalls += 1;
    if (this.failAtCall !== null && this.nextCalls === this.failAtCall) throw new Error("step failed");
    return this.step(1);
  }

  async previousTurn() {
    this.previousCalls += 1;
    return this.step(-1);
  }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 30));
const { registerBandTurns } = await import("../scripts/adapters/band-turns.js");
registerBandTurns();

const PG = {};
const band = id => ({ group: id });
const standard = () => [PG, band("G1"), band("G1"), band("G1"), band("G1"), band("G1"), PG, band("G2"), band("G2")];

function start(layout, turn = 0, skipDefeated = false) {
  const combat = new MockCombat(`C${combats.length + 1}`, layout, skipDefeated);
  combats.push(combat);
  combat.turn = turn;
  fire("updateCombat", combat, { turn }, {});
  notices.length = 0;
  return combat;
}

async function press(combat, direction = 1) {
  combat.visited = [];
  combat.nextCalls = 0;
  combat.previousCalls = 0;
  if (direction > 0) await combat.nextTurn();
  else await combat.previousTurn();
  await flush();
}

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

{
  const combat = start(standard(), 0);
  await press(combat);
  check("entering a band from a character stops on the first member", [combat.turn, combat.visited], [1, [1]]);
  await press(combat);
  check("passing the turn from the first member walks every member and stops on the next character", [combat.turn, combat.visited, combat.nextCalls], [6, [2, 3, 4, 5, 6], 5]);
  await press(combat);
  check("entering the second band stops on its first member", [combat.turn, combat.round], [7, 1]);
  await press(combat);
  check("the last band walks to the new round and stops on the first character", [combat.turn, combat.round, combat.visited], [0, 2, [8, 0]]);
}

{
  const combat = start(standard(), 6);
  await press(combat, -1);
  check("going back into a band walks back to its first member", [combat.turn, combat.visited, combat.previousCalls], [1, [5, 4, 3, 2, 1], 5]);
  await press(combat, -1);
  check("going back from the first member lands on the character before", [combat.turn, combat.visited], [0, [0]]);
}

{
  const combat = start(standard(), 3);
  await press(combat);
  check("a walk interrupted in the middle resumes at the next press", [combat.turn, combat.visited], [6, [4, 5, 6]]);
}

{
  const combat = start(standard(), 3);
  await press(combat, -1);
  check("going back from the middle of a band stops on its first member", [combat.turn, combat.visited], [1, [2, 1]]);
}

{
  const combat = start(standard(), 1);
  combat.visited = [];
  combat.turn = 4;
  fire("updateCombat", combat, { turn: 4 }, {});
  await flush();
  check("a manual jump inside a band (no direction) does not walk", [combat.turn, combat.nextCalls, combat.previousCalls], [4, 0, 0]);
}

{
  const combat = start([band("G1"), band("G1"), band("G1")], 0);
  await press(combat);
  check("a band alone: pressing from the first member stops after the wrap, on the first member", [combat.turn, combat.round, combat.visited], [0, 2, [1, 2, 0]]);
  await press(combat);
  check("a band alone: the next press does the same in the following round", [combat.turn, combat.round], [0, 3]);
}

{
  const layout = standard();
  layout[3] = { group: "G1", defeated: true };
  const combat = start(layout, 1, true);
  await press(combat);
  check("a defeated member is skipped by the walk when the game skips defeated", [combat.turn, combat.visited], [6, [2, 4, 5, 6]]);
}

{
  const layout = standard();
  layout[3] = { group: "G1", defeated: true };
  const combat = start(layout, 1, false);
  await press(combat);
  check("a defeated member is walked when the game does not skip defeated", [combat.turn, combat.visited], [6, [2, 3, 4, 5, 6]]);
}

{
  const layout = standard();
  layout[1] = { group: "G1", defeated: true };
  const combat = start(layout, 0, true);
  await press(combat);
  check("with the first member defeated, entering stops on the first living one", [combat.turn, combat.visited], [2, [2]]);
  const back = start(layout, 6, true);
  await press(back, -1);
  check("with the first member defeated, going back stops on the first living one", [back.turn, back.visited], [2, [5, 4, 3, 2]]);
}

{
  const combat = start(standard(), 1);
  combat.onStep = c => {
    if (c.visited.length === 2) fire("updateCombat", c, { turn: c.turn }, { direction: 1 });
  };
  await press(combat);
  check("an update that arrives during the walk does not start a second walk", [combat.turn, combat.nextCalls], [6, 5]);
}

{
  const combat = start(standard(), 1);
  combat.failAtCall = 3;
  await press(combat);
  check("a failing step stops the walk and warns the GM", [combat.turn, notices], [3, ["MINIONBANG.BandTurns.Failed"]]);
  combat.failAtCall = null;
  await press(combat);
  check("after a failure the next press resumes normally", [combat.turn, combat.visited], [6, [4, 5, 6]]);
}

{
  settingValues.groupsEnabled = false;
  const combat = start(standard(), 1);
  await press(combat);
  check("setting off: no walk", [combat.turn, combat.nextCalls], [2, 1]);
  settingValues.groupsEnabled = true;
}

{
  activeModules.add("squad-combat-initiative");
  const combat = start(standard(), 1);
  await press(combat);
  check("Squad Combat Initiative active: no walk", [combat.turn, combat.nextCalls], [2, 1]);
  activeModules.delete("squad-combat-initiative");
}

{
  state.activeGmIsMe = false;
  const combat = start(standard(), 1);
  await press(combat);
  check("not the active GM: no walk", [combat.turn, combat.nextCalls], [2, 1]);
  state.activeGmIsMe = true;
}

{
  const combat = start(standard(), 1);
  fire("updateCombat", combat, { name: "renamed" }, { direction: 1 });
  await flush();
  check("an update that is not a turn change is ignored", combat.nextCalls, 0);
  const middle = start(standard(), 3);
  fire("updateCombat", middle, { name: "renamed" }, { direction: -1 });
  await flush();
  check("a backward update that is not a turn change is ignored too", [middle.turn, middle.previousCalls], [3, 0]);
}

{
  const combat = start(standard(), 1);
  combat.turn = null;
  fire("updateCombat", combat, { turn: null }, { direction: 1 });
  combat.turn = 2;
  fire("updateCombat", combat, { turn: 2 }, { direction: 1 });
  await flush();
  check("a combat that has not started does not walk", combat.nextCalls, 0);
}

{
  const combat = start(standard(), 1);
  fire("deleteCombat", combat);
  combat.turn = 2;
  fire("updateCombat", combat, { turn: 2 }, { direction: 1 });
  await flush();
  check("after the combat is deleted its state is forgotten and nothing walks", combat.nextCalls, 0);
}

{
  const first = start(standard(), 1);
  const second = start(standard(), 1);
  await Promise.all([press(first), press(second)]);
  check("two combats walk independently", [first.turn, second.turn], [6, 6]);
}

check("listens to the right events", [(handlers.get("updateCombat") ?? []).length, (handlers.get("deleteCombat") ?? []).length], [1, 1]);

console.log(failures === 0 ? "\nAll band turn checks passed.\n" : `\n${failures} band turn check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
