import {
  Grid2X2,
  Puzzle,
  Palette,
  type LucideIcon,
} from 'lucide-react';

export type Category = 'Alle' | 'Strategie' | 'Party & Kreativ';

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

export const CATEGORIES: Category[] = ['Alle', 'Strategie', 'Party & Kreativ'];

export const CATEGORY_ACCENTS: Record<Category, CrystalAccent> = {
  Alle: 'amber',
  Strategie: 'indigo',
  'Party & Kreativ': 'rose',
};

export const GAMES: Game[] = [
  {
    id: 'draw-and-guess',
    title: 'Zeichnen & Raten',
    subtitle: 'Kreatives Party-Montagsmaler',
    description:
      'Einer zeichnet das geheime Wort live auf dem Smartphone, während alle anderen auf dem Handy oder großen TV-Bildschirm um die Wette raten.',
    howToPlay:
      'Der Zeichner wählt ein Wort und malt es auf dem Canvas. Je schneller die Mitspieler den Begriff im Chat erraten, desto mehr Punkte gibt es!',
    category: 'Party & Kreativ',
    gameType: 'party',
    gameTypeLabel: 'Party & Gruppe',
    players: '2–8 Spieler',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '5–10 Min.',
    durationMinutes: 7,
    supportsTv: true,
    tags: ['Party', 'Zeichnen', 'Raten', 'TV-Highlight', 'Familie & Freunde'],
    icon: Palette,
    tone: 'sunset',
    accent: 'rose',
  },
  {
    id: 'connect',
    title: 'Vier gewinnt',
    subtitle: 'Taktisches 1v1 Schwerkraft-Duell',
    description:
      'Wirf deine Spielsteine geschickt in die 7×6-Arena, baue Zwickmühlen auf und verbinde vier Steine horizontal, vertikal oder diagonal.',
    howToPlay:
      'Setzt abwechselnd Steine in die Spalten. Durch die Schwerkraft fallen sie auf das unterste freie Feld. Wer zuerst vier eigene Steine in eine Reihe bringt, gewinnt.',
    category: 'Strategie',
    gameType: 'duel',
    gameTypeLabel: '1v1 Duell',
    players: '2 Spieler',
    minPlayers: 2,
    maxPlayers: 2,
    duration: '3–5 Min.',
    durationMinutes: 4,
    supportsTv: true,
    tags: ['Duell', 'Strategie', 'Taktik', 'Klassiker', '2 Spieler'],
    icon: Grid2X2,
    tone: 'sunset',
    accent: 'coral',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    subtitle: 'Schnelles 3×3 Taktik-Duell',
    description:
      'Der zeitlose Klassiker für zwischendurch: Setze X und O mit klarem Blick, blockiere deinen Gegner und sichere dir den schnellen Rundensieg.',
    howToPlay:
      'Zwei Spieler setzen abwechselnd ihr Symbol auf das 3×3-Spielfeld. Drei gleiche Symbole in einer Reihe, Spalte oder Diagonale entscheiden die Runde.',
    category: 'Strategie',
    gameType: 'duel',
    gameTypeLabel: '1v1 Duell',
    players: '2 Spieler',
    minPlayers: 2,
    maxPlayers: 2,
    duration: '1–3 Min.',
    durationMinutes: 2,
    supportsTv: true,
    tags: ['Duell', 'Schnell', 'Strategie', 'Einsteigerfreundlich', '2 Spieler'],
    icon: Puzzle,
    tone: 'indigo',
    accent: 'violet',
  },
];
