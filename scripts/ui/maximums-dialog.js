import { formatChallengeRating, getDefaultMaximumsTable, maximumForCr, tableWithMaximums } from "../engine/band-maximums.js";
import { currentMaximumsTable, resetMaximumsTable, saveMaximumsTable } from "../maximums-setting.js";
import { MODULE_ID, errorLog } from "../log.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/maximums-table.hbs`;

function readValues(form) {
  return Array.from(form.querySelectorAll("input[data-maximum]")).map(input => Number(input.value));
}

export async function openMaximumsDialog() {
  const defaults = getDefaultMaximumsTable();
  const table = currentMaximumsTable();
  let values = defaults.map(row => maximumForCr(row.cr, table));

  for (;;) {
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, {
      intro: game.i18n.localize("MINIONBANG.Maximums.Intro"),
      warning: game.i18n.localize("MINIONBANG.Maximums.Warning"),
      crLabel: game.i18n.localize("MINIONBANG.Maximums.Cr"),
      maxLabel: game.i18n.localize("MINIONBANG.Maximums.Max"),
      defaultLabel: game.i18n.localize("MINIONBANG.Maximums.Default"),
      rows: defaults.map((row, index) => ({ index, cr: formatChallengeRating(row.cr), value: values[index], defaultValue: row.max }))
    });

    const answer = await foundry.applications.api.DialogV2.wait({
      window: { title: "MINIONBANG.Maximums.Title", icon: "fa-solid fa-table-list" },
      position: { width: 380, top: 30 },
      content,
      buttons: [
        {
          action: "save",
          label: "MINIONBANG.Maximums.Save",
          icon: "fa-solid fa-check",
          default: true,
          callback: (event, button) => ({ action: "save", values: readValues(button.form) })
        },
        { action: "reset", label: "MINIONBANG.Maximums.Reset", icon: "fa-solid fa-rotate-left", callback: () => ({ action: "reset" }) },
        { action: "cancel", label: "MINIONBANG.Maximums.Cancel", icon: "fa-solid fa-xmark", callback: () => null }
      ],
      rejectClose: false
    });

    if (!answer || typeof answer !== "object") return false;
    if (answer.action === "reset") {
      await resetMaximumsTable();
      ui.notifications.info(game.i18n.localize("MINIONBANG.Maximums.ResetDone"));
      return true;
    }

    values = answer.values;
    try {
      await saveMaximumsTable(tableWithMaximums(values));
    } catch (error) {
      errorLog("Maximums table not saved:", error);
      ui.notifications.error(game.i18n.localize("MINIONBANG.Maximums.Invalid"));
      continue;
    }
    ui.notifications.info(game.i18n.localize("MINIONBANG.Maximums.Saved"));
    return true;
  }
}
