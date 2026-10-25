const RING_COLOR = 0xff3b30;
const STRONG_ALPHA = 0.9;
const WEAK_ALPHA = 0.3;
const STRONG_WIDTH = 4;
const WEAK_WIDTH = 2;

const activeRings = new Map();

function drawRing(token, { alpha, width }) {
  const graphics = new PIXI.Graphics();
  const radius = Math.max(token.w, token.h) / 2 + 6;
  graphics.lineStyle(width, RING_COLOR, alpha);
  graphics.drawCircle(token.w / 2, token.h / 2, radius);
  token.addChild(graphics);
  return graphics;
}

export function highlightCandidates(strongIds, weakIds) {
  clearHighlights();
  for (const id of strongIds) {
    const token = canvas.tokens?.get(id);
    if (!token) continue;
    activeRings.set(id, drawRing(token, { alpha: STRONG_ALPHA, width: STRONG_WIDTH }));
  }
  for (const id of weakIds) {
    if (activeRings.has(id)) continue;
    const token = canvas.tokens?.get(id);
    if (!token) continue;
    activeRings.set(id, drawRing(token, { alpha: WEAK_ALPHA, width: WEAK_WIDTH }));
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
  activeRings.set(
    tokenId,
    drawRing(token, strong ? { alpha: STRONG_ALPHA, width: STRONG_WIDTH } : { alpha: WEAK_ALPHA, width: WEAK_WIDTH })
  );
}

export function clearHighlights() {
  for (const graphics of activeRings.values()) {
    if (!graphics.destroyed) graphics.destroy();
  }
  activeRings.clear();
}

Hooks.on("canvasTearDown", () => clearHighlights());
