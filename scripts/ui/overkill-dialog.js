import { highlightCandidates, setCandidateStrength, clearHighlights } from "./map-highlight.js";
import { bindSelectionLimit } from "./selection-binding.js";
import { MODULE_ID, debugLog, escapeHtml } from "../log.js";

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

export async function promptOverkillDialog(payload) {
  const { requestId, attackerName, hitTokenName, hitTokenImg, weaponName, proposed, others, shortfall,
    maxSelectable, autoSelect = true, distanceUnits = "ft", askOpportunityAttack = false } = payload;
  const limitText = selected => game.i18n.format("MINIONBANG.Overkill.Limit", { max: maxSelectable, selected });
  const formatDistance = d => `${Math.round(d * 10) / 10} ${distanceUnits}`;

  const candidates = [
    ...proposed.map(c => ({ ...c, checked: autoSelect, distanceLabel: formatDistance(c.distance) })),
    ...others.map(c => ({ ...c, checked: false, distanceLabel: formatDistance(c.distance) }))
  ];

  const introHtml = game.i18n.format("MINIONBANG.Overkill.Intro", {
    attacker: escapeHtml(attackerName),
    target: escapeHtml(hitTokenName),
    weapon: escapeHtml(weaponName)
  });

  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE_PATH, {
    introHtml, hitTokenName, hitTokenImg, candidates, shortfall, askOpportunityAttack,
    limitText: limitText(autoSelect ? proposed.length : 0)
  });

  const proposedIds = proposed.map(c => c.id);
  const otherIds = others.map(c => c.id);
  if (autoSelect) highlightCandidates(proposedIds, otherIds);
  else highlightCandidates([], [...proposedIds, ...otherIds]);

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
        const limitLine = dialog.element.querySelector(".minion-bang-limit");
        const list = dialog.element.querySelector(".minion-bang-candidates");
        const allIds = [...proposed, ...others].map(c => c.id);
        bindSelectionLimit(dialog.element, {
          max: maxSelectable,
          onChange: (id, checked) => setCandidateStrength(id, checked),
          onCount: count => { if (limitLine) limitLine.textContent = limitText(count); },
          onLockChange: (locked, selectedIds) => {
            list?.classList.toggle("minion-bang-locked", locked);
            if (locked) {
              clearHighlights();
              if (limitLine) limitLine.textContent = game.i18n.localize("MINIONBANG.Overkill.Locked");
              debugLog("Opportunity attack chosen in the dialog: overkill choices locked.");
            } else {
              highlightCandidates(selectedIds, allIds.filter(id => !selectedIds.includes(id)));
              debugLog("Opportunity attack unchosen in the dialog: overkill choices restored.");
            }
          }
        });
      }
    });
  } finally {
    if (requestId) openOverkillDialogs.delete(requestId);
    clearHighlights();
  }

  return result && typeof result === "object" ? result : null;
}

export function closeOverkillDialog(requestId) {
  openOverkillDialogs.get(requestId)?.close();
}
