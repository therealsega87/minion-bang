export const MIN_BAND_SIZE = 2;

function requireInteger(name, value, least) {
  if (!Number.isInteger(value) || value < least) {
    throw new Error(`${name}: must be a whole number of at least ${least} (${value})`);
  }
}

export function proposeBands(total, maximum) {
  requireInteger("proposeBands total", total, 0);
  requireInteger("proposeBands maximum", maximum, MIN_BAND_SIZE);

  const sizes = [];
  let remaining = total;
  while (remaining >= MIN_BAND_SIZE) {
    const size = Math.min(maximum, remaining);
    sizes.push(size);
    remaining -= size;
  }
  return { sizes, singles: remaining };
}
