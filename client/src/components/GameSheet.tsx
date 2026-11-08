import { Play, X } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';

interface GameSheetProps {
  game: Game | null;
  onClose: () => void;
}

export function GameSheet({ game, onClose }: GameSheetProps) {
  if (!game) return null;

  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5 backdrop-blur-md transition-opacity"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white/95 dark:bg-[#1C1C1E]/95 p-6 text-[#1C1C1E] dark:text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] dark:ring-white/[0.12] backdrop-blur-2xl"
      >
        {/* Typischer iOS Bottom-Sheet Grabber */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20" />

        {/* iOS Schließen-Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-5 right-5 grid h-8 w-8 place-items-center rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-[#6C6C70] dark:text-[#AEAEB2] transition-transform active:scale-90 cursor-pointer"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* App Store Header-Bereich */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-[20px] shadow-sm ${style.dockIcon}`}
          >
            <Icon className="h-8 w-8" strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-[#98989D]">
              {game.subtitle}
            </span>
            <h2
              id="sheet-title"
              className="truncate text-2xl font-extrabold tracking-tight"
            >
              {game.title}
            </h2>
          </div>
        </div>

        {/* iOS App Store Info-Leiste (4 Spalten mit feinen Trennlinien) */}
        <div className="mb-5 grid grid-cols-3 divide-x divide-black/[0.06] dark:divide-white/[0.08] rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 py-2.5 text-center">
          <div className="px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Kategorie
            </div>
            <div className="mt-0.5 text-xs font-bold">{game.category}</div>
          </div>
          <div className="px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Spieler
            </div>
            <div className="mt-0.5 text-xs font-bold">{game.players}</div>
          </div>
          <div className="px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Dauer
            </div>
            <div className="mt-0.5 text-xs font-bold">{game.duration}</div>
          </div>
        </div>

        {/* Beschreibung */}
        <p className="mb-6 text-xs sm:text-sm leading-relaxed text-[#6C6C70] dark:text-[#AEAEB2]">
          {game.description}
        </p>

        {/* Primärer iOS Action-Button */}
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] hover:bg-[#0071EB] dark:bg-[#0A84FF] dark:hover:bg-[#1E8FFF] py-3.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Play className="h-4 w-4 fill-current" />
          Jetzt starten
        </button>
      </section>
    </div>
  );
}
