import { getDefaultMaximumsTable, parseMaximumsTable, serializeMaximumsTable } from "./engine/band-maximums.js";
import { MODULE_ID, errorLog } from "./log.js";

let reportedCorrupt = null;

export function currentMaximumsTable() {
  let stored = "";
  try {
    stored = game.settings.get(MODULE_ID, "maximumsTable");
  } catch {
    stored = "";
  }
  if (!stored) return getDefaultMaximumsTable();
  try {
    return parseMaximumsTable(stored);
  } catch (error) {
    if (reportedCorrupt !== stored) {
      reportedCorrupt = stored;
      errorLog("The stored maximums table is not valid, the default table is used:", error);
      if (game.user?.isGM) ui.notifications?.warn(game.i18n.localize("MINIONBANG.Maximums.Corrupt"));
    }
    return getDefaultMaximumsTable();
  }
}

export async function saveMaximumsTable(rows) {
  await game.settings.set(MODULE_ID, "maximumsTable", serializeMaximumsTable(rows));
}

export async function resetMaximumsTable() {
  await game.settings.set(MODULE_ID, "maximumsTable", "");
}

export function maximumsTableIsCustom() {
  return serializeMaximumsTable(currentMaximumsTable()) !== "";
}
