import { drawTokenRing } from "./token-ring.js";

const RING_COLOR = 0xff3b30;
const STRONG = { width: 4, alpha: 0.9 };
const WEAK = { width: 2, alpha: 0.3 };

const activeRings = new Map();

function drawRing(token, style) {
  return drawTokenRing(token, RING_COLOR, style);
}

export function highlightCandidates(strongIds, weakIds) {
  clearHighlights();
  for (const id of strongIds) {
    const token = canvas.tokens?.get(id);
    if (!token) continue;
    activeRings.set(id, drawRing(token, STRONG));
  }
  for (const id of weakIds) {
    if (activeRings.has(id)) continue;
    const token = canvas.tokens?.get(id);
    if (!token) continue;
    activeRings.set(id, drawRing(token, WEAK));
  }
}

export function setCandidateStrength(tokenId, strong) {
  const existing = activeRings.get(tokenId);
  if (existing) {
    if (!existing.destroyed) existing.destroy();
    activeRings.delete(tokenId);
  }
  const token = canvas.tokens?.get(tokenId);
  if (!token || token.destroyed) return;
  activeRings.set(tokenId, drawRing(token, strong ? STRONG : WEAK));
}

export function clearHighlights() {
  for (const graphics of activeRings.values()) {
    if (!graphics.destroyed) graphics.destroy();
  }
  activeRings.clear();
}

Hooks.on("canvasTearDown", () => clearHighlights());
