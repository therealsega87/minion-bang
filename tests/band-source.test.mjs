const settings = { maximumsTable: "" };
let answer = true;
const questions = [];

const tokenList = [];
const selected = [];
const combatants = [];

globalThis.game = {
  settings: { get: (module, key) => settings[key] },
  i18n: { localize: key => key },
  user: { isGM: true },
  get combat() { return { combatants }; }
};
globalThis.ui = { notifications: { warn: () => {} } };
globalThis.canvas = { scene: { tokens: tokenList }, tokens: { controlled: selected } };
globalThis.foundry = {
  applications: {
    api: {
      DialogV2: {
        confirm: async config => { questions.push(config); return answer; }
      }
    }
  }
};

const { eligibleTokens, groupByStatBlock, collectBandTypes, selectedTokenDocuments } = await import("../scripts/adapters/band-source.js");

let counter = 0;
function token(name, { minion = true, cr = 0.25, source = "Compendium.x.goblin", img = "tok.png", actorName = name } = {}) {
  counter += 1;
  return {
    id: `T${counter}`,
    name: `${name} ${counter}`,
    texture: { src: img },
    actor: {
      name: actorName,
      img: "actor.png",
      flags: minion ? { dnd5e: { minionBangMinion: true } } : {},
      system: { details: { cr } },
      _stats: { compendiumSource: source }
    }
  };
}

function reset() {
  tokenList.length = 0;
  selected.length = 0;
  combatants.length = 0;
  questions.length = 0;
  settings.maximumsTable = "";
  answer = true;
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
const idsOf = list => list.map(t => t.id);

{
  reset();
  const a = token("Goblin");
  const b = token("Goblin", { minion: false });
  const c = token("Goblin", { cr: null });
  const d = token("Goblin", { cr: -1 });
  const e = token("Goblin", { cr: "2" });
  const f = token("Goblin");
  const noActor = { id: "TX", name: "ghost", actor: null };
  combatants.push({ tokenId: f.id });
  check("only minions with a valid CR that are not in the combat are eligible", idsOf(eligibleTokens([a, b, c, d, e, f, noActor])), [a.id]);
  check("a CR of 0 is valid", eligibleTokens([token("Rat", { cr: 0 })]).length, 1);
  check("a token without actor is ignored", eligibleTokens([noActor]), []);
}

{
  reset();
  const orc1 = token("Orc", { source: "Compendium.x.orc", cr: 5 });
  const gob1 = token("Goblin", { source: "Compendium.x.goblin", cr: 0.25 });
  const gob2 = token("Goblin", { source: "Compendium.x.goblin", cr: 0.25 });
  const types = groupByStatBlock([orc1, gob1, gob2]);
  check("types are grouped by stat block and sorted by name", types.map(t => [t.name, t.members.length]), [["Goblin", 2], ["Orc", 1]]);
  check("each type carries the maximum of its CR from the default table", types.map(t => t.maximum), [5, 8]);
  check("each type carries its CR and key", types.map(t => [t.cr, t.key]), [[0.25, "Compendium.x.goblin"], [5, "Compendium.x.orc"]]);
  check("members carry id, name and image", types[0].members[0], { id: gob1.id, name: gob1.name, img: "tok.png" });
  settings.maximumsTable = JSON.stringify([{ cr: 0, max: 3 }]);
  check("the maximum comes from the table edited by the GM", groupByStatBlock([gob1])[0].maximum, 3);
}

{
  reset();
  const a = token("Goblin", { source: "Compendium.x.goblin" });
  const b = token("Goblin", { source: "Compendium.x.other-goblin" });
  check("two stat blocks with the same name stay apart", groupByStatBlock([a, b]).length, 2);
  const noImage = { ...token("Rat"), texture: undefined };
  check("a token without image uses the image of its actor", groupByStatBlock([noImage])[0].members[0].img, "actor.png");
  const noImageNoActor = { ...token("Rat"), texture: undefined };
  noImageNoActor.actor.img = undefined;
  check("without any image a default one is used", groupByStatBlock([noImageNoActor])[0].members[0].img, "icons/svg/mystery-man.svg");
}

{
  reset();
  const a = token("Goblin");
  const b = token("Goblin");
  tokenList.push(a, b);
  const types = await collectBandTypes();
  check("nothing selected: all the eligible tokens of the scene, no question", [types[0].members.length, questions.length], [2, 0]);
}

{
  reset();
  const a = token("Goblin");
  const b = token("Goblin");
  const c = token("Orc", { source: "Compendium.x.orc", cr: 5 });
  tokenList.push(a, b, c);
  selected.push({ document: a });
  answer = true;
  const types = await collectBandTypes();
  check("selected tokens and the answer yes: only the selected ones", [types.length, types[0].members.map(m => m.id)], [1, [a.id]]);
  check("the question is asked once", questions.length, 1);
  check("the question uses the texts of the module", [questions[0].yes.label, questions[0].no.label, questions[0].rejectClose], ["MINIONBANG.Bands.Question.Yes", "MINIONBANG.Bands.Question.No", false]);
}

{
  reset();
  const a = token("Goblin");
  const b = token("Goblin");
  tokenList.push(a, b);
  selected.push({ document: a });
  answer = false;
  const types = await collectBandTypes();
  check("the answer no: all the eligible tokens of the scene", types[0].members.length, 2);
}

{
  reset();
  const a = token("Goblin");
  tokenList.push(a);
  selected.push({ document: a });
  answer = null;
  check("closing the question cancels everything", await collectBandTypes(), null);
}

{
  reset();
  const a = token("Goblin");
  const human = token("Bandit", { minion: false });
  tokenList.push(a, human);
  selected.push({ document: human });
  const types = await collectBandTypes();
  check("a selection without eligible minions is ignored and nothing is asked", [types[0].members.length, questions.length], [1, 0]);
}

{
  reset();
  const a = token("Goblin");
  const b = token("Goblin");
  tokenList.push(a, b);
  combatants.push({ tokenId: a.id });
  selected.push({ document: a });
  const types = await collectBandTypes();
  check("a selected token already in the combat does not count as selection", [types[0].members.map(m => m.id), questions.length], [[b.id], 0]);
}

{
  reset();
  const a = token("Goblin");
  const b = token("Orc", { source: "Compendium.x.orc", cr: 5 });
  tokenList.push(a, b);
  combatants.push({ tokenId: a.id }, { tokenId: b.id });
  check("everything already in the combat: no types", await collectBandTypes(), []);
}

{
  reset();
  const a = token("Goblin");
  selected.push(a);
  check("selected tokens without a document are used as they are", idsOf(selectedTokenDocuments()), [a.id]);
}

{
  reset();
  globalThis.canvas = { scene: null, tokens: null };
  check("no scene: no types", await collectBandTypes(), []);
  globalThis.canvas = { scene: { tokens: tokenList }, tokens: { controlled: selected } };
}

console.log(failures === 0 ? "\nAll band source checks passed.\n" : `\n${failures} band source check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
