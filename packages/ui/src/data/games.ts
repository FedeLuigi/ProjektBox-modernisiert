import {
  Coins,
  Compass,
  Palette,
  Spade,
  type LucideIcon,
} from 'lucide-react';
import {
  CATEGORY_ACCENTS,
  GAME_CATEGORIES,
  GAMES_CATALOG_META,
  type CrystalAccent,
  type GameCategory,
  type GameMetadata,
  type GameType,
  type Tone,
} from '@projektbox/shared/utils';

export type Category = GameCategory;
export type PlayerCountFilter = 'all' | '2' | '3+';
export type SortOption = 'featured' | 'players-asc' | 'players-desc' | 'duration-asc' | 'alpha';
export type { GameType, Tone, CrystalAccent };

export interface Game extends GameMetadata {
  icon: LucideIcon;
}

const GAME_ICONS: Record<string, LucideIcon> = {
  'draw-and-guess': Palette,
  'stadt-land-fluss': Compass,
  roulette: Coins,
  'texas-holdem': Spade,
};

export const CATEGORIES: Category[] = GAME_CATEGORIES;
export { CATEGORY_ACCENTS };

export const GAMES: Game[] = GAMES_CATALOG_META.map((meta) => ({
  ...meta,
  icon: GAME_ICONS[meta.id] || Palette,
}));
