import { bindSelectionLimit } from "../scripts/ui/selection-binding.js";

class FakeInput {
  constructor(value, checked) {
    this.value = value;
    this.checked = checked;
    this.disabled = false;
    this.listeners = [];
  }
  addEventListener(type, fn) {
    if (type === "change") this.listeners.push(fn);
  }
  click() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.listeners.forEach(fn => fn());
  }
}

class FakeRadio extends FakeInput {
  constructor(value, checked, group) {
    super(value, checked);
    this.group = group;
    group.push(this);
  }
  click() {
    this.group.forEach(r => { r.checked = false; });
    this.checked = true;
    this.listeners.forEach(fn => fn());
  }
}

function makeRoot(inputs, radios = []) {
  return {
    querySelectorAll: selector => (selector.includes("opportunity") ? radios : inputs)
  };
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

function setup(ids, checkedIds, max, withRadios = false) {
  const inputs = ids.map(id => new FakeInput(id, checkedIds.includes(id)));
  const rings = new Map(ids.map(id => [id, checkedIds.includes(id)]));
  const counts = [];
  const locks = [];
  const group = [];
  const radios = withRadios ? [new FakeRadio("no", true, group), new FakeRadio("yes", false, group)] : [];
  bindSelectionLimit(makeRoot(inputs, radios), {
    max,
    onChange: (id, checked) => rings.set(id, checked),
    onCount: count => counts.push(count),
    onLockChange: (locked, selected) => locks.push({ locked, selected })
  });
  const state = () => inputs.filter(i => i.checked).map(i => i.value);
  const disabled = () => inputs.filter(i => i.disabled).length;
  const ringState = () => ids.filter(id => rings.get(id));
  return { inputs, radios, state, disabled, ringState, counts, locks };
}

{
  const t = setup(["a", "b", "c", "d", "e"], ["a"], 1);
  check("10 damage on 6 HP: one box preselected, count starts at 1", t.counts, [1]);
  t.inputs[2].click();
  check("limit 1: checking c unchecks a", t.state(), ["c"]);
  check("limit 1: rings follow the boxes", t.ringState(), ["c"]);
  t.inputs[3].click();
  t.inputs[4].click();
  check("limit 1: after d then e only e stays", t.state(), ["e"]);
  t.inputs[4].click();
  check("limit 1: unchecking the only box leaves none", t.state(), []);
  check("limit 1: counter never exceeds 1", Math.max(...t.counts), 1);
  check("limit 1: last counter value is 0", t.counts.at(-1), 0);
}

{
  const t = setup(["a", "b", "c", "d"], ["a", "b"], 2);
  t.inputs[2].click();
  check("limit 2: checking c drops the oldest (a)", t.state(), ["b", "c"]);
  t.inputs[0].click();
  check("limit 2: checking a again drops b", t.state(), ["a", "c"]);
  t.inputs[2].click();
  t.inputs[3].click();
  check("limit 2: uncheck c then check d keeps both without dropping", t.state(), ["a", "d"]);
  check("limit 2: rings follow the boxes", t.ringState(), ["a", "d"]);
}

{
  const t = setup(["a", "b", "c"], ["a", "b", "c"], 2);
  check("preselection above the limit keeps the first (nearest) ones", t.state(), ["a", "b"]);
  check("trimmed rings match", t.ringState(), ["a", "b"]);
}

{
  const t = setup(["a", "b"], ["a"], undefined);
  t.inputs[1].click();
  check("no limit given: no capping", t.state(), ["a", "b"]);
}

{
  const t = setup(["a", "b", "c", "d"], ["a", "b"], 2, true);
  const [no, yes] = t.radios;
  check("opportunity question: starts unlocked", t.locks, []);
  yes.click();
  check("Yes: all boxes unchecked", t.state(), []);
  check("Yes: all boxes disabled", t.disabled(), 4);
  check("Yes: lock reported with no selection", t.locks.at(-1), { locked: true, selected: [] });
  check("Yes: rings of the previous selection are reset", t.ringState(), []);
  t.inputs[2].click();
  check("Yes: clicks on boxes do nothing", t.state(), []);
  no.click();
  check("No again: previous selection restored", t.state(), ["a", "b"]);
  check("No again: boxes enabled", t.disabled(), 0);
  check("No again: unlock reported with the restored selection", t.locks.at(-1), { locked: false, selected: ["a", "b"] });
  check("No again: counter back to 2", t.counts.at(-1), 2);
  t.inputs[2].click();
  check("No again: limit 2 still applies (c replaces a)", t.state(), ["b", "c"]);
}

{
  const t = setup(["a", "b", "c"], ["a"], 1, true);
  const [no, yes] = t.radios;
  yes.click();
  yes.click();
  check("Yes twice: reported as locked only once", t.locks.filter(l => l.locked).length, 1);
  no.click();
  no.click();
  check("No twice: reported as unlocked only once", t.locks.filter(l => !l.locked).length, 1);
  check("Yes then No twice: selection intact", t.state(), ["a"]);
}

{
  const t = setup(["a", "b"], ["a"], 1, false);
  check("no opportunity question in the dialog: no lock", t.locks, []);
  t.inputs[1].click();
  check("no opportunity question: selection works as before", t.state(), ["b"]);
}

console.log(failures === 0 ? "\nAll selection binding checks passed.\n" : `\n${failures} selection binding check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
