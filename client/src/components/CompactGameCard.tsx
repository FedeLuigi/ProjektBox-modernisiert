import { type Game, TONE_STYLES } from '../data/games';
import { GameBackground } from './GameBackground';

interface CompactGameCardProps {
  game: Game;
  onSelect: () => void;
}

export function CompactGameCard({ game, onSelect }: CompactGameCardProps) {
  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;

  return (
    <article
      onClick={onSelect}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-3 w-[155px] sm:w-[175px] h-[135px] sm:h-[150px] shrink-0 snap-start transition-all duration-200 active:scale-95 cursor-pointer select-none shadow-sm hover:shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-xl ${style.cardBg}`}
    >
      {/* ─── Spezifisches Spiel-Vorschau Artwork ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden scale-105">
        <GameBackground gameId={game.id} />
      </div>

      {/* Kontrast-Gradient von unten nach oben */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 dark:from-[#0B0B0F]/95 dark:via-[#0B0B0F]/55 dark:to-transparent" />

      {/* Sanftes Umgebungslicht */}
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-xl opacity-60 ${style.glow}`}
      />

      {/* ─── Oben: Squircle App-Icon ─── */}
      <div className="relative z-10 flex items-center justify-between gap-1.5">
        <div
          className={`grid h-8 w-8 place-items-center rounded-[10px] bg-white/95 dark:bg-[#1C1C1E]/95 ${style.accentText} shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.1] backdrop-blur-md transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
      </div>

      {/* ─── Unten: Subtitle, Titel & Spieleranzahl (kompakt ohne Textwüste) ─── */}
      <div className="relative z-10">
        <p className={`text-[9px] font-bold uppercase tracking-wider ${style.accentText}`}>
          {game.subtitle}
        </p>

        <h3 className="mt-0.5 text-sm sm:text-base font-extrabold text-white leading-tight truncate">
          {game.title}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-[9.5px] font-medium text-white/70">
          <span>{game.players}</span>
          <span>•</span>
          <span>{game.duration}</span>
        </div>
      </div>
    </article>
  );
}
