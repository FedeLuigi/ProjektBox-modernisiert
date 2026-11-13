/**
 * Weiterentwickeltes Crystal-UI Design-System:
 * Verbindet die facettierte Kristall-Formensprache mit neutralen Frost-/Schiefer-Oberflächen
 * und individuellen Spiel-Akzentfarben (Sunset/Amber, Indigo/Violet, Emerald/Jade, Ocean/Cyan).
 */
import { GAMES, type Tone } from '../data/games';

export interface GameThemeTokens {
  tone: Tone;
  primaryBtn: string;
  secondaryAccentBtn: string;
  switchOn: string;
  focusRing: string;
  activeSurface: string;
  badgePill: string;
  infoBox: string;
  accentText: string;
  accentTextSoft: string;
  accentIcon: string;
  secondaryAccentText: string;
  codeGradient: string;
  copyHover: string;
  softRing: string;
  turnPill: string;
  ambientTop: string;
  ambientBottom: string;
  canvasRing: string;
  tvCanvasRing: string;
  slotActive: string;
  slotBar: string;
  brushActive: string;
  keyActive: string;
  progressGradient: string;
  duelPlayerOneCard: string;
  duelPlayerTwoCard: string;
  duelBadgeOne: string;
  duelBadgeTwo: string;
  actionOrb: string;
  hoverRing: string;
}

const CRYSTAL_THEME_BASE: Omit<GameThemeTokens, 'tone'> = {
  primaryBtn:
    'font-arcade uppercase tracking-wider bg-[#059669] hover:bg-[#10B981] text-white border-[3px] border-[#064E3B] shadow-[inset_0_2px_0_#6EE7B7,0_3px_0_rgba(6,78,59,0.5)] cursor-pointer',
  secondaryAccentBtn:
    'font-arcade uppercase tracking-wider bg-[#E2E8F0] hover:bg-[#F1F5F9] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF] cursor-pointer',
  switchOn: 'bg-[#10B981] border-2 border-[#065F46]',
  focusRing: 'focus:ring-2 focus:ring-[#334155]',
  activeSurface: 'bg-[#F1F5F9] border-2 border-[#334155]',
  badgePill:
    'font-arcade uppercase tracking-wider bg-[#1E293B] text-white border-2 border-[#0F172A] shadow-[inset_0_1.5px_0_#475569]',
  infoBox:
    'bg-[#F8FAFC] text-[#1E293B] border-2 border-[#334155] shadow-[inset_0_2px_0_#FFFFFF]',
  accentText: 'text-[#1E293B]',
  accentTextSoft: 'text-[#475569]',
  accentIcon: 'text-[#1E293B]',
  secondaryAccentText: 'text-[#334155]',
  codeGradient: 'from-[#0F172A] via-[#1E293B] to-[#334155]',
  copyHover: 'group-hover:bg-[#10B981]',
  softRing: 'border-[3px] border-[#334155]',
  turnPill:
    'font-arcade uppercase tracking-wider bg-[#059669] text-white border-2 border-[#064E3B]',
  ambientTop: 'bg-[#F59E0B]/15',
  ambientBottom: 'bg-[#10B981]/15',
  canvasRing: 'border-[4px] border-[#1E293B] shadow-[inset_0_0_0_3px_#CBD5E1,0_10px_24px_rgba(15,23,42,0.45)]',
  tvCanvasRing:
    'border-[4px] border-[#1E293B] shadow-[inset_0_0_0_4px_#CBD5E1,0_12px_28px_rgba(15,23,42,0.5)]',
  slotActive:
    'bg-[#059669] text-white border-[3px] border-[#064E3B] shadow-[inset_0_2px_0_#6EE7B7] scale-105',
  slotBar: 'bg-[#F59E0B]',
  brushActive: 'bg-[#1E293B] text-white border-2 border-[#0F172A]',
  keyActive: 'active:bg-[#059669]',
  progressGradient: 'from-[#34D399] via-[#10B981] to-[#059669]',
  duelPlayerOneCard:
    'bg-[#F8FAFC] border-[3px] border-[#0284C7] shadow-[inset_0_2px_0_#FFFFFF,0_4px_0_rgba(3,105,161,0.35)] scale-105',
  duelPlayerTwoCard:
    'bg-[#FFFBEB] border-[3px] border-[#D97706] shadow-[inset_0_2px_0_#FFFFFF,0_4px_0_rgba(180,83,9,0.35)] scale-105',
  duelBadgeOne: 'bg-[#0284C7] border-2 border-[#075985]',
  duelBadgeTwo: 'bg-[#D97706] border-2 border-[#92400E]',
  actionOrb:
    'font-arcade uppercase bg-[#059669] hover:bg-[#10B981] text-white border-[4px] border-[#064E3B] shadow-[inset_0_3px_0_#6EE7B7,0_6px_0_rgba(6,78,59,0.45)] cursor-pointer hover:scale-105',
  hoverRing: 'hover:border-[#0F172A]',
};

export const GAME_THEMES: Record<Tone, GameThemeTokens> = {
  sunset: {
    ...CRYSTAL_THEME_BASE,
    tone: 'sunset',
    primaryBtn:
      'font-arcade uppercase tracking-wider bg-[#EA580C] hover:bg-[#F97316] text-white border-[3px] border-[#7C2D12] shadow-[inset_0_2px_0_#FDBA74,0_3px_0_rgba(124,45,18,0.5)] cursor-pointer',
    turnPill:
      'font-arcade uppercase tracking-wider bg-[#EA580C] text-white border-2 border-[#7C2D12]',
    brushActive: 'bg-[#EA580C] text-white border-2 border-[#7C2D12]',
    keyActive: 'active:bg-[#EA580C]',
    actionOrb:
      'font-arcade uppercase bg-[#EA580C] hover:bg-[#F97316] text-white border-[4px] border-[#7C2D12] shadow-[inset_0_3px_0_#FDBA74,0_6px_0_rgba(124,45,18,0.45)] cursor-pointer hover:scale-105',
  },
  indigo: {
    ...CRYSTAL_THEME_BASE,
    tone: 'indigo',
    primaryBtn:
      'font-arcade uppercase tracking-wider bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border-[3px] border-[#4C1D95] shadow-[inset_0_2px_0_#C4B5FD,0_3px_0_rgba(76,29,149,0.5)] cursor-pointer',
    turnPill:
      'font-arcade uppercase tracking-wider bg-[#7C3AED] text-white border-2 border-[#4C1D95]',
    brushActive: 'bg-[#7C3AED] text-white border-2 border-[#4C1D95]',
    keyActive: 'active:bg-[#7C3AED]',
    actionOrb:
      'font-arcade uppercase bg-[#7C3AED] hover:bg-[#8B5CF6] text-white border-[4px] border-[#4C1D95] shadow-[inset_0_3px_0_#C4B5FD,0_6px_0_rgba(76,29,149,0.45)] cursor-pointer hover:scale-105',
  },
  emerald: {
    ...CRYSTAL_THEME_BASE,
    tone: 'emerald',
  },
  ocean: {
    ...CRYSTAL_THEME_BASE,
    tone: 'ocean',
    primaryBtn:
      'font-arcade uppercase tracking-wider bg-[#0284C7] hover:bg-[#0EA5E9] text-white border-[3px] border-[#075985] shadow-[inset_0_2px_0_#7DD3FC,0_3px_0_rgba(7,89,133,0.5)] cursor-pointer',
    turnPill:
      'font-arcade uppercase tracking-wider bg-[#0284C7] text-white border-2 border-[#075985]',
    actionOrb:
      'font-arcade uppercase bg-[#0284C7] hover:bg-[#0EA5E9] text-white border-[4px] border-[#075985] shadow-[inset_0_3px_0_#7DD3FC,0_6px_0_rgba(7,89,133,0.45)] cursor-pointer hover:scale-105',
  },
};

export function getGameTheme(gameId?: string): GameThemeTokens {
  const tone = GAMES.find((g) => g.id === gameId)?.tone ?? 'ocean';
  return GAME_THEMES[tone];
}

// Horizontale Innenabstände identisch zu `.app-shell`
export const SHELL_CONTAINER = 'w-full max-w-7xl mx-auto';
export const SHELL_PADDING_X = 'app-shell-x';

// Kopfzeile innerhalb `.app-shell`
export const HEADER_ROW = 'flex shrink-0 items-center justify-between gap-2 pb-2 sm:pb-3 landscape:pb-1.5';

// Navigation / Zurück-Button im neutralen Schiefer-Perlmutt Crystal-Stil ("EXIT" / "HOME")
export const HEADER_BACK_BTN =
  'font-arcade uppercase tracking-wider inline-flex h-10 sm:h-11 landscape:h-9 items-center justify-center gap-2 bg-[#E2E8F0] hover:bg-[#F8FAFC] px-4 sm:px-5 text-xs sm:text-sm text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF,0_3px_0_rgba(15,23,42,0.4)] transition-transform active:scale-95 cursor-pointer shrink-0 [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';

// Einheitliche Header-Badges rechts
export const HEADER_BADGE_PILL =
  'font-arcade uppercase tracking-wider inline-flex h-9 sm:h-10 landscape:h-8 items-center justify-center gap-1.5 bg-[#F1F5F9] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF,0_2px_0_rgba(15,23,42,0.35)] px-3.5 text-xs sm:text-sm [clip-path:polygon(0%_5%,100%_0%,98%_95%,2%_100%)]';

// Inhalts-Bühnen innerhalb <main>
export const STAGE_TWO_COL = 'my-auto mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-2 sm:py-4 landscape:py-1';
export const STAGE_SINGLE_COL = 'my-auto mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-2 sm:py-4 landscape:py-1';

// Einheitliches Frost-Crystal-Panel & Unter-Elemente
export const SURFACE_CARD =
  'relative bg-[#EEF4F9] text-[#1E293B] p-5 sm:p-7 landscape:p-4 sm:landscape:p-5 border-[4px] border-[#2B425B] shadow-[inset_0_0_0_3.5px_#FFFFFF,0_12px_24px_rgba(9,20,38,0.42)]';
export const SURFACE_ITEM_ROW =
  'bg-[#F8FAFC] text-[#1E293B] p-3.5 border-[3px] border-[#CBD5E1] shadow-[inset_0_2px_0_#FFFFFF]';
export const INFO_PILL =
  'font-arcade uppercase tracking-wider inline-flex items-center gap-1.5 bg-[#1E293B] px-3.5 py-1.5 text-xs text-white border-[2.5px] border-[#0F172A] shadow-[inset_0_1.5px_0_#475569] [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';
export const STATUS_PILL_SUCCESS =
  'font-arcade uppercase tracking-wider px-3 py-1 text-xs bg-[#059669] text-white border-2 border-[#064E3B] shadow-[inset_0_1.5px_0_#6EE7B7]';
export const STATUS_PILL_NEUTRAL =
  'font-arcade uppercase tracking-wider px-3 py-1 text-xs bg-[#E2E8F0] text-[#1E293B] border-2 border-[#475569]';

// ─── CRYSTAL BUTTON-SYSTEM ─────

export const BTN_PRIMARY_BASE =
  'font-arcade uppercase tracking-wider flex h-12 landscape:h-10 sm:landscape:h-11 w-full items-center justify-center gap-2.5 px-6 text-sm sm:text-base transition-transform duration-150 active:scale-95 [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';
export const BTN_PRIMARY_ENABLED =
  'bg-[#059669] hover:bg-[#10B981] text-white border-[3px] border-[#064E3B] shadow-[inset_0_2px_0_#6EE7B7,0_4px_0_rgba(6,78,59,0.45)] cursor-pointer';
export const BTN_PRIMARY_DISABLED =
  'bg-[#CBD5E1] text-[#64748B] border-[3px] border-[#94A3B8] cursor-not-allowed shadow-none';

export const BTN_SECONDARY_BASE =
  'font-arcade uppercase tracking-wider flex h-11 sm:h-12 landscape:h-10 w-full items-center justify-center gap-2.5 px-5 text-sm sm:text-base transition-transform duration-150 active:scale-95 cursor-pointer [clip-path:polygon(1%_0%,99%_6%,97%_100%,0%_94%)]';
export const BTN_SECONDARY_NEUTRAL =
  'bg-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF]';
export const BTN_SECONDARY_ACCENT =
  'bg-[#F59E0B] hover:bg-[#FBBF24] text-white border-[3px] border-[#78350F] shadow-[inset_0_2px_0_#FDE68A]';

export const BTN_SUCCESS_READY =
  'bg-[#059669] hover:bg-[#10B981] text-white border-[3px] border-[#064E3B] shadow-[inset_0_2px_0_#6EE7B7]';
export const BTN_SUCCESS_CONFIRMED =
  'bg-[#F59E0B] hover:bg-[#FBBF24] text-white border-[3px] border-[#78350F] shadow-[inset_0_2px_0_#FDE68A]';

export const SEGMENT_CONTAINER =
  'grid gap-1.5 p-1.5 bg-[#E2E8F0] border-[3px] border-[#334155] shadow-inner';
export const SEGMENT_TAB_BASE =
  'font-arcade uppercase tracking-wider py-2 px-3 text-center text-xs sm:text-sm transition-all cursor-pointer [clip-path:polygon(0%_5%,100%_0%,98%_95%,2%_100%)]';
export const SEGMENT_TAB_ACTIVE =
  'bg-[#1E293B] text-white border-2 border-[#0F172A] shadow-[inset_0_1.5px_0_#475569]';
export const SEGMENT_TAB_INACTIVE =
  'bg-[#F8FAFC] text-[#334155] hover:bg-white';

export const SWITCH_TRACK_ON =
  'bg-[#10B981] border-2 border-[#065F46]';
export const SWITCH_TRACK_OFF =
  'bg-[#CBD5E1] border-2 border-[#475569]';

export interface GameWorldStageTheme {
  bgGradient: string;
  glowPrimary: string;
  glowSecondary: string;
  hudBadgeBg: string;
  hudBadgeBorder: string;
  hudBadgeText: string;
  worldLabel: string;
}

const GAME_WORLD_STAGES: Record<string, GameWorldStageTheme> = {
  'tic-tac-toe': {
    bgGradient: 'from-[#091526] via-[#0F2442] to-[#060E1A]',
    glowPrimary: 'bg-[#06B6D4]/20',
    glowSecondary: 'bg-[#F59E0B]/15',
    hudBadgeBg: 'bg-[#083344]/90',
    hudBadgeBorder: 'border-[#06B6D4]',
    hudBadgeText: 'text-[#67E8F9]',
    worldLabel: 'CYBER DUEL 3×3',
  },
  'connect-four': {
    bgGradient: 'from-[#0A1329] via-[#132347] to-[#070D1C]',
    glowPrimary: 'bg-[#3B82F6]/20',
    glowSecondary: 'bg-[#F43F5E]/15',
    hudBadgeBg: 'bg-[#1E3A8A]/90',
    hudBadgeBorder: 'border-[#60A5FA]',
    hudBadgeText: 'text-[#BFDBFE]',
    worldLabel: 'GRAVITY ARENA 7×6',
  },
  'draw-and-guess': {
    bgGradient: 'from-[#1F102B] via-[#2E1740] to-[#13091C]',
    glowPrimary: 'bg-[#EC4899]/20',
    glowSecondary: 'bg-[#F59E0B]/15',
    hudBadgeBg: 'bg-[#831843]/90',
    hudBadgeBorder: 'border-[#F472B6]',
    hudBadgeText: 'text-[#FBCFE8]',
    worldLabel: 'ATELIER LIVE STUDIO',
  },
  memory: {
    bgGradient: 'from-[#14112E] via-[#211C4C] to-[#0B091B]',
    glowPrimary: 'bg-[#8B5CF6]/22',
    glowSecondary: 'bg-[#F59E0B]/16',
    hudBadgeBg: 'bg-[#3B0764]/90',
    hudBadgeBorder: 'border-[#A78BFA]',
    hudBadgeText: 'text-[#DDD6FE]',
    worldLabel: 'ARCANE CARD VAULT',
  },
  reaction: {
    bgGradient: 'from-[#1A0D1F] via-[#2A1230] to-[#0E0611]',
    glowPrimary: 'bg-[#F43F5E]/20',
    glowSecondary: 'bg-[#10B981]/18',
    hudBadgeBg: 'bg-[#881337]/90',
    hudBadgeBorder: 'border-[#FB7185]',
    hudBadgeText: 'text-[#FFE4E6]',
    worldLabel: 'REFLEX SENSOR LAB',
  },
  snake: {
    bgGradient: 'from-[#051B14] via-[#0A2B21] to-[#03100C]',
    glowPrimary: 'bg-[#10B981]/22',
    glowSecondary: 'bg-[#F59E0B]/14',
    hudBadgeBg: 'bg-[#064E3B]/90',
    hudBadgeBorder: 'border-[#34D399]',
    hudBadgeText: 'text-[#A7F3D0]',
    worldLabel: 'BIO-GRID SERPENT',
  },
  '2048': {
    bgGradient: 'from-[#1E150A] via-[#2E2010] to-[#120C05]',
    glowPrimary: 'bg-[#F59E0B]/22',
    glowSecondary: 'bg-[#EA580C]/16',
    hudBadgeBg: 'bg-[#78350F]/90',
    hudBadgeBorder: 'border-[#FBBF24]',
    hudBadgeText: 'text-[#FEF3C7]',
    worldLabel: 'GOLDEN MATRIX 2048',
  },
  minesweeper: {
    bgGradient: 'from-[#0B1420] via-[#132235] to-[#070C14]',
    glowPrimary: 'bg-[#38BDF8]/18',
    glowSecondary: 'bg-[#F59E0B]/15',
    hudBadgeBg: 'bg-[#1E293B]/95',
    hudBadgeBorder: 'border-[#94A3B8]',
    hudBadgeText: 'text-[#E2E8F0]',
    worldLabel: 'TACTICAL RADAR SWEEPER',
  },
  'space-dodge': {
    bgGradient: 'from-[#050714] via-[#0D122B] to-[#02030A]',
    glowPrimary: 'bg-[#8B5CF6]/24',
    glowSecondary: 'bg-[#06B6D4]/20',
    hudBadgeBg: 'bg-[#2E1065]/90',
    hudBadgeBorder: 'border-[#C084FC]',
    hudBadgeText: 'text-[#E9D5FF]',
    worldLabel: 'DEEP COSMOS SECTOR',
  },
};

export function getGameWorldStage(gameId?: string): GameWorldStageTheme {
  if (gameId && GAME_WORLD_STAGES[gameId]) {
    return GAME_WORLD_STAGES[gameId];
  }
  return GAME_WORLD_STAGES['tic-tac-toe'];
}
