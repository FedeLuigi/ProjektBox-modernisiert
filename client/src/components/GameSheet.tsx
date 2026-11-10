import { ArrowLeft, Clock3, Play, Sparkles, Users, Wifi } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';
import { GameBackground } from './GameBackground';
import { BackgroundCometCanvas } from './BackgroundCometCanvas';

interface GameSheetProps {
  game: Game | null;
  onClose: () => void;
  onPlay?: (game: Game) => void;
}

export function isMultiplayerGame(game: Game): boolean {
  return (
    game.id === 'connect' ||
    game.id === 'tic-tac-toe' ||
    game.players.includes('2')
  );
}

export function GameSheet({ game, onClose, onPlay }: GameSheetProps) {
  if (!game) return null;

  const style = TONE_STYLES[game.tone];
  const Icon = game.icon;
  const isMultiplayer = isMultiplayerGame(game);

  const handlePlayClick = () => {
    if (onPlay) {
      onPlay(game);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-screen-title"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in pb-[env(safe-area-inset-bottom)]"
    >
      {/* ─── Vollbild-Kometen-Animation hinter Spiel-Details ─── */}
      <BackgroundCometCanvas opacity={0.45} />

      {/* ─── Spezifischer illustrierter Spiel-Hintergrund (Vollbild) ─── */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-30 scale-125 transform-gpu">
        <GameBackground gameId={game.id} />
      </div>

      {/* ─── Sanftes Ambient-Hintergrundlicht passend zum Spielton ─── */}
      <div
        className={`pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-70 ${style.glow}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50 ${style.glow}`}
      />

      {/* ─── Vollbild-Container mit sicherem Abstand zur iPhone Notch ─── */}
      <div className="safe-screen relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Zurück-Pille & Kategorie-Badge (wie im Hauptmenü) */}
        <header className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/85 dark:bg-[#1C1C1E]/90 px-4 py-2 text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white shadow-xs ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-xl transition-transform active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <span
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase shadow-2xs ${style.badge}`}
          >
            {game.category}
          </span>
        </header>

        {/* 2. MITTE: Großzügige, luftige Spiel-Präsentation über den ganzen Bildschirm */}
        <main className="my-auto mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-4">
          <div className="grid w-full items-center gap-6 sm:gap-10 portrait:grid-cols-1 portrait:text-center landscape:grid-cols-[1fr_1.2fr] landscape:text-left">
            {/* Linke / Obere Seite: Großes Squircle-Icon & Titel */}
            <div className="flex flex-col portrait:items-center landscape:items-start">
              <div
                className={`grid h-22 w-22 sm:h-28 sm:w-28 landscape:h-20 landscape:w-20 landscape:sm:h-24 landscape:sm:w-24 place-items-center rounded-[28px] sm:rounded-[32px] shadow-md ring-1 ring-black/[0.05] dark:ring-white/[0.12] ${style.artBg} ${style.accentText}`}
              >
                <Icon className="h-11 w-11 sm:h-14 sm:w-14 landscape:h-10 landscape:w-10 landscape:sm:h-12 landscape:sm:w-12" strokeWidth={2.1} />
              </div>

              <div
                className={`mt-5 landscape:mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${style.accentText}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{game.subtitle}</span>
              </div>

              <h1
                id="game-screen-title"
                className="mt-1.5 text-3xl sm:text-5xl landscape:text-3xl landscape:sm:text-4xl font-black tracking-tight leading-tight"
              >
                {game.title}
              </h1>

              {/* Luftige Info-Pillen */}
              <div className="mt-4 flex flex-wrap items-center portrait:justify-center landscape:justify-start gap-2.5 text-xs font-semibold text-[#6C6C70] dark:text-[#AEAEB2]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 dark:bg-white/[0.07] px-3.5 py-1.5 ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-md">
                  <Users className="h-3.5 w-3.5" />
                  {game.players}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 dark:bg-white/[0.07] px-3.5 py-1.5 ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-md">
                  <Clock3 className="h-3.5 w-3.5" />
                  {game.duration}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 dark:bg-white/[0.07] px-3.5 py-1.5 ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-md">
                  Tempo: {game.difficulty}
                </span>
                {isMultiplayer && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-400 px-3.5 py-1.5 ring-1 ring-purple-500/25 backdrop-blur-md font-bold">
                    <Wifi className="h-3.5 w-3.5" />
                    Online Multiplayer
                  </span>
                )}
              </div>
            </div>

            {/* Rechte / Untere Seite: Luftige Beschreibung & Start-Aktion */}
            <div className="flex flex-col portrait:items-center landscape:items-start justify-center rounded-[28px] bg-white/70 dark:bg-[#18181C]/80 p-6 sm:p-8 ring-1 ring-black/[0.05] dark:ring-white/[0.08] backdrop-blur-xl shadow-sm">
              <p className="text-sm sm:text-base leading-relaxed text-[#3A3A3C] dark:text-[#E5E5EA]">
                {game.description}
              </p>

              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#8E8E93] dark:text-[#98989D]">
                {game.howToPlay}
              </p>

              <button
                type="button"
                onClick={handlePlayClick}
                className={`mt-6 landscape:mt-5 flex w-full sm:w-auto min-w-[200px] items-center justify-center gap-2.5 rounded-full px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold tracking-wide shadow-md transition-all duration-150 active:scale-95 cursor-pointer ${
                  isMultiplayer
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30 hover:brightness-110'
                    : style.playBtn
                }`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isMultiplayer ? 'Jetzt online spielen' : 'Jetzt losspielen'}</span>
              </button>
            </div>
          </div>
        </main>

        {/* 3. UNTEN: Sanfter optischer Ausgleich für luftiges Vollbild-Gefühl */}
        <footer className="shrink-0 text-center text-[11px] font-medium text-[#8E8E93] dark:text-[#636366]">
          {isMultiplayer ? 'Multiplayer-Lobby mit Socket.io' : 'Vollbild-Modus aktiv'}
        </footer>
      </div>
    </div>
  );
}
