import type { RouletteColor } from '../types/games.js';

// Originale europäische Roulette-Reihenfolge im Uhrzeigersinn (37 Fächer: 0-36)
export const ROULETTE_WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const SPIN_DURATION_MS = 4800;
export const RESULT_DURATION_MS = 8500;
export const MIN_RESCUE_THRESHOLD = 5;
export const RESCUE_BONUS_AMOUNT = 50;

export function getRouletteColor(num: number): RouletteColor {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
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

/**
 * Liefert bei gültigen Innenwetten (Einzelzahl, 2er-Split, 3er-Straße/Trio, 4er-Carré/First-Four, 6er-Linie)
 * alle abgedeckten Gewinnzahlen; sonst null.
 */
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

export function isValidBetKey(betKey: string): boolean {
  if (typeof betKey !== 'string') return false;
  if (getInsideBetNumbers(betKey) !== null) return true;
  return (
    betKey === 'dozen:1' ||
    betKey === 'dozen:2' ||
    betKey === 'dozen:3' ||
    betKey === 'column:1' ||
    betKey === 'column:2' ||
    betKey === 'column:3' ||
    betKey === 'color:red' ||
    betKey === 'color:black' ||
    betKey === 'parity:even' ||
    betKey === 'parity:odd' ||
    betKey === 'range:low' ||
    betKey === 'range:high'
  );
}

/**
 * Gesamtrückzahlung (Einsatz + Gewinn) als Multiplikator auf den Einsatz.
 */
export function getBetPayoutMultiplier(betKey: string): number {
  const insideNums = getInsideBetNumbers(betKey);
  if (insideNums) {
    return 36 / insideNums.length;
  }
  if (betKey.startsWith('dozen:') || betKey.startsWith('column:')) return 3;
  return 2;
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

export interface PlayerChipTheme {
  color: string;
  border: string;
  text: string;
}

export const PLAYER_CHIP_THEMES: PlayerChipTheme[] = [
  { color: '#F59E0B', border: '#FEF08A', text: '#0F172A' },
  { color: '#38BDF8', border: '#E0F2FE', text: '#0F172A' },
  { color: '#F472B6', border: '#FCE7F3', text: '#0F172A' },
  { color: '#A78BFA', border: '#EDE9FE', text: '#0F172A' },
  { color: '#2DD4BF', border: '#CCFBF1', text: '#0F172A' },
  { color: '#FB7185', border: '#FFE4E6', text: '#0F172A' },
  { color: '#A3E635', border: '#ECFCCB', text: '#0F172A' },
  { color: '#FDE047', border: '#FEF9C3', text: '#0F172A' },
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
