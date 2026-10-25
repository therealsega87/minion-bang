import { readFileSync } from "node:fs";
import { computeGroupInitiative } from "../scripts/engine/group-initiative.js";
import { maximumForCr } from "../scripts/engine/band-maximums.js";
import { proposeBands } from "../scripts/engine/band-split.js";

const FILES = ["group-initiative", "band-maximums", "band-split", "group-plan", "group-walk", "band-window-model", "band-colors", "band-apply", "token-color-plan", "band-captain", "existing-bands"];
const FORBIDDEN = [
  [/minion/i, "mentions minions"],
  [/\bimport\b(?![^\n]*from "\.\/(?:band-(?:split|colors|window-model)|group-initiative)\.js")/, "imports another file"],
  [/\bgame\b/, "uses the Foundry game object"],
  [/\bui\b\./, "uses the Foundry ui object"],
  [/\bHooks\b/, "uses Foundry hooks"],
  [/\bCONFIG\b/, "uses Foundry CONFIG"],
  [/\bfoundry\b/i, "mentions Foundry"],
  [/\bcanvas\b/, "uses the canvas"],
  [/\bdocument\b/, "uses the DOM"],
  [/\bwindow\b/, "uses the window"]
];

const results = [];
const check = (label, pass, detail = "") => results.push({ label, pass, detail });

for (const name of FILES) {
  const source = readFileSync(new URL(`../scripts/engine/${name}.js`, import.meta.url), "utf8");
  const withoutPaths = source.replace(/from "[^"]*"/g, 'from ""');
  for (const [pattern, reason] of FORBIDDEN) {
    const text = reason === "imports another file" ? source : withoutPaths;
    check(`${name}.js: no code that ${reason}`, !pattern.test(text), pattern.test(text) ? String(text.match(pattern)[0]) : "");
  }
}

const goblins = [11, 14, 9, 17];
const dragons = [20, 5];
check("initiative works for any creature (median of 4 rolls)", computeGroupInitiative("median", goblins) === 13);
check("initiative works for any creature (lowest of 2 rolls)", computeGroupInitiative("lowest", dragons) === 5);
check("the maximum table can be replaced with a table for other creatures", maximumForCr(3, [{ cr: 0, max: 2 }, { cr: 3, max: 3 }]) === 3);
check("a band of 2 is possible with a custom maximum of 2", JSON.stringify(proposeBands(4, 2).sizes) === "[2,2]");

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? "  OK" : "FAIL"}  ${r.label}${r.pass ? "" : `  [${r.detail}]`}`);
}
console.log(`\n${results.length - failed} passed, ${failed} failed, ${results.length} total.\n`);
process.exit(failed === 0 ? 0 : 1);
