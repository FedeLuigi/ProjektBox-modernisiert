import { Play } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';

interface QuickLaunchTileProps {
  game: Game;
  onSelect: () => void;
}

export function QuickLaunchTile({ game, onSelect }: QuickLaunchTileProps) {
  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex items-center gap-3 rounded-[18px] bg-white/80 dark:bg-[#18181C]/85 p-2.5 w-[185px] sm:w-[205px] h-[62px] shrink-0 snap-start text-left shadow-xs ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-white dark:hover:bg-[#202026] cursor-pointer"
    >
      {/* Icon Box */}
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${style.artBg} ${style.accentText} shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.08] transition-transform duration-200 group-hover:scale-105`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>

      {/* Titel & Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate leading-tight">
          {game.title}
        </h4>
        <p className="mt-0.5 text-[10px] text-[#8E8E93] dark:text-[#98989D] truncate">
          {game.subtitle}
        </p>
      </div>

      {/* Mini Play Button */}
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${style.playBtn} shadow-xs transition-transform duration-150 group-hover:scale-110`}
      >
        <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
      </div>
    </button>
  );
}
