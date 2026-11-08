import { Clock3, Play, Sparkles, Users } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';

interface FeaturedCardProps {
  game: Game;
  currentIndex: number;
  totalCount: number;
  onPlay: (game: Game) => void;
}

export function FeaturedCard({
  game,
  currentIndex,
  totalCount,
  onPlay,
}: FeaturedCardProps) {
  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;

  return (
    <section
      className={`relative flex flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:p-7 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] dark:ring-white/[0.12] transition-all duration-300 ${style.heroBg} ${style.heroText}`}
    >
      {/* Sanftes iOS Ambient-Licht im Hintergrund */}
      <div
        className={`pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 rounded-full blur-3xl transition-colors duration-500 ${style.heroGlow}`}
      />
      <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-white/30 dark:bg-white/5 blur-2xl" />

      {/* Obere Status-Zeile (Apple Arcade Stil) */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] px-3 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md">
          0{currentIndex + 1} / 0{totalCount}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase backdrop-blur-md ring-1 ring-black/[0.04] dark:ring-white/[0.08] ${style.heroBadge}`}
        >
          <Sparkles className="h-3 w-3" />
          {game.category}
        </span>
      </div>

      {/* Mittlerer Hero-Inhalt: iOS App-Icon Squircle + Titel + Beschreibung */}
      <div className="relative z-10 my-auto py-2">
        <div className="flex items-center gap-4 mb-3 sm:mb-4">
          <div
            className={`grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-[18px] sm:rounded-[20px] backdrop-blur-xl ring-1 ring-white/60 dark:ring-white/15 ${style.heroIconBox}`}
          >
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider opacity-75`}>
              {game.subtitle}
            </p>
            <h1 className="truncate text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {game.title}
            </h1>
          </div>
        </div>

        <p
          className={`line-clamp-2 max-w-md text-xs sm:text-sm leading-relaxed font-medium ${style.heroSubtext}`}
        >
          {game.description}
        </p>
      </div>

      {/* Untere Aktionsleiste: Metadaten & iOS Capsule Play-Button */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-3 text-xs font-semibold opacity-80">
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

        <button
          type="button"
          onClick={() => onPlay(game)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold tracking-wide shadow-md transition-all duration-150 hover:opacity-95 active:scale-95 cursor-pointer ${style.heroButton}`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          SPIELEN
        </button>
      </div>
    </section>
  );
}
