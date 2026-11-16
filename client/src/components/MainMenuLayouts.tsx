import { Heart, Play, Search, Tv, X } from 'lucide-react';
import { type NavSection } from '../App';
import { type Game } from '../data/games';
import { type AvatarConfig } from './Avatar';
import { PlayerAvatarButton, SECTION_ITEMS } from './ArcadeHudElements';
import { ACCENT_PALETTES } from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';
import { BrandWordmark, HeaderActionButtons, MainMenuHeader } from './MainMenuHeader';

export type OpenLayoutId =
  | 'open-classic'
  | 'open-unified-bar'
  | 'open-editorial'
  | 'open-docked-rail'
  | 'open-floating-pill';

export interface OpenLayoutOption {
  id: OpenLayoutId;
  title: string;
  description: string;
}

export const OPEN_LAYOUT_OPTIONS: OpenLayoutOption[] = [
  {
    id: 'open-unified-bar',
    title: 'Verschmolzene Leiste',
    description:
      'Avatar, Titel, „+“, Suchleiste und Aktionsbuttons verschmelzen in einer einzigen durchgängigen Kopfleiste.',
  },
  {
    id: 'open-editorial',
    title: 'Editorial Masthead',
    description:
      'Profil & Aktionen oben, darunter PROJEKT BOX, Kategorien und Suche auf einer gemeinsamen Linie.',
  },
  {
    id: 'open-docked-rail',
    title: 'Seitenleiste',
    description:
      'Titel, Avatar, Suche, Kategorien und Buttons verschmelzen links in einer schlanken offenen Leiste.',
  },
  {
    id: 'open-floating-pill',
    title: 'Schwebende Leiste',
    description:
      'Kopfzeile links/rechts aufgeräumt, Kategorien & Suche schweben darunter als transparente Glasleiste.',
  },
  {
    id: 'open-classic',
    title: 'Open Gallery Klassik',
    description:
      'Zentrierte Wortmarke mit Avatar links, Buttons rechts und klassischer Unterstrich-Filterleiste.',
  },
];

export interface OpenGalleryLayoutProps {
  layout: OpenLayoutId;
  avatar?: AvatarConfig;
  playerName: string;
  games: Game[];
  favoriteIds: string[];
  activeSection: NavSection;
  searchQuery: string;
  filterCounts: Partial<Record<NavSection, number>>;
  onOpenProfile: () => void;
  onOpenTvJoin: () => void;
  onOpenSettings: () => void;
  onOpenLayoutExplorer: () => void;
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

function UnderlineCategoryTabs({
  activeSection,
  filterCounts,
  onSelectSection,
  vertical = false,
}: {
  activeSection: NavSection;
  filterCounts: Partial<Record<NavSection, number>>;
  onSelectSection: (sec: NavSection) => void;
  vertical?: boolean;
}) {
  return (
    <div
      className={
        vertical
          ? 'flex flex-col gap-1.5'
          : 'no-scrollbar flex items-center gap-4 sm:gap-5 overflow-x-auto'
      }
    >
      {SECTION_ITEMS.map((item) => {
        const active = activeSection === item.id;
        const count = filterCounts[item.id] ?? 0;

        if (vertical) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`font-arcade relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs tracking-wider uppercase transition-colors cursor-pointer ${
                active
                  ? 'bg-[#F59E0B]/15 text-[#FDE68A] border-l-2 border-[#F59E0B]'
                  : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.shortLabel}</span>
              {count > 0 && <span className="text-[11px] opacity-75">{count}</span>}
            </button>
          );
        }

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
  );
}

function BorderlessSearchInput({
  searchQuery,
  onSearchChange,
  className = 'sm:w-52',
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center border-b-2 border-white/25 pb-1 focus-within:border-[#38BDF8] ${className}`}
    >
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
  );
}

function OpenGalleryGrid({
  games,
  favoriteIds,
  activeSection,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onResetFilters,
  columnsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}: {
  games: Game[];
  favoriteIds: string[];
  activeSection: NavSection;
  onSelectGame: (gameId: string) => void;
  onLaunchGame: (game: Game, tvMode: boolean) => void;
  onToggleFavorite: (gameId: string) => void;
  onResetFilters: () => void;
  columnsClass?: string;
}) {
  if (games.length === 0) {
    return <OpenEmptyState activeSection={activeSection} onReset={onResetFilters} />;
  }

  return (
    <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto py-2">
      <div className={`grid ${columnsClass} gap-6 sm:gap-7 pb-4`}>
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
  );
}

/**
 * Offenes Gallery-Layout mit 5 wählbaren Kompositionen, bei denen das Open-Gallery-Design
 * identisch bleibt, Titel, Avatar, Suche, Tabs und Buttons aber unterschiedlich stark verschmelzen.
 */
export function OpenGalleryLayout({
  layout,
  avatar,
  playerName,
  games,
  favoriteIds,
  activeSection,
  searchQuery,
  filterCounts,
  onOpenProfile,
  onOpenTvJoin,
  onOpenSettings,
  onOpenLayoutExplorer,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onSelectSection,
  onSearchChange,
}: OpenGalleryLayoutProps) {
  const resetFilters = () => {
    onSelectSection('all');
    onSearchChange('');
  };

  // 1. VERSCHMOLZENE KOPFLEISTE: Avatar + Titel + „+“ + Suche + Aktionsbuttons in einer einzigen Zeile
  if (layout === 'open-unified-bar') {
    return (
      <div className="flex flex-1 min-h-0 w-full flex-col">
        <header className="relative z-30 mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/15 px-4 sm:px-6 py-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
              <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
            </div>
            <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} compact />
          </div>

          <div className="order-3 w-full sm:order-2 sm:w-56 md:w-64">
            <BorderlessSearchInput
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              className="w-full"
            />
          </div>

          <div className="order-2 sm:order-3">
            <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} compact />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-2 px-4 sm:px-6 pt-2.5">
          <div className="shrink-0">
            <UnderlineCategoryTabs
              activeSection={activeSection}
              filterCounts={filterCounts}
              onSelectSection={onSelectSection}
            />
          </div>
          <OpenGalleryGrid
            games={games}
            favoriteIds={favoriteIds}
            activeSection={activeSection}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
          />
        </main>
      </div>
    );
  }

  // 2. EDITORIAL MASTHEAD: Avatar + Name & Buttons oben, darunter Titel + Tabs + Suche auf einer Linie
  if (layout === 'open-editorial') {
    return (
      <div className="flex flex-1 min-h-0 w-full flex-col">
        <header className="relative z-30 mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-2.5 px-4 sm:px-6 pt-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 rounded-full pr-2 text-left transition hover:bg-white/5 cursor-pointer"
            >
              <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
              </div>
              <span className="font-arcade hidden xs:inline text-xs tracking-wider text-[#CBD5E1] uppercase">
                {playerName}
              </span>
            </button>

            <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} compact />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-white/15 pb-2">
            <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} />

            <UnderlineCategoryTabs
              activeSection={activeSection}
              filterCounts={filterCounts}
              onSelectSection={onSelectSection}
            />

            <BorderlessSearchInput
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              className="w-full lg:w-48"
            />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col px-4 sm:px-6 pt-2">
          <OpenGalleryGrid
            games={games}
            favoriteIds={favoriteIds}
            activeSection={activeSection}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
          />
        </main>
      </div>
    );
  }

  // 3. SEITENLEISTE (DOCKED RAIL): Alle Bedienelemente links verschmolzen, rechts reine Open Gallery
  if (layout === 'open-docked-rail') {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-6xl flex-col md:flex-row">
        <aside className="relative z-30 flex shrink-0 flex-col justify-between gap-4 border-b md:border-b-0 md:border-r border-white/15 px-4 sm:px-5 py-3 md:w-64">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 md:hidden">
              <div className="flex items-center gap-2.5">
                <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                  <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
                </div>
                <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} compact />
              </div>
              <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} compact />
            </div>

            <div className="hidden md:flex md:flex-col md:items-start gap-3">
              <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} compact />

              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 rounded-xl py-1 pr-2 text-left transition hover:bg-white/5 cursor-pointer"
              >
                <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                  <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
                </div>
                <span className="font-arcade text-xs tracking-wider text-white/90 uppercase truncate max-w-[130px]">
                  {playerName}
                </span>
              </button>
            </div>

            <BorderlessSearchInput
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              className="w-full"
            />

            <div className="hidden md:block">
              <UnderlineCategoryTabs
                activeSection={activeSection}
                filterCounts={filterCounts}
                onSelectSection={onSelectSection}
                vertical
              />
            </div>

            <div className="md:hidden">
              <UnderlineCategoryTabs
                activeSection={activeSection}
                filterCounts={filterCounts}
                onSelectSection={onSelectSection}
              />
            </div>
          </div>

          <div className="hidden md:flex items-center justify-between pt-2 border-t border-white/10">
            <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} compact />
          </div>
        </aside>

        <main className="flex flex-1 min-h-0 flex-col px-4 sm:px-6 pt-2">
          <OpenGalleryGrid
            games={games}
            favoriteIds={favoriteIds}
            activeSection={activeSection}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
            columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
          />
        </main>
      </div>
    );
  }

  // 4. SCHWEBENDE GLASLEISTE: Avatar + Titel + „+“ links, Aktionen rechts, Tabs & Suche als Glas-Pill darunter
  if (layout === 'open-floating-pill') {
    return (
      <div className="flex flex-1 min-h-0 w-full flex-col">
        <header className="relative z-30 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-2 px-4 sm:px-6 pt-2 pb-1.5">
          <div className="flex items-center gap-3">
            <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
              <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
            </div>
            <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} />
          </div>

          <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} />
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-3 px-4 sm:px-6 pt-1">
          <div className="flex shrink-0 flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <UnderlineCategoryTabs
              activeSection={activeSection}
              filterCounts={filterCounts}
              onSelectSection={onSelectSection}
            />
            <BorderlessSearchInput
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              className="sm:w-52"
            />
          </div>

          <OpenGalleryGrid
            games={games}
            favoriteIds={favoriteIds}
            activeSection={activeSection}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
          />
        </main>
      </div>
    );
  }

  // 5. OPEN GALLERY KLASSIK
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col">
      <MainMenuHeader
        avatar={avatar}
        onOpenProfile={onOpenProfile}
        onOpenTvJoin={onOpenTvJoin}
        onOpenSettings={onOpenSettings}
        onOpenLayoutExplorer={onOpenLayoutExplorer}
      />

      <main className="tablet-main-area widescreen-main-area relative flex flex-1 min-h-0 w-full flex-col pt-2 sm:pt-3 px-0 sm:px-4 landscape:p-0">
        <div className="mx-auto flex w-full flex-1 min-h-0 max-w-5xl flex-col gap-3 px-4 sm:px-6 py-1">
          <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 border-b border-white/15 pb-2 shrink-0">
            <UnderlineCategoryTabs
              activeSection={activeSection}
              filterCounts={filterCounts}
              onSelectSection={onSelectSection}
            />
            <BorderlessSearchInput searchQuery={searchQuery} onSearchChange={onSearchChange} />
          </div>

          <OpenGalleryGrid
            games={games}
            favoriteIds={favoriteIds}
            activeSection={activeSection}
            onSelectGame={onSelectGame}
            onLaunchGame={onLaunchGame}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
          />
        </div>
      </main>
    </div>
  );
}
