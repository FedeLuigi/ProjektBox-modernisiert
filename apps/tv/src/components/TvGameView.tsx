import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Wifi } from 'lucide-react';
import type { Lobby } from '@projektbox/shared/types';
import {
  Avatar,
  BackgroundCometCanvas,
  ConnectionStatusBadge,
  HeaderStatusOverlay,
  OpenButton,
  clientGameRegistry,
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

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const isStadtLandFluss = lobby.gameId === 'stadt-land-fluss';
  const isRoulette = lobby.gameId === 'roulette';
  const isTexasHoldem = lobby.gameId === 'texas-holdem';
  const isMoneyGame = isRoulette || isTexasHoldem;
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const player1 = activePlayers[0];
  const player2 = activePlayers[1];

  const currentTurnPlayer = activePlayers.find((p) => p.id === gameState?.currentTurn);
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
      className="fixed inset-0 z-50 flex w-full flex-col justify-between overflow-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="safe-tv-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between max-w-[1600px] mx-auto px-6 lg:px-10 py-3">
        {/* 1. TV-KOPFZEILE */}
        <header className="relative flex flex-wrap shrink-0 items-center justify-between gap-3 border-b border-white/15 pb-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <OpenButton size="md" variant="secondary" onClick={onLeave}>
              <ArrowLeft className="h-4 w-4" />
              <span>EXIT TV</span>
            </OpenButton>
            <div className="min-w-0 border-b-2 border-[#F59E0B] px-1 pb-0.5">
              <span className="font-arcade block truncate text-lg lg:text-2xl tracking-wider text-white uppercase">
                {gameTitle || lobby.name}
              </span>
            </div>
          </div>

          {isDrawAndGuess && !isGameOver && !isRoundOver && (
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2 backdrop-blur-md">
              <span className="font-arcade text-xs tracking-wider text-[#FBBF24] uppercase">
                {gameState?.categoryName || 'WORT'}
              </span>
              <span className="font-arcade text-lg lg:text-2xl tracking-[0.22em] text-white uppercase">
                {gameState?.roundStatus === 'choosing_word'
                  ? 'WORTWAHL...'
                  : gameState?.wordLength
                    ? Array.from({ length: gameState.wordLength }, () => '_').join(' ')
                    : '_ _ _ _'}
              </span>
            </div>
          )}

          {isStadtLandFluss && !isGameOver && (
            <div className="flex items-center gap-3 rounded-xl border border-[#22D3EE]/35 bg-white/[0.06] px-5 py-2 backdrop-blur-md">
              <span className="font-arcade text-xs tracking-wider text-[#67E8F9] uppercase">
                RUNDE {gameState?.round || 1}/{gameState?.maxRounds || 3}
              </span>
              <span className="font-arcade text-lg lg:text-xl text-[#FDE68A] uppercase">
                BUCHSTABE {gameState?.letter || '?'}
              </span>
            </div>
          )}

          {isRoulette && !isGameOver && (
            <div className="flex items-center gap-3 rounded-xl border border-[#34D399]/40 bg-[#064E3B]/55 px-5 py-2 backdrop-blur-md">
              <span className="font-arcade text-xs tracking-wider text-[#6EE7B7] uppercase">
                CASINO ROULETTE
              </span>
              <span className="font-arcade text-lg text-[#FDE68A] uppercase">
                RUNDE {gameState?.round || 1}/{gameState?.maxRounds || 5}
              </span>
            </div>
          )}

          {isTexasHoldem && !isGameOver && (
            <div className="flex items-center gap-3 rounded-xl border border-[#F59E0B]/45 bg-[#064E3B]/60 px-5 py-2 backdrop-blur-md">
              <span className="font-arcade text-xs tracking-wider text-[#FBBF24] uppercase">
                TEXAS HOLD&apos;EM
              </span>
              <span className="font-arcade text-lg text-white uppercase">
                HAND {gameState?.handNumber || 1}/{gameState?.maxHands || 10}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {(isDrawAndGuess || isStadtLandFluss || isMoneyGame) && !isGameOver && !isRoundOver && (
              <span className="font-arcade rounded-xl border border-white/20 bg-white/[0.08] px-4 py-1.5 text-sm lg:text-base text-white">
                {timeLeft} S
              </span>
            )}
            <div className="hidden md:block">
              <ConnectionStatusBadge />
            </div>
            <span className="font-arcade rounded-xl border border-[#F59E0B]/55 bg-[#F59E0B]/15 px-4 py-1.5 text-sm lg:text-base tracking-widest text-[#FDE68A] uppercase">
              {lobby.code}
            </span>
          </div>

          <HeaderStatusOverlay
            lobby={lobby}
            showWhenConnected={false}
            onExitExpired={onLeave}
          />
        </header>

        {/* 2. TV-BÜHNE */}
        {isDrawAndGuess ? (
          <main className="flex flex-1 min-h-0 flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 py-4 w-full">
            <div className="w-full lg:w-72 shrink-0 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-4 backdrop-blur-xl">
              <div className="mb-3 border-b-2 border-[#F59E0B] inline-block pb-0.5">
                <span className="font-arcade text-sm tracking-wider text-white uppercase">
                  SPIELER
                </span>
              </div>
              <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto no-scrollbar">
                {activePlayers.map((p, idx) => {
                  const isCurrentDrawer = p.id === gameState?.currentDrawerId;
                  const score = gameState?.scores?.[p.id] || 0;
                  return (
                    <div
                      key={p.id || idx}
                      className={`w-full flex items-center justify-between rounded-xl border p-3 ${
                        isCurrentDrawer
                          ? 'bg-[#DB2777]/25 border-[#F472B6]/60 text-white'
                          : 'bg-white/[0.04] border-white/12 text-white/90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar config={p.avatar} size={36} />
                        <span className="font-arcade text-sm uppercase truncate">{p.name}</span>
                        {p.connectionState === 'disconnected' && !p.connected && (
                          <span className="rounded border border-[#F59E0B]/50 bg-[#F59E0B]/20 px-1.5 py-0.5 font-arcade text-[10px] text-[#FDE68A] uppercase">
                            GETRENNT
                          </span>
                        )}
                      </div>
                      <span className="font-arcade text-sm text-[#FDE68A] uppercase">{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
              {!isRoundOver && !isGameOver && (
                <div className="font-arcade mb-3 shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2 text-sm text-white uppercase flex items-center gap-2.5">
                  <Wifi className="h-4 w-4 text-[#F472B6] animate-pulse shrink-0" />
                  <span className="truncate">
                    {currentTurnPlayer?.name || 'SPIELER'}{' '}
                    {gameState?.roundStatus === 'choosing_word'
                      ? 'WÄHLT EIN WORT...'
                      : 'ZEICHNET...'}
                  </span>
                </div>
              )}

              <div className="w-full flex-1 min-h-0 flex items-center justify-center pointer-events-none">
                {BoardComponent && (
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
                )}
              </div>
            </div>

            <div className="w-full lg:w-72 shrink-0 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-4 backdrop-blur-xl">
              <div className="mb-3 border-b-2 border-[#10B981] inline-block pb-0.5">
                <span className="font-arcade text-sm tracking-wider text-white uppercase">
                  LIVE TIPPS
                </span>
              </div>
              <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto no-scrollbar">
                {gameState?.guesses && gameState.guesses.length > 0 ? (
                  gameState.guesses.map((g: any) => (
                    <div
                      key={g.id}
                      className={`font-arcade w-full rounded-xl border text-sm p-2.5 flex items-center justify-between uppercase ${
                        g.isCorrect
                          ? 'bg-[#10B981]/20 border-[#34D399]/50 text-[#6EE7B7]'
                          : 'bg-white/[0.04] border-white/12 text-white/85'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {g.playerName}: {g.text}
                      </span>
                      <span>{g.isCorrect ? '✓' : '×'}</span>
                    </div>
                  ))
                ) : (
                  <div className="font-arcade text-sm text-[#94A3B8] text-center py-8 uppercase">
                    WARTE AUF TIPPS...
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex flex-1 min-h-0 flex-col items-center overflow-y-auto py-3 w-full">
            <div className="my-auto flex w-full flex-col items-center">
              {BoardComponent && (
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
              )}
            </div>
          </main>
        )}

        <footer className="font-arcade shrink-0 text-center text-xs lg:text-sm tracking-wider text-[#94A3B8] uppercase pb-1">
          {lobby.isSimulated
            ? 'TV-SIMULATION • BOTS SPIELEN AUTOMATISCH • EXIT / ESCAPE ZUM BEENDEN'
            : 'STEUERUNG ÜBER VERBUNDENE SMARTPHONES • ESCAPE / ZURÜCK FÜR HAUPTMENÜ'}
        </footer>

        {/* GEWINNER-OVERLAY */}
        {isGameOver && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Spielende"
            className="fixed inset-0 z-50 bg-[#0F172A]/88 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
          >
            <div className="flex w-full max-w-md flex-col items-center gap-6 text-center rounded-3xl border border-white/15 bg-[#1B2B40]/95 p-7 shadow-2xl">
              <div className="border-b-2 border-[#F59E0B] px-4 pb-1.5">
                <span className="font-arcade text-2xl sm:text-4xl tracking-wider text-white uppercase">
                  {winner ? `${winner.name} GEWINNT!` : 'UNENTSCHIEDEN!'}
                </span>
              </div>

              <div className="flex w-full flex-col gap-2.5 max-h-[45vh] overflow-y-auto">
                {[...activePlayers]
                  .sort(
                    (a, b) =>
                      (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
                  )
                  .slice(0, 8)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-arcade text-sm text-[#FBBF24]">#{idx + 1}</span>
                        <Avatar config={p.avatar} size={28} />
                        <span className="font-arcade text-sm text-white uppercase truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="font-arcade text-lg text-[#FDE68A]">
                        {isMoneyGame
                          ? `${Math.round(gameState?.scores?.[p.id] ?? 0).toLocaleString('de-DE')} €`
                          : String(gameState?.scores?.[p.id] ?? 0)}
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
                {lobby.isSimulated && (
                  <OpenButton
                    fullWidth
                    size="lg"
                    variant="amber"
                    disabled={rematchRequested}
                    onClick={() => void handleSimulatedRematch()}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>NOCHMAL</span>
                  </OpenButton>
                )}
                <OpenButton
                  fullWidth
                  size="lg"
                  variant="primary"
                  data-tv-autofocus="true"
                  onClick={onLeave}
                >
                  ZURÜCK ZUM MENÜ
                </OpenButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
