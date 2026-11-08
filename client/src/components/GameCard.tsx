import { Clock3, Play, Users } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

export function GameCard({
  game,
  isActive,
  onSelect,
  onPlay,
}: GameCardProps) {
  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;

  return (
    <article
      onClick={() => {
        onSelect();
        onPlay();
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:p-6 transition-all duration-200 cursor-pointer select-none backdrop-blur-xl active:scale-[0.98] ${
        isActive
          ? `${style.cardActiveBg} ${style.cardRing}`
          : `${style.cardBg} ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-sm hover:ring-black/[0.12] dark:hover:ring-white/[0.16]`
      }`}
    >
      {/* Sanftes Hintergrund-Licht */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'
        } ${style.glow}`}
      />

      {/* ─── Oben: Squircle App-Icon & Kategorie-Pille ─── */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className={`grid h-13 w-13 sm:h-15 sm:w-15 shrink-0 place-items-center rounded-[18px] sm:rounded-[20px] transition-transform duration-200 group-hover:scale-105 ${style.artBg} ${style.accentText} ring-1 ring-black/[0.05] dark:ring-white/[0.1] shadow-xs`}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase ${style.badge}`}
        >
          {game.category}
        </span>
      </div>

      {/* ─── Mitte: Großzügiger Freiraum mit klarem Titel & Metadaten ─── */}
      <div className="relative z-10 my-auto py-3">
        <p
          className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${style.accentText}`}
        >
          {game.subtitle}
        </p>

        <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
          {game.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[#8E8E93] dark:text-[#98989D]">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {game.players}
          </span>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {game.duration}
          </span>
        </div>
      </div>

      {/* ─── Unten: Klarer, luftiger Spielen-Button ─── */}
      <div className="relative z-10 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            onPlay();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 sm:py-3 text-xs sm:text-sm font-bold tracking-wide shadow-xs transition-all duration-150 active:scale-95 cursor-pointer ${style.playBtn}`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Spielen</span>
        </button>
      </div>
    </article>
  );
}
