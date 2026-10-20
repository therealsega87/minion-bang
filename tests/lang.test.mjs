import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const manifest = read("module.json");

function flatten(object, prefix = "") {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
  );
}

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const htmlTags = text => [...text.matchAll(/<\/?(\w+)>/g)].map(m => m[1]).sort();

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
);

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

const english = new Map(flatten(read("lang/en.json")));

const usedKeys = new Set();
for (const file of [...walk(path.join(root, "scripts")), ...walk(path.join(root, "templates"))]) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/MINIONBANG\.([A-Za-z]+(?:\.[A-Za-z]+)*)(?![\w.$`])/g)) usedKeys.add(`MINIONBANG.${m[1]}`);
}
for (const suffix of ["NoOverkill", "NoOverkillConfirmed"]) {
  usedKeys.add(`MINIONBANG.Notify.${suffix}`);
  usedKeys.add(`MINIONBANG.Chat.${suffix}`);
}
const flatEnglish = new Map([...english].map(([k, v]) => [`MINIONBANG.${k.replace(/^MINIONBANG\./, "")}`, v]));
const missingInEnglish = [...usedKeys].filter(k => !flatEnglish.has(k));
check("every key used in the code exists in lang/en.json", missingInEnglish, []);

const languages = manifest.languages.map(l => l.lang).sort();
check("the manifest declares English and Italian", languages, ["en", "it"]);

for (const entry of manifest.languages) {
  check(`${entry.lang}: the declared file exists`, fs.existsSync(path.join(root, entry.path)), true);
}

const italian = new Map(flatten(read("lang/it.json")));
check("it.json has exactly the keys of en.json", [...italian.keys()].sort(), [...english.keys()].sort());

const placeholderMismatch = [...english].filter(([k, v]) => JSON.stringify(placeholders(v)) !== JSON.stringify(placeholders(italian.get(k) ?? "")));
check("it.json uses the same placeholders in every string", placeholderMismatch.map(([k]) => k), []);

const tagMismatch = [...english].filter(([k, v]) => JSON.stringify(htmlTags(v)) !== JSON.stringify(htmlTags(italian.get(k) ?? "")));
check("it.json keeps the same HTML tags in every string", tagMismatch.map(([k]) => k), []);

const empty = [...italian].filter(([, v]) => !String(v).trim()).map(([k]) => k);
check("it.json has no empty string", empty, []);

console.log(failures === 0 ? "\nAll language checks passed.\n" : `\n${failures} language check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
