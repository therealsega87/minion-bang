import { isHexColor } from "./band-colors.js";

function same(a, b) {
  return typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
}

export function planTokenColors(tokens, desired) {
  if (!Array.isArray(tokens)) {
    throw new Error("planTokenColors: tokens must be an array");
  }
  const updates = [];
  const restores = [];
  const circles = [];
  for (const token of tokens) {
    const wanted = desired?.[token.id];
    const color = isHexColor(wanted) ? wanted.toLowerCase() : null;
    const saved = token.saved;
    if (color === null) {
      if (saved !== undefined && saved !== null) restores.push({ id: token.id, value: saved.value ?? null });
      continue;
    }
    if (token.ringEnabled) {
      if (!same(token.current, color)) {
        updates.push({ id: token.id, color, save: saved === undefined || saved === null ? { value: token.current ?? null } : null });
      }
    } else {
      circles.push({ id: token.id, color });
      if (saved !== undefined && saved !== null) restores.push({ id: token.id, value: saved.value ?? null });
    }
  }
  return { updates, restores, circles };
}
