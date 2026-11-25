import type { GoldMinerMode, GoldMinerShopItemId } from '../types/games.js';

export type GoldMinerObjectKind =
  | 'gold_small'
  | 'gold_medium'
  | 'gold_large'
  | 'rock_small'
  | 'rock_large'
  | 'diamond'
  | 'mystery_bag'
  | 'tnt'
  | 'mole_diamond'
  | 'bone'
  | 'skull';

export interface GoldMinerObjectSpec {
  kind: GoldMinerObjectKind;
  label: string;
  value: number;
  weight: number; // higher = slower reel speed
  radius: number;
}

export const GOLD_MINER_OBJECT_SPECS: Record<GoldMinerObjectKind, GoldMinerObjectSpec> = {
  gold_small: { kind: 'gold_small', label: 'Kleines Gold', value: 100, weight: 1.4, radius: 16 },
  gold_medium: { kind: 'gold_medium', label: 'Goldnugget', value: 250, weight: 2.3, radius: 24 },
  gold_large: { kind: 'gold_large', label: 'Riesen-Gold', value: 500, weight: 4.0, radius: 36 },
  rock_small: { kind: 'rock_small', label: 'Stein', value: 15, weight: 2.6, radius: 20 },
  rock_large: { kind: 'rock_large', label: 'Felsen', value: 30, weight: 4.4, radius: 32 },
  diamond: { kind: 'diamond', label: 'Diamant', value: 600, weight: 1.0, radius: 14 },
  mystery_bag: { kind: 'mystery_bag', label: 'Überraschungssack', value: 0, weight: 1.6, radius: 20 },
  tnt: { kind: 'tnt', label: 'TNT-Fass', value: 0, weight: 1.0, radius: 24 },
  mole_diamond: { kind: 'mole_diamond', label: 'Maulwurf mit Diamant', value: 650, weight: 1.1, radius: 18 },
  bone: { kind: 'bone', label: 'Knochen', value: 10, weight: 1.1, radius: 16 },
  skull: { kind: 'skull', label: 'Totenkopf', value: 20, weight: 1.2, radius: 17 },
};

export interface GoldMinerShopItemSpec {
  id: GoldMinerShopItemId;
  name: string;
  description: string;
  basePrice: number;
}

export const GOLD_MINER_SHOP_ITEMS: GoldMinerShopItemSpec[] = [
  {
    id: 'dynamite',
    name: 'Dynamit-Stange',
    description: 'Sprengt unerwünschte Steine sofort vom Haken.',
    basePrice: 120,
  },
  {
    id: 'strength',
    name: 'Krafttrank',
    description: 'Zieht schwere Goldnuggets & Felsen deutlich schneller hoch.',
    basePrice: 220,
  },
  {
    id: 'clover',
    name: 'Glücksklee',
    description: 'Erhöht die Chancen auf fette Boni in ?-Säcken.',
    basePrice: 160,
  },
  {
    id: 'rock_book',
    name: 'Steine-Handbuch',
    description: 'Steine & Felsen bringen 3x mehr Geld.',
    basePrice: 140,
  },
  {
    id: 'diamond_polish',
    name: 'Diamant-Politur',
    description: 'Diamanten sind im nächsten Level +50 % mehr wert.',
    basePrice: 280,
  },
];

export function getGoldMinerLevelTarget(
  level: number,
  playerCount: number,
  mode: GoldMinerMode
): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const baseSingle = 650 + (safeLevel - 1) * 550 + Math.pow(safeLevel - 1, 2) * 120;
  if (mode === 'versus') {
    return Math.round(baseSingle);
  }
  const scale = 1 + Math.max(0, playerCount - 1) * 0.65;
  return Math.round(baseSingle * scale);
}

/**
 * Classic Gold Miner weight-based retraction formula:
 * Retraction speed = Base Reel Speed / Weight, boosted by Strength Tonic.
 */
export function getGoldMinerRetractSpeed(
  weight: number | null | undefined,
  hasStrength: boolean
): number {
  const emptySpeed = hasStrength ? 760 : 610;
  if (!weight || weight <= 0) {
    return emptySpeed;
  }
  const baseLoadedSpeed = 340;
  const strengthMult = hasStrength ? 1.65 : 1.0;
  return Math.max(72, (baseLoadedSpeed * strengthMult) / Math.max(0.85, weight));
}

export function getGoldMinerItemValue(
  kind: GoldMinerObjectKind,
  baseValue: number,
  upgrades: { hasRockBook?: boolean; hasDiamondPolish?: boolean }
): number {
  if ((kind === 'rock_small' || kind === 'rock_large') && upgrades.hasRockBook) {
    return Math.round(baseValue * 3);
  }
  if ((kind === 'diamond' || kind === 'mole_diamond') && upgrades.hasDiamondPolish) {
    return Math.round(baseValue * 1.5);
  }
  return Math.round(baseValue);
}

export interface MysteryBagReward {
  kind: 'money' | 'dynamite' | 'strength';
  amount: number;
  label: string;
}

export function rollMysteryBagReward(
  hasClover: boolean,
  rng: () => number = Math.random
): MysteryBagReward {
  const roll = rng();
  if (hasClover) {
    if (roll < 0.28) {
      return { kind: 'strength', amount: 1, label: 'KRAFTTRANK!' };
    }
    if (roll < 0.5) {
      return { kind: 'dynamite', amount: 1, label: '+1 DYNAMIT!' };
    }
    const cash = Math.round(450 + rng() * 450);
    return { kind: 'money', amount: cash, label: `+$${cash} JACKPOT!` };
  }

  if (roll < 0.16) {
    return { kind: 'strength', amount: 1, label: 'KRAFTTRANK!' };
  }
  if (roll < 0.36) {
    return { kind: 'dynamite', amount: 1, label: '+1 DYNAMIT!' };
  }
  const cash = Math.round(100 + rng() * 320);
  return { kind: 'money', amount: cash, label: `+$${cash}!` };
}
