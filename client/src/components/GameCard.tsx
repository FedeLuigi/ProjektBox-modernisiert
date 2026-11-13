import { Clock3, Play, Users } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';
import { GameBackground } from './GameBackground';

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

  return (
    <article
      onClick={() => {
        if (isActive) {
          onPlay();
        } else {
          onSelect();
        }
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[clamp(22px,3vh,30px)] p-3 sm:p-3.5 landscape:p-3 w-[clamp(245px,74vw,315px)] h-[clamp(360px,64dvh,490px)] sm:w-[280px] sm:h-[420px] md:w-[310px] md:h-[460px] landscape:w-[clamp(340px,56vw,450px)] landscape:h-[clamp(170px,68dvh,240px)] landscape:flex-row landscape:gap-3.5 shrink-0 transition-all duration-300 cursor-pointer select-none backdrop-blur-xl ${
        isActive
          ? `${style.cardActiveBg} ${style.cardRing} scale-100 opacity-100 z-20 shadow-xl`
          : `${style.cardBg} ring-1 ring-black/[0.06] dark:ring-white/[0.08] scale-90 opacity-60 hover:opacity-85 z-10`
      }`}
    >
      {/* Sanftes Umgebungslicht */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full blur-2xl transition-opacity duration-300 ${
          isActive ? 'opacity-90' : 'opacity-25'
        } ${style.glow}`}
      />

      {/* ─── 1. OBERER BEREICH: Visuelle Spiel-Vorschau & Artwork-Bühne ─── */}
      <div className={`relative h-[clamp(150px,28dvh,220px)] landscape:h-full landscape:w-[45%] w-full overflow-hidden rounded-[clamp(16px,2.2vh,22px)] ${style.artBg} ring-1 ring-black/[0.06] dark:ring-white/[0.08] shadow-inner shrink-0`}>
        {/* Spezifisches Spiel-Vorschau Artwork */}
        <GameBackground gameId={game.id} />

        {/* Badges auf der Spiel-Vorschau */}
        <div className="absolute inset-0 p-2.5 sm:p-3 flex flex-col justify-between z-10 pointer-events-none">
          <div className="flex items-center justify-end">
            {/* Kategorie Badge */}
            <span
              className={`rounded-full px-2.5 py-1 text-[clamp(9px,1.2vh,10.5px)] font-bold tracking-wide uppercase shadow-xs backdrop-blur-md ${style.badge}`}
            >
              {game.category}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. UNTERER BEREICH: Titel, Beschreibung & Spielen-Button ─── */}
      <div className="relative z-10 flex flex-1 flex-col justify-between pt-2.5 sm:pt-3 landscape:pt-0 landscape:w-[55%]">
        <div>
          <p
            className={`text-[clamp(9px,1.2vh,11px)] font-bold uppercase tracking-wider ${style.accentText}`}
          >
            {game.subtitle}
          </p>

          <h2 className="mt-0.5 text-[clamp(1.15rem,2.8vh,1.45rem)] font-extrabold tracking-tight text-[#1C1C1E] dark:text-white leading-tight">
            {game.title}
          </h2>

          <p className="game-card-desc mt-1 line-clamp-2 landscape:line-clamp-1 text-[clamp(11px,1.4vh,12.5px)] leading-relaxed text-[#6C6C70] dark:text-[#A1A1A6]">
            {game.description}
          </p>
        </div>

        {/* Metadaten & Spielen-Button */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.08] mt-auto">
          <div className="flex items-center gap-2 text-[clamp(10px,1.3vh,12px)] font-semibold text-[#8E8E93] dark:text-[#98989D]">
            <span className="inline-flex items-center gap-1">
              <Users className="h-[clamp(11px,1.3vh,13px)] w-[clamp(11px,1.3vh,13px)]" />
              {game.players}
            </span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-[clamp(11px,1.3vh,13px)] w-[clamp(11px,1.3vh,13px)]" />
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
            className={`inline-flex items-center gap-1.5 rounded-full py-[clamp(6px,1.1vh,9px)] px-[clamp(11px,2.2vw,16px)] text-[clamp(10.5px,1.3vh,12.5px)] font-bold tracking-wide shadow-xs transition-all duration-150 active:scale-95 cursor-pointer ${style.playBtn}`}
          >
            <Play className="h-[clamp(10px,1.2vh,12px)] w-[clamp(10px,1.2vh,12px)] fill-current" />
            <span>Spielen</span>
          </button>
        </div>
      </div>
    </article>
  );
}
