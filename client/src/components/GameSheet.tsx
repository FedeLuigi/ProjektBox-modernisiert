import { Play, Sparkles, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 sm:p-6 backdrop-blur-md transition-opacity"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white/95 dark:bg-[#1C1C1E]/95 p-5 sm:p-6 text-[#1C1C1E] dark:text-white shadow-[0_24px_70px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.06] dark:ring-white/[0.12] backdrop-blur-2xl"
      >
        {/* Typischer iOS Bottom-Sheet Grabber */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15 dark:bg-white/20" />

        {/* iOS Schließen-Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-5 right-5 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/[0.08] dark:bg-white/[0.12] text-[#1C1C1E] dark:text-white transition-transform active:scale-90 cursor-pointer"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Farbiger Artwork-Banner im Modal */}
        <div
          className={`relative mb-5 flex items-center gap-4 overflow-hidden rounded-[22px] p-4 ${style.artBg} ring-1 ring-black/[0.04] dark:ring-white/[0.08]`}
        >
          <div
            className={`grid h-15 w-15 shrink-0 place-items-center rounded-[18px] shadow-sm ${style.iconBox}`}
          >
            <Icon className="h-8 w-8" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 pr-6">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${style.accentText}`}
            >
              <Sparkles className="h-3 w-3" />
              {game.subtitle}
            </span>
            <h2
              id="sheet-title"
              className="truncate text-2xl font-extrabold tracking-tight text-[#1C1C1E] dark:text-white"
            >
              {game.title}
            </h2>
          </div>
        </div>

        {/* iOS App Store Info-Leiste (4 Spalten) */}
        <div className="mb-4 grid grid-cols-4 divide-x divide-black/[0.06] dark:divide-white/[0.08] rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]/70 py-2.5 text-center">
          <div className="px-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Modus
            </div>
            <div className="mt-0.5 text-xs font-bold truncate">{game.category}</div>
          </div>
          <div className="px-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Spieler
            </div>
            <div className="mt-0.5 text-xs font-bold truncate">{game.players}</div>
          </div>
          <div className="px-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Dauer
            </div>
            <div className="mt-0.5 text-xs font-bold truncate">{game.duration}</div>
          </div>
          <div className="px-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Tempo
            </div>
            <div className="mt-0.5 text-xs font-bold truncate">{game.difficulty}</div>
          </div>
        </div>

        {/* Beschreibung & Kurzanleitung */}
        <p className="mb-3 text-xs sm:text-sm leading-relaxed text-[#48484A] dark:text-[#D1D1D6]">
          {game.description}
        </p>

        <div className="mb-5 rounded-2xl bg-[#F2F2F7]/80 dark:bg-white/[0.05] p-3.5 text-xs leading-relaxed text-[#6C6C70] dark:text-[#AEAEB2] ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <span className="font-bold text-[#1C1C1E] dark:text-white">So geht’s: </span>
          {game.howToPlay}
        </div>

        {/* Primärer iOS Action-Button */}
        <button
          type="button"
          onClick={onClose}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer ${style.playBtn}`}
        >
          <Play className="h-4 w-4 fill-current" />
          Spiel jetzt starten
        </button>
      </section>
    </div>
  );
}
