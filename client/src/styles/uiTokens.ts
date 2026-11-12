/**
 * Einheitliches Layout- und Button-Stufensystem für Hauptmenü,
 * Spiel-Erklärung, Spiel-Vorbereitung, Lobby-Warteraum, Modals und Einstellungen.
 */

// Horizontale Innenabstände identisch zu `.app-shell` (für Scroll-Bereiche im Hauptmenü)
export const SHELL_CONTAINER = 'w-full max-w-7xl mx-auto';
export const SHELL_PADDING_X = 'app-shell-x';

// Kopfzeile innerhalb `.app-shell`
export const HEADER_ROW = 'flex shrink-0 items-center justify-between gap-3 pb-3 sm:pb-4';

// Navigation / Zurück-Button (Stufe 4 Ghost/Nav — ruhig im Dark-Glass-Stil)
export const HEADER_BACK_BTN =
  'inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full bg-[#1C1C1E]/90 hover:bg-[#27272B] px-4 text-xs sm:text-sm font-bold text-white shadow-xs ring-1 ring-white/[0.1] backdrop-blur-xl transition-all active:scale-95 cursor-pointer shrink-0';

// Einheitliche Header-Badges rechts (Kategorie, Einstellungen, Status)
export const HEADER_BADGE_PILL =
  'inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-bold tracking-wide';

// Inhalts-Bühnen innerhalb <main>
export const STAGE_TWO_COL = 'my-auto mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-2 sm:py-4';
export const STAGE_SINGLE_COL = 'my-auto mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-2 sm:py-4';

// Einheitliche Dark-Glass-Karte & Unter-Elemente
export const SURFACE_CARD =
  'rounded-[28px] bg-[#18181C]/80 p-6 sm:p-7 ring-1 ring-white/[0.08] backdrop-blur-xl shadow-lg';
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
  'flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95';
export const BTN_PRIMARY_ENABLED =
  'bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C026D3] text-white shadow-md shadow-purple-600/25 hover:brightness-110 cursor-pointer';
export const BTN_PRIMARY_DISABLED =
  'bg-white/[0.07] text-white/35 ring-1 ring-white/[0.08] cursor-not-allowed shadow-none';

// Stufe 2 (Secondary): Wichtige Alternativ- oder Schnellaktionen ohne grellen Pink-Schrei.
export const BTN_SECONDARY_BASE =
  'flex h-12 w-full items-center justify-center gap-2.5 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-150 active:scale-95 cursor-pointer';
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
