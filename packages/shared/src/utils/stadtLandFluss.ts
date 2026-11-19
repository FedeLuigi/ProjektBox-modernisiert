import type { StadtLandFlussPreset } from '../types/games.js';

export const STADT_LAND_FLUSS_PRESETS: Record<
  StadtLandFlussPreset,
  { label: string; preview: string; categories: string[] }
> = {
  klassisch: {
    label: 'KLASSISCH',
    preview: 'Stadt • Land • Fluss • Tier • Name',
    categories: ['Stadt', 'Land', 'Fluss', 'Tier', 'Name'],
  },
  party: {
    label: 'PARTY-MIX',
    preview: 'Stadt • Land • Tier • Beruf • Essen',
    categories: ['Stadt', 'Land', 'Tier', 'Beruf', 'Essen & Trinken'],
  },
  bunt: {
    label: 'BUNT GEMISCHT',
    preview: 'Stadt • Tier • Film • Marke • Gegenstand',
    categories: ['Stadt', 'Tier', 'Film & Serie', 'Marke', 'Gegenstand'],
  },
};

export const PLAYABLE_SLF_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Z',
] as const;

export const REVIEW_DURATION_SEC = 45;

export function getPresetCategories(preset?: string): {
  presetKey: StadtLandFlussPreset;
  categories: string[];
} {
  if (preset === 'party' || preset === 'bunt' || preset === 'klassisch') {
    return { presetKey: preset, categories: STADT_LAND_FLUSS_PRESETS[preset].categories };
  }
  return {
    presetKey: 'klassisch',
    categories: STADT_LAND_FLUSS_PRESETS.klassisch.categories,
  };
}

export function normalizeSlfAnswerText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function normalizeSlfComparisonKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function startsWithLetter(text: string, letter: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const first = trimmed[0]
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return first === letter.toUpperCase();
}
