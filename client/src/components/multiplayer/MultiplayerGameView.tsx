import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Users,
  WifiOff,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  BTN_SECONDARY_BASE,
  BTN_SECONDARY_NEUTRAL,
} from '../../styles/uiTokens';

interface MultiplayerGameViewProps {
  lobby: Lobby;
  gameTitle?: string;
  onLeave: () => void;
}

export function MultiplayerGameView({
  lobby: initialLobby,
  gameTitle,
  onLeave,
}: MultiplayerGameViewProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [disconnectedOpponent, setDisconnectedOpponent] = useState<string | null>(null);

  const currentUser = getUserProfile();
  const activePlayers = lobby.isTvMode
    ? lobby.players.filter((p) => !p.isTvScreen)
    : lobby.players;
  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);
  const opponent = activePlayers.find((p) => p.id !== currentUser.id);

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const isMyTurn = isDrawAndGuess
    ? (gameState?.status === 'playing')
    : (gameState?.status === 'playing' && gameState.currentTurn === currentUser.id);

  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);

  // Socket Events für Live-Spielzug-Updates
  useEffect(() => {
    const unsubState = socketService.onGameState(({ gameState: newState, status, lobby: updatedLobby }) => {
      setLobby((prev) => ({
        ...prev,
        ...updatedLobby,
        gameState: newState,
        status: status as any,
      }));
      setIsSubmitting(false);
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      setIsSubmitting(false);
    });

    const unsubRestart = socketService.onGameRestarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      setIsSubmitting(false);
      setErrorMsg(null);
    });

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby }) => {
      setLobby((prev) => ({ ...prev, ...updatedLobby }));
    });

    const unsubDiscon = socketService.onPlayerDisconnected(({ playerName }) => {
      setDisconnectedOpponent(playerName);
    });

    return () => {
      unsubState();
      unsubStarted();
      unsubRestart();
      unsubUpdated();
      unsubDiscon();
    };
  }, []);

  // Fehler nach 3 Sekunden ausblenden
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Zentraler generischer Spielzug-Handler (für alle Spiele)
  const handleSendMove = async (moveData: any) => {
    if (!isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await socketService.sendMove(moveData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ungültiger Zug.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRematch = async () => {
    try {
      await socketService.requestRematch();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const hasVotedRematch = lobby.rematchVotes.includes(currentUser.id);

  const isGameOver = gameState?.status === 'won' || gameState?.status === 'draw';
  const isWinner = gameState?.status === 'won' && gameState.winnerId === currentUser.id;
  const isLoser = gameState?.status === 'won' && gameState.winnerId !== currentUser.id;
  const isDraw = gameState?.status === 'draw';

  // Dynamischer Game-Board Renderer aus der zentralen Registry
  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#07070C] text-white select-none animate-fade-in"
    >
      {/* ─── Dynamischer Hintergrund ─── */}
      <BackgroundCometCanvas opacity={0.35} />

      {/* ─── Ambient Glow ─── */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-purple-600/30" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-pink-600/25" />

      {/* ─── Vollbild-Container mit Safe-Area ─── */}
      <div
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        className="relative z-10 flex h-full w-full flex-col justify-between px-4 sm:px-6"
      >
        {/* 1. KOPFZEILE: Aufgeben/Verlassen, Spielname & Raumcode */}
        <header className="flex shrink-0 items-center justify-between pb-2">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Verlassen</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-400">
              {gameTitle || lobby.name}
            </span>
            <span className="text-[10px] font-semibold text-[#8E8E93]">
              Code: <strong className="text-white tracking-widest">{lobby.code}</strong>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-bold text-white/80 ring-1 ring-white/10">
            <Users className="h-3 w-3 text-purple-400" />
            <span>
              {activePlayers.length}/{lobby.maxPlayers}
            </span>
          </div>
        </header>

        {/* 2. SPIELER-HUD (KOMPAKT FÜR ZEICHNEN & RATEN, STANDARD FÜR DUELLE) */}
        {lobby.gameId === 'draw-and-guess' ? (
          <section className="shrink-0 flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 max-w-lg mx-auto w-full my-1 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar config={currentUser.avatar} size={28} />
              <span className="font-bold text-white truncate max-w-[100px]">{currentUser.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-black shrink-0">
                {gameState?.scores?.[currentUser.id] || 0} Pkt
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-black shrink-0">
                {gameState?.scores?.[opponent?.id || ''] || 0} Pkt
              </span>
              <span className="font-bold text-white truncate max-w-[100px]">{opponent?.name || 'Gegner'}</span>
              <Avatar config={opponent?.avatar || ({} as any)} size={28} />
            </div>
          </section>
        ) : (
          <section className="shrink-0 grid grid-cols-2 gap-3 max-w-lg mx-auto w-full my-2">
            {/* Dein Profil */}
            <div
              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all ${
                isMyTurn
                  ? 'bg-purple-600/25 ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.02]'
                  : 'bg-white/[0.05] ring-1 ring-white/10 opacity-75'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar config={currentUser.avatar} size={42} />
                {myPlayer?.symbol && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-black shadow-sm ring-2 ring-black">
                    {myPlayer.symbol}
                  </span>
                )}
                {myPlayer?.color && (
                  <span
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-black ${
                      myPlayer.color === 'red'
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-bold truncate">
                  <span className="truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-purple-400 shrink-0">(Du)</span>
                </div>
                <div className="text-[11px] font-semibold text-[#8E8E93]">
                  {isMyTurn ? (
                    <span className="text-purple-300 font-bold animate-pulse">Dein Zug!</span>
                  ) : (
                    'Wartet...'
                  )}
                </div>
              </div>
            </div>

            {/* Gegner Profil */}
            <div
              className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all ${
                !isMyTurn && gameState?.status === 'playing'
                  ? 'bg-pink-600/25 ring-2 ring-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.35)] scale-[1.02]'
                  : 'bg-white/[0.05] ring-1 ring-white/10 opacity-75'
              }`}
            >
              <div className="relative shrink-0">
                <Avatar config={opponent?.avatar || ({} as any)} size={42} />
                {opponent?.symbol && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-[11px] font-black shadow-sm ring-2 ring-black">
                    {opponent.symbol}
                  </span>
                )}
                {opponent?.color && (
                  <span
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-black ${
                      opponent.color === 'red'
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{opponent?.name || 'Gegner'}</div>
                <div className="text-[11px] font-semibold text-[#8E8E93]">
                  {!isMyTurn && gameState?.status === 'playing' ? (
                    <span className="text-pink-300 font-bold animate-pulse">Denkt nach...</span>
                  ) : (
                    'Wartet...'
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Fehler-Banner ─── */}
        {errorMsg && (
          <div className="mx-auto my-1 max-w-sm rounded-xl bg-rose-500/20 px-3 py-1.5 text-center text-xs font-bold text-rose-300 ring-1 ring-rose-500/30">
            {errorMsg}
          </div>
        )}

        {/* ─── Gegner getrennt Banner ─── */}
        {disconnectedOpponent && (
          <div className="mx-auto my-1 flex items-center gap-2 rounded-xl bg-amber-500/20 px-3.5 py-2 text-center text-xs font-bold text-amber-300 ring-1 ring-amber-500/30 animate-pulse">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Verbindung zu {disconnectedOpponent} unterbrochen. Warte auf Wiederverbindung...</span>
          </div>
        )}

        {/* 3. MITTE: DYNAMISCHES SPIELFELD AUS DER REGISTRY */}
        <main className="my-auto mx-auto flex w-full max-w-md flex-1 items-center justify-center p-2">
          {BoardComponent && myPlayer ? (
            <BoardComponent
              gameState={gameState}
              myPlayer={myPlayer}
              opponent={opponent}
              allPlayers={activePlayers}
              isMyTurn={isMyTurn}
              isGameOver={isGameOver}
              onMove={handleSendMove}
              disabled={isSubmitting}
            />
          ) : (
            <div className="text-center p-8 rounded-2xl bg-white/5 ring-1 ring-white/10 text-xs text-[#8E8E93]">
              Spielfeld wird initialisiert...
            </div>
          )}
        </main>

        {/* 4. UNTERER STATUS / GAME OVER OVERLAY */}
        {isGameOver ? (
          <div className="shrink-0 max-w-sm mx-auto w-full p-4 rounded-3xl bg-[#181824]/95 ring-2 ring-purple-500/40 shadow-2xl backdrop-blur-2xl text-center mb-2 animate-fade-in">
            <div className="flex justify-center mb-2">
              {isWinner && <Trophy className="h-10 w-10 text-amber-400 animate-bounce" />}
              {isLoser && <span className="text-3xl">😔</span>}
              {isDraw && <span className="text-3xl">🤝</span>}
            </div>

            <h2 className="text-xl sm:text-2xl font-black">
              {isWinner && <span className="text-emerald-400">Du hast gewonnen! 🎉</span>}
              {isLoser && <span className="text-rose-400">{opponent?.name || 'Gegner'} gewinnt!</span>}
              {isDraw && <span className="text-amber-400">Unentschieden!</span>}
            </h2>

            <p className="mt-1 text-xs text-[#8E8E93]">
              {lobby.rematchVotes.length > 0
                ? `${lobby.rematchVotes.length}/${activePlayers.length} Spieler möchten Revanche`
                : 'Bereit für eine Revanche?'}
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRematch}
                disabled={hasVotedRematch}
                className={`${BTN_PRIMARY_BASE} ${
                  hasVotedRematch ? BTN_PRIMARY_DISABLED : BTN_PRIMARY_ENABLED
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>{hasVotedRematch ? 'Warte auf Gegner...' : 'Nochmal spielen (Revanche)'}</span>
              </button>

              <button
                type="button"
                onClick={onLeave}
                className={`${BTN_SECONDARY_BASE} ${BTN_SECONDARY_NEUTRAL}`}
              >
                Zurück zur Lobby
              </button>
            </div>
          </div>
        ) : lobby.gameId === 'draw-and-guess' ? null : (
          <footer className="shrink-0 text-center text-xs font-medium text-[#8E8E93] py-2">
            {isMyTurn ? (
              <span className="text-purple-400 font-bold">Du bist am Zug!</span>
            ) : (
              <span>Warte auf {opponent?.name || 'Gegner'}...</span>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
