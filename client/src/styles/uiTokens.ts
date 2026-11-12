/**
 * Einheitliches Layout- und Button-Stufensystem für Hauptmenü,
 * Spiel-Erklärung, Spiel-Vorbereitung, Lobby-Warteraum, Modals und Einstellungen.
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

export const GAME_THEMES: Record<Tone, GameThemeTokens> = {
  sunset: {
    tone: 'sunset',
    primaryBtn:
      'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/30 hover:brightness-110 cursor-pointer',
    secondaryAccentBtn:
      'bg-orange-500/16 hover:bg-orange-500/24 text-orange-100 ring-1 ring-orange-400/35 backdrop-blur-md shadow-xs',
    switchOn: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]',
    focusRing: 'focus:ring-2 focus:ring-orange-500',
    activeSurface: 'bg-orange-500/[0.14] ring-orange-400/40',
    badgePill: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
    infoBox: 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/25',
    accentText: 'text-orange-300',
    accentTextSoft: 'text-orange-300/90',
    accentIcon: 'text-orange-400',
    secondaryAccentText: 'text-amber-300',
    codeGradient: 'from-orange-400 via-amber-300 to-yellow-200',
    copyHover: 'group-hover:bg-orange-500',
    softRing: 'ring-2 ring-orange-500/45',
    turnPill: 'bg-orange-500/20 text-orange-200 ring-orange-400/40',
    ambientTop: 'bg-orange-600/25',
    ambientBottom: 'bg-amber-600/20',
    canvasRing: 'ring-2 ring-orange-400/45',
    tvCanvasRing: 'ring-4 ring-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.25)]',
    slotActive: 'bg-orange-500/30 text-white ring-2 ring-orange-400 scale-105',
    slotBar: 'bg-orange-400',
    brushActive: 'bg-orange-500 text-white shadow-xs',
    keyActive: 'active:bg-orange-500/50',
    progressGradient: 'from-orange-500 via-amber-400 to-yellow-300',
    duelPlayerOneCard: 'bg-orange-500/25 ring-2 ring-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.38)] scale-105',
    duelPlayerTwoCard: 'bg-amber-500/25 ring-2 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.38)] scale-105',
    duelBadgeOne: 'bg-orange-500',
    duelBadgeTwo: 'bg-amber-500',
    actionOrb:
      'bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 text-white shadow-orange-500/40 ring-4 ring-orange-400/40 cursor-pointer animate-pulse hover:scale-105',
    hoverRing: 'hover:ring-orange-400/50',
  },
  indigo: {
    tone: 'indigo',
    primaryBtn:
      'bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] text-white shadow-md shadow-purple-600/25 hover:brightness-110 cursor-pointer',
    secondaryAccentBtn:
      'bg-purple-500/16 hover:bg-purple-500/24 text-purple-100 ring-1 ring-purple-400/35 backdrop-blur-md shadow-xs',
    switchOn: 'bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.35)]',
    focusRing: 'focus:ring-2 focus:ring-purple-500',
    activeSurface: 'bg-purple-500/[0.12] ring-purple-400/35',
    badgePill: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30',
    infoBox: 'bg-purple-500/15 text-purple-200 ring-1 ring-purple-500/25',
    accentText: 'text-purple-300',
    accentTextSoft: 'text-purple-300/90',
    accentIcon: 'text-purple-400',
    secondaryAccentText: 'text-indigo-300',
    codeGradient: 'from-purple-400 via-indigo-300 to-fuchsia-300',
    copyHover: 'group-hover:bg-purple-600',
    softRing: 'ring-2 ring-purple-500/45',
    turnPill: 'bg-purple-500/20 text-purple-200 ring-purple-400/40',
    ambientTop: 'bg-purple-600/25',
    ambientBottom: 'bg-indigo-600/22',
    canvasRing: 'ring-2 ring-purple-400/45',
    tvCanvasRing: 'ring-4 ring-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.25)]',
    slotActive: 'bg-purple-600/30 text-white ring-2 ring-purple-400 scale-105',
    slotBar: 'bg-purple-400',
    brushActive: 'bg-purple-600 text-white shadow-xs',
    keyActive: 'active:bg-purple-600/50',
    progressGradient: 'from-purple-500 via-indigo-500 to-fuchsia-400',
    duelPlayerOneCard: 'bg-purple-600/25 ring-2 ring-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.4)] scale-105',
    duelPlayerTwoCard: 'bg-indigo-600/25 ring-2 ring-indigo-400 shadow-[0_0_35px_rgba(99,102,241,0.4)] scale-105',
    duelBadgeOne: 'bg-purple-600',
    duelBadgeTwo: 'bg-indigo-600',
    actionOrb:
      'bg-gradient-to-tr from-purple-600 via-indigo-600 to-fuchsia-500 text-white shadow-purple-500/40 ring-4 ring-purple-400/40 cursor-pointer animate-pulse hover:scale-105',
    hoverRing: 'hover:ring-purple-500/50',
  },
  emerald: {
    tone: 'emerald',
    primaryBtn:
      'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-white shadow-md shadow-emerald-500/25 hover:brightness-110 cursor-pointer',
    secondaryAccentBtn:
      'bg-emerald-500/16 hover:bg-emerald-500/24 text-emerald-100 ring-1 ring-emerald-400/35 backdrop-blur-md shadow-xs',
    switchOn: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    focusRing: 'focus:ring-2 focus:ring-emerald-500',
    activeSurface: 'bg-emerald-500/[0.14] ring-emerald-400/40',
    badgePill: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    infoBox: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25',
    accentText: 'text-emerald-300',
    accentTextSoft: 'text-emerald-300/90',
    accentIcon: 'text-emerald-400',
    secondaryAccentText: 'text-teal-300',
    codeGradient: 'from-emerald-400 via-teal-300 to-lime-200',
    copyHover: 'group-hover:bg-emerald-600',
    softRing: 'ring-2 ring-emerald-500/45',
    turnPill: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40',
    ambientTop: 'bg-emerald-600/25',
    ambientBottom: 'bg-teal-600/20',
    canvasRing: 'ring-2 ring-emerald-400/45',
    tvCanvasRing: 'ring-4 ring-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)]',
    slotActive: 'bg-emerald-600/30 text-white ring-2 ring-emerald-400 scale-105',
    slotBar: 'bg-emerald-400',
    brushActive: 'bg-emerald-600 text-white shadow-xs',
    keyActive: 'active:bg-emerald-600/50',
    progressGradient: 'from-emerald-500 via-teal-400 to-lime-300',
    duelPlayerOneCard: 'bg-emerald-600/25 ring-2 ring-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.4)] scale-105',
    duelPlayerTwoCard: 'bg-teal-600/25 ring-2 ring-teal-400 shadow-[0_0_35px_rgba(20,184,166,0.4)] scale-105',
    duelBadgeOne: 'bg-emerald-600',
    duelBadgeTwo: 'bg-teal-600',
    actionOrb:
      'bg-gradient-to-tr from-emerald-500 via-teal-500 to-lime-500 text-white shadow-emerald-500/40 ring-4 ring-emerald-400/40 cursor-pointer animate-pulse hover:scale-105',
    hoverRing: 'hover:ring-emerald-400/50',
  },
  ocean: {
    tone: 'ocean',
    primaryBtn:
      'bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 text-white shadow-md shadow-sky-500/25 hover:brightness-110 cursor-pointer',
    secondaryAccentBtn:
      'bg-sky-500/16 hover:bg-sky-500/24 text-sky-100 ring-1 ring-sky-400/35 backdrop-blur-md shadow-xs',
    switchOn: 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]',
    focusRing: 'focus:ring-2 focus:ring-sky-500',
    activeSurface: 'bg-sky-500/[0.14] ring-sky-400/40',
    badgePill: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
    infoBox: 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25',
    accentText: 'text-sky-300',
    accentTextSoft: 'text-sky-300/90',
    accentIcon: 'text-sky-400',
    secondaryAccentText: 'text-cyan-300',
    codeGradient: 'from-sky-400 via-cyan-300 to-blue-200',
    copyHover: 'group-hover:bg-sky-500',
    softRing: 'ring-2 ring-sky-500/45',
    turnPill: 'bg-sky-500/20 text-sky-200 ring-sky-400/40',
    ambientTop: 'bg-sky-600/25',
    ambientBottom: 'bg-blue-600/20',
    canvasRing: 'ring-2 ring-sky-400/45',
    tvCanvasRing: 'ring-4 ring-sky-500/30 shadow-[0_0_50px_rgba(14,165,233,0.25)]',
    slotActive: 'bg-sky-600/30 text-white ring-2 ring-sky-400 scale-105',
    slotBar: 'bg-sky-400',
    brushActive: 'bg-sky-500 text-white shadow-xs',
    keyActive: 'active:bg-sky-500/50',
    progressGradient: 'from-sky-500 via-cyan-400 to-blue-300',
    duelPlayerOneCard: 'bg-sky-600/25 ring-2 ring-sky-400 shadow-[0_0_35px_rgba(14,165,233,0.4)] scale-105',
    duelPlayerTwoCard: 'bg-amber-500/25 ring-2 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.38)] scale-105',
    duelBadgeOne: 'bg-sky-500',
    duelBadgeTwo: 'bg-amber-500',
    actionOrb:
      'bg-gradient-to-tr from-sky-500 via-blue-500 to-cyan-400 text-white shadow-sky-500/40 ring-4 ring-sky-400/40 cursor-pointer animate-pulse hover:scale-105',
    hoverRing: 'hover:ring-sky-400/50',
  },
};

export function getGameTheme(gameId?: string): GameThemeTokens {
  const tone = GAMES.find((g) => g.id === gameId)?.tone ?? 'indigo';
  return GAME_THEMES[tone];
}

// Horizontale Innenabstände identisch zu `.app-shell` (für Scroll-Bereiche im Hauptmenü)
export const SHELL_CONTAINER = 'w-full max-w-7xl mx-auto';
export const SHELL_PADDING_X = 'app-shell-x';

// Kopfzeile innerhalb `.app-shell`
export const HEADER_ROW = 'flex shrink-0 items-center justify-between gap-2 pb-2 sm:pb-3 landscape:pb-1.5';

// Navigation / Zurück-Button (Stufe 4 Ghost/Nav — ruhig im Dark-Glass-Stil)
export const HEADER_BACK_BTN =
  'inline-flex h-9 sm:h-10 landscape:h-8 items-center justify-center gap-2 rounded-full bg-[#1C1C1E]/90 hover:bg-[#27272B] px-4 landscape:px-3 text-xs sm:text-sm landscape:text-xs font-bold text-white shadow-xs ring-1 ring-white/[0.1] backdrop-blur-xl transition-all active:scale-95 cursor-pointer shrink-0';

// Einheitliche Header-Badges rechts (Kategorie, Einstellungen, Status)
export const HEADER_BADGE_PILL =
  'inline-flex h-8 sm:h-9 landscape:h-7 items-center justify-center gap-1.5 rounded-full px-3.5 landscape:px-3 text-xs font-bold tracking-wide';

// Inhalts-Bühnen innerhalb <main>
export const STAGE_TWO_COL = 'my-auto mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-2 sm:py-4 landscape:py-1';
export const STAGE_SINGLE_COL = 'my-auto mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-2 sm:py-4 landscape:py-1';

// Einheitliche Dark-Glass-Karte & Unter-Elemente
export const SURFACE_CARD =
  'rounded-[28px] bg-[#18181C]/80 p-6 sm:p-7 landscape:p-4 sm:landscape:p-5 ring-1 ring-white/[0.08] backdrop-blur-xl shadow-lg';
export const SURFACE_ITEM_ROW =
  'rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.08] backdrop-blur-md';
export const INFO_PILL =
  'inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/[0.08] backdrop-blur-md';
export const STATUS_PILL_SUCCESS =
  'rounded-full px-3 py-1 text-xs font-extrabold ring-1 bg-emerald-500/20 text-emerald-300 ring-emerald-500/35';
export const STATUS_PILL_NEUTRAL =
  'rounded-full px-3 py-1 text-xs font-extrabold ring-1 bg-white/10 text-white/60 ring-white/15';

// ─── 4-STUFEN BUTTON-SYSTEM ──────────────────────────────────────────────────

// Stufe 1 (Primary): Genau EINE Haupt- bzw. Abschluss-Aktion pro Ansicht/Card.
export const BTN_PRIMARY_BASE =
  'flex h-12 landscape:h-10 sm:landscape:h-11 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95';
export const BTN_PRIMARY_ENABLED =
  'bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] text-white shadow-md shadow-purple-600/25 hover:brightness-110 cursor-pointer';
export const BTN_PRIMARY_DISABLED =
  'bg-white/[0.07] text-white/35 ring-1 ring-white/[0.08] cursor-not-allowed shadow-none';

// Stufe 2 (Secondary): Wichtige Alternativ- oder Schnellaktionen ohne grellen Pink-Schrei.
export const BTN_SECONDARY_BASE =
  'flex h-12 landscape:h-10 sm:landscape:h-11 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95 cursor-pointer';
export const BTN_SECONDARY_NEUTRAL =
  'bg-white/[0.09] hover:bg-white/[0.15] text-white ring-1 ring-white/[0.16] backdrop-blur-md shadow-xs';
export const BTN_SECONDARY_ACCENT =
  'bg-purple-500/16 hover:bg-purple-500/24 text-purple-100 ring-1 ring-purple-400/35 backdrop-blur-md shadow-xs';

// Stufe 3 (Semantic Status): Bereit-Status & Bestätigungen (gedecktes Emerald statt Neon).
export const BTN_SUCCESS_READY =
  'bg-emerald-500/22 hover:bg-emerald-500/32 text-emerald-100 ring-1 ring-emerald-400/45 shadow-xs';
export const BTN_SUCCESS_CONFIRMED =
  'bg-emerald-500/18 hover:bg-emerald-500/26 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs';

// Stufe 4 (Segmented Tabs & Switches): Neutrales iOS Dark-Glass für Umschalter.
export const SEGMENT_CONTAINER =
  'grid gap-1.5 p-1 rounded-full bg-black/40 ring-1 ring-white/10 backdrop-blur-md';
export const SEGMENT_TAB_BASE =
  'py-2 px-3 text-center rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer';
export const SEGMENT_TAB_ACTIVE =
  'bg-white/[0.15] text-white ring-1 ring-white/20 shadow-xs';
export const SEGMENT_TAB_INACTIVE =
  'text-[#8E8E93] hover:text-white';

export const SWITCH_TRACK_ON =
  'bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.35)]';
export const SWITCH_TRACK_OFF =
  'bg-white/20';
