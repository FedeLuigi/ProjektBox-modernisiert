import { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Play, Search, Tv, X } from 'lucide-react';
import { type NavSection } from '../App';
import { type Game } from '../data/games';
import { SECTION_ITEMS } from './ArcadeHudElements';
import {
  ACCENT_PALETTES,
  CrystalButton,
  CrystalIconButton,
} from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';

export interface OpenLayoutProps {
  games: Game[];
  activeGame: Game;
  favoriteIds: string[];
  activeSection: NavSection;
  searchQuery: string;
  filterCounts: Partial<Record<NavSection, number>>;
  onSelectGame: (gameId: string) => void;
  onLaunchGame: (game: Game, tvMode: boolean) => void;
  onToggleFavorite: (gameId: string) => void;
  onSelectSection: (sec: NavSection) => void;
  onSearchChange: (q: string) => void;
}

function OpenEmptyState({
  activeSection,
  onReset,
}: {
  activeSection: NavSection;
  onReset: () => void;
}) {
  return (
    <div className="my-auto flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <p className="font-arcade text-sm sm:text-base tracking-wider text-[#E2E8F0] uppercase">
        {activeSection === 'favorites'
          ? 'NOCH KEINE FAVORITEN MARKIERT'
          : activeSection === 'recent'
            ? 'NOCH KEIN SPIEL ZULETZT GESPIELT'
            : 'KEIN SPIEL FÜR DIESE SUCHE GEFUNDEN'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="font-arcade rounded-full border border-white/25 bg-white/10 px-5 py-2 text-xs tracking-wider text-[#FDE68A] uppercase backdrop-blur-xs transition hover:bg-white/20 cursor-pointer active:scale-95"
      >
        ALLE SPIELE ZEIGEN
      </button>
    </div>
  );
}

/**
 * Variante 1 (Offen): OPEN STAGE
 * Luftiges, rahmenloses Layout direkt über dem Hintergrund – ohne schwere Boxen,
 * mit viel Raum für Artwork, klarer Typografie und schwebender Spielauswahl unten.
 */
export function OpenStageLayout({
  games,
  activeGame,
  favoriteIds,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: OpenLayoutProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-4 px-4 sm:px-6 py-2">
      <div className="my-auto mx-auto flex w-full max-w-5xl flex-col md:flex-row items-center gap-5 sm:gap-8">
        <div className="relative w-full max-w-[300px] sm:max-w-[360px] md:w-[46%] shrink-0">
          <div
            style={{ backgroundColor: palette.bg }}
            className="pointer-events-none absolute -inset-3 rounded-3xl opacity-30 blur-2xl"
          />
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span
              style={{ borderColor: palette.topBorder, color: palette.topBorder }}
              className="font-arcade border bg-white/10 backdrop-blur-xs px-2.5 py-0.5 text-[10px] sm:text-xs tracking-widest uppercase rounded-full"
            >
              {activeGame.gameTypeLabel} • {activeGame.category}
            </span>
            <span className="font-arcade text-[10px] sm:text-xs tracking-wider text-[#94A3B8] uppercase">
              {activeGame.players} • {activeGame.duration}
            </span>
          </div>

          <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]">
            {activeGame.title}
          </h2>

          <p className="text-sm sm:text-base font-medium text-[#CBD5E1] max-w-lg leading-relaxed">
            {activeGame.description}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <CrystalButton
              size="lg"
              variant={activeGame.accent}
              tilt="left"
              onClick={() => onLaunchGame(activeGame, false)}
              className="h-11 sm:h-12 px-7 text-sm sm:text-base"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>SPIELEN</span>
            </CrystalButton>

            {activeGame.supportsTv && (
              <CrystalButton
                size="lg"
                variant="secondary"
                tilt="right"
                onClick={() => onLaunchGame(activeGame, true)}
                className="h-11 sm:h-12 px-5 text-sm sm:text-base"
              >
                <Tv className="h-4 w-4" />
                <span>TV</span>
              </CrystalButton>
            )}

            <CrystalIconButton
              size="md"
              tilt="right"
              variant={isFav ? 'rose' : 'neutral'}
              onClick={() => onToggleFavorite(activeGame.id)}
              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </CrystalIconButton>
          </div>
        </div>
      </div>

      <div className="no-scrollbar mx-auto flex w-full max-w-4xl items-center justify-start sm:justify-center gap-2.5 overflow-x-auto py-1">
        {games.map((game) => {
          const selected = game.id === activeGame.id;
          const Icon = game.icon;
          const itemPalette = ACCENT_PALETTES[game.accent];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelectGame(game.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all cursor-pointer active:scale-95 ${
                selected
                  ? 'border-white/60 bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.18)] backdrop-blur-xs'
                  : 'border-white/10 bg-white/5 text-[#CBD5E1] hover:bg-white/12 hover:text-white'
              }`}
            >
              <span
                style={{ backgroundColor: itemPalette.bg }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-arcade text-xs tracking-wide uppercase whitespace-nowrap">
                {game.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Variante 2 (Offen): OPEN GLASS PILLS
 * Transparente Glas-Pills für Kategorien & Suche oben + gespiegelter offener Split-Screen.
 */
export function OpenGlassPillsLayout({
  games,
  activeGame,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: OpenLayoutProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-3 px-4 sm:px-6 py-1">
      {/* Offene Glas-Pill Filter & Suche */}
      <div className="mx-auto flex w-full max-w-5xl flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5">
          {SECTION_ITEMS.map((item) => {
            const active = activeSection === item.id;
            const count = filterCounts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`font-arcade shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] sm:text-xs tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  active
                    ? 'border-[#FDE68A] bg-[#F59E0B]/25 text-[#FEF3C7] shadow-[0_0_16px_rgba(245,158,11,0.3)] backdrop-blur-xs'
                    : 'border-white/15 bg-white/6 text-[#CBD5E1] hover:bg-white/14 hover:text-white'
                }`}
              >
                {item.shortLabel}
                {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center rounded-full border border-white/20 bg-white/8 px-3.5 py-1.5 backdrop-blur-xs focus-within:border-[#38BDF8] sm:w-56">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SUCHEN..."
            aria-label="Spiele durchsuchen"
            className="font-arcade w-full min-w-0 bg-transparent text-xs tracking-wider text-white placeholder:text-white/50 uppercase focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Suche löschen"
              className="ml-1 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <OpenEmptyState
          activeSection={activeSection}
          onReset={() => {
            onSelectSection('all');
            onSearchChange('');
          }}
        />
      ) : (
        <>
          {/* Gespiegelter offener Split: Infos links, Artwork rechts */}
          <div className="my-auto mx-auto flex w-full max-w-5xl flex-col-reverse md:flex-row items-center gap-5 sm:gap-8">
            <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
              <span
                style={{ borderColor: palette.topBorder, color: palette.topBorder }}
                className="font-arcade rounded-full border bg-white/8 px-3 py-0.5 text-[10px] sm:text-xs uppercase tracking-widest"
              >
                {activeGame.gameTypeLabel} • {activeGame.players} • {activeGame.duration}
              </span>

              <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]">
                {activeGame.title}
              </h2>

              <p className="text-sm sm:text-base font-medium text-[#CBD5E1] max-w-md leading-relaxed">
                {activeGame.description}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                <CrystalButton
                  size="lg"
                  variant={activeGame.accent}
                  tilt="left"
                  onClick={() => onLaunchGame(activeGame, false)}
                  className="h-11 px-7 text-sm sm:text-base"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>PLAY</span>
                </CrystalButton>

                {activeGame.supportsTv && (
                  <CrystalButton
                    size="lg"
                    variant="secondary"
                    tilt="right"
                    onClick={() => onLaunchGame(activeGame, true)}
                    className="h-11 px-5 text-sm sm:text-base"
                  >
                    <Tv className="h-4 w-4" />
                    <span>TV</span>
                  </CrystalButton>
                )}

                <CrystalIconButton
                  size="md"
                  tilt="right"
                  variant={isFav ? 'rose' : 'neutral'}
                  onClick={() => onToggleFavorite(activeGame.id)}
                  aria-label="Favorit umschalten"
                >
                  <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                </CrystalIconButton>
              </div>
            </div>

            <div className="relative w-full max-w-[300px] sm:max-w-[360px] md:w-[46%] shrink-0">
              <div
                style={{ backgroundColor: palette.bg }}
                className="pointer-events-none absolute -inset-3 rounded-3xl opacity-30 blur-2xl"
              />
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>

          <div className="no-scrollbar mx-auto flex w-full max-w-4xl items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1">
            {games.map((game) => {
              const selected = game.id === activeGame.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onSelectGame(game.id)}
                  className={`font-arcade shrink-0 rounded-full px-3.5 py-1 text-xs uppercase transition-all cursor-pointer ${
                    selected
                      ? 'bg-white text-[#0F172A] shadow-md'
                      : 'bg-white/8 text-[#CBD5E1] hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {game.title}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Variante 3 (Offen): OPEN FLOATING DOCK
 * Oben komplett frei und offen – Filter, Suche und Spielwahl schweben im unteren Glas-Dock.
 */
export function OpenFloatingDockLayout({
  games,
  activeGame,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: OpenLayoutProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-3 px-4 sm:px-6 py-2">
      {games.length === 0 ? (
        <OpenEmptyState
          activeSection={activeSection}
          onReset={() => {
            onSelectSection('all');
            onSearchChange('');
          }}
        />
      ) : (
        <div className="my-auto mx-auto flex w-full max-w-3xl flex-col items-center text-center gap-3.5">
          <div className="relative w-full max-w-[330px] sm:max-w-[400px]">
            <div
              style={{ backgroundColor: palette.bg }}
              className="pointer-events-none absolute -inset-4 rounded-3xl opacity-35 blur-2xl"
            />
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/25 shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
              <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="font-arcade text-[11px] tracking-widest text-[#FDE68A] uppercase">
              {activeGame.gameTypeLabel} • {activeGame.players} • {activeGame.duration}
            </span>
            <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]">
              {activeGame.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#CBD5E1] max-w-md">
              {activeGame.description}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <CrystalButton
              size="lg"
              variant={activeGame.accent}
              tilt="left"
              onClick={() => onLaunchGame(activeGame, false)}
              className="h-11 px-8 text-sm sm:text-base"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>SPIELEN</span>
            </CrystalButton>

            {activeGame.supportsTv && (
              <CrystalButton
                size="lg"
                variant="secondary"
                tilt="right"
                onClick={() => onLaunchGame(activeGame, true)}
                className="h-11 px-5 text-sm sm:text-base"
              >
                <Tv className="h-4 w-4" />
                <span>TV</span>
              </CrystalButton>
            )}

            <CrystalIconButton
              size="md"
              tilt="right"
              variant={isFav ? 'rose' : 'neutral'}
              onClick={() => onToggleFavorite(activeGame.id)}
              aria-label="Favorit umschalten"
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </CrystalIconButton>
          </div>
        </div>
      )}

      {/* Unteres schwebendes Dock: Spiele + Kategorien + Suche */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-white/15 bg-[#0F172A]/55 p-2.5 sm:p-3 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        {games.length > 0 && (
          <div className="no-scrollbar flex items-center justify-start sm:justify-center gap-2 overflow-x-auto">
            {games.map((game) => {
              const selected = game.id === activeGame.id;
              const Icon = game.icon;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onSelectGame(game.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-arcade uppercase transition-all cursor-pointer ${
                    selected
                      ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-white'
                      : 'border-white/10 bg-white/5 text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{game.title}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-white/10 pt-2">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {SECTION_ITEMS.map((item) => {
              const active = activeSection === item.id;
              const count = filterCounts[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  className={`font-arcade shrink-0 rounded-lg px-2.5 py-1 text-[10px] sm:text-[11px] uppercase transition cursor-pointer ${
                    active
                      ? 'bg-[#F59E0B] text-[#0F172A]'
                      : 'bg-white/8 text-[#CBD5E1] hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {item.shortLabel}
                  {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
                </button>
              );
            })}
          </div>

          <div className="flex items-center rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 sm:w-48">
            <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 text-[#FBBF24]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="SUCHEN..."
              aria-label="Spiele durchsuchen"
              className="font-arcade w-full min-w-0 bg-transparent text-[11px] text-white placeholder:text-white/50 uppercase focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Suche löschen"
                className="ml-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Variante 4 (Offen): OPEN GALLERY
 * Unterstrich-Filter & rahmenlose Suche oben, alle Spiele frei schwebend ohne weiße Kartenrahmen.
 */
export function OpenGalleryLayout({
  games,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: OpenLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col gap-3 px-4 sm:px-6 py-1">
      {/* Offene Unterstrich-Tabs & Borderless-Suche */}
      <div className="mx-auto flex w-full max-w-5xl flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 border-b border-white/15 pb-2 shrink-0">
        <div className="no-scrollbar flex items-center gap-4 sm:gap-6 overflow-x-auto">
          {SECTION_ITEMS.map((item) => {
            const active = activeSection === item.id;
            const count = filterCounts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`font-arcade relative shrink-0 pb-1.5 text-xs sm:text-sm tracking-wider uppercase transition-colors cursor-pointer ${
                  active ? 'text-[#FDE68A]' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <span>{item.shortLabel}</span>
                {count > 0 && <span className="ml-1 opacity-75">({count})</span>}
                {active && (
                  <span className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center border-b-2 border-white/25 pb-1 focus-within:border-[#38BDF8] sm:w-52">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SPIEL FINDEN..."
            aria-label="Spiele durchsuchen"
            className="font-arcade w-full min-w-0 bg-transparent text-xs text-white placeholder:text-white/45 uppercase focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Suche löschen"
              className="ml-1 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <OpenEmptyState
          activeSection={activeSection}
          onReset={() => {
            onSelectSection('all');
            onSearchChange('');
          }}
        />
      ) : (
        <div className="no-scrollbar mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 pb-4">
            {games.map((game) => {
              const isFav = favoriteIds.includes(game.id);
              const palette = ACCENT_PALETTES[game.accent];

              return (
                <div
                  key={game.id}
                  onClick={() => onSelectGame(game.id)}
                  className="group flex flex-col gap-2.5 cursor-pointer"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/15 shadow-[0_14px_30px_rgba(0,0,0,0.4)] transition-transform duration-200 group-hover:-translate-y-1">
                    <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(game.id);
                      }}
                      aria-label="Favorit umschalten"
                      className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-xs transition cursor-pointer ${
                        isFav
                          ? 'border-[#FDA4AF] bg-[#E11D48]/85 text-white'
                          : 'border-white/25 bg-[#0F172A]/60 text-white/80 hover:text-white'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <span
                      style={{ backgroundColor: palette.bg }}
                      className="font-arcade absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[10px] text-white uppercase shadow"
                    >
                      {game.players} • {game.duration}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <h3 className="font-arcade text-base sm:text-lg tracking-wider text-white uppercase truncate">
                        {game.title}
                      </h3>
                      <p className="text-xs text-[#94A3B8] truncate">{game.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <CrystalButton
                        size="sm"
                        variant={game.accent}
                        tilt="left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchGame(game, false);
                        }}
                        className="h-8 px-3 text-xs"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </CrystalButton>
                      {game.supportsTv && (
                        <CrystalButton
                          size="sm"
                          variant="secondary"
                          tilt="right"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchGame(game, true);
                          }}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Tv className="h-3.5 w-3.5" />
                        </CrystalButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Variante 5 (Offen): OPEN MINIMAL
 * Ghost-Filter + ausklappbare Suchlupe oben, zentrierte Hero-Bühne mit Seiten-Vorschau.
 */
export function OpenMinimalLayout({
  games,
  activeGame,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: OpenLayoutProps) {
  const [searchExpanded, setSearchExpanded] = useState(Boolean(searchQuery));
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  const currentIdx = Math.max(
    0,
    games.findIndex((g) => g.id === activeGame.id)
  );
  const prevGame = games.length > 1 ? games[(currentIdx - 1 + games.length) % games.length] : null;
  const nextGame = games.length > 1 ? games[(currentIdx + 1) % games.length] : null;

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-3 px-4 sm:px-6 py-1">
      {/* Minimale Ghost-Filter + ausklappbare Suchlupe */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 shrink-0">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {SECTION_ITEMS.map((item) => {
            const active = activeSection === item.id;
            const count = filterCounts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`font-arcade flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs uppercase transition cursor-pointer shrink-0 ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />}
                <span>{item.shortLabel}</span>
                {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center shrink-0">
          {searchExpanded || searchQuery ? (
            <div className="flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 backdrop-blur-xs w-40 sm:w-52">
              <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 text-[#38BDF8]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="SUCHEN..."
                aria-label="Spiele durchsuchen"
                className="font-arcade w-full min-w-0 bg-transparent text-xs text-white placeholder:text-white/50 uppercase focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setSearchExpanded(false);
                }}
                aria-label="Suche schließen"
                className="ml-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchExpanded(true)}
              aria-label="Suche öffnen"
              title="Spiele suchen"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white/80 hover:bg-white/15 hover:text-white cursor-pointer transition"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <OpenEmptyState
          activeSection={activeSection}
          onReset={() => {
            onSelectSection('all');
            onSearchChange('');
            setSearchExpanded(false);
          }}
        />
      ) : (
        <div className="my-auto mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4">
          <div className="flex w-full items-center justify-center gap-3 sm:gap-6">
            {prevGame && (
              <button
                type="button"
                onClick={() => onSelectGame(prevGame.id)}
                aria-label={`Vorheriges Spiel: ${prevGame.title}`}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <div className="relative w-full max-w-[320px] sm:max-w-[420px]">
              <div
                style={{ backgroundColor: palette.bg }}
                className="pointer-events-none absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
              />
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/20 shadow-[0_22px_50px_rgba(0,0,0,0.5)]">
                <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
              </div>
            </div>

            {nextGame && (
              <button
                type="button"
                onClick={() => onSelectGame(nextGame.id)}
                aria-label={`Nächstes Spiel: ${nextGame.title}`}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-1.5">
            <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]">
              {activeGame.title}
            </h2>
            <span className="font-arcade text-xs text-[#94A3B8] uppercase">
              {activeGame.gameTypeLabel} • {activeGame.players} • {activeGame.duration}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <CrystalButton
              size="lg"
              variant={activeGame.accent}
              tilt="left"
              onClick={() => onLaunchGame(activeGame, false)}
              className="h-11 sm:h-12 px-8 text-sm sm:text-base"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>SPIELEN</span>
            </CrystalButton>

            {activeGame.supportsTv && (
              <CrystalButton
                size="lg"
                variant="secondary"
                tilt="right"
                onClick={() => onLaunchGame(activeGame, true)}
                className="h-11 sm:h-12 px-5 text-sm sm:text-base"
              >
                <Tv className="h-4 w-4" />
                <span>TV</span>
              </CrystalButton>
            )}

            <CrystalIconButton
              size="md"
              tilt="right"
              variant={isFav ? 'rose' : 'neutral'}
              onClick={() => onToggleFavorite(activeGame.id)}
              aria-label="Favorit umschalten"
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </CrystalIconButton>
          </div>
        </div>
      )}

      {/* Minimalistischer Punkt-Indikator unten */}
      <div className="flex items-center justify-center gap-2 pb-1">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelectGame(g.id)}
            aria-label={g.title}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              g.id === activeGame.id
                ? 'w-7 bg-[#38BDF8]'
                : 'w-2 bg-white/25 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
