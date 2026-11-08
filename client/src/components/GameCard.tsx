import { Clock3, Play, Users } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

export function GameCard({
  game,
  isActive,
  isExpanded,
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
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-5 transition-all duration-200 cursor-pointer select-none backdrop-blur-xl ${
        isActive
          ? `${style.cardActiveBg} ${style.cardRing} scale-[1.01]`
          : `${style.cardBg} ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-xs hover:ring-black/[0.12] dark:hover:ring-white/[0.16]`
      }`}
    >
      {/* Dezenter Ambient-Schein bei aktivem Spiel */}
      {isActive && (
        <div
          className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${style.glow}`}
        />
      )}

      {/* ─── Oberer Artwork-Header mit Squircle-Icon & Kategorie-Badge ─── */}
      <div
        className={`relative flex items-center justify-between overflow-hidden rounded-[18px] sm:rounded-[20px] p-3 sm:p-4 ${style.artBg} ring-1 ring-black/[0.04] dark:ring-white/[0.06]`}
      >
        {/* Dekorative Mini-Spielgrafik im Hintergrund rechts */}
        <div className="pointer-events-none absolute -right-2 -bottom-2 opacity-20 dark:opacity-15">
          <Icon className="h-16 w-16 sm:h-20 sm:w-20 rotate-12" strokeWidth={1.5} />
        </div>

        {/* iOS Squircle App-Icon */}
        <div
          className={`relative z-10 grid h-11 w-11 sm:h-13 sm:w-13 shrink-0 place-items-center rounded-[14px] sm:rounded-[16px] transition-transform duration-200 group-hover:scale-105 ${style.iconBox}`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
        </div>

        {/* Kategorie-Pille */}
        <span
          className={`relative z-10 rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase backdrop-blur-md ${style.badge}`}
        >
          {game.category}
        </span>
      </div>

      {/* ─── Mittlerer Textbereich: Titel, Untertitel & Beschreibung ─── */}
      <div className="my-auto py-2 sm:py-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${style.accentText}`}
          >
            {game.subtitle}
          </span>
        </div>

        <h2 className="truncate text-base sm:text-xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white leading-snug">
          {game.title}
        </h2>

        <p
          className={`mt-1 text-xs leading-relaxed text-[#6C6C70] dark:text-[#98989D] ${
            isExpanded ? 'line-clamp-3' : 'hidden sm:line-clamp-2'
          }`}
        >
          {game.description}
        </p>
      </div>

      {/* ─── Untere Aktionszeile: Metadaten & direkter Play-Button ─── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] sm:text-xs font-semibold text-[#8E8E93] dark:text-[#98989D]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {game.players}
          </span>
          <span className="hidden xs:inline opacity-40">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wide shadow-xs transition-all duration-150 active:scale-95 cursor-pointer ${
            isActive
              ? style.playBtn
              : 'bg-black/[0.06] dark:bg-white/[0.1] text-[#1C1C1E] dark:text-white hover:bg-black/[0.1] dark:hover:bg-white/[0.16]'
          }`}
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Spielen</span>
        </button>
      </div>
    </article>
  );
}
