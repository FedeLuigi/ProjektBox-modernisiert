import { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Tv, Wifi } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';

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
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const player1 = activePlayers[0];
  const player2 = activePlayers[1];

  const currentTurnPlayer = activePlayers.find((p) => p.id === gameState?.currentTurn);
  const isGameOver = gameState?.status === 'won' || gameState?.status === 'draw';
  const winner = activePlayers.find((p) => p.id === gameState?.winnerId);
  const isDraw = gameState?.status === 'draw';

  // Socket Events für Live-Spielzug-Updates
  useEffect(() => {
    const unsubState = socketService.onGameState(({ gameState: newState, status, lobby: updatedLobby }) => {
      setLobby((prev) => ({
        ...prev,
        ...updatedLobby,
        gameState: newState,
        status: status as any,
      }));
    });

    const unsubRestart = socketService.onGameRestarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
    });

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
    });

    return () => {
      unsubState();
      unsubRestart();
      unsubUpdated();
    };
  }, []);

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col justify-between overflow-hidden bg-[#07070C] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.35} />

      {/* ─── Ambient Glow ─── */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-35 bg-purple-600/30" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-35 bg-pink-600/25" />

      {/* ─── Großbild-Container ─── */}
      <div
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        className="relative z-10 flex h-full w-full flex-col justify-between px-6 sm:px-10 max-w-6xl mx-auto"
      >
        {/* 1. KOPFZEILE */}
        <header className="flex shrink-0 items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-purple-600/30 text-purple-300 px-3.5 py-1 text-xs font-black uppercase ring-1 ring-purple-500/40">
              <Tv className="h-3.5 w-3.5" />
              <span>TV-Anzeige</span>
            </div>
            <span className="text-lg font-black text-white">{gameTitle || lobby.name}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-[#8E8E93]">
              Code: <strong className="text-white tracking-widest">{lobby.code}</strong>
            </span>

            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/15 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>TV-Lobby beenden</span>
            </button>
          </div>
        </header>

        {/* 2. MITTE: SPIELER-PROFILES LINKS/RECHTS & SPIELFELD IN DER MITTE */}
        <main className="my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10 py-4">
          {/* Spieler 1 (Links) */}
          <div
            className={`flex flex-col items-center p-6 rounded-3xl transition-all ${
              currentTurnPlayer?.id === player1?.id && !isGameOver
                ? 'bg-purple-600/25 ring-2 ring-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.4)] scale-105'
                : 'bg-white/[0.04] ring-1 ring-white/10 opacity-70'
            }`}
          >
            <div className="relative mb-3">
              <Avatar config={player1?.avatar || ({} as any)} size={72} />
              {player1?.symbol && (
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-sm font-black shadow-md ring-2 ring-black">
                  {player1.symbol}
                </span>
              )}
              {player1?.color && (
                <span
                  className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ring-2 ring-black ${
                    player1.color === 'red' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                  }`}
                />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white truncate max-w-[160px]">
              {player1?.name || 'Spieler 1'}
            </h3>

            <span className="text-xs font-semibold text-purple-300 mt-0.5">
              {currentTurnPlayer?.id === player1?.id && !isGameOver
                ? 'Ist am Zug (Handy)...'
                : 'Wartet...'}
            </span>
          </div>

          {/* Spielfeld (Zentrum) */}
          <div className="flex flex-col items-center justify-center">
            {/* Zug-Hinweis Banner */}
            {!isGameOver && (
              <div className="mb-4 px-6 py-2 rounded-full bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-md text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <Wifi className="h-4 w-4 text-purple-400 animate-pulse" />
                <span>
                  Zug von <strong className="text-purple-300">{currentTurnPlayer?.name || 'Spieler'}</strong> auf Smartphone
                </span>
              </div>
            )}

            {/* Board Component im Anzeigemodus */}
            <div className="pointer-events-none scale-105 sm:scale-115 transform-gpu">
              {BoardComponent ? (
                <BoardComponent
                  gameState={gameState}
                  myPlayer={player1 || ({} as any)}
                  opponent={player2}
                  allPlayers={activePlayers}
                  isMyTurn={false}
                  isGameOver={isGameOver}
                  onMove={() => {}}
                  disabled={true}
                />
              ) : (
                <div className="p-8 text-center text-xs text-[#8E8E93]">Spielfeld aktiv...</div>
              )}
            </div>
          </div>

          {/* Spieler 2 (Rechts) */}
          <div
            className={`flex flex-col items-center p-6 rounded-3xl transition-all ${
              currentTurnPlayer?.id === player2?.id && !isGameOver
                ? 'bg-pink-600/25 ring-2 ring-pink-500 shadow-[0_0_35px_rgba(236,72,153,0.4)] scale-105'
                : 'bg-white/[0.04] ring-1 ring-white/10 opacity-70'
            }`}
          >
            <div className="relative mb-3">
              <Avatar config={player2?.avatar || ({} as any)} size={72} />
              {player2?.symbol && (
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-sm font-black shadow-md ring-2 ring-black">
                  {player2.symbol}
                </span>
              )}
              {player2?.color && (
                <span
                  className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full ring-2 ring-black ${
                    player2.color === 'red' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                  }`}
                />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white truncate max-w-[160px]">
              {player2?.name || 'Spieler 2'}
            </h3>

            <span className="text-xs font-semibold text-pink-300 mt-0.5">
              {currentTurnPlayer?.id === player2?.id && !isGameOver
                ? 'Ist am Zug (Handy)...'
                : 'Wartet...'}
            </span>
          </div>
        </main>

        {/* 3. UNTEN: GEWINNER-OVERLAY ODER STATUS */}
        {isGameOver ? (
          <div className="shrink-0 max-w-md mx-auto w-full p-6 rounded-3xl bg-[#141420]/95 ring-2 ring-purple-500/50 shadow-2xl backdrop-blur-2xl text-center mb-4 animate-fade-in">
            <div className="flex justify-center mb-2">
              {winner && <Trophy className="h-12 w-12 text-amber-400 animate-bounce" />}
              {isDraw && <span className="text-4xl">🤝</span>}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black">
              {winner ? (
                <span className="text-emerald-400">{winner.name} gewinnt das Duell! 🎉</span>
              ) : (
                <span className="text-amber-400">Unentschieden!</span>
              )}
            </h2>

            <p className="mt-2 text-xs text-[#AEAEB2]">
              Revanche kann direkt auf den Smartphones gewählt werden.
            </p>

            <button
              type="button"
              onClick={onLeave}
              className="mt-4 w-full py-3 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/15 ring-1 ring-white/15 transition-all cursor-pointer"
            >
              Zurück zur TV-Lobby
            </button>
          </div>
        ) : (
          <footer className="shrink-0 text-center text-xs font-semibold text-[#8E8E93] pb-2">
            📱 Die Spieler steuern das Spiel mit ihrem Smartphone. Keine Eingaben auf dem TV nötig.
          </footer>
        )}
      </div>
    </div>
  );
}
