export type RouletteColor = 'green' | 'red' | 'black';

export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function getRouletteColor(num: number): RouletteColor {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

export interface PlayerChipTheme {
  color: string;
  border: string;
  text: string;
}

export const PLAYER_CHIP_THEMES: PlayerChipTheme[] = [
  { color: '#F59E0B', border: '#FEF08A', text: '#0F172A' }, // Gold / Amber
  { color: '#38BDF8', border: '#E0F2FE', text: '#0F172A' }, // Sky Blau
  { color: '#F472B6', border: '#FCE7F3', text: '#0F172A' }, // Pink
  { color: '#A78BFA', border: '#EDE9FE', text: '#0F172A' }, // Violett
  { color: '#2DD4BF', border: '#CCFBF1', text: '#0F172A' }, // Türkis
  { color: '#FB7185', border: '#FFE4E6', text: '#0F172A' }, // Koralle
  { color: '#A3E635', border: '#ECFCCB', text: '#0F172A' }, // Limette
  { color: '#FDE047', border: '#FEF9C3', text: '#0F172A' }, // Gelb
];

export interface PlayerChipMarker {
  playerId: string;
  name: string;
  shortTag: string;
  isMe: boolean;
  theme: PlayerChipTheme;
}

function deriveBaseTag(name: string, idx: number): string {
  const cleaned = name
    .replace(/^bot\s+/i, '')
    .replace(/[^a-zA-Z0-9äöüÄÖÜ]/g, '')
    .toUpperCase();
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  if (cleaned.length === 1) return cleaned;
  return `S${idx + 1}`;
}

export function buildPlayerChipMarkers(
  players: Array<{ id: string; name: string }>,
  myPlayerId: string
): Map<string, PlayerChipMarker> {
  const map = new Map<string, PlayerChipMarker>();
  const usedTags = new Set<string>();

  players.forEach((p, idx) => {
    const theme = PLAYER_CHIP_THEMES[idx % PLAYER_CHIP_THEMES.length];
    const base = deriveBaseTag(p.name, idx);
    let shortTag = base;
    if (usedTags.has(shortTag)) {
      shortTag = `${base.slice(0, 1)}${idx + 1}`;
    }
    usedTags.add(shortTag);

    map.set(p.id, {
      playerId: p.id,
      name: p.name,
      shortTag,
      isMe: p.id === myPlayerId,
      theme,
    });
  });

  return map;
}

function parseCanonicalNumbers(raw: string, expectedCount: number): number[] | null {
  const parts = raw.split('-');
  if (parts.length !== expectedCount) return null;
  const nums: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!/^(0|[1-9]\d*)$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 36) return null;
    if (i > 0 && n <= nums[i - 1]) return null;
    nums.push(n);
  }
  return nums;
}

export function getInsideBetNumbers(betKey: string): number[] | null {
  if (typeof betKey !== 'string') return null;

  if (betKey.startsWith('number:')) {
    return parseCanonicalNumbers(betKey.slice('number:'.length), 1);
  }

  if (betKey.startsWith('split:')) {
    const nums = parseCanonicalNumbers(betKey.slice('split:'.length), 2);
    if (!nums) return null;
    const [a, b] = nums;
    if (a === 0 && (b === 1 || b === 2 || b === 3)) return nums;
    if (a >= 1 && b === a + 1 && a % 3 !== 0) return nums;
    if (a >= 1 && b === a + 3 && b <= 36) return nums;
    return null;
  }

  if (betKey.startsWith('street:')) {
    const nums = parseCanonicalNumbers(betKey.slice('street:'.length), 3);
    if (!nums) return null;
    const [a, b, c] = nums;
    if (a === 0 && b === 1 && c === 2) return nums;
    if (a === 0 && b === 2 && c === 3) return nums;
    if (a >= 1 && a % 3 === 1 && b === a + 1 && c === a + 2 && c <= 36) return nums;
    return null;
  }

  if (betKey.startsWith('corner:')) {
    const nums = parseCanonicalNumbers(betKey.slice('corner:'.length), 4);
    if (!nums) return null;
    const [a, b, c, d] = nums;
    if (a === 0 && b === 1 && c === 2 && d === 3) return nums;
    if (a >= 1 && a % 3 !== 0 && b === a + 1 && c === a + 3 && d === a + 4 && d <= 36) {
      return nums;
    }
    return null;
  }

  if (betKey.startsWith('line:')) {
    const nums = parseCanonicalNumbers(betKey.slice('line:'.length), 2);
    if (!nums) return null;
    const [a, b] = nums;
    if (a >= 1 && a % 3 === 1 && b === a + 5 && b <= 36) {
      return [a, a + 1, a + 2, a + 3, a + 4, a + 5];
    }
    return null;
  }

  return null;
}

export function doesBetWin(betKey: string, winningNumber: number): boolean {
  const insideNums = getInsideBetNumbers(betKey);
  if (insideNums) {
    return insideNums.includes(winningNumber);
  }
  if (winningNumber === 0) return false;
  switch (betKey) {
    case 'dozen:1':
      return winningNumber >= 1 && winningNumber <= 12;
    case 'dozen:2':
      return winningNumber >= 13 && winningNumber <= 24;
    case 'dozen:3':
      return winningNumber >= 25 && winningNumber <= 36;
    case 'column:1':
      return winningNumber % 3 === 1;
    case 'column:2':
      return winningNumber % 3 === 2;
    case 'column:3':
      return winningNumber % 3 === 0;
    case 'color:red':
      return RED_NUMBERS.has(winningNumber);
    case 'color:black':
      return !RED_NUMBERS.has(winningNumber);
    case 'parity:even':
      return winningNumber % 2 === 0;
    case 'parity:odd':
      return winningNumber % 2 === 1;
    case 'range:low':
      return winningNumber >= 1 && winningNumber <= 18;
    case 'range:high':
      return winningNumber >= 19 && winningNumber <= 36;
    default:
      return false;
  }
}

export function isNumberCellHighlightedByBet(
  betKey: string | null | undefined,
  num: number
): boolean {
  if (!betKey) return false;
  if (betKey.startsWith('number:')) {
    return Number(betKey.slice('number:'.length)) === num;
  }
  const inside = getInsideBetNumbers(betKey);
  return inside ? inside.includes(num) : false;
}

export function formatBetLabel(betKey: string | null | undefined): string | null {
  if (!betKey) return null;
  if (betKey.startsWith('number:')) {
    return `ZAHL ${betKey.slice('number:'.length)} (35:1)`;
  }
  if (betKey.startsWith('split:')) {
    return `2ER ${betKey.slice('split:'.length).replace('-', '·')} (17:1)`;
  }
  if (betKey.startsWith('street:')) {
    const nums = getInsideBetNumbers(betKey);
    if (!nums) return null;
    return nums[0] === 0
      ? `3ER ${nums.join('·')} (11:1)`
      : `3ER ${nums[0]}–${nums[2]} (11:1)`;
  }
  if (betKey.startsWith('corner:')) {
    const nums = getInsideBetNumbers(betKey);
    return nums ? `4ER ${nums.join('·')} (8:1)` : null;
  }
  if (betKey.startsWith('line:')) {
    return `6ER ${betKey.slice('line:'.length).replace('-', '–')} (5:1)`;
  }
  switch (betKey) {
    case 'dozen:1':
      return '1. 12 (2:1)';
    case 'dozen:2':
      return '2. 12 (2:1)';
    case 'dozen:3':
      return '3. 12 (2:1)';
    case 'column:1':
    case 'column:2':
    case 'column:3':
      return '2:1 KOLONNE (2:1)';
    case 'color:red':
      return 'ROT (1:1)';
    case 'color:black':
      return 'SCHWARZ (1:1)';
    case 'parity:even':
      return 'GERADE (1:1)';
    case 'parity:odd':
      return 'UNGERADE (1:1)';
    case 'range:low':
      return '1–18 (1:1)';
    case 'range:high':
      return '19–36 (1:1)';
    default:
      return null;
  }
}

export interface InsideSpot {
  betKey: string;
  kind: 'split' | 'street' | 'trio' | 'corner' | 'line';
  leftPct: number;
  topPct: number;
  widthStyle: string;
  heightStyle: string;
  zIndex: number;
  title: string;
}

function buildPortraitSpots(): InsideSpot[] {
  const spots: InsideSpot[] = [];

  // 1. 0-Splits (0-1, 0-2, 0-3) auf der oberen Naht zur 0
  [1, 2, 3].forEach((n, colIdx) => {
    spots.push({
      betKey: `split:0-${n}`,
      kind: 'split',
      leftPct: ((colIdx + 0.5) / 3) * 100,
      topPct: 0,
      widthStyle: '18%',
      heightStyle: '11px',
      zIndex: 20,
      title: `2er-Wette 0 & ${n} (17:1)`,
    });
  });

  // 2. 0-Trios (0-1-2, 0-2-3)
  spots.push(
    {
      betKey: 'street:0-1-2',
      kind: 'trio',
      leftPct: 33.3333,
      topPct: 0,
      widthStyle: '16px',
      heightStyle: '14px',
      zIndex: 30,
      title: '3er-Wette 0, 1, 2 (11:1)',
    },
    {
      betKey: 'street:0-2-3',
      kind: 'trio',
      leftPct: 66.6667,
      topPct: 0,
      widthStyle: '16px',
      heightStyle: '14px',
      zIndex: 30,
      title: '3er-Wette 0, 2, 3 (11:1)',
    }
  );

  // 3. First Four (0-1-2-3) an der linken oberen Ecke zwischen 0 und 1
  spots.push({
    betKey: 'corner:0-1-2-3',
    kind: 'corner',
    leftPct: 0,
    topPct: 0,
    widthStyle: '16px',
    heightStyle: '16px',
    zIndex: 30,
    title: '4er-Wette 0, 1, 2, 3 (8:1)',
  });

  // 4. Reihen-Splits (horizontal innerhalb jeder 3er-Reihe) + 3er-Straßen am linken Rand
  for (let r = 0; r < 12; r++) {
    const base = r * 3 + 1;
    const rowMidY = ((r + 0.5) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base}-${base + 1}`,
        kind: 'split',
        leftPct: 33.3333,
        topPct: rowMidY,
        widthStyle: '11px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 1} (17:1)`,
      },
      {
        betKey: `split:${base + 1}-${base + 2}`,
        kind: 'split',
        leftPct: 66.6667,
        topPct: rowMidY,
        widthStyle: '11px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 2} (17:1)`,
      },
      {
        betKey: `street:${base}-${base + 1}-${base + 2}`,
        kind: 'street',
        leftPct: 0,
        topPct: rowMidY,
        widthStyle: '12px',
        heightStyle: '4.4%',
        zIndex: 20,
        title: `3er-Reihe ${base}–${base + 2} (11:1)`,
      }
    );
  }

  // 5. Vertikale Splits (n, n+3), 4er-Carrés & 6er-Linien zwischen benachbarten Reihen
  for (let r = 0; r < 11; r++) {
    const base = r * 3 + 1;
    const seamY = ((r + 1) / 12) * 100;

    for (let c = 0; c < 3; c++) {
      const n = base + c;
      spots.push({
        betKey: `split:${n}-${n + 3}`,
        kind: 'split',
        leftPct: ((c + 0.5) / 3) * 100,
        topPct: seamY,
        widthStyle: '18%',
        heightStyle: '10px',
        zIndex: 20,
        title: `2er-Wette ${n} & ${n + 3} (17:1)`,
      });
    }

    spots.push(
      {
        betKey: `corner:${base}-${base + 1}-${base + 3}-${base + 4}`,
        kind: 'corner',
        leftPct: 33.3333,
        topPct: seamY,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base}, ${base + 1}, ${base + 3}, ${base + 4} (8:1)`,
      },
      {
        betKey: `corner:${base + 1}-${base + 2}-${base + 4}-${base + 5}`,
        kind: 'corner',
        leftPct: 66.6667,
        topPct: seamY,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base + 1}, ${base + 2}, ${base + 4}, ${base + 5} (8:1)`,
      },
      {
        betKey: `line:${base}-${base + 5}`,
        kind: 'line',
        leftPct: 0,
        topPct: seamY,
        widthStyle: '15px',
        heightStyle: '15px',
        zIndex: 30,
        title: `6er-Linie ${base}–${base + 5} (5:1)`,
      }
    );
  }

  return spots;
}

function buildHorizontalSpots(): InsideSpot[] {
  const spots: InsideSpot[] = [];

  // 1. 0-Splits (0-3 oben, 0-2 mitte, 0-1 unten) entlang linker Naht zur 0
  spots.push(
    {
      betKey: 'split:0-3',
      kind: 'split',
      leftPct: 0,
      topPct: 16.6667,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 3 (17:1)',
    },
    {
      betKey: 'split:0-2',
      kind: 'split',
      leftPct: 0,
      topPct: 50,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 2 (17:1)',
    },
    {
      betKey: 'split:0-1',
      kind: 'split',
      leftPct: 0,
      topPct: 83.3333,
      widthStyle: '12px',
      heightStyle: '18%',
      zIndex: 20,
      title: '2er-Wette 0 & 1 (17:1)',
    }
  );

  // 2. 0-Trios (0-2-3 & 0-1-2) + First Four (0-1-2-3)
  spots.push(
    {
      betKey: 'street:0-2-3',
      kind: 'trio',
      leftPct: 0,
      topPct: 33.3333,
      widthStyle: '16px',
      heightStyle: '15px',
      zIndex: 30,
      title: '3er-Wette 0, 2, 3 (11:1)',
    },
    {
      betKey: 'street:0-1-2',
      kind: 'trio',
      leftPct: 0,
      topPct: 66.6667,
      widthStyle: '16px',
      heightStyle: '15px',
      zIndex: 30,
      title: '3er-Wette 0, 1, 2 (11:1)',
    },
    {
      betKey: 'corner:0-1-2-3',
      kind: 'corner',
      leftPct: 0,
      topPct: 100,
      widthStyle: '16px',
      heightStyle: '16px',
      zIndex: 30,
      title: '4er-Wette 0, 1, 2, 3 (8:1)',
    }
  );

  // 3. Vertikale Splits innerhalb jeder Spalte + 3er-Straßen entlang unterem Rand
  for (let c = 0; c < 12; c++) {
    const base = c * 3 + 1;
    const colMidX = ((c + 0.5) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base + 1}-${base + 2}`,
        kind: 'split',
        leftPct: colMidX,
        topPct: 33.3333,
        widthStyle: '4.4%',
        heightStyle: '11px',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 2} (17:1)`,
      },
      {
        betKey: `split:${base}-${base + 1}`,
        kind: 'split',
        leftPct: colMidX,
        topPct: 66.6667,
        widthStyle: '4.4%',
        heightStyle: '11px',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 1} (17:1)`,
      },
      {
        betKey: `street:${base}-${base + 1}-${base + 2}`,
        kind: 'street',
        leftPct: colMidX,
        topPct: 100,
        widthStyle: '4.4%',
        heightStyle: '12px',
        zIndex: 20,
        title: `3er-Reihe ${base}–${base + 2} (11:1)`,
      }
    );
  }

  // 4. Horizontale Splits, 4er-Carrés & 6er-Linien zwischen benachbarten Spalten
  for (let c = 0; c < 11; c++) {
    const base = c * 3 + 1;
    const seamX = ((c + 1) / 12) * 100;

    spots.push(
      {
        betKey: `split:${base + 2}-${base + 5}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 16.6667,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base + 2} & ${base + 5} (17:1)`,
      },
      {
        betKey: `split:${base + 1}-${base + 4}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 50,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base + 1} & ${base + 4} (17:1)`,
      },
      {
        betKey: `split:${base}-${base + 3}`,
        kind: 'split',
        leftPct: seamX,
        topPct: 83.3333,
        widthStyle: '11px',
        heightStyle: '18%',
        zIndex: 20,
        title: `2er-Wette ${base} & ${base + 3} (17:1)`,
      },
      {
        betKey: `corner:${base + 1}-${base + 2}-${base + 4}-${base + 5}`,
        kind: 'corner',
        leftPct: seamX,
        topPct: 33.3333,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base + 1}, ${base + 2}, ${base + 4}, ${base + 5} (8:1)`,
      },
      {
        betKey: `corner:${base}-${base + 1}-${base + 3}-${base + 4}`,
        kind: 'corner',
        leftPct: seamX,
        topPct: 66.6667,
        widthStyle: '16px',
        heightStyle: '16px',
        zIndex: 30,
        title: `4er-Wette ${base}, ${base + 1}, ${base + 3}, ${base + 4} (8:1)`,
      },
      {
        betKey: `line:${base}-${base + 5}`,
        kind: 'line',
        leftPct: seamX,
        topPct: 100,
        widthStyle: '15px',
        heightStyle: '15px',
        zIndex: 30,
        title: `6er-Linie ${base}–${base + 5} (5:1)`,
      }
    );
  }

  return spots;
}

export const PORTRAIT_INSIDE_SPOTS: InsideSpot[] = buildPortraitSpots();
export const HORIZONTAL_INSIDE_SPOTS: InsideSpot[] = buildHorizontalSpots();
