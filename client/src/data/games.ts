import {
  Brain,
  Grid2X2,
  Zap,
  Puzzle,
  Flame,
  Gamepad2,
  Bomb,
  Rocket,
  Palette,
  type LucideIcon,
} from 'lucide-react';

export type Category = 'Alle' | 'Strategie' | 'Denken' | 'Arcade';

export type Tone = 'sunset' | 'indigo' | 'emerald' | 'ocean';

export interface Game {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  howToPlay: string;
  category: Exclude<Category, 'Alle'>;
  players: string;
  duration: string;
  icon: LucideIcon;
  tone: Tone;
  starsEarned: number;
  starsTotal: number;
  defaultScore: number;
  defaultReward: number;
  unlockCost?: number;
}

export const CATEGORIES: Category[] = ['Alle', 'Strategie', 'Denken', 'Arcade'];

export const GAMES: Game[] = [
  {
    id: 'memory',
    title: 'Insel-Memory',
    subtitle: 'Gedächtnis & Fokus',
    description:
      'Finde die verdeckten Paare in möglichst wenigen Zügen und trainiere dein Gedächtnis.',
    howToPlay:
      'Decke pro Zug zwei Karten auf. Stimmen die Symbole überein, bleiben sie offen.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '5 Min.',
    icon: Brain,
    tone: 'sunset',
    starsEarned: 22,
    starsTotal: 135,
    defaultScore: 25873,
    defaultReward: 63581,
    unlockCost: 0,
  },
  {
    id: 'connect',
    title: 'Vier gewinnt',
    subtitle: 'Taktisches Duell',
    description:
      'Plane voraus und bringe vier deiner Spielsteine horizontal, vertikal oder diagonal in eine Reihe.',
    howToPlay:
      'Wirf abwechselnd Steine in die Spalten. Wer zuerst vier Steine verbindet, gewinnt.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '5 Min.',
    icon: Grid2X2,
    tone: 'indigo',
    starsEarned: 45,
    starsTotal: 135,
    defaultScore: 19420,
    defaultReward: 48200,
    unlockCost: 20,
  },
  {
    id: 'reaction',
    title: 'Reaktions-Test',
    subtitle: 'Reflex-Challenge',
    description:
      'Teste deine Reaktionszeit auf die Millisekunde genau, sobald das Signal aufleuchtet.',
    howToPlay:
      'Warte auf den Farbwechsel und tippe so blitzschnell wie möglich auf das Feld.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '2 Min.',
    icon: Zap,
    tone: 'emerald',
    starsEarned: 33,
    starsTotal: 135,
    defaultScore: 31050,
    defaultReward: 75400,
    unlockCost: 20,
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    subtitle: 'Schneller Klassiker',
    description:
      'Drei Felder, klare Taktik: Setze dein Zeichen geschickt und blockiere deinen Gegenspieler.',
    howToPlay:
      'Setze abwechselnd X und O auf das 3×3-Feld, bis drei gleiche Zeichen in einer Reihe stehen.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '3 Min.',
    icon: Puzzle,
    tone: 'ocean',
    starsEarned: 54,
    starsTotal: 135,
    defaultScore: 14890,
    defaultReward: 32150,
    unlockCost: 20,
  },
  {
    id: 'draw-and-guess',
    title: 'Zeichnen & Raten',
    subtitle: 'Kreatives Montagsmaler',
    description:
      'Male das geheime Wort auf deinem Smartphone, während deine Freunde auf dem Bildschirm oder Fernseher mitraten!',
    howToPlay:
      'Der Zeichner malt das geheime Wort. Alle anderen tippen ihre Vermutungen ein, um blitzschnell Punkte zu sammeln.',
    category: 'Denken',
    players: '2-8 Spieler',
    duration: '5 Min.',
    icon: Palette,
    tone: 'sunset',
    starsEarned: 18,
    starsTotal: 135,
    defaultScore: 22500,
    defaultReward: 54000,
    unlockCost: 20,
  },
  {
    id: 'snake',
    title: 'Snake',
    subtitle: 'Retro Wurm-Jagd',
    description:
      'Steuere die Schlange, schnappe dir Äpfel und wachse unaufhaltsam – ohne in die Wände zu crashen.',
    howToPlay:
      'Wische oder nutze die Pfeiltasten, um die Richtung zu wechseln und Äpfel einzusammeln.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '3 Min.',
    icon: Flame,
    tone: 'emerald',
    starsEarned: 15,
    starsTotal: 135,
    defaultScore: 28640,
    defaultReward: 59300,
    unlockCost: 20,
  },
  {
    id: '2048',
    title: '2048',
    subtitle: 'Zahlenrausch',
    description:
      'Kombiniere gleiche Zahlenblöcke durch geschicktes Wischen, bis die magische 2048 Kachel entsteht.',
    howToPlay:
      'Verschiebe alle Kacheln auf dem Spielfeld. Stoßen zwei gleiche Zahlen zusammen, verschmelzen sie.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '8 Min.',
    icon: Gamepad2,
    tone: 'sunset',
    starsEarned: 28,
    starsTotal: 135,
    defaultScore: 42048,
    defaultReward: 88500,
    unlockCost: 20,
  },
  {
    id: 'minesweeper',
    title: 'Minenfeld',
    subtitle: 'Logik & Spürsinn',
    description:
      'Decke sichere Kacheln auf, markiere gefährliche Sprengsätze mit Flaggen und löse das Minenfeld.',
    howToPlay:
      'Tippe zum Aufdecken. Zahlen zeigen an, wie viele Minen an diese Kachel angrenzen.',
    category: 'Strategie',
    players: '1 Spieler',
    duration: '5 Min.',
    icon: Bomb,
    tone: 'indigo',
    starsEarned: 10,
    starsTotal: 135,
    defaultScore: 17320,
    defaultReward: 41900,
    unlockCost: 20,
  },
  {
    id: 'space-dodge',
    title: 'Space Dodge',
    subtitle: 'Galaxy Überleben',
    description:
      'Navigiere dein Raumschiff durch ein dichtes Asteroidenfeld und sammle leuchtende Raumkerne.',
    howToPlay:
      'Halte und ziehe dein Schiff nach links und rechts, um den anfliegenden Asteroiden auszuweichen.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '2 Min.',
    icon: Rocket,
    tone: 'ocean',
    starsEarned: 12,
    starsTotal: 135,
    defaultScore: 36910,
    defaultReward: 69800,
    unlockCost: 20,
  },
];
