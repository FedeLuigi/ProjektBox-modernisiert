import { Heart, Play, Search, Tv, X } from 'lucide-react';
import { type NavSection } from '../App';
import { type Game } from '../data/games';
import { SECTION_ITEMS } from './ArcadeHudElements';
import { ACCENT_PALETTES } from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';

export interface OpenGalleryLayoutProps {
  games: Game[];
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
        className="font-arcade rounded-lg border border-[#F59E0B]/60 bg-transparent px-5 py-2 text-xs tracking-wider text-[#FDE68A] uppercase transition hover:bg-[#F59E0B]/15 cursor-pointer active:scale-95"
      >
        ALLE SPIELE ZEIGEN
      </button>
    </div>
  );
}

/**
 * Offenes Gallery-Layout:
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
}: OpenGalleryLayoutProps) {
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchGame(game, false);
                        }}
                        style={{
                          backgroundColor: palette.bg,
                          borderColor: palette.topBorder,
                        }}
                        title={`${game.title} spielen`}
                        aria-label={`${game.title} spielen`}
                        className="font-arcade inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs text-white uppercase shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>

                      {game.supportsTv && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchGame(game, true);
                          }}
                          title={`${game.title} im TV-Modus starten`}
                          aria-label={`${game.title} im TV-Modus starten`}
                          className="font-arcade inline-flex h-8 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-2.5 text-xs text-white uppercase backdrop-blur-xs transition hover:bg-white/20 active:scale-95 cursor-pointer"
                        >
                          <Tv className="h-3.5 w-3.5" />
                        </button>
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
