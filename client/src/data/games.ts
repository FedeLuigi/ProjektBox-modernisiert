import {
  Coins,
  Compass,
  Palette,
  Spade,
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
    id: 'stadt-land-fluss',
    title: 'Stadt, Land, Fluss',
    subtitle: 'Der Wort-Klassiker fürs Wohnzimmer',
    description:
      'Finde zu einem Zufallsbuchstaben blitzschnell passende Begriffe – mit Live-Veto auf dem Handy & TV!',
    howToPlay:
      'Alle erhalten gleichzeitig einen Buchstaben und füllen heimlich die 5 Kategorien aus. Wer alles hat, kann STOPP drücken! Danach werden alle Antworten gemeinsam auf dem Handy oder TV-Board aufgedeckt, angefochten und mit 5, 10 oder 20 Punkten belohnt.',
    category: 'Kreativ',
    gameType: 'party',
    gameTypeLabel: 'GRUPPE',
    players: '2–8 Spieler',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '5–12 Min.',
    durationMinutes: 8,
    supportsTv: true,
    tags: ['Party', 'Gruppe', 'Wörter', 'Quiz', 'Klassiker', 'TV-Highlight'],
    icon: Compass,
    tone: 'ocean',
    accent: 'cyan',
  },
  {
    id: 'roulette',
    title: 'Casino Roulette',
    subtitle: 'Chips setzen, drehen & gewinnen',
    description:
      'Alle starten mit Startguthaben: Setze deine Chips auf Zahlen, Rot/Schwarz oder Dutzende und kassiere bis zu 35:1 ab!',
    howToPlay:
      'Jeder startet mit demselben Startguthaben (z. B. 1.000 €). Ziehe deine Spielsteine bis zum Ablauf der Zeit auf Zahlen (35:1), Dutzende/Kolonnen (2:1) oder Rot/Schwarz, Gerade/Ungerade & 1–18/19–36 (1:1). Nach allen Spins gewinnt das höchste Guthaben!',
    category: 'Strategie',
    gameType: 'party',
    gameTypeLabel: 'CASINO',
    players: '1–8 Spieler',
    minPlayers: 1,
    maxPlayers: 8,
    duration: '5–10 Min.',
    durationMinutes: 6,
    supportsTv: true,
    tags: ['Casino', 'Party', 'Guthaben', 'Strategie', 'TV-Highlight'],
    icon: Coins,
    tone: 'emerald',
    accent: 'emerald',
  },
  {
    id: 'texas-holdem',
    title: "Poker Texas Hold'em",
    subtitle: 'Bluffs, Side-Pots & All-In',
    description:
      'Klassisches No-Limit Texas Hold’em mit geheimen Pocket-Karten am Handy, Community Cards am TV und echtem Chip-Management!',
    howToPlay:
      'Jeder Spieler erhält 2 verdeckte Karten und dasselbe Startguthaben. Über Pre-Flop, Flop, Turn und River baust du mit Check, Call, Raise oder All-In die stärkste 5-Karten-Hand. Im TV-Modus bleiben alle geheimen Karten diskret auf euren Smartphones bis zum Showdown!',
    category: 'Strategie',
    gameType: 'party',
    gameTypeLabel: 'CASINO',
    players: '2–8 Spieler',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '10–20 Min.',
    durationMinutes: 15,
    supportsTv: true,
    tags: ['Poker', 'Casino', 'Karten', 'Strategie', 'TV-Highlight'],
    icon: Spade,
    tone: 'indigo',
    accent: 'amber',
  },
];
