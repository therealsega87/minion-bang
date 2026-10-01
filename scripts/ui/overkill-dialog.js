/**
 * Overkill confirmation dialog. closeOverkillDialog() closes it when the
 * decision has been made elsewhere.
 */

import { highlightCandidates, setCandidateStrength, clearHighlights } from "./map-highlight.js";
import { MODULE_ID, escapeHtml } from "../log.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/overkill-dialog.hbs`;
const openOverkillDialogs = new Map();

function readAnswer(form) {
  const checked = form.querySelectorAll('input[name="minion-bang-target"]:checked');
  const opportunity = form.querySelector('input[name="minion-bang-opportunity"]:checked');
  return {
    selectedIds: Array.from(checked).map(el => el.value),
    opportunityAttack: opportunity?.value === "yes"
  };
}

/**
 * @param {Object} payload
 * @param {string} [payload.requestId]
 * @param {string} payload.attackerName
 * @param {string} payload.hitTokenName
 * @param {string} payload.hitTokenImg
 * @param {string} payload.weaponName
 * @param {Array<{id: string, name: string, img: string, distance: number}>} payload.proposed  Checked by default.
 * @param {Array<{id: string, name: string, img: string, distance: number}>} payload.others    Unchecked by default.
 * @param {number} payload.shortfall
 * @param {string} payload.distanceUnits
 * @param {boolean} payload.askOpportunityAttack
 * @returns {Promise<{selectedIds: string[], opportunityAttack: boolean}|null>}
 */
export async function promptOverkillDialog(payload) {
  const { requestId, attackerName, hitTokenName, hitTokenImg, weaponName, proposed, others, shortfall,
    distanceUnits = "ft", askOpportunityAttack = false } = payload;
  const formatDistance = d => `${Math.round(d * 10) / 10} ${distanceUnits}`;

  const candidates = [
    ...proposed.map(c => ({ ...c, checked: true, distanceLabel: formatDistance(c.distance) })),
    ...others.map(c => ({ ...c, checked: false, distanceLabel: formatDistance(c.distance) }))
  ];

  const introHtml = game.i18n.format("MINIONBANG.Overkill.Intro", {
    attacker: escapeHtml(attackerName),
    target: escapeHtml(hitTokenName),
    weapon: escapeHtml(weaponName)
  });

  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, {
    introHtml, hitTokenName, hitTokenImg, candidates, shortfall, askOpportunityAttack
  });

  highlightCandidates(proposed.map(c => c.id), others.map(c => c.id));

  let result;
  try {
    result = await foundry.applications.api.DialogV2.wait({
      window: { title: "MINIONBANG.Overkill.Title", icon: "fa-solid fa-skull-crossbones" },
      position: { width: 400 },
      content,
      buttons: [
        {
          action: "confirm",
          label: "MINIONBANG.Overkill.Confirm",
          icon: "fa-solid fa-check",
          default: true,
          callback: (event, button) => readAnswer(button.form)
        },
        { action: "cancel", label: "MINIONBANG.Overkill.Cancel", icon: "fa-solid fa-xmark", callback: () => null }
      ],
      rejectClose: false,
      render: (event, dialog) => {
        if (requestId) openOverkillDialogs.set(requestId, dialog);
        dialog.element.querySelectorAll('input[name="minion-bang-target"]').forEach(input => {
          input.addEventListener("change", () => setCandidateStrength(input.value, input.checked));
        });
      }
    });
  } finally {
    if (requestId) openOverkillDialogs.delete(requestId);
    clearHighlights();
  }

  return result ?? null;
}

export function closeOverkillDialog(requestId) {
  openOverkillDialogs.get(requestId)?.close();
}
