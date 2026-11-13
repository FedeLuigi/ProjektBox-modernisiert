/**
 * Einheitliches Crystal-UI Design-System (verbindliche Designreferenz: Faceted Ice / Crystal Game UI)
 * für Hauptmenü, Spiel-Erklärung, Spiel-Vorbereitung, Lobby-Warteraum, Modals, TV-Modus und Spielfelder.
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
    'font-arcade uppercase tracking-wider bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[3px] border-[#0E5A8A] shadow-[inset_0_2px_0_#7AD3F7,0_3px_0_rgba(14,62,96,0.45)] cursor-pointer',
  secondaryAccentBtn:
    'font-arcade uppercase tracking-wider bg-[#52A9D6] hover:bg-[#64B7E2] text-white border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#9CE0FA] cursor-pointer',
  switchOn: 'bg-[#2B9FD6] border-2 border-[#12608E]',
  focusRing: 'focus:ring-2 focus:ring-[#17608E]',
  activeSurface: 'bg-[#52A9D6]/45 border-2 border-[#17608E]',
  badgePill:
    'font-arcade uppercase tracking-wider bg-[#39A9DD] text-white border-2 border-[#17608E] shadow-[inset_0_1.5px_0_#8AD8F8]',
  infoBox:
    'bg-[#88D6F8] text-[#15608E] border-2 border-[#17608E] shadow-[inset_0_2px_0_#CFF2FF]',
  accentText: 'text-[#15608E]',
  accentTextSoft: 'text-[#17689A]',
  accentIcon: 'text-[#15608E]',
  secondaryAccentText: 'text-[#0E4D78]',
  codeGradient: 'from-[#15608E] via-[#1A6798] to-[#0E4D78]',
  copyHover: 'group-hover:bg-[#2B9FD6]',
  softRing: 'border-[3px] border-[#17608E]',
  turnPill:
    'font-arcade uppercase tracking-wider bg-[#2B9FD6] text-white border-2 border-[#0E5A8A]',
  ambientTop: 'bg-[#8DD7F7]/25',
  ambientBottom: 'bg-[#52A9D6]/25',
  canvasRing: 'border-[4px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE]',
  tvCanvasRing:
    'border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_10px_0_rgba(14,62,96,0.4)]',
  slotActive:
    'bg-[#2B9FD6] text-white border-[3px] border-[#0E5A8A] shadow-[inset_0_2px_0_#8AD8F8] scale-105',
  slotBar: 'bg-[#F6B969]',
  brushActive: 'bg-[#2B9FD6] text-white border-2 border-[#0E5A8A]',
  keyActive: 'active:bg-[#2B9FD6]',
  progressGradient: 'from-[#8DD7F7] via-[#52A9D6] to-[#2B9FD6]',
  duelPlayerOneCard:
    'bg-[#ADE6FB] border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#E6F8FF,0_4px_0_rgba(14,62,96,0.35)] scale-105',
  duelPlayerTwoCard:
    'bg-[#FDE0A6] border-[3px] border-[#D9923E] shadow-[inset_0_2px_0_#FFF8E7,0_4px_0_rgba(158,93,25,0.35)] scale-105',
  duelBadgeOne: 'bg-[#2B9FD6] border-2 border-[#0E5A8A]',
  duelBadgeTwo: 'bg-[#EAA14B] border-2 border-[#9E5D19]',
  actionOrb:
    'font-arcade uppercase bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[4px] border-[#0E5A8A] shadow-[inset_0_3px_0_#8AD8F8,0_6px_0_rgba(14,62,96,0.45)] cursor-pointer hover:scale-105',
  hoverRing: 'hover:border-[#0E5A8A]',
};

export const GAME_THEMES: Record<Tone, GameThemeTokens> = {
  sunset: {
    ...CRYSTAL_THEME_BASE,
    tone: 'sunset',
  },
  indigo: {
    ...CRYSTAL_THEME_BASE,
    tone: 'indigo',
  },
  emerald: {
    ...CRYSTAL_THEME_BASE,
    tone: 'emerald',
  },
  ocean: {
    ...CRYSTAL_THEME_BASE,
    tone: 'ocean',
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

// Navigation / Zurück-Button im abgeschrägten Crystal-Button-Stil ("EXIT" / "HOME")
export const HEADER_BACK_BTN =
  'font-arcade uppercase tracking-wider inline-flex h-10 sm:h-11 landscape:h-9 items-center justify-center gap-2 bg-[#2B9FD6] hover:bg-[#38ACE0] px-4 sm:px-5 text-xs sm:text-sm text-white border-[3px] border-[#0E5A8A] shadow-[inset_0_2px_0_#8AD8F8,0_3px_0_rgba(14,62,96,0.4)] transition-transform active:scale-95 cursor-pointer shrink-0 [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';

// Einheitliche Header-Badges rechts (Kategorie, Einstellungen, Status) im Crystal-Readout-Stil
export const HEADER_BADGE_PILL =
  'font-arcade uppercase tracking-wider inline-flex h-9 sm:h-10 landscape:h-8 items-center justify-center gap-1.5 bg-[#88D6F8] text-[#15608E] border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#DDF6FF,0_2px_0_rgba(14,62,96,0.35)] px-3.5 text-xs sm:text-sm [clip-path:polygon(0%_5%,100%_0%,98%_95%,2%_100%)]';

// Inhalts-Bühnen innerhalb <main>
export const STAGE_TWO_COL = 'my-auto mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-2 sm:py-4 landscape:py-1';
export const STAGE_SINGLE_COL = 'my-auto mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-2 sm:py-4 landscape:py-1';

// Einheitliches Crystal-Panel ("DIFFICULTY" / "LEVEL 16" / "OPTIONS" Fläche) & Unter-Elemente
export const SURFACE_CARD =
  'relative bg-[#9CE0FA] text-[#15608E] p-5 sm:p-7 landscape:p-4 sm:landscape:p-5 border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_10px_0_rgba(14,62,96,0.38)]';
export const SURFACE_ITEM_ROW =
  'bg-[#B8ECFD]/85 text-[#15608E] p-3.5 border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#E6F8FF]';
export const INFO_PILL =
  'font-arcade uppercase tracking-wider inline-flex items-center gap-1.5 bg-[#39A9DD] px-3.5 py-1.5 text-xs text-white border-[2.5px] border-[#17608E] shadow-[inset_0_1.5px_0_#9CE0FA] [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';
export const STATUS_PILL_SUCCESS =
  'font-arcade uppercase tracking-wider px-3 py-1 text-xs bg-[#2B9FD6] text-white border-2 border-[#0E5A8A] shadow-[inset_0_1.5px_0_#8AD8F8]';
export const STATUS_PILL_NEUTRAL =
  'font-arcade uppercase tracking-wider px-3 py-1 text-xs bg-[#88D6F8] text-[#15608E] border-2 border-[#17608E]';

// ─── CRYSTAL BUTTON-SYSTEM ("EASY", "NORMAL", "HARD", "PLAY", "CONTINUE", "OK") ─────

export const BTN_PRIMARY_BASE =
  'font-arcade uppercase tracking-wider flex h-12 landscape:h-10 sm:landscape:h-11 w-full items-center justify-center gap-2.5 px-6 text-sm sm:text-base transition-transform duration-150 active:scale-95 [clip-path:polygon(0%_6%,100%_0%,98%_95%,2%_100%)]';
export const BTN_PRIMARY_ENABLED =
  'bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[3px] border-[#0E5A8A] shadow-[inset_0_2px_0_#8AD8F8,0_4px_0_rgba(14,62,96,0.45)] cursor-pointer';
export const BTN_PRIMARY_DISABLED =
  'bg-[#74BCE0]/60 text-[#15608E]/50 border-[3px] border-[#17608E]/50 cursor-not-allowed shadow-none';

export const BTN_SECONDARY_BASE =
  'font-arcade uppercase tracking-wider flex h-11 sm:h-12 landscape:h-10 w-full items-center justify-center gap-2.5 px-5 text-sm sm:text-base transition-transform duration-150 active:scale-95 cursor-pointer [clip-path:polygon(1%_0%,99%_6%,97%_100%,0%_94%)]';
export const BTN_SECONDARY_NEUTRAL =
  'bg-[#52A9D6] hover:bg-[#64B7E2] text-white border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#AEE8FC]';
export const BTN_SECONDARY_ACCENT =
  'bg-[#39A9DD] hover:bg-[#4EB6E6] text-white border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#9CE0FA]';

export const BTN_SUCCESS_READY =
  'bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[3px] border-[#0E5A8A] shadow-[inset_0_2px_0_#8AD8F8]';
export const BTN_SUCCESS_CONFIRMED =
  'bg-[#F6B969] hover:bg-[#FDE0A6] text-[#15608E] border-[3px] border-[#D9923E] shadow-[inset_0_2px_0_#FFF1C9]';

export const SEGMENT_CONTAINER =
  'grid gap-1.5 p-1.5 bg-[#52A9D6] border-[3px] border-[#17608E] shadow-[inset_0_2px_0_#3990BE]';
export const SEGMENT_TAB_BASE =
  'font-arcade uppercase tracking-wider py-2 px-3 text-center text-xs sm:text-sm transition-all cursor-pointer [clip-path:polygon(0%_5%,100%_0%,98%_95%,2%_100%)]';
export const SEGMENT_TAB_ACTIVE =
  'bg-[#2B9FD6] text-white border-2 border-[#0E5A8A] shadow-[inset_0_1.5px_0_#8AD8F8]';
export const SEGMENT_TAB_INACTIVE =
  'bg-[#88D6F8]/70 text-[#15608E] hover:bg-[#9CE0FA]';

export const SWITCH_TRACK_ON =
  'bg-[#2B9FD6] border-2 border-[#12608E]';
export const SWITCH_TRACK_OFF =
  'bg-[#74BCE0] border-2 border-[#17608E]';
