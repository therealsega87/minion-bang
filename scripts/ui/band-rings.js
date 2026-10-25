import { colorToNumber } from "../engine/band-colors.js";
import { drawTokenRing } from "./token-ring.js";

const NORMAL = { width: 3, alpha: 0.9 };
const EMPHASIS = { width: 7, alpha: 1 };
const SINGLE = { width: 2, alpha: 0.6 };

const rings = new Map();
let teardownRegistered = false;

export function clearBandRings() {
  for (const graphics of rings.values()) {
    if (!graphics.destroyed) graphics.destroy();
  }
  rings.clear();
}

export function showBandRings(entries) {
  clearBandRings();
  if (!teardownRegistered) {
    Hooks.on("canvasTearDown", () => clearBandRings());
    teardownRegistered = true;
  }
  for (const entry of entries) {
    const token = canvas.tokens?.get(entry.id);
    if (!token || token.destroyed) continue;
    const style = entry.emphasis ? EMPHASIS : entry.single ? SINGLE : NORMAL;
    rings.set(entry.id, drawTokenRing(token, colorToNumber(entry.color), style));
  }
}
