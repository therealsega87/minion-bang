export const INITIATIVE_MODES = Object.freeze({
  AVERAGE: "average",
  HIGHEST: "highest",
  LOWEST: "lowest",
  MEDIAN: "median",
  CAPTAIN: "captain"
});

const VALID_MODES = new Set(Object.values(INITIATIVE_MODES));

function isRoll(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function computeGroupInitiative(mode, initiatives, captainInitiative = null) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`computeGroupInitiative: invalid mode (${mode})`);
  }

  if (mode === INITIATIVE_MODES.CAPTAIN) {
    if (!isRoll(captainInitiative)) {
      throw new Error("computeGroupInitiative: the captain has not rolled initiative");
    }
    return captainInitiative;
  }

  if (!Array.isArray(initiatives) || initiatives.length === 0) {
    throw new Error("computeGroupInitiative: initiatives must be a non-empty array");
  }
  const missing = initiatives.filter(value => !isRoll(value)).length;
  if (missing > 0) {
    throw new Error(`computeGroupInitiative: ${missing} of ${initiatives.length} members have not rolled initiative`);
  }

  switch (mode) {
    case INITIATIVE_MODES.HIGHEST:
      return Math.max(...initiatives);
    case INITIATIVE_MODES.LOWEST:
      return Math.min(...initiatives);
    case INITIATIVE_MODES.MEDIAN: {
      const sorted = [...initiatives].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 1
        ? sorted[middle]
        : Math.ceil((sorted[middle - 1] + sorted[middle]) / 2);
    }
    default:
      return Math.ceil(initiatives.reduce((sum, value) => sum + value, 0) / initiatives.length);
  }
}

export function describeGroupInitiative(mode, initiatives) {
  const result = computeGroupInitiative(mode, initiatives);

  if (mode === INITIATIVE_MODES.CAPTAIN) {
    throw new Error("describeGroupInitiative: the captain mode has no calculation to describe");
  }
  if (mode === INITIATIVE_MODES.HIGHEST) return `max(${initiatives.join(", ")}) = ${result}`;
  if (mode === INITIATIVE_MODES.LOWEST) return `min(${initiatives.join(", ")}) = ${result}`;
  if (mode === INITIATIVE_MODES.MEDIAN) {
    const sorted = [...initiatives].sort((a, b) => a - b);
    return `${sorted.join(" · ")} → ${result}`;
  }

  const sum = initiatives.reduce((acc, value) => acc + value, 0);
  const exact = sum / initiatives.length;
  const division = `${initiatives.join(" + ")} = ${sum} ÷ ${initiatives.length} = ${Number.isInteger(exact) ? exact : Math.round(exact * 100) / 100}`;
  return Number.isInteger(exact) ? division : `${division} → ${result}`;
}
