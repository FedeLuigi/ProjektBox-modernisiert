import { Heart, Search, Tv, X } from 'lucide-react';
import type { NavSection } from '@projektbox/shared/types';
import {
  ACCENT_PALETTES,
  GamePreviewArtwork,
  SECTION_ITEMS,
  type Game,
} from '@projektbox/ui';

export interface TvGalleryLayoutProps {
  games: Game[];
  favoriteIds: string[];
  activeSection: NavSection;
  searchQuery: string;
  filterCounts: Partial<Record<NavSection, number>>;
  onLaunchTvGame: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onSelectSection: (sec: NavSection) => void;
  onSearchChange: (q: string) => void;
}

export function TvGalleryLayout({
  games,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onLaunchTvGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: TvGalleryLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col gap-5 px-6 lg:px-10 pt-5 pb-3">
      {/* Filter-Tabs + TV-Suchleiste */}
      <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 lg:gap-7">
          {SECTION_ITEMS.map((item) => {
            const active = activeSection === item.id;
            const count = filterCounts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`font-arcade relative shrink-0 rounded-lg px-2 py-1.5 text-sm lg:text-base tracking-wider uppercase transition-colors cursor-pointer ${
                  active ? 'text-[#FDE68A]' : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <span>{item.shortLabel}</span>
                {count > 0 && <span className="ml-1.5 opacity-80">({count})</span>}
                {active && (
                  <span className="absolute right-1 bottom-0 left-1 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_12px_#F59E0B]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex w-64 lg:w-80 items-center rounded-xl border border-white/20 bg-white/[0.05] px-3.5 py-2 focus-within:border-[#FBBF24]">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="SPIEL FINDEN..."
            aria-label="Spiele durchsuchen"
            className="font-arcade w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/45 uppercase focus:outline-none"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Suche löschen"
              className="ml-1 rounded p-0.5 text-white/70 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="font-arcade text-lg text-[#E2E8F0] uppercase">
            KEIN SPIEL GEFUNDEN
          </p>
          <button
            type="button"
            data-tv-autofocus="true"
            onClick={() => {
              onSelectSection('all');
              onSearchChange('');
            }}
            className="font-arcade rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-6 py-3 text-sm tracking-wider text-[#FDE68A] uppercase cursor-pointer hover:bg-[#F59E0B]/25"
          >
            ALLE SPIELE ZEIGEN
          </button>
        </div>
      ) : (
        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto py-2 px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-7 pb-6">
            {games.map((game, idx) => {
              const isFav = favoriteIds.includes(game.id);
              const palette = ACCENT_PALETTES[game.accent];

              return (
                <div key={game.id} className="group flex flex-col gap-3">
                  <button
                    type="button"
                    data-tv-card="true"
                    data-tv-autofocus={idx === 0 ? 'true' : undefined}
                    onClick={() => onLaunchTvGame(game)}
                    className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border-2 border-white/15 bg-[#0F172A]/40 text-left shadow-[0_16px_34px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-1 hover:border-white/40 cursor-pointer"
                  >
                    <GamePreviewArtwork
                      gameId={game.id}
                      variant="card"
                      className="h-full w-full object-cover"
                    />
                    <span
                      style={{ backgroundColor: palette.bg }}
                      className="font-arcade absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs text-white uppercase shadow"
                    >
                      {game.players} • {game.duration}
                    </span>
                    <span className="font-arcade absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-[#0F172A]/80 px-2.5 py-1 text-xs text-[#FDE68A] uppercase backdrop-blur-xs">
                      <Tv className="h-3.5 w-3.5" />
                      <span>RAUM ÖFFNEN</span>
                    </span>
                  </button>

                  <div className="flex items-start justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <h3 className="font-arcade text-base lg:text-lg tracking-wide text-white uppercase leading-tight truncate">
                        {game.title}
                      </h3>
                      <p className="text-sm text-[#94A3B8] line-clamp-1">{game.subtitle}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(game.id)}
                      aria-label={`${game.title} als Favorit umschalten`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
                        isFav
                          ? 'border-[#FDA4AF] bg-[#E11D48]/85 text-white'
                          : 'border-white/20 bg-white/[0.06] text-white/75 hover:text-white'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
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
