import {
  Brain,
  Grid2X2,
  Zap,
  Puzzle,
  Flame,
  Gamepad2,
  Bomb,
  Rocket,
  type LucideIcon,
} from 'lucide-react';

export type Category = 'Alle' | 'Strategie' | 'Denken' | 'Arcade';

export type Tone = 'sunset' | 'indigo' | 'emerald' | 'ocean';

export interface ToneStyle {
  cardBg: string;
  cardActiveBg: string;
  cardRing: string;
  artBg: string;
  iconBox: string;
  badge: string;
  accentText: string;
  playBtn: string;
  dot: string;
  glow: string;
}

export interface Game {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  howToPlay: string;
  category: Exclude<Category, 'Alle'>;
  players: string;
  duration: string;
  difficulty: 'Leicht' | 'Mittel' | 'Schnell';
  icon: LucideIcon;
  tone: Tone;
}

export const CATEGORIES: Category[] = ['Alle', 'Strategie', 'Denken', 'Arcade'];

export const TONE_STYLES: Record<Tone, ToneStyle> = {
  sunset: {
    cardBg:
      'bg-white/85 dark:bg-[#18181C]/90 hover:bg-white dark:hover:bg-[#1E1E24]',
    cardActiveBg:
      'bg-gradient-to-br from-white via-[#FFF7F3] to-[#FFEDE5] dark:from-[#241A1D] dark:via-[#1E171B] dark:to-[#18151A]',
    cardRing:
      'ring-2 ring-[#F97316] dark:ring-[#FB923C] shadow-[0_14px_34px_-8px_rgba(249,115,22,0.22)]',
    artBg:
      'bg-gradient-to-br from-[#FFEDD5] via-[#FED7AA] to-[#FBCFE8] dark:from-[#43202A] dark:via-[#361C28] dark:to-[#271824]',
    iconBox:
      'bg-white/90 text-[#EA580C] dark:bg-white/15 dark:text-[#FDBA74] shadow-xs',
    badge:
      'bg-[#FFF0E6] text-[#C2410C] dark:bg-[#F97316]/15 dark:text-[#FDBA74]',
    accentText: 'text-[#EA580C] dark:text-[#FB923C]',
    playBtn:
      'bg-[#EA580C] text-white hover:bg-[#D94E07] dark:bg-[#FB923C] dark:text-[#18181B]',
    dot: 'bg-[#F97316] dark:bg-[#FB923C]',
    glow: 'bg-orange-400/25 dark:bg-orange-500/20',
  },
  indigo: {
    cardBg:
      'bg-white/85 dark:bg-[#18181C]/90 hover:bg-white dark:hover:bg-[#1E1E24]',
    cardActiveBg:
      'bg-gradient-to-br from-white via-[#F7F5FF] to-[#EDE9FE] dark:from-[#1F1B33] dark:via-[#1A1829] dark:to-[#161521]',
    cardRing:
      'ring-2 ring-[#7C3AED] dark:ring-[#A78BFA] shadow-[0_14px_34px_-8px_rgba(124,58,237,0.22)]',
    artBg:
      'bg-gradient-to-br from-[#E0E7FF] via-[#DDD6FE] to-[#F3E8FF] dark:from-[#2E2352] dark:via-[#251E42] dark:to-[#1C1833]',
    iconBox:
      'bg-white/90 text-[#6D28D9] dark:bg-white/15 dark:text-[#C4B5FD] shadow-xs',
    badge:
      'bg-[#F3EFFE] text-[#6D28D9] dark:bg-[#8B5CF6]/15 dark:text-[#C4B5FD]',
    accentText: 'text-[#7C3AED] dark:text-[#A78BFA]',
    playBtn:
      'bg-[#7C3AED] text-white hover:bg-[#6D28D9] dark:bg-[#A78BFA] dark:text-[#18181B]',
    dot: 'bg-[#7C3AED] dark:bg-[#A78BFA]',
    glow: 'bg-violet-400/25 dark:bg-violet-500/20',
  },
  emerald: {
    cardBg:
      'bg-white/85 dark:bg-[#18181C]/90 hover:bg-white dark:hover:bg-[#1E1E24]',
    cardActiveBg:
      'bg-gradient-to-br from-white via-[#F2FDF8] to-[#DCFCE7] dark:from-[#162923] dark:via-[#14221E] dark:to-[#131B19]',
    cardRing:
      'ring-2 ring-[#10B981] dark:ring-[#34D399] shadow-[0_14px_34px_-8px_rgba(16,185,129,0.22)]',
    artBg:
      'bg-gradient-to-br from-[#D1FAE5] via-[#A7F3D0] to-[#CCFBF1] dark:from-[#163B30] dark:via-[#133028] dark:to-[#112420]',
    iconBox:
      'bg-white/90 text-[#059669] dark:bg-white/15 dark:text-[#6EE7B7] shadow-xs',
    badge:
      'bg-[#E6FAEE] text-[#047857] dark:bg-[#10B981]/15 dark:text-[#6EE7B7]',
    accentText: 'text-[#059669] dark:text-[#34D399]',
    playBtn:
      'bg-[#059669] text-white hover:bg-[#047857] dark:bg-[#34D399] dark:text-[#18181B]',
    dot: 'bg-[#10B981] dark:bg-[#34D399]',
    glow: 'bg-emerald-400/25 dark:bg-emerald-500/20',
  },
  ocean: {
    cardBg:
      'bg-white/85 dark:bg-[#18181C]/90 hover:bg-white dark:hover:bg-[#1E1E24]',
    cardActiveBg:
      'bg-gradient-to-br from-white via-[#F2F9FF] to-[#E0F2FE] dark:from-[#172536] dark:via-[#151F2C] dark:to-[#131922]',
    cardRing:
      'ring-2 ring-[#0284C7] dark:ring-[#38BDF8] shadow-[0_14px_34px_-8px_rgba(2,132,199,0.22)]',
    artBg:
      'bg-gradient-to-br from-[#E0F2FE] via-[#BAE6FD] to-[#E0E7FF] dark:from-[#1B3552] dark:via-[#172B42] dark:to-[#142033]',
    iconBox:
      'bg-white/90 text-[#0284C7] dark:bg-white/15 dark:text-[#7DD3FC] shadow-xs',
    badge:
      'bg-[#E6F4FE] text-[#0369A1] dark:bg-[#0EA5E9]/15 dark:text-[#7DD3FC]',
    accentText: 'text-[#0284C7] dark:text-[#38BDF8]',
    playBtn:
      'bg-[#0284C7] text-white hover:bg-[#0369A1] dark:bg-[#38BDF8] dark:text-[#18181B]',
    dot: 'bg-[#0284C7] dark:bg-[#38BDF8]',
    glow: 'bg-sky-400/25 dark:bg-sky-500/20',
  },
};

export const GAMES: Game[] = [
  {
    id: 'memory',
    title: 'Memory',
    subtitle: 'Gedächtnis & Fokus',
    description:
      'Finde die verdeckten Bildpaare in möglichst wenigen Zügen und trainiere dein Kurzzeitgedächtnis.',
    howToPlay:
      'Decke pro Zug zwei Karten auf. Stimmen die Symbole überein, bleiben sie offen.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '5 Min.',
    difficulty: 'Leicht',
    icon: Brain,
    tone: 'sunset',
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
    difficulty: 'Mittel',
    icon: Grid2X2,
    tone: 'indigo',
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
    difficulty: 'Schnell',
    icon: Zap,
    tone: 'emerald',
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
    difficulty: 'Leicht',
    icon: Puzzle,
    tone: 'ocean',
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
    difficulty: 'Mittel',
    icon: Flame,
    tone: 'emerald',
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
    difficulty: 'Mittel',
    icon: Gamepad2,
    tone: 'sunset',
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
    difficulty: 'Mittel',
    icon: Bomb,
    tone: 'indigo',
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
    difficulty: 'Schnell',
    icon: Rocket,
    tone: 'ocean',
  },
];
