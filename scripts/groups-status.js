import { MODULE_ID, infoLog, warnLog } from "./log.js";

export const SCI_MODULE_ID = "squad-combat-initiative";

export const GROUPS_STATUS = Object.freeze({
  OFF: "off",
  ON: "on",
  BLOCKED: "blocked"
});

export function resolveGroupsStatus({ enabled, conflictActive }) {
  if (typeof enabled !== "boolean" || typeof conflictActive !== "boolean") {
    throw new Error("resolveGroupsStatus: enabled and conflictActive must be booleans");
  }
  if (!enabled) return GROUPS_STATUS.OFF;
  return conflictActive ? GROUPS_STATUS.BLOCKED : GROUPS_STATUS.ON;
}

export function getGroupsStatus() {
  let enabled = false;
  try {
    enabled = game.settings.get(MODULE_ID, "groupsEnabled") === true;
  } catch {
    enabled = false;
  }
  const conflictActive = game.modules.get(SCI_MODULE_ID)?.active === true;
  return resolveGroupsStatus({ enabled, conflictActive });
}

export function groupsActive() {
  return getGroupsStatus() === GROUPS_STATUS.ON;
}

const STATUS_TEXT = {
  [GROUPS_STATUS.OFF]: "off",
  [GROUPS_STATUS.ON]: "on",
  [GROUPS_STATUS.BLOCKED]: "blocked by Squad Combat Initiative"
};

export function describeGroupsStatus(status = getGroupsStatus()) {
  return STATUS_TEXT[status];
}

export function announceGroupsStatus({ log = true } = {}) {
  const status = getGroupsStatus();
  if (log) infoLog(`Shared turns and bands: ${describeGroupsStatus(status)}.`);
  if (status === GROUPS_STATUS.BLOCKED && game.user.isGM) {
    warnLog("Shared turns and bands is on, but Squad Combat Initiative is active: the groups stay off.");
    ui.notifications.warn(game.i18n.localize("MINIONBANG.Groups.BlockedBySci"), { permanent: true });
  }
  return status;
}
