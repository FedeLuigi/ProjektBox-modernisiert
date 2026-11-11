/**
 * Einheitliche Layout- und Button-Tokens für Hauptmenü, Spiel-Vorbereitung,
 * Lobby-Warteraum und Einstellungen.
 */

// Horizontale Innenabstände identisch zu `.app-shell` (für Scroll-Bereiche im Hauptmenü)
export const SHELL_CONTAINER = 'w-full max-w-7xl mx-auto';
export const SHELL_PADDING_X = 'app-shell-x';

// Kopfzeile innerhalb `.app-shell`
export const HEADER_ROW = 'flex shrink-0 items-center justify-between gap-3 pb-3 sm:pb-4';

// Einheitlicher Zurück- / Verlassen-Button oben links
export const HEADER_BACK_BTN =
  'inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full bg-[#1C1C1E]/90 hover:bg-[#27272B] px-4 text-xs sm:text-sm font-bold text-white shadow-xs ring-1 ring-white/[0.1] backdrop-blur-xl transition-all active:scale-95 cursor-pointer shrink-0';

// Einheitliche Header-Badges rechts (Kategorie, Einstellungen, Status)
export const HEADER_BADGE_PILL =
  'inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-bold tracking-wide';

// Inhalts-Bühnen innerhalb <main>
export const STAGE_TWO_COL = 'my-auto mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-2 sm:py-4';
export const STAGE_SINGLE_COL = 'my-auto mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-2 sm:py-4';

// Einheitliche Dark-Glass-Karte
export const SURFACE_CARD =
  'rounded-[28px] bg-[#18181C]/80 p-6 sm:p-7 ring-1 ring-white/[0.08] backdrop-blur-xl shadow-lg';

// Einheitliche Primär-Buttons (volle Breite, feste Höhe h-12, Pillenform)
export const PRIMARY_BTN_BASE =
  'flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95';
export const PRIMARY_BTN_ENABLED =
  'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30 hover:brightness-110 cursor-pointer';
export const PRIMARY_BTN_DISABLED =
  'bg-white/[0.08] text-white/40 ring-1 ring-white/10 cursor-not-allowed shadow-none';

// Einheitliche Sekundär- / Bereit-Buttons (ebenfalls h-12, Pillenform)
export const SECONDARY_BTN_BASE =
  'flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95 cursor-pointer';
