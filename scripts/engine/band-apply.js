import { buildPlan, evaluateModel } from "./band-window-model.js";

export function buildApplyPlan(models) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("buildApplyPlan: at least one type is required");
  }
  const groups = [];
  const singles = [];
  for (const model of models) {
    const plan = buildPlan(model);
    for (const band of plan.bands) {
      groups.push({ typeKey: plan.key, name: band.name, color: band.color, mode: band.mode, captainId: band.captainId, memberIds: band.memberIds });
    }
    singles.push(...plan.singleIds);
  }
  return { groups, singles };
}

export function allMembersOf(plan) {
  return [...plan.groups.flatMap(group => group.memberIds), ...plan.singles];
}

export function validateApply(plan, { existingIds, busyIds }) {
  const existing = new Set(existingIds);
  const busy = new Set(busyIds);
  const ids = allMembersOf(plan);
  const missing = ids.filter(id => !existing.has(id));
  const inCombat = ids.filter(id => busy.has(id));
  return { ok: missing.length === 0 && inCombat.length === 0, missing, inCombat };
}

export function needsConfirmation(models) {
  return models.length > 1;
}

export function summarizeModels(models) {
  return models.map(model => {
    const evaluation = evaluateModel(model);
    return { name: model.name, bands: model.expected.length, singles: evaluation.singles, total: model.members.length };
  });
}

export function modelsAreValid(models) {
  return models.every(model => evaluateModel(model).ok);
}
