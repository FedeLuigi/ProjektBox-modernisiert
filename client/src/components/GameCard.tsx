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
        if (isActive) {
          onPlay();
        } else {
          onSelect();
        }
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:p-6 portrait:w-[270px] portrait:sm:w-[310px] portrait:h-[320px] portrait:sm:h-[350px] landscape:w-[360px] landscape:sm:w-[410px] landscape:h-[205px] landscape:sm:h-[235px] landscape:p-4 landscape:sm:p-5 shrink-0 transition-all duration-300 cursor-pointer select-none backdrop-blur-xl ${
        isActive
          ? `${style.cardActiveBg} ${style.cardRing} scale-100 opacity-100 z-20`
          : `${style.cardBg} ring-1 ring-black/[0.06] dark:ring-white/[0.08] scale-90 opacity-45 hover:opacity-70 z-10`
      }`}
    >
      {/* Sanftes Hintergrund-Licht */}
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-30'
        } ${style.glow}`}
      />

      {/* ─── Oben: Squircle App-Icon & Kategorie-Pille ─── */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div
          className={`grid h-13 w-13 landscape:h-11 landscape:w-11 landscape:sm:h-13 landscape:sm:w-13 shrink-0 place-items-center rounded-[18px] transition-transform duration-200 group-hover:scale-105 ${style.artBg} ${style.accentText} ring-1 ring-black/[0.05] dark:ring-white/[0.1] shadow-xs`}
        >
          <Icon className="h-6 w-6 landscape:h-5 landscape:w-5 landscape:sm:h-6 landscape:sm:w-6" strokeWidth={2.2} />
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase ${style.badge}`}
        >
          {game.category}
        </span>
      </div>

      {/* ─── Mitte: Titel, Untertitel & Beschreibung ─── */}
      <div className="relative z-10 my-auto py-1">
        <p
          className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${style.accentText}`}
        >
          {game.subtitle}
        </p>

        <h2 className="mt-0.5 text-xl sm:text-2xl landscape:text-lg landscape:sm:text-xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
          {game.title}
        </h2>

        <p className="mt-1.5 line-clamp-2 landscape:line-clamp-1 text-xs leading-relaxed text-[#6C6C70] dark:text-[#98989D]">
          {game.description}
        </p>
      </div>

      {/* ─── Unten: Metadaten & Spielen-Button ─── */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {game.players}
          </span>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {game.duration}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            onPlay();
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold tracking-wide shadow-xs transition-all duration-150 active:scale-95 cursor-pointer ${style.playBtn}`}
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Spielen</span>
        </button>
      </div>
    </article>
  );
}
