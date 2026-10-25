import { colorToNumber } from "../engine/band-colors.js";
import { drawTokenRing } from "./token-ring.js";

const STYLE = { width: 3, alpha: 0.9 };
const markers = new Map();

export function clearBandMarkers() {
  for (const graphics of markers.values()) {
    if (!graphics.destroyed) graphics.destroy();
  }
  markers.clear();
}

export function showBandMarkers(entries) {
  clearBandMarkers();
  for (const entry of entries) {
    const token = canvas.tokens?.get(entry.id);
    if (!token || token.destroyed) continue;
    markers.set(entry.id, drawTokenRing(token, colorToNumber(entry.color), STYLE));
  }
}
