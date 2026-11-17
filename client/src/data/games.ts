import {
  Palette,
  type LucideIcon,
} from 'lucide-react';

export type Category = 'Alle' | 'Strategie' | 'Kreativ';

export type GameType = 'duel' | 'party';

export type PlayerCountFilter = 'all' | '2' | '3+';

export type SortOption = 'featured' | 'players-asc' | 'players-desc' | 'duration-asc' | 'alpha';

export type Tone = 'sunset' | 'indigo' | 'emerald' | 'ocean';

export type CrystalAccent =
  | 'amber'
  | 'coral'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'gold'
  | 'indigo'
  | 'cyan';

export interface Game {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  howToPlay: string;
  category: Exclude<Category, 'Alle'>;
  gameType: GameType;
  gameTypeLabel: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  durationMinutes: number;
  supportsTv: boolean;
  tags: string[];
  icon: LucideIcon;
  tone: Tone;
  accent: CrystalAccent;
}

export const CATEGORIES: Category[] = ['Alle', 'Strategie', 'Kreativ'];

export const CATEGORY_ACCENTS: Record<Category, CrystalAccent> = {
  Alle: 'amber',
  Strategie: 'indigo',
  Kreativ: 'rose',
};

export const GAMES: Game[] = [
  {
    id: 'draw-and-guess',
    title: 'Zeichnen & Raten',
    subtitle: 'Kreatives Party-Montagsmaler',
    description:
      'Male das geheime Wort auf dem Handy, während alle anderen live mitraten!',
    howToPlay:
      'Der Zeichner wählt ein Wort und malt es auf dem Canvas. Je schneller die Mitspieler den Begriff im Chat erraten, desto mehr Punkte gibt es!',
    category: 'Kreativ',
    gameType: 'party',
    gameTypeLabel: 'GRUPPE',
    players: '2–8 Spieler',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '5–10 Min.',
    durationMinutes: 7,
    supportsTv: true,
    tags: ['Party', 'Gruppe', 'Kreativ', 'Zeichnen', 'Raten', 'TV-Highlight'],
    icon: Palette,
    tone: 'sunset',
    accent: 'rose',
  },
];
