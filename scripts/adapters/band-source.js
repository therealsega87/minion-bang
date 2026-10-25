import { maximumForCr } from "../engine/band-maximums.js";
import { challengeRatingOf, isMinionActor, statBlockKey } from "../minion-flags.js";
import { currentMaximumsTable } from "../maximums-setting.js";

function tokenImage(token) {
  return token.texture?.src ?? token.actor?.img ?? "icons/svg/mystery-man.svg";
}

function tokensInCombat() {
  const ids = new Set();
  for (const combatant of game.combat?.combatants ?? []) {
    if (combatant.tokenId) ids.add(combatant.tokenId);
  }
  return ids;
}

export function selectedTokenDocuments() {
  return Array.from(canvas.tokens?.controlled ?? []).map(token => token.document ?? token);
}

export function eligibleTokens(tokens) {
  const inCombat = tokensInCombat();
  return tokens.filter(token => {
    const actor = token.actor;
    if (!actor || inCombat.has(token.id)) return false;
    return isMinionActor(actor) && challengeRatingOf(actor) !== null;
  });
}

export function groupByStatBlock(tokens) {
  const table = currentMaximumsTable();
  const types = new Map();
  for (const token of tokens) {
    const key = statBlockKey(token.actor);
    if (!types.has(key)) {
      const cr = challengeRatingOf(token.actor);
      types.set(key, { key, name: token.actor.name, cr, maximum: maximumForCr(cr, table), members: [] });
    }
    types.get(key).members.push({ id: token.id, name: token.name ?? token.actor.name, img: tokenImage(token) });
  }
  return Array.from(types.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function askSelectedOnly() {
  return foundry.applications.api.DialogV2.confirm({
    window: { title: "MINIONBANG.Bands.Question.Title" },
    content: `<p>${game.i18n.localize("MINIONBANG.Bands.Question.Content")}</p>`,
    yes: { label: "MINIONBANG.Bands.Question.Yes", icon: "fa-solid fa-hand-pointer" },
    no: { label: "MINIONBANG.Bands.Question.No", icon: "fa-solid fa-map" },
    rejectClose: false
  });
}

export async function collectBandTypes() {
  const scene = Array.from(canvas.scene?.tokens ?? []);
  const selected = eligibleTokens(selectedTokenDocuments());
  let tokens = eligibleTokens(scene);
  if (selected.length > 0) {
    const answer = await askSelectedOnly();
    if (answer === null || answer === undefined) return null;
    if (answer === true) tokens = selected;
  }
  return groupByStatBlock(tokens);
}
