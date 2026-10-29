import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const workflow = fs.readFileSync(path.join(root, ".github/workflows/release.yml"), "utf8");
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
const exists = file => fs.existsSync(path.join(root, file));

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

const repo = "therealsega87/minion-bang";

check("the id is minion-bang", manifest.id, "minion-bang");
check("the version is a test build for dnd5e 6 (x.y.z-dev.n)", /^\d+\.\d+\.\d+-dev\.\d+$/.test(manifest.version), true);
check("the latest CHANGELOG section is the manifest version", changelog.match(/^## (\S+)/m)?.[1], manifest.version);
check("the download URL matches the version", manifest.download, `https://github.com/${repo}/releases/download/v${manifest.version}/module.zip`);
check("the manifest URL is fixed to this pre-release, never to the latest stable release", manifest.manifest, `https://github.com/${repo}/releases/download/v${manifest.version}/module.json`);
check("this build declares dnd5e 6 only", manifest.relationships.systems.find(x => x.id === "dnd5e")?.compatibility?.minimum, "6.0.6");
check("the compatibility minimum is set", typeof manifest.compatibility?.minimum, "string");
check("socket is enabled", manifest.socket, true);

check("every script in esmodules exists", manifest.esmodules.filter(f => !exists(f)), []);
check("every style exists", manifest.styles.filter(f => !exists(f)), []);
check("every language file exists", manifest.languages.map(l => l.path).filter(f => !exists(f)), []);

const zipLine = workflow.match(/zip -r module\.zip (.+)/)?.[1]?.trim().split(/\s+/) ?? [];
check("the release zip lists module.json, scripts, styles, templates, lang and the documents",
  ["module.json", "scripts", "styles", "templates", "lang", "LICENSE", "README.md", "CHANGELOG.md"].filter(f => !zipLine.includes(f)), []);
check("every path packed in the release zip exists", zipLine.filter(f => !exists(f)), []);

const templateDir = path.join(root, "templates");
const usedTemplates = [...fs.readFileSync(path.join(root, "scripts/ui/overkill-dialog.js"), "utf8").matchAll(/templates\/([\w-]+\.hbs)/g)].map(m => m[1]);
check("the templates used by the code are in the templates folder", usedTemplates.filter(f => !fs.existsSync(path.join(templateDir, f))), []);

const testFiles = fs.readdirSync(path.join(root, "tests")).filter(f => f.endsWith(".test.mjs"));
check("every test file runs in the workflow", testFiles.filter(f => !workflow.includes(`tests/${f}`)), []);

console.log(failures === 0 ? "\nAll manifest checks passed.\n" : `\n${failures} manifest check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
