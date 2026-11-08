import { ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react';
import {
  CATEGORIES,
  type Category,
  type Game,
  TONE_STYLES,
} from '../data/games';

interface GameDockProps {
  games: Game[];
  category: Category;
  activeIndex: number;
  onSelectCategory: (cat: Category) => void;
  onSelectGame: (index: number) => void;
  onOpenGame: (game: Game) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function GameDock({
  games,
  category,
  activeIndex,
  onSelectCategory,
  onSelectGame,
  onOpenGame,
  onPrev,
  onNext,
}: GameDockProps) {
  const activeGame = games[activeIndex] || games[0];
  const activeStyle = TONE_STYLES[activeGame.tone];

  return (
    <section className="flex flex-col justify-between overflow-hidden min-h-0">
      {/* Obere Leiste: iOS Segmented Control für Kategorien */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div
          role="tablist"
          aria-label="Spielkategorien"
          className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] p-1 backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-[#6C6C70] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#8E8E93] dark:text-[#98989D] uppercase">
          <Gamepad2 className="h-3.5 w-3.5" />
          Arcade Box
        </span>
      </div>

      {/* 2x2 iOS App-Store Bento Grid */}
      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3 sm:gap-3.5 min-h-0">
        {games.map((game, index) => {
          const Icon = game.icon;
          const isCurrent = index === activeIndex;
          const toneStyle = TONE_STYLES[game.tone];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => {
                if (isCurrent) {
                  onOpenGame(game);
                } else {
                  onSelectGame(index);
                }
              }}
              className={`group relative flex items-center gap-3 sm:gap-3.5 rounded-[22px] p-3 sm:p-4 text-left transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.97] ${
                isCurrent
                  ? `${toneStyle.dockActiveBg} ${toneStyle.dockActiveRing} shadow-[0_10px_28px_-6px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.45)]`
                  : 'bg-white/80 dark:bg-[#1C1C1E]/85 hover:bg-white dark:hover:bg-[#242428] ring-1 ring-black/[0.05] dark:ring-white/[0.08] shadow-xs'
              } backdrop-blur-xl`}
            >
              {/* iOS App Icon Squircle */}
              <div
                className={`grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-[14px] sm:rounded-[15px] transition-transform duration-200 group-hover:scale-105 ${toneStyle.dockIcon}`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.1} />
              </div>

              {/* Titel & Untertitel */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="truncate text-xs sm:text-sm font-bold tracking-tight text-[#1C1C1E] dark:text-white">
                    {game.title}
                  </h2>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${
                      isCurrent ? `${toneStyle.dotActive} scale-100` : 'scale-0 opacity-0'
                    }`}
                  />
                </div>

                <p className="truncate text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D] mt-0.5">
                  {game.subtitle}
                </p>

                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#AEAEB2] dark:text-[#636366]">
                  <span>{game.players}</span>
                  <span>•</span>
                  <span>{game.duration}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Untere iOS Navigations-Pille */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Vorheriges Spiel"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/80 dark:bg-[#1C1C1E]/90 text-[#1C1C1E] dark:text-white ring-1 ring-black/[0.06] dark:ring-white/[0.1] shadow-xs backdrop-blur-md transition-transform active:scale-90 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-3.5 py-2 backdrop-blur-md">
          {games.map((game, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGame(idx)}
                aria-label={`Gehe zu ${game.title}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? `w-5 ${activeStyle.dotActive}`
                    : 'w-2 bg-black/20 dark:bg-white/25 hover:bg-black/35 dark:hover:bg-white/40'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="Nächstes Spiel"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/80 dark:bg-[#1C1C1E]/90 text-[#1C1C1E] dark:text-white ring-1 ring-black/[0.06] dark:ring-white/[0.1] shadow-xs backdrop-blur-md transition-transform active:scale-90 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
