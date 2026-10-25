function capacityOf(capacities, key) {
  const value = capacities?.[key];
  if (value === undefined || value === null) return Infinity;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`planGrouping: invalid capacity for ${key} (${value})`);
  }
  return value;
}

export function planGrouping(items, capacities = {}) {
  if (!Array.isArray(items)) {
    throw new Error("planGrouping: items must be an array");
  }

  const seen = new Set();
  for (const item of items) {
    if (typeof item?.id !== "string" || item.id === "") {
      throw new Error("planGrouping: every item needs an id");
    }
    if (seen.has(item.id)) {
      throw new Error(`planGrouping: duplicate id (${item.id})`);
    }
    seen.add(item.id);
  }

  const groups = new Map();
  for (const item of items) {
    if (!item.groupId) continue;
    const group = groups.get(item.groupId) ?? { keys: new Set(), size: 0 };
    group.keys.add(item.key ?? null);
    group.size += 1;
    groups.set(item.groupId, group);
  }

  const pureGroupsByKey = new Map();
  for (const [groupId, group] of groups) {
    if (group.keys.size !== 1) continue;
    const [key] = group.keys;
    if (key === null) continue;
    const list = pureGroupsByKey.get(key) ?? [];
    list.push({ groupId, size: group.size });
    pureGroupsByKey.set(key, list);
  }

  const loose = new Map();
  for (const item of items) {
    if (item.groupId || item.key === null || item.key === undefined) continue;
    const list = loose.get(item.key) ?? [];
    list.push(item.id);
    loose.set(item.key, list);
  }

  const create = [];
  const add = [];
  for (const [key, looseIds] of loose) {
    const capacity = capacityOf(capacities, key);
    let remaining = [...looseIds];

    const partial = (pureGroupsByKey.get(key) ?? [])
      .filter(group => group.size < capacity)
      .sort((a, b) => b.size - a.size);
    for (const group of partial) {
      if (remaining.length === 0) break;
      const room = capacity - group.size;
      add.push({ groupId: group.groupId, memberIds: remaining.slice(0, room) });
      remaining = remaining.slice(room);
    }

    while (capacity >= 2 && remaining.length >= 2) {
      create.push({ key, memberIds: remaining.slice(0, capacity) });
      remaining = remaining.slice(capacity);
    }
  }

  return { create, add };
}
