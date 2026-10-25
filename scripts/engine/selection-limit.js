export function applySelectionChange(order, id, checked, max) {
  if (!Array.isArray(order)) {
    throw new Error("applySelectionChange: order must be an array");
  }
  if (typeof max !== "number" || Number.isNaN(max) || max < 0) {
    throw new Error(`applySelectionChange: invalid max (${max})`);
  }

  const without = order.filter(entry => entry !== id);
  if (!checked) return { order: without, dropped: [] };

  const next = [...without, id];
  const overflow = Math.max(0, next.length - max);
  return { order: next.slice(overflow), dropped: next.slice(0, overflow) };
}

export function clampSelection(selectedIds, orderedCandidateIds, max) {
  if (!Array.isArray(selectedIds) || !Array.isArray(orderedCandidateIds)) {
    throw new Error("clampSelection: selectedIds and orderedCandidateIds must be arrays");
  }
  if (typeof max !== "number" || Number.isNaN(max) || max < 0) {
    throw new Error(`clampSelection: invalid max (${max})`);
  }

  const selected = new Set(selectedIds);
  const known = new Set(orderedCandidateIds);
  const valid = orderedCandidateIds.filter(id => selected.has(id));
  return {
    accepted: valid.slice(0, max),
    excess: valid.slice(max),
    unknown: [...selected].filter(id => !known.has(id))
  };
}
