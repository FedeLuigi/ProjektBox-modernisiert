import {
  Grid2X2,
  Puzzle,
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
  {
    id: 'connect',
    title: 'Vier gewinnt',
    subtitle: 'Taktisches 1v1 Schwerkraft-Duell',
    description:
      'Wirf deine Steine geschickt in die 7×6-Arena und verbinde vier in einer Reihe.',
    howToPlay:
      'Setzt abwechselnd Steine in die Spalten. Durch die Schwerkraft fallen sie auf das unterste freie Feld. Wer zuerst vier eigene Steine in eine Reihe bringt, gewinnt.',
    category: 'Strategie',
    gameType: 'duel',
    gameTypeLabel: 'DUELL',
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
      'Setze X und O mit klarem Taktik-Blick und sichere dir drei in einer Reihe.',
    howToPlay:
      'Zwei Spieler setzen abwechselnd ihr Symbol auf das 3×3-Spielfeld. Drei gleiche Symbole in einer Reihe, Spalte oder Diagonale entscheiden die Runde.',
    category: 'Strategie',
    gameType: 'duel',
    gameTypeLabel: 'DUELL',
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
