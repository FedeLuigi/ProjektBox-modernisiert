import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Loader2, LogOut, Menu, Pencil, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Lobby } from '@projektbox/shared/types';
import {
  Avatar,
  BackgroundCometCanvas,
  HeaderStatusOverlay,
  OpenButton,
  clientGameRegistry,
  getGameStageBgClass,
  socketService,
} from '@projektbox/ui';

interface TvGameViewProps {
  lobby: Lobby;
  gameTitle?: string;
  onLeave: () => void;
}

export function TvGameView({
  lobby: initialLobby,
  gameTitle,
  onLeave,
}: TvGameViewProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [isZombieMenuOpen, setIsZombieMenuOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const isStadtLandFluss = lobby.gameId === 'stadt-land-fluss';
  const isRoulette = lobby.gameId === 'roulette';
  const isTexasHoldem = lobby.gameId === 'texas-holdem';
  const isZombieSurvival = lobby.gameId === 'zombie-survival';
  const isGoldMiner = lobby.gameId === 'gold-miner';
  const isFullScreenGame = isZombieSurvival || isGoldMiner;
  const isMoneyGame = isRoulette || isTexasHoldem;
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const player1 = activePlayers[0];
  const player2 = activePlayers[1];

  const isGameOver = gameState?.status === 'won' || gameState?.status === 'draw';
  const isRoundOver = gameState?.roundStatus === 'round_over' || gameState?.phase === 'round_over';
  const winner = activePlayers.find((p) => p.id === gameState?.winnerId);

  const activeEndsAt = gameState?.phaseEndsAt ?? gameState?.roundEndsAt;
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!activeEndsAt) return 60;
    return Math.max(0, Math.ceil((activeEndsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!activeEndsAt || gameState?.status !== 'playing') return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((activeEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [activeEndsAt, gameState?.status]);

  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);

  useEffect(() => {
    const unsubState = socketService.onGameState(({ gameState: newState, status, lobby: updatedLobby }) => {
      setLobby((prev) => ({
        ...prev,
        ...updatedLobby,
        gameState: newState,
        status: status as Lobby['status'],
      }));
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setRematchRequested(false);
      setLobby(updatedLobby);
    });

    const unsubRestart = socketService.onGameRestarted(({ lobby: updatedLobby }) => {
      setRematchRequested(false);
      setLobby(updatedLobby);
    });

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby }) => {
      setLobby((prev) => ({ ...prev, ...updatedLobby }));
    });

    const unsubSync = socketService.onStateSync(({ lobby: syncedLobby }) => {
      setLobby(syncedLobby);
    });

    return () => {
      unsubState();
      unsubStarted();
      unsubRestart();
      unsubUpdated();
      unsubSync();
    };
  }, []);

  const handleSimulatedRematch = async () => {
    if (rematchRequested) return;
    setRematchRequested(true);
    try {
      await socketService.requestRematch();
    } catch {
      setRematchRequested(false);
    }
  };

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div
      data-tv-scope="modal"
      className={`fixed inset-0 z-50 flex w-full flex-col justify-between overflow-hidden text-white select-none animate-fade-in ${
        !isGameOver ? getGameStageBgClass(lobby.gameId) : 'bg-[#1B2B40]'
      }`}
    >
      {isGameOver && <BackgroundCometCanvas opacity={0.85} />}

      <div
        className={
          isFullScreenGame
            ? 'relative z-10 flex flex-1 min-h-0 w-full h-full flex-col justify-between'
            : 'safe-tv-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between max-w-[1600px] mx-auto px-4 lg:px-8 py-3'
        }
      >
        {/* 1. TV-KOPFZEILE NUR NOCH IM GAME-OVER-SCREEN; IM SPIEL SCHWEBENDES MENÜ */}
        {isGameOver && (
        <header className="relative flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] shrink-0 items-center gap-3 pb-2.5">
          <div className="flex w-full sm:w-auto min-w-0 items-center justify-between sm:justify-start gap-3">
            <OpenButton size="md" variant="secondary" onClick={onLeave} className="shrink-0 whitespace-nowrap">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>EXIT TV</span>
            </OpenButton>

            {isStadtLandFluss && !isGameOver && (
              <span className="font-arcade hidden lg:inline text-xs tracking-wider text-[#67E8F9] uppercase truncate">
                {gameState?.letter ? `BUCHSTABE ${gameState.letter}` : 'KATEGORIENWAHL'}
              </span>
            )}

            {isRoulette && !isGameOver && (
              <span className="font-arcade hidden md:inline text-xs tracking-wider text-[#6EE7B7] uppercase truncate">
                RUNDE {gameState?.round || 1}/{gameState?.maxRounds || 5}
              </span>
            )}

            {isTexasHoldem && !isGameOver && (
              <span className="font-arcade hidden md:inline text-xs tracking-wider text-[#FBBF24] uppercase truncate">
                HAND {gameState?.handNumber || 1}/{gameState?.maxHands || 10}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center px-2 text-center">
            <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
              <span className="font-arcade block whitespace-nowrap text-lg sm:text-xl lg:text-2xl tracking-wider text-white uppercase">
                {gameTitle || lobby.name}
              </span>
            </div>
          </div>

          <div className="flex w-full sm:w-auto min-w-0 items-center justify-end gap-2.5">
            {isMoneyGame &&
              !isGameOver &&
              !isRoundOver &&
              (!isRoulette || gameState?.phase === 'betting') && (
                <span className="font-arcade shrink-0 rounded-xl border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-sm lg:text-base text-white">
                  {timeLeft} S
                </span>
              )}
            <HeaderStatusOverlay
              lobby={lobby}
              showWhenConnected
              connectedClassName="hidden lg:block shrink-0"
              onExitExpired={onLeave}
            />
            <span className="font-arcade shrink-0 rounded-xl border border-[#F59E0B]/55 bg-[#F59E0B]/15 px-3.5 py-1.5 text-sm lg:text-base tracking-widest text-[#FDE68A] uppercase">
              {lobby.code}
            </span>
          </div>
        </header>
        )}

        {/* Schwebendes TV-Menü für alle Standard-/Party-/Casino-Spiele */}
        {!isFullScreenGame && !isGameOver && (
          <>
            <button
              type="button"
              onClick={() => setIsGameMenuOpen(true)}
              aria-label="Spielmenü öffnen"
              className="fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] left-[max(0.75rem,calc(env(safe-area-inset-left,0px)+0.5rem))] z-40 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-[#0F172A]/80 px-3.5 py-2 font-arcade text-xs tracking-wider text-white uppercase shadow-lg backdrop-blur-md transition-colors hover:border-[#FBBF24] hover:text-[#FDE68A] cursor-pointer"
            >
              <Menu className="h-4 w-4 text-[#FBBF24]" />
              <span>MENÜ</span>
            </button>

            {isGameMenuOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="TV-Spielmenü"
                onClick={() => setIsGameMenuOpen(false)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/80 p-6 backdrop-blur-md animate-fade-in"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0F172A]/95 p-6 shadow-2xl"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="font-arcade text-lg text-white uppercase">
                        {gameTitle || lobby.name}
                      </div>
                      <div className="font-arcade text-xs text-[#FDE68A] uppercase">
                        RAUMCODE: {lobby.code}
                      </div>
                    </div>
                    <HeaderStatusOverlay
                      lobby={lobby}
                      showWhenConnected
                      onExitExpired={onLeave}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <OpenButton
                      size="lg"
                      variant="primary"
                      fullWidth
                      data-tv-autofocus="true"
                      onClick={() => setIsGameMenuOpen(false)}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>WEITER SPIELEN</span>
                    </OpenButton>
                    <OpenButton
                      size="lg"
                      variant="rose"
                      fullWidth
                      onClick={onLeave}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>EXIT TV</span>
                    </OpenButton>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Schwebender EXIT-TV-Button im Vollbild-Gold-Miner */}
        {isGoldMiner && !isGameOver && (
          <button
            type="button"
            onClick={onLeave}
            className="font-goldminer fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] left-[max(1rem,calc(env(safe-area-inset-left,0px)+0.75rem))] z-40 inline-flex items-center gap-2 rounded-xl border-2 border-[#78350F] bg-[#B45309]/90 px-3.5 py-2 text-sm text-amber-100 shadow-lg backdrop-blur-sm hover:bg-[#92400E] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>EXIT TV</span>
          </button>
        )}

        {/* Schwebender OPTIONEN-Button oben rechts im Vollbild-Zombie-Spiel */}
        {isZombieSurvival && !isGameOver && (
          <>
            <button
              type="button"
              onClick={() => setIsZombieMenuOpen(true)}
              className="fixed top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] right-[max(0.75rem,calc(env(safe-area-inset-right,0px)+0.5rem))] left-auto z-40 self-end w-fit inline-flex items-center gap-2 border border-white/15 bg-[#070B12]/85 px-3.5 py-2 font-mono text-xs font-bold tracking-[0.18em] text-white uppercase backdrop-blur-md transition-colors hover:border-[#F59E0B] hover:text-[#FDE68A] cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>OPTIONEN</span>
            </button>

            {isZombieMenuOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Spielmenü"
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/82 p-6 backdrop-blur-md animate-fade-in"
              >
                <div className="flex w-full max-w-sm flex-col gap-5 border border-white/15 border-t-2 border-t-[#EF4444] bg-[#070B12] p-6 text-center shadow-2xl">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.25em] text-[#94A3B8] uppercase">
                      ZOMBIE ARENA 3D • RAUM {lobby.code}
                    </span>
                    <h2 className="font-mono text-xl font-bold tracking-[0.2em] text-white uppercase">
                      SPIELMENÜ
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setIsZombieMenuOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 border border-[#10B981]/60 bg-[#10B981]/20 px-4 py-3 font-mono text-xs font-bold tracking-[0.18em] text-[#6EE7B7] uppercase hover:bg-[#10B981]/30 cursor-pointer"
                    >
                      <Play className="h-4 w-4" />
                      <span>WEITER SPIELEN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsZombieMenuOpen(false);
                        onLeave();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 border border-[#EF4444]/60 bg-[#EF4444]/20 px-4 py-3 font-mono text-xs font-bold tracking-[0.18em] text-[#FCA5A5] uppercase hover:bg-[#EF4444]/30 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>LOBBY VERLASSEN</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 2. TV-BÜHNE */}
        {isDrawAndGuess ? (
          <main className="flex flex-1 min-h-0 flex-col lg:flex-row items-stretch lg:items-center justify-center gap-8 lg:gap-16 xl:gap-20 py-4 w-full max-w-6xl mx-auto">
            <div className="w-full lg:w-64 shrink-0">
              <div className="mb-5 text-center">
                <span className="font-arcade text-sm tracking-wider text-[#CBD5E1] uppercase">
                  SPIELER
                </span>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-x-5 gap-y-6 max-h-[55vh] overflow-y-auto no-scrollbar p-3">
                {activePlayers.map((p, idx) => {
                  const isCurrentDrawer = p.id === gameState?.currentDrawerId;
                  const score = gameState?.scores?.[p.id] || 0;
                  return (
                    <div
                      key={p.id || idx}
                      className={`flex flex-col items-center gap-2 text-center min-w-0 transition-all duration-300 ${
                        isCurrentDrawer ? 'scale-110' : 'opacity-55 scale-95'
                      }`}
                    >
                      <div className="relative">
                        {isCurrentDrawer && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1.5 rounded-full bg-[#F472B6]/30 blur-md animate-pulse"
                          />
                        )}
                        <div
                          className={`relative rounded-full transition-all ${
                            isCurrentDrawer
                              ? 'ring-4 ring-[#F472B6] shadow-[0_0_24px_rgba(244,114,182,0.7)]'
                              : 'ring-2 ring-white/15'
                          }`}
                        >
                          <Avatar config={p.avatar} size={isCurrentDrawer ? 64 : 56} />
                        </div>
                        {isCurrentDrawer && (
                          <span
                            title="Zeichnet gerade"
                            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F472B6] text-white ring-2 ring-[#0F172A] shadow-md"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-arcade w-full truncate text-xs uppercase ${
                          isCurrentDrawer ? 'text-white' : 'text-[#CBD5E1]'
                        }`}
                      >
                        {p.name}
                      </span>
                      <span className="font-arcade text-[11px] text-[#FDE68A] uppercase">
                        {score} PKT
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-2xl w-full">
              {!isRoundOver && !isGameOver && (
                <div className="mb-6 lg:mb-7 shrink-0 px-2 py-1 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-arcade text-sm sm:text-base tracking-wider text-[#FBBF24] uppercase shrink-0">
                      {gameState?.categoryName || 'WORT'}
                    </span>
                    <span className="font-arcade text-base sm:text-xl tracking-[0.22em] text-white uppercase truncate">
                      {gameState?.roundStatus === 'choosing_word'
                        ? 'WORTWAHL...'
                        : gameState?.wordLength
                          ? Array.from({ length: gameState.wordLength }, () => '_').join(' ')
                          : '_ _ _ _'}
                    </span>
                  </div>
                  <span
                    className={`font-arcade shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm sm:text-base ${
                      timeLeft <= 10
                        ? 'border-[#F87171]/60 bg-[#EF4444]/20 text-[#FCA5A5]'
                        : 'border-white/20 bg-white/[0.06] text-white'
                    }`}
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{timeLeft} S</span>
                  </span>
                </div>
              )}

              <div className="w-full flex-1 min-h-0 flex items-center justify-center pointer-events-none">
                {BoardComponent && (
                  <Suspense
                    fallback={
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
                        <Loader2 className="h-7 w-7 animate-spin text-[#FBBF24]" />
                        <span className="font-arcade text-sm text-[#CBD5E1] uppercase">
                          SPIELFELD WIRD GELADEN...
                        </span>
                      </div>
                    }
                  >
                    <BoardComponent
                      gameId={lobby.gameId}
                      gameState={gameState}
                      myPlayer={{ id: 'tv_screen', socketId: '', name: 'TV', avatar: {}, isReady: true, isHost: true, connected: true, isTvScreen: true }}
                      opponent={player2}
                      allPlayers={activePlayers}
                      isMyTurn={false}
                      isGameOver={isGameOver}
                      onMove={() => {}}
                      disabled={true}
                      isTvMode={true}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main
            className={`flex flex-1 min-h-0 flex-col items-center w-full ${
              isFullScreenGame ? 'overflow-hidden p-0' : 'overflow-y-auto py-3'
            }`}
          >
            <div
              className={
                isFullScreenGame
                  ? 'flex h-full w-full flex-1 min-h-0 flex-col'
                  : 'my-auto flex w-full flex-col items-center'
              }
            >
              {BoardComponent && (
                <Suspense
                  fallback={
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
                      <Loader2 className="h-7 w-7 animate-spin text-[#FBBF24]" />
                      <span className="font-arcade text-sm text-[#CBD5E1] uppercase">
                        SPIELFELD WIRD GELADEN...
                      </span>
                    </div>
                  }
                >
                  <BoardComponent
                    gameId={lobby.gameId}
                    gameState={gameState}
                    myPlayer={{ id: 'tv_screen', socketId: '', name: 'TV', avatar: {}, isReady: true, isHost: true, connected: true, isTvScreen: true }}
                    opponent={player2 || player1}
                    allPlayers={activePlayers}
                    isMyTurn={false}
                    isGameOver={isGameOver}
                    onMove={() => {}}
                    disabled={true}
                    isTvMode={true}
                  />
                </Suspense>
              )}
            </div>
          </main>
        )}

        {/* GEWINNER-OVERLAY */}
        {isGameOver && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Spielende"
            className="fixed inset-0 z-50 bg-[#0F172A]/88 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
              <div className="border-b-2 border-[#F59E0B] px-4 pb-1.5">
                <span className="font-arcade text-2xl sm:text-4xl tracking-wider text-white uppercase">
                  {winner ? `${winner.name} GEWINNT!` : 'UNENTSCHIEDEN!'}
                </span>
              </div>

              <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-6 max-h-[45vh] overflow-y-auto py-2">
                {[...activePlayers]
                  .sort(
                    (a, b) =>
                      (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
                  )
                  .slice(0, 8)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex flex-col items-center gap-2 text-center min-w-0"
                    >
                      <div
                        className={`relative rounded-full ${
                          idx === 0
                            ? 'ring-[3px] ring-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.4)]'
                            : 'ring-2 ring-white/20'
                        }`}
                      >
                        <Avatar config={p.avatar} size={58} />
                        <span className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F59E0B] font-arcade text-[10px] text-[#0F172A] ring-2 ring-[#0F172A]">
                          #{idx + 1}
                        </span>
                      </div>
                      <span className="font-arcade w-full truncate text-xs sm:text-sm text-white uppercase">
                        {p.name}
                      </span>
                      <span className="font-arcade text-sm text-[#FDE68A]">
                        {isMoneyGame
                          ? `${Math.round(gameState?.scores?.[p.id] ?? 0).toLocaleString('de-DE')} €`
                          : `${String(gameState?.scores?.[p.id] ?? 0)} PKT`}
                      </span>
                    </div>
                  ))}
              </div>

              {!lobby.isSimulated && (
                <p className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                  REVANCHE AUF HANDYS: {lobby.rematchVotes.length}/{activePlayers.length} BEREIT
                </p>
              )}

              <div className="flex w-full flex-col sm:flex-row gap-3">
                <OpenButton
                  fullWidth
                  size="lg"
                  variant="rose"
                  data-tv-autofocus={!lobby.isSimulated ? 'true' : undefined}
                  onClick={onLeave}
                >
                  ZURÜCK ZUM MENÜ
                </OpenButton>
                {lobby.isSimulated && (
                  <OpenButton
                    fullWidth
                    size="lg"
                    variant="primary"
                    data-tv-autofocus="true"
                    disabled={rematchRequested}
                    onClick={() => void handleSimulatedRematch()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>NOCHMAL</span>
                  </OpenButton>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
