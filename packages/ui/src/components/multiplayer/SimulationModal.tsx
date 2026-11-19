import { useState } from 'react';
import { ArrowLeft, Bot, Loader2, Play, Smartphone, Tv } from 'lucide-react';
import { GAMES, type Game } from '../../data/games';
import { ACCENT_PALETTES } from '../CrystalUI';
import { GamePreviewArtwork } from '../GamePreviewArtwork';

interface SimulationModalProps {
  isOpen: boolean;
  isStarting?: boolean;
  startingGameId?: string | null;
  errorMessage?: string | null;
  defaultTvMode?: boolean;
  tvOnly?: boolean;
  onClose: () => void;
  onStartSimulation: (game: Game, isTvMode: boolean, botCount: number) => void;
}

export function SimulationModal({
  isOpen,
  isStarting = false,
  startingGameId = null,
  errorMessage = null,
  defaultTvMode = false,
  tvOnly = false,
  onClose,
  onStartSimulation,
}: SimulationModalProps) {
  const [isTvMode, setIsTvMode] = useState(defaultTvMode || tvOnly);
  const [botCount, setBotCount] = useState(2);

  if (!isOpen) return null;

  const getEffectiveBotCount = (game: Game) => {
    const minBots = isTvMode ? Math.max(2, game.minPlayers) : Math.max(0, game.minPlayers - 1);
    const maxBots = isTvMode ? game.maxPlayers : Math.max(0, game.maxPlayers - 1);
    return Math.min(maxBots, Math.max(minBots, botCount));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spiel simulieren"
      onClick={() => {
        if (!isStarting) onClose();
      }}
      className="fixed inset-0 z-50 flex w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden overscroll-contain bg-[#0F172A]/88 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(14px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(24px+env(safe-area-inset-top,0px))] sm:pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:pl-[max(32px,env(safe-area-inset-left,0px))] sm:pr-[max(32px,env(safe-area-inset-right,0px))] backdrop-blur-md select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 min-h-0 w-full max-w-4xl flex-col gap-4 sm:gap-5"
      >
        {/* Kopfzeile mit ZURÜCK links */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={isStarting}
            onClick={onClose}
            className="font-arcade inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>ZURÜCK</span>
          </button>

          <span className="font-arcade inline-flex items-center gap-1.5 text-[10px] sm:text-xs tracking-wider text-[#7DD3FC] uppercase">
            <Bot className="h-3.5 w-3.5" />
            <span>OHNE LOBBY-WARTEZEIT</span>
          </span>
        </div>

        {/* Titel & Optionen */}
        <div className="mx-auto flex w-full flex-col items-center gap-3.5 text-center shrink-0">
          <div className="border-b-2 border-[#38BDF8] px-3 pb-1">
            <h2 className="font-arcade text-xl sm:text-3xl tracking-wider text-white uppercase">
              SPIEL <span className="text-[#38BDF8]">SIMULIEREN</span>
            </h2>
          </div>

          {errorMessage && (
            <div className="font-arcade w-full max-w-xl rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
              {errorMessage}
            </div>
          )}

          {/* Ansicht + Bot-Anzahl */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 w-full">
            {!tvOnly && (
              <div className="flex items-center gap-1.5">
                {[
                  { tv: false, label: 'HANDY', Icon: Smartphone },
                  { tv: true, label: 'TV SCREEN', Icon: Tv },
                ].map(({ tv, label, Icon }) => {
                  const active = isTvMode === tv;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={isStarting}
                      onClick={() => {
                        setIsTvMode(tv);
                        if (tv && botCount < 2) setBotCount(2);
                      }}
                      className={`font-arcade inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] uppercase transition cursor-pointer ${
                        active
                          ? 'border-[#38BDF8] bg-[#0284C7]/25 text-white'
                          : 'border-white/15 bg-white/[0.04] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3].map((count) => {
                const active = botCount === count;
                const disabledCount = isStarting || (isTvMode && count < 2);
                return (
                  <button
                    key={count}
                    type="button"
                    disabled={disabledCount}
                    onClick={() => setBotCount(count)}
                    className={`font-arcade inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] uppercase transition ${
                      active
                        ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-[#FDE68A]'
                        : 'border-white/15 bg-white/[0.04] text-[#94A3B8] hover:text-white'
                    } ${disabledCount ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {count === 0 ? 'SOLO' : `${count} ${count === 1 ? 'BOT' : 'BOTS'}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spiele-Kacheln: 1 Tipp startet direkt in die Simulation */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 my-auto pb-2">
          {GAMES.map((game) => {
            const palette = ACCENT_PALETTES[game.accent];
            const effectiveBots = getEffectiveBotCount(game);
            const isThisStarting = isStarting && startingGameId === game.id;
            const participantSummary = isTvMode
              ? `${effectiveBots} BOTS LIVE AUF TV`
              : effectiveBots === 0
                ? 'NUR DU (SOLO)'
                : `DU + ${effectiveBots} ${effectiveBots === 1 ? 'BOT' : 'BOTS'}`;

            return (
              <button
                key={game.id}
                type="button"
                disabled={isStarting}
                onClick={() => onStartSimulation(game, isTvMode, effectiveBots)}
                className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-2.5 sm:p-3 text-left transition-all hover:border-[#38BDF8]/60 hover:bg-white/[0.08] disabled:opacity-60 cursor-pointer active:scale-[0.98]"
              >
                <div className="relative h-16 w-26 sm:h-20 sm:w-32 shrink-0 overflow-hidden rounded-xl border border-white/15">
                  <GamePreviewArtwork
                    gameId={game.id}
                    variant="card"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 min-w-0 flex-col gap-0.5 sm:gap-1">
                  <span className="font-arcade text-xs sm:text-sm text-white uppercase leading-snug">
                    {game.title}
                  </span>
                  <span className="font-arcade text-[10px] text-[#7DD3FC] uppercase truncate">
                    {participantSummary}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] line-clamp-2 leading-snug">
                    {game.subtitle}
                  </span>
                </div>

                <span
                  style={{
                    backgroundColor: palette.bg,
                    borderColor: palette.topBorder,
                  }}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-white shadow transition-transform group-hover:scale-105"
                >
                  {isThisStarting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
