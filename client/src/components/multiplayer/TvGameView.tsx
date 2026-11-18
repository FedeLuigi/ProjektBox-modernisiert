import { useEffect, useState } from 'react';
import { ArrowLeft, Wifi } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import { OpenButton } from '../OpenSubpageUI';
import { ConnectionStatusBadge, HeaderStatusOverlay } from './ConnectionStatusBadge';

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
        status: status as any,
      }));
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
    });

    const unsubRestart = socketService.onGameRestarted(({ lobby: updatedLobby }) => {
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

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div className="fixed inset-0 z-50 flex w-full flex-col justify-between overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        className="safe-tv-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between max-w-[1440px] mx-auto"
      >
        {/* 1. OPEN-GALLERY TV HEADER */}
        <header className="relative flex flex-wrap shrink-0 items-center justify-between gap-1.5 sm:gap-3 landscape:gap-1 border-b border-white/15 pb-1.5 sm:pb-2.5 landscape:pb-1">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <OpenButton size="sm" variant="secondary" onClick={onLeave}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>EXIT TV</span>
            </OpenButton>
            <div className="min-w-0 border-b-2 border-[#F59E0B] px-1 pb-0.5">
              <span className="font-arcade block truncate text-xs sm:text-lg tracking-wider text-white uppercase">
                {gameTitle || lobby.name}
              </span>
            </div>
          </div>

          {isDrawAndGuess && !isGameOver && !isRoundOver && (
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
              <span className="font-arcade text-[10px] tracking-wider text-[#FBBF24] uppercase">
                {gameState?.categoryName || 'WORD'}
              </span>
              <span className="font-arcade text-sm sm:text-base tracking-[0.2em] text-white uppercase">
                {gameState?.roundStatus === 'choosing_word'
                  ? 'WORTWAHL...'
                  : gameState?.wordLength
                    ? Array.from({ length: gameState.wordLength }, () => '_').join(' ')
                    : '_ _ _ _'}
              </span>
            </div>
          )}

          {isStadtLandFluss && !isGameOver && (
            <div className="flex items-center gap-2 rounded-xl border border-[#22D3EE]/35 bg-white/[0.06] px-4 py-1.5 backdrop-blur-md">
              <span className="font-arcade text-[10px] tracking-wider text-[#67E8F9] uppercase">
                RUNDE {gameState?.round || 1}/{gameState?.maxRounds || 3}
              </span>
              <span className="font-arcade text-sm sm:text-base text-[#FDE68A] uppercase">
                BUCHSTABE {gameState?.letter || '?'}
              </span>
            </div>
          )}

          {isRoulette && !isGameOver && (
            <div className="flex items-center gap-2 rounded-xl border border-[#34D399]/40 bg-[#064E3B]/55 px-4 py-1.5 backdrop-blur-md">
              <span className="font-arcade text-[10px] tracking-wider text-[#6EE7B7] uppercase">
                CASINO ROULETTE
              </span>
              <span className="font-arcade text-sm sm:text-base text-[#FDE68A] uppercase">
                RUNDE {gameState?.round || 1}/{gameState?.maxRounds || 5}
              </span>
            </div>
          )}

          {isTexasHoldem && !isGameOver && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/45 bg-[#064E3B]/60 px-4 py-1.5 backdrop-blur-md">
              <span className="font-arcade text-[10px] tracking-wider text-[#FBBF24] uppercase">
                TEXAS HOLD&apos;EM
              </span>
              <span className="font-arcade text-sm sm:text-base text-white uppercase">
                HAND {gameState?.handNumber || 1}/{gameState?.maxHands || 10}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {(isDrawAndGuess || isStadtLandFluss || isMoneyGame) && !isGameOver && !isRoundOver && (
              <span className="font-arcade rounded-lg border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-white">
                {timeLeft} S
              </span>
            )}
            <div className="hidden md:block">
              <ConnectionStatusBadge />
            </div>
            <span className="font-arcade rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1 text-xs tracking-widest text-[#FDE68A] uppercase">
              {lobby.code}
            </span>
          </div>

          <HeaderStatusOverlay
            lobby={lobby}
            showWhenConnected={false}
            onExitExpired={onLeave}
          />
        </header>

        {/* 2. MITTE: TV-BÜHNE */}
        {isDrawAndGuess ? (
          <main className="flex flex-1 min-h-0 flex-col min-[540px]:flex-row items-stretch min-[540px]:items-center justify-start min-[540px]:justify-between gap-2.5 sm:gap-4 lg:gap-8 overflow-y-auto py-1.5 sm:py-3 w-full">
            {/* Linke Spalte: Spieler & Punkte */}
            <div className="w-full max-w-md min-[540px]:w-36 sm:w-44 md:w-52 lg:w-68 mx-auto min-[540px]:mx-0 shrink-0 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-2.5 sm:p-3.5 backdrop-blur-xl">
              <div className="mb-1.5 sm:mb-2.5 border-b-2 border-[#F59E0B] self-start inline-block pb-0.5">
                <span className="font-arcade text-xs tracking-wider text-white uppercase">
                  SPIELER
                </span>
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-2 max-h-[24dvh] min-[540px]:max-h-[46dvh] lg:max-h-[52vh] overflow-y-auto no-scrollbar">
                {activePlayers.map((p, idx) => {
                  const isCurrentDrawer = p.id === gameState?.currentDrawerId;
                  const score = gameState?.scores?.[p.id] || 0;
                  return (
                    <div
                      key={p.id || idx}
                      className={`w-full flex items-center justify-between rounded-xl border p-2.5 ${
                        isCurrentDrawer
                          ? 'bg-[#DB2777]/25 border-[#F472B6]/60 text-white'
                          : 'bg-white/[0.04] border-white/12 text-white/90'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar config={p.avatar} size={32} />
                        <span className="font-arcade text-xs uppercase truncate">{p.name}</span>
                        {p.connectionState === 'disconnected' && !p.connected && (
                          <span className="rounded border border-[#F59E0B]/50 bg-[#F59E0B]/20 px-1 py-0.5 font-arcade text-[9px] text-[#FDE68A] uppercase">
                            GETRENNT
                          </span>
                        )}
                      </div>
                      <span className="font-arcade text-xs text-[#FDE68A] uppercase">{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mittlere Spalte: TV-Leinwand */}
            <div className="w-full shrink-0 min-[540px]:flex-1 min-[540px]:min-h-0 flex flex-col items-center justify-center max-w-xl mx-auto">
              {!isRoundOver && !isGameOver && (
                <div className="font-arcade mb-1.5 sm:mb-3 shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs text-white uppercase flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 text-[#F472B6] animate-pulse shrink-0" />
                  <span className="truncate">
                    {currentTurnPlayer?.name || 'SPIELER'}{' '}
                    {gameState?.roundStatus === 'choosing_word'
                      ? 'WÄHLT EIN EIGENES WORT...'
                      : 'ZEICHNET...'}
                  </span>
                </div>
              )}

              <div className="w-full shrink-0 min-[540px]:flex-1 min-[540px]:min-h-0 flex items-center justify-center pointer-events-none">
                {BoardComponent && (
                  <BoardComponent
                    gameId={lobby.gameId}
                    gameState={gameState}
                    myPlayer={{ id: 'tv_screen', name: 'TV', isTvScreen: true } as any}
                    opponent={player2}
                    allPlayers={activePlayers}
                    isMyTurn={false}
                    isGameOver={isGameOver}
                    onMove={() => {}}
                    disabled={true}
                  />
                )}
              </div>
            </div>

            {/* Rechte Spalte: Tipps */}
            <div className="w-full max-w-md min-[540px]:w-36 sm:w-44 md:w-52 lg:w-68 mx-auto min-[540px]:mx-0 shrink-0 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-2.5 sm:p-3.5 backdrop-blur-xl">
              <div className="mb-1.5 sm:mb-2.5 border-b-2 border-[#10B981] self-start inline-block pb-0.5">
                <span className="font-arcade text-xs tracking-wider text-white uppercase">
                  TIPPS
                </span>
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-2 max-h-[24dvh] min-[540px]:max-h-[46dvh] lg:max-h-[52vh] overflow-y-auto no-scrollbar">
                {gameState?.guesses && gameState.guesses.length > 0 ? (
                  gameState.guesses.map((g: any) => (
                    <div
                      key={g.id}
                      className={`font-arcade w-full rounded-xl border text-xs p-2 flex items-center justify-between uppercase ${
                        g.isCorrect
                          ? 'bg-[#10B981]/20 border-[#34D399]/50 text-[#6EE7B7]'
                          : 'bg-white/[0.04] border-white/12 text-white/85'
                      }`}
                    >
                      <span className="truncate pr-1">
                        {g.playerName}: {g.text}
                      </span>
                      <span>{g.isCorrect ? '✓' : '×'}</span>
                    </div>
                  ))
                ) : (
                  <div className="font-arcade text-xs text-[#94A3B8] text-center py-6 uppercase">
                    WARTE AUF TIPPS...
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : isStadtLandFluss || isMoneyGame ? (
          <main className="flex flex-1 min-h-0 flex-col items-center overflow-y-auto py-1.5 sm:py-3 w-full">
            <div className="my-auto flex w-full flex-col items-center">
              {BoardComponent && (
                <BoardComponent
                  gameId={lobby.gameId}
                  gameState={gameState}
                  myPlayer={{ id: 'tv_screen', name: 'TV', isTvScreen: true } as any}
                  opponent={player2}
                  allPlayers={activePlayers}
                  isMyTurn={false}
                  isGameOver={isGameOver}
                  onMove={() => {}}
                  disabled={true}
                />
              )}
            </div>
          </main>
        ) : (
          <main className="my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-12 py-4 w-full">
            {/* Spieler 1 */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-5 text-center">
              <span className="font-arcade text-[10px] tracking-widest text-[#FBBF24] uppercase">
                SPIELER 1
              </span>
              <Avatar config={player1?.avatar || ({} as any)} size={68} />
              <span className="font-arcade text-sm sm:text-base text-white uppercase truncate max-w-full">
                {player1?.name || 'SPIELER 1'}
              </span>
              <span
                className={`font-arcade rounded-lg border px-3 py-1 text-[11px] uppercase ${
                  currentTurnPlayer?.id === player1?.id && !isGameOver
                    ? 'border-[#34D399]/50 bg-[#10B981]/20 text-[#6EE7B7]'
                    : 'border-white/15 bg-white/[0.04] text-[#94A3B8]'
                }`}
              >
                {currentTurnPlayer?.id === player1?.id && !isGameOver ? 'AM ZUG' : 'WARTET'}
              </span>
            </div>

            {/* Spielfeld */}
            <div className="flex flex-col items-center justify-center">
              <div className="pointer-events-none scale-105 transform-gpu">
                {BoardComponent && (
                  <BoardComponent
                    gameId={lobby.gameId}
                    gameState={gameState}
                    myPlayer={{ id: 'tv_screen', name: 'TV', isTvScreen: true } as any}
                    opponent={player2}
                    allPlayers={activePlayers}
                    isMyTurn={false}
                    isGameOver={isGameOver}
                    onMove={() => {}}
                    disabled={true}
                  />
                )}
              </div>
            </div>

            {/* Spieler 2 */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-5 text-center">
              <span className="font-arcade text-[10px] tracking-widest text-[#A78BFA] uppercase">
                SPIELER 2
              </span>
              <Avatar config={player2?.avatar || ({} as any)} size={68} />
              <span className="font-arcade text-sm sm:text-base text-white uppercase truncate max-w-full">
                {player2?.name || 'SPIELER 2'}
              </span>
              <span
                className={`font-arcade rounded-lg border px-3 py-1 text-[11px] uppercase ${
                  currentTurnPlayer?.id === player2?.id && !isGameOver
                    ? 'border-[#34D399]/50 bg-[#10B981]/20 text-[#6EE7B7]'
                    : 'border-white/15 bg-white/[0.04] text-[#94A3B8]'
                }`}
              >
                {currentTurnPlayer?.id === player2?.id && !isGameOver ? 'AM ZUG' : 'WARTET'}
              </span>
            </div>
          </main>
        )}

        <footer className="font-arcade shrink-0 text-center text-xs tracking-wider text-[#94A3B8] uppercase pb-1">
          STEUERUNG PER SMARTPHONE
        </footer>

        {/* GEWINNER-OVERLAY im Offene-Bühne-Stil */}
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  {winner ? `${winner.name} GEWINNT!` : 'UNENTSCHIEDEN!'}
                </span>
              </div>

              <div className="flex w-full flex-col gap-2.5 max-h-[50vh] overflow-y-auto">
                {[...activePlayers]
                  .sort(
                    (a, b) =>
                      (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
                  )
                  .slice(0, isDrawAndGuess || isStadtLandFluss || isMoneyGame ? 8 : 2)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5"
                    >
                      <span className="font-arcade text-xs text-[#CBD5E1] uppercase">{p.name}</span>
                      <span className="font-arcade text-base text-[#FDE68A]">
                        {isMoneyGame
                          ? `${Math.round(gameState?.scores?.[p.id] ?? 0).toLocaleString('de-DE')} €`
                          : String(gameState?.scores?.[p.id] ?? 0)}
                      </span>
                    </div>
                  ))}
              </div>

              <OpenButton size="lg" variant="primary" onClick={onLeave} className="min-w-[160px]">
                OK
              </OpenButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
