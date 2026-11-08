import { Brain, Grid2X2, Zap, Puzzle, type LucideIcon } from 'lucide-react';

export type Category = 'Alle' | 'Strategie' | 'Denken' | 'Arcade';

export type Tone = 'sunset' | 'indigo' | 'emerald' | 'ocean';

export interface ToneStyle {
  heroBg: string;
  heroText: string;
  heroSubtext: string;
  heroBadge: string;
  heroIconBox: string;
  heroButton: string;
  heroGlow: string;
  dockIcon: string;
  dockActiveRing: string;
  dockActiveBg: string;
  dotActive: string;
}

export interface Game {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: Exclude<Category, 'Alle'>;
  players: string;
  duration: string;
  ageRating: string;
  icon: LucideIcon;
  tone: Tone;
}

export const CATEGORIES: Category[] = ['Alle', 'Strategie', 'Denken', 'Arcade'];

export const TONE_STYLES: Record<Tone, ToneStyle> = {
  sunset: {
    heroBg: 'bg-gradient-to-br from-[#FFEDD5] via-[#FDE2D2] to-[#FBCFE8] dark:from-[#3B1D2E] dark:via-[#2E1A29] dark:to-[#1F1624]',
    heroText: 'text-[#3B1812] dark:text-[#FFE4D6]',
    heroSubtext: 'text-[#6E3B30]/85 dark:text-[#F5C2B0]/80',
    heroBadge: 'bg-white/55 text-[#5C2B22] dark:bg-white/12 dark:text-[#FFD6C4]',
    heroIconBox: 'bg-white/75 text-[#D95338] shadow-sm dark:bg-white/12 dark:text-[#FF9E85]',
    heroButton: 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]',
    heroGlow: 'bg-orange-400/25 dark:bg-orange-500/15',
    dockIcon: 'bg-[#FFE8DC] text-[#D95338] dark:bg-[#3A2220] dark:text-[#FF9E85]',
    dockActiveRing: 'ring-2 ring-[#E86C4F] dark:ring-[#FF8E72]',
    dockActiveBg: 'bg-[#FFF9F6] dark:bg-[#261D22]',
    dotActive: 'bg-[#E86C4F] dark:bg-[#FF8E72]',
  },
  indigo: {
    heroBg: 'bg-gradient-to-br from-[#E8E4FF] via-[#DDD6FE] to-[#E0E7FF] dark:from-[#251E42] dark:via-[#1E1A36] dark:to-[#161529]',
    heroText: 'text-[#231942] dark:text-[#EDE9FE]',
    heroSubtext: 'text-[#4A3B78]/85 dark:text-[#C4B5FD]/80',
    heroBadge: 'bg-white/55 text-[#3B2A6E] dark:bg-white/12 dark:text-[#DDD6FE]',
    heroIconBox: 'bg-white/75 text-[#6344F5] shadow-sm dark:bg-white/12 dark:text-[#A78BFA]',
    heroButton: 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]',
    heroGlow: 'bg-violet-400/25 dark:bg-violet-500/15',
    dockIcon: 'bg-[#ECE8FF] text-[#6344F5] dark:bg-[#2A2344] dark:text-[#B49FFA]',
    dockActiveRing: 'ring-2 ring-[#7C5CFA] dark:ring-[#A78BFA]',
    dockActiveBg: 'bg-[#F8F6FF] dark:bg-[#1E1B2E]',
    dotActive: 'bg-[#7C5CFA] dark:bg-[#A78BFA]',
  },
  emerald: {
    heroBg: 'bg-gradient-to-br from-[#DDF7E8] via-[#D1FAE5] to-[#CCFBF1] dark:from-[#16362B] dark:via-[#132B24] dark:to-[#10201D]',
    heroText: 'text-[#113325] dark:text-[#D1FAE5]',
    heroSubtext: 'text-[#255943]/85 dark:text-[#99E6C3]/80',
    heroBadge: 'bg-white/55 text-[#1B4B37] dark:bg-white/12 dark:text-[#A7F3D0]',
    heroIconBox: 'bg-white/75 text-[#109868] shadow-sm dark:bg-white/12 dark:text-[#6EE7B7]',
    heroButton: 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]',
    heroGlow: 'bg-emerald-400/25 dark:bg-emerald-500/15',
    dockIcon: 'bg-[#DFF7EA] text-[#109868] dark:bg-[#1B352C] dark:text-[#6EE7B7]',
    dockActiveRing: 'ring-2 ring-[#10B981] dark:ring-[#34D399]',
    dockActiveBg: 'bg-[#F3FCF7] dark:bg-[#172622]',
    dotActive: 'bg-[#10B981] dark:bg-[#34D399]',
  },
  ocean: {
    heroBg: 'bg-gradient-to-br from-[#DFF0FF] via-[#D8ECFF] to-[#E0E7FF] dark:from-[#172C42] dark:via-[#152436] dark:to-[#121B29]',
    heroText: 'text-[#122D42] dark:text-[#E0F2FE]',
    heroSubtext: 'text-[#2A5373]/85 dark:text-[#93C5FD]/80',
    heroBadge: 'bg-white/55 text-[#1E4463] dark:bg-white/12 dark:text-[#BAE6FD]',
    heroIconBox: 'bg-white/75 text-[#0284C7] shadow-sm dark:bg-white/12 dark:text-[#7DD3FC]',
    heroButton: 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E]',
    heroGlow: 'bg-sky-400/25 dark:bg-sky-500/15',
    dockIcon: 'bg-[#E0F1FF] text-[#0284C7] dark:bg-[#1D3247] dark:text-[#7DD3FC]',
    dockActiveRing: 'ring-2 ring-[#0EA5E9] dark:ring-[#38BDF8]',
    dockActiveBg: 'bg-[#F4FAFF] dark:bg-[#182330]',
    dotActive: 'bg-[#0EA5E9] dark:bg-[#38BDF8]',
  },
};

export const GAMES: Game[] = [
  {
    id: 'memory',
    title: 'Memory',
    subtitle: 'Gedächtnis & Fokus',
    description: 'Finde die passenden Bildpaare und trainiere dein visuelles Kurzzeitgedächtnis in schnellen Runden.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '5 Min.',
    ageRating: '4+',
    icon: Brain,
    tone: 'sunset',
  },
  {
    id: 'connect',
    title: 'Vier gewinnt',
    subtitle: 'Taktisches Duell',
    description: 'Denke voraus und bringe vier deiner Steine in eine horizontale, vertikale oder diagonale Reihe.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '5 Min.',
    ageRating: '6+',
    icon: Grid2X2,
    tone: 'indigo',
  },
  {
    id: 'reaction',
    title: 'Reaktions-Test',
    subtitle: 'Reflex-Challenge',
    description: 'Wie schnell kannst du reagieren? Stelle dich der ultimativen Tempo-Herausforderung gegen die Uhr.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '2 Min.',
    ageRating: '4+',
    icon: Zap,
    tone: 'emerald',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    subtitle: 'Der Klassiker',
    description: 'Schnelle Runden, klare Regeln: Setze deine Zeichen geschickt und blockiere deinen Gegenspieler.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '3 Min.',
    ageRating: '4+',
    icon: Puzzle,
    tone: 'ocean',
  },
];
