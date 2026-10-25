import { applySelectionChange } from "../engine/selection-limit.js";

const TARGET_SELECTOR = 'input[name="minion-bang-target"]';
const OPPORTUNITY_SELECTOR = 'input[name="minion-bang-opportunity"]';

export function bindSelectionLimit(root, { max, onChange, onCount, onLockChange }) {
  const inputs = Array.from(root.querySelectorAll(TARGET_SELECTOR));
  const radios = Array.from(root.querySelectorAll(OPPORTUNITY_SELECTOR));
  const byId = new Map(inputs.map(input => [input.value, input]));
  const limit = Number.isFinite(max) ? max : Infinity;
  let order = inputs.filter(input => input.checked).map(input => input.value);
  let locked = false;
  let saved = [];

  if (order.length > limit) {
    const surplus = order.slice(limit);
    order = order.slice(0, limit);
    for (const id of surplus) {
      byId.get(id).checked = false;
      onChange?.(id, false);
    }
  }
  onCount?.(order.length);

  function setLocked(next) {
    if (next === locked) return;
    locked = next;
    if (locked) {
      saved = order;
      order = [];
      for (const input of inputs) {
        input.checked = false;
        input.disabled = true;
      }
      for (const id of saved) onChange?.(id, false);
      onLockChange?.(true, []);
      return;
    }
    order = saved;
    saved = [];
    for (const input of inputs) {
      input.disabled = false;
      input.checked = order.includes(input.value);
    }
    onLockChange?.(false, [...order]);
    onCount?.(order.length);
  }

  for (const input of inputs) {
    input.addEventListener("change", () => {
      if (locked) {
        input.checked = false;
        return;
      }
      const result = applySelectionChange(order, input.value, input.checked, limit);
      order = result.order;
      for (const id of result.dropped) {
        const dropped = byId.get(id);
        if (dropped) dropped.checked = false;
        onChange?.(id, false);
      }
      input.checked = order.includes(input.value);
      onChange?.(input.value, input.checked);
      onCount?.(order.length);
    });
  }

  for (const radio of radios) {
    radio.addEventListener("change", () => {
      setLocked(radios.some(r => r.value === "yes" && r.checked));
    });
  }

  setLocked(radios.some(r => r.value === "yes" && r.checked));

  return { setLocked, isLocked: () => locked };
}
