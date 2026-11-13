import { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import {
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
  CrystalStatBar,
} from '../CrystalUI';

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
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const player1 = activePlayers[0];
  const player2 = activePlayers[1];

  const currentTurnPlayer = activePlayers.find((p) => p.id === gameState?.currentTurn);
  const isGameOver = gameState?.status === 'won' || gameState?.status === 'draw';
  const isRoundOver = gameState?.roundStatus === 'round_over';
  const winner = activePlayers.find((p) => p.id === gameState?.winnerId);

  const [timeLeft, setTimeLeft] = useState(() => {
    if (!gameState?.roundEndsAt) return 60;
    return Math.max(0, Math.ceil((gameState.roundEndsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!gameState?.roundEndsAt || gameState?.status !== 'playing') return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [gameState?.roundEndsAt, gameState?.status]);

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

    return () => {
      unsubState();
      unsubStarted();
      unsubRestart();
      unsubUpdated();
    };
  }, []);

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col justify-between overflow-hidden bg-[#3B82B6] text-[#15608E] select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        style={{
          paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between px-6 sm:px-12 lg:px-16 max-w-[1600px] mx-auto"
      >
        {/* 1. CRYSTAL TV HEADER */}
        <header className="flex shrink-0 items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <CrystalButton size="sm" tilt="left" onClick={onLeave}>
              EXIT TV
            </CrystalButton>
            <CrystalReadout value={gameTitle || lobby.name} />
          </div>

          {isDrawAndGuess && !isGameOver && (
            <div className="flex items-center gap-3">
              {!isRoundOver && (
                <CrystalReadout
                  label={gameState?.categoryName || 'WORD'}
                  value={gameState?.wordHint || '_ _ _ _'}
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {isDrawAndGuess && !isGameOver && !isRoundOver && (
              <CrystalStatBar type="star" value={`${timeLeft}S`} />
            )}
            <CrystalStatBar type="coin" value={lobby.code} />
          </div>
        </header>

        {/* 2. MITTE: TV-BÜHNE */}
        {isDrawAndGuess ? (
          <main className="my-auto flex flex-1 items-center justify-between gap-6 lg:gap-10 py-2 w-full">
            {/* Linke Spalte: Spieler & Punkte */}
            <div className="w-64 lg:w-72 shrink-0">
              <CrystalPanel title="PLAYERS" contentClassName="gap-2.5 max-h-[54vh] overflow-y-auto">
                {activePlayers.map((p, idx) => {
                  const isCurrentDrawer = p.id === gameState?.currentDrawerId;
                  const score = gameState?.scores?.[p.id] || 0;
                  return (
                    <div
                      key={p.id || idx}
                      className={`w-full flex items-center justify-between p-2.5 border-[3px] ${
                        isCurrentDrawer
                          ? 'bg-[#2B9FD6] border-[#0E5A8A] text-white'
                          : 'bg-[#B8ECFD] border-[#17608E] text-[#15608E]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar config={p.avatar} size={34} />
                        <span className="font-arcade text-xs uppercase truncate">{p.name}</span>
                      </div>
                      <span className="font-arcade text-xs uppercase">{score}</span>
                    </div>
                  );
                })}
              </CrystalPanel>
            </div>

            {/* Mittlere Spalte: TV-Leinwand */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto">
              {!isRoundOver && !isGameOver && (
                <div className="font-arcade mb-2.5 px-4 py-1.5 border-[3px] border-[#17608E] bg-[#9CE0FA] text-xs text-[#15608E] uppercase flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 animate-pulse" />
                  <span>{currentTurnPlayer?.name || 'PLAYER'} IS DRAWING...</span>
                </div>
              )}

              <div className="w-full flex-1 flex items-center justify-center pointer-events-none">
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
            <div className="w-64 lg:w-72 shrink-0">
              <CrystalPanel title="GUESSES" contentClassName="gap-2 max-h-[54vh] overflow-y-auto">
                {gameState?.guesses && gameState.guesses.length > 0 ? (
                  gameState.guesses.map((g: any) => (
                    <div
                      key={g.id}
                      className={`font-arcade w-full text-xs p-2 border-2 flex items-center justify-between uppercase ${
                        g.isCorrect
                          ? 'bg-[#2B9FD6] border-[#0E5A8A] text-white'
                          : 'bg-[#B8ECFD] border-[#17608E] text-[#15608E]'
                      }`}
                    >
                      <span className="truncate pr-1">
                        {g.playerName}: {g.text}
                      </span>
                      <span>{g.isCorrect ? '✓' : '×'}</span>
                    </div>
                  ))
                ) : (
                  <div className="font-arcade text-xs text-[#15608E]/70 text-center py-6 uppercase">
                    WAITING FOR GUESSES...
                  </div>
                )}
              </CrystalPanel>
            </div>
          </main>
        ) : (
          <main className="my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-12 py-4 w-full">
            {/* Spieler 1 */}
            <CrystalPanel
              topTabLabel="PLAYER 1"
              title={player1?.name || 'PLAYER 1'}
              contentClassName="gap-2"
            >
              <Avatar config={player1?.avatar || ({} as any)} size={68} />
              <CrystalReadout
                value={currentTurnPlayer?.id === player1?.id && !isGameOver ? 'PLAYING' : 'WAITING'}
              />
            </CrystalPanel>

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
            <CrystalPanel
              topTabLabel="PLAYER 2"
              title={player2?.name || 'PLAYER 2'}
              contentClassName="gap-2"
            >
              <Avatar config={player2?.avatar || ({} as any)} size={68} />
              <CrystalReadout
                value={currentTurnPlayer?.id === player2?.id && !isGameOver ? 'PLAYING' : 'WAITING'}
              />
            </CrystalPanel>
          </main>
        )}

        <footer className="font-arcade shrink-0 text-center text-xs tracking-wider text-white uppercase pb-1 drop-shadow-[0_1.5px_0_rgba(14,62,96,0.65)]">
          PLAYERS CONTROL THE GAME VIA SMARTPHONE
        </footer>

        {/* GEWINNER-MODAL im 1:1 "LEVEL 16" Crystal-Panel-Stil */}
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-[#103858]/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm">
              <CrystalPanel
                stars={3}
                title={winner ? `${winner.name} WINS!` : 'DRAW!'}
                contentClassName="gap-3.5 py-6"
              >
                {activePlayers.slice(0, 2).map((p) => (
                  <CrystalReadout
                    key={p.id}
                    label={p.name}
                    value={String(gameState?.scores?.[p.id] ?? 25873)}
                  />
                ))}

                <div className="mt-2">
                  <CrystalButton size="md" onClick={onLeave} className="min-w-[140px]">
                    OK
                  </CrystalButton>
                </div>
              </CrystalPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
