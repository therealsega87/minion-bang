const stored = { maximumsTable: "" };
const sets = [];
const infos = [];
const errors = [];
const rendered = [];
const configs = [];
const scripts = [];

globalThis.game = {
  user: { isGM: true },
  settings: {
    get: (module, key) => stored[key],
    set: async (module, key, value) => { sets.push(value); stored[key] = value; }
  },
  i18n: { localize: key => key }
};
globalThis.ui = { notifications: { info: text => infos.push(text), error: text => errors.push(text), warn: () => {} } };
globalThis.foundry = {
  applications: {
    handlebars: { renderTemplate: async (path, data) => { rendered.push({ path, data }); return "content"; } },
    api: {
      DialogV2: {
        async wait(config) {
          configs.push(config);
          const script = scripts.shift();
          if (!script) throw new Error("no script for the dialog");
          const button = config.buttons.find(b => b.action === script.press);
          if (!button) return undefined;
          const form = { querySelectorAll: selector => (selector === "input[data-maximum]" ? (script.inputs ?? []).map(value => ({ value: String(value) })) : []) };
          return button.callback({}, { form });
        }
      }
    }
  }
};

const { openMaximumsDialog } = await import("../scripts/ui/maximums-dialog.js");
const { currentMaximumsTable, maximumsTableIsCustom } = await import("../scripts/maximums-setting.js");
const { getDefaultMaximumsTable } = await import("../scripts/engine/band-maximums.js");

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
function reset() {
  stored.maximumsTable = "";
  sets.length = 0;
  infos.length = 0;
  errors.length = 0;
  rendered.length = 0;
  configs.length = 0;
  scripts.length = 0;
}
const defaults = () => getDefaultMaximumsTable().map(r => r.max);

{
  reset();
  scripts.push({ press: "cancel" });
  const result = await openMaximumsDialog();
  check("the dialog shows 25 rows with the default maximums", [rendered[0].data.rows.length, rendered[0].data.rows.map(r => r.value)], [25, defaults()]);
  check("the rows show CR 1/8 as a fraction and the default next to the value", [rendered[0].data.rows[1].cr, rendered[0].data.rows[0].defaultValue], ["1/8", 5]);
  check("the dialog uses its template", rendered[0].path, "modules/minion-bang/templates/maximums-table.hbs");
  check("cancel changes nothing", [result, sets.length, infos.length], [false, 0, 0]);
}

{
  reset();
  const values = defaults();
  values[4] = 6;
  scripts.push({ press: "save", inputs: values });
  const result = await openMaximumsDialog();
  check("saving a changed table stores it", [result, maximumsTableIsCustom(), currentMaximumsTable().find(r => r.cr === 1).max], [true, true, 6]);
  check("saving tells the GM", infos, ["MINIONBANG.Maximums.Saved"]);
  scripts.push({ press: "cancel" });
  await openMaximumsDialog();
  check("the dialog reopens with the saved values", rendered.at(-1).data.rows[4].value, 6);
}

{
  reset();
  scripts.push({ press: "save", inputs: defaults() });
  await openMaximumsDialog();
  check("saving the default values stores the empty value", [sets, maximumsTableIsCustom()], [[""], false]);
}

{
  reset();
  const bad = defaults();
  bad[2] = 0;
  const good = defaults();
  good[2] = 4;
  scripts.push({ press: "save", inputs: bad }, { press: "save", inputs: good });
  const result = await openMaximumsDialog();
  check("an invalid value is refused with a message and nothing is stored first", [errors, sets.length], [["MINIONBANG.Maximums.Invalid"], 1]);
  check("after the refusal the dialog reopens with the values just typed", rendered[1].data.rows[2].value, 0);
  check("the corrected table is then saved", [result, currentMaximumsTable().find(r => r.cr === 0.25).max], [true, 4]);
}

{
  reset();
  const one = defaults();
  one[0] = 1;
  scripts.push({ press: "save", inputs: one }, { press: "cancel" });
  await openMaximumsDialog();
  check("a maximum of 1 is refused: a band needs 2 members", [errors.length, sets.length], [1, 0]);
}

{
  reset();
  scripts.push({ press: "cancel" });
  await openMaximumsDialog();
  check("the dialog warns that changing the table affects balance", rendered[0].data.warning, "MINIONBANG.Maximums.Warning");
}

{
  reset();
  const bad = defaults();
  bad[0] = 2.5;
  scripts.push({ press: "save", inputs: bad }, { press: "cancel" });
  const result = await openMaximumsDialog();
  check("a fractional value is refused too", [errors.length, result, sets.length], [1, false, 0]);
}

{
  reset();
  const empty = defaults();
  empty[3] = "";
  scripts.push({ press: "save", inputs: empty }, { press: "cancel" });
  await openMaximumsDialog();
  check("an empty field is refused", [errors.length, sets.length], [1, 0]);
}

{
  reset();
  stored.maximumsTable = JSON.stringify(defaults().map((max, i) => ({ cr: getDefaultMaximumsTable()[i].cr, max: 9 })));
  scripts.push({ press: "reset" });
  const result = await openMaximumsDialog();
  check("the dialog opens with the custom values", rendered[0].data.rows.every(r => r.value === 9), true);
  check("restore default empties the setting and tells the GM", [result, stored.maximumsTable, infos, maximumsTableIsCustom()], [true, "", ["MINIONBANG.Maximums.ResetDone"], false]);
}

{
  reset();
  scripts.push({ press: "none" });
  const result = await openMaximumsDialog();
  check("closing the window changes nothing", [result, sets.length], [false, 0]);
}

{
  reset();
  stored.maximumsTable = "{broken";
  scripts.push({ press: "cancel" });
  await openMaximumsDialog();
  check("an unreadable stored table opens the dialog with the defaults", rendered[0].data.rows.map(r => r.value), defaults());
}

{
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../styles/minion-bang.css", import.meta.url), "utf8");
  const template = readFileSync(new URL("../templates/maximums-table.hbs", import.meta.url), "utf8");
  const rule = css.match(/\.minion-bang-maximums-scroll\s*\{([^}]*)\}/)?.[1] ?? "";
  const room = Number(rule.match(/max-height:\s*calc\(100vh\s*-\s*(\d+)px\)/)?.[1] ?? 0);
  check("the table area is limited to the screen height minus the rest of the window", room > 0, true);
  check("the room left for the title, the text, the buttons and the top offset is at least 300px", room >= 300, true);
  check("the window opens near the top so the table has room", configs.at(-1)?.position?.top <= 60, true);
  check("the table area keeps a minimum height", /min-height:\s*\d+px/.test(rule), true);
  check("the table area scrolls when it does not fit", /overflow-y:\s*(auto|scroll)/.test(rule), true);
  const headPos = template.indexOf("minion-bang-maximums-head");
  const scrollPos = template.indexOf('class="minion-bang-maximums-scroll"');
  check("the header row is outside the scrolling area and comes first", headPos > 0 && scrollPos > headPos, true);
  check("the text above the table is outside the scrolling area", template.indexOf("{{intro}}") < headPos, true);
  check("the inputs do not accept less than 2", /data-maximum="\{\{index\}\}" min="2"/.test(template), true);
  check("the warning is in the template and styled", template.includes("{{warning}}") && css.includes(".minion-bang-maximums-warning"), true);
  check("every input is inside the scrolling area", template.indexOf("data-maximum") > scrollPos, true);
  check("the header does not depend on sticky positioning", css.includes("position: sticky"), false);
  check("the header and the rows have the same columns", /\.minion-bang-maximums-row\s*\{[^}]*grid-template-columns:\s*1fr 1fr 1fr/.test(css), true);
  check("the header and the rows keep the same width next to the scrollbar", (css.match(/scrollbar-gutter:\s*stable/g) ?? []).length >= 2, true);
  check("the header does not scroll", /\.minion-bang-maximums-head\s*\{[^}]*overflow:\s*hidden/.test(css), true);
}

console.log(failures === 0 ? "\nAll maximum table dialog checks passed.\n" : `\n${failures} maximum table dialog check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
