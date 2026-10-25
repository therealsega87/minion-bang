const MANUAL_ROWS = [
  [0, 5], [0.125, 5], [0.25, 5], [0.5, 5],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [5, 8], [6, 8], [7, 8], [8, 8],
  [9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10],
  [16, 10], [17, 10], [18, 10], [19, 10], [20, 10], [21, 10]
];

export function getDefaultMaximumsTable() {
  return MANUAL_ROWS.map(([cr, max]) => ({ cr, max }));
}

export function normalizeMaximumsTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("normalizeMaximumsTable: the table must be a non-empty array");
  }
  const seen = new Set();
  const clean = rows.map((row, index) => {
    const cr = row?.cr;
    const max = row?.max;
    if (typeof cr !== "number" || !Number.isFinite(cr) || cr < 0) {
      throw new Error(`normalizeMaximumsTable: invalid cr in row ${index + 1} (${cr})`);
    }
    if (!Number.isInteger(max) || max < 2) {
      throw new Error(`normalizeMaximumsTable: invalid maximum in row ${index + 1} (${max})`);
    }
    if (seen.has(cr)) {
      throw new Error(`normalizeMaximumsTable: duplicate cr (${cr})`);
    }
    seen.add(cr);
    return { cr, max };
  });
  return clean.sort((a, b) => a.cr - b.cr);
}

export function maximumForCr(cr, table = getDefaultMaximumsTable()) {
  if (typeof cr !== "number" || !Number.isFinite(cr) || cr < 0) {
    throw new Error(`maximumForCr: invalid cr (${cr})`);
  }
  const rows = normalizeMaximumsTable(table);
  let found = rows[0];
  for (const row of rows) {
    if (row.cr <= cr) found = row;
    else break;
  }
  return found.max;
}

export function formatChallengeRating(cr) {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

export function parseMaximumsTable(text) {
  if (text === "") return getDefaultMaximumsTable();
  if (typeof text !== "string") {
    throw new Error("parseMaximumsTable: the stored table must be a string");
  }
  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    throw new Error("parseMaximumsTable: the stored table is not valid JSON");
  }
  return normalizeMaximumsTable(rows);
}

export function serializeMaximumsTable(rows) {
  const clean = normalizeMaximumsTable(rows);
  const text = JSON.stringify(clean);
  return text === JSON.stringify(getDefaultMaximumsTable()) ? "" : text;
}

export function tableWithMaximums(maximums) {
  const base = getDefaultMaximumsTable();
  if (!Array.isArray(maximums) || maximums.length !== base.length) {
    throw new Error(`tableWithMaximums: expected ${base.length} values`);
  }
  return base.map((row, index) => ({ cr: row.cr, max: maximums[index] }));
}
