import { ArrowLeft, Clock3, Play, Sparkles, Users, Wifi } from 'lucide-react';
import { type Game, TONE_STYLES } from '../data/games';
import { GameBackground } from './GameBackground';
import { BackgroundCometCanvas } from './BackgroundCometCanvas';
import { isMultiplayerGame } from '../games/registry';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_ENABLED,
  HEADER_BACK_BTN,
  HEADER_BADGE_PILL,
  HEADER_ROW,
  STAGE_TWO_COL,
  SURFACE_CARD,
} from '../styles/uiTokens';

interface GameSheetProps {
  game: Game | null;
  onClose: () => void;
  onPlay?: (game: Game) => void;
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
      className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in"
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

      {/* ─── Vollbild-Container mit einheitlichem Shell-Abstand ─── */}
      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Zurück-Pille & Kategorie-Badge */}
        <header className={HEADER_ROW}>
          <button
            type="button"
            onClick={onClose}
            className={HEADER_BACK_BTN}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <span
            className={`${HEADER_BADGE_PILL} uppercase shadow-2xs ${style.badge}`}
          >
            {game.category}
          </span>
        </header>

        {/* 2. MITTE: Großzügige, luftige Spiel-Präsentation über den ganzen Bildschirm */}
        <main className={`${STAGE_TWO_COL} min-h-0 overflow-y-auto overscroll-y-contain scrollbar-none`}>
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
                {isMultiplayer && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-400 px-3.5 py-1.5 ring-1 ring-purple-500/25 backdrop-blur-md font-bold">
                    <Wifi className="h-3.5 w-3.5" />
                    Online Multiplayer
                  </span>
                )}
              </div>
            </div>

            {/* Rechte / Untere Seite: Luftige Beschreibung & Start-Aktion */}
            <div className={`flex flex-col portrait:items-center landscape:items-start justify-center ${SURFACE_CARD}`}>
              <p className="text-sm sm:text-base leading-relaxed text-[#E5E5EA]">
                {game.description}
              </p>

              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#98989D]">
                {game.howToPlay}
              </p>

              <button
                type="button"
                onClick={handlePlayClick}
                className={`mt-6 landscape:mt-5 ${BTN_PRIMARY_BASE} ${BTN_PRIMARY_ENABLED} sm:w-auto sm:min-w-[220px]`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Jetzt losspielen</span>
              </button>
            </div>
          </div>
        </main>

        </div>
    </div>
  );
}
