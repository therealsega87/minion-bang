export const BAND_PALETTE = Object.freeze([
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
  "#9a6324", "#800000"
]);

export const SINGLE_COLOR = "#9e9e9e";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR.test(value);
}

export function colorToNumber(color) {
  if (!isHexColor(color)) {
    throw new Error(`colorToNumber: not a #rrggbb color (${color})`);
  }
  return parseInt(color.slice(1), 16);
}

export function pickFreeColors(count, usedColors = []) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`pickFreeColors: the count must be a whole number of at least 0 (${count})`);
  }
  if (!Array.isArray(usedColors)) {
    throw new Error("pickFreeColors: the used colors must be an array");
  }
  const uses = new Map(BAND_PALETTE.map(color => [color, 0]));
  for (const color of usedColors) {
    if (!isHexColor(color)) continue;
    const key = color.toLowerCase();
    if (uses.has(key)) uses.set(key, uses.get(key) + 1);
  }
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    let best = BAND_PALETTE[0];
    for (const color of BAND_PALETTE) {
      if (uses.get(color) < uses.get(best)) best = color;
    }
    uses.set(best, uses.get(best) + 1);
    picked.push(best);
  }
  return picked;
}
