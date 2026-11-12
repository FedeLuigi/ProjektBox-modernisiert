import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
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
  gameTitle: _gameTitle,
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
    <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in">
      {/* ─── Dynamischer Hintergrund ─── */}
      <BackgroundCometCanvas opacity={0.35} />

      {/* ─── Ambient Glow ─── */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-purple-600/30" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-40 bg-pink-600/25" />

      {/* ─── Vollbild-Container mit Safe-Area ─── */}
      <div
        style={{
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between px-3 sm:px-6"
      >
        {/* 1. EINZIGE SCHMALE TOP-BAR: Verlassen links, Score/Zug-Status exakt mittig, Raum-Code rechts */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1.5 landscape:pb-1">
          <button
            type="button"
            onClick={onLeave}
            className="justify-self-start inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-3 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Verlassen</span>
          </button>

          {isDrawAndGuess ? (
            <div className="justify-self-center flex items-center gap-2 rounded-full bg-white/[0.06] px-2.5 py-1 ring-1 ring-white/10 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar config={currentUser.avatar} size={22} />
                <span className="hidden sm:inline font-bold text-white truncate max-w-[80px]">
                  {currentUser.name}
                </span>
                <span className="font-black text-purple-300 tabular-nums">
                  {gameState?.scores?.[currentUser.id] || 0}
                </span>
              </div>
              <span className="text-white/30 font-bold">:</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-black text-pink-300 tabular-nums">
                  {gameState?.scores?.[opponent?.id || ''] || 0}
                </span>
                <span className="hidden sm:inline font-bold text-white truncate max-w-[80px]">
                  {opponent?.name || 'Gegner'}
                </span>
                <Avatar config={opponent?.avatar || ({} as any)} size={22} />
              </div>
            </div>
          ) : (
            <div
              className={`justify-self-center inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 text-xs font-bold transition-colors ${
                isMyTurn
                  ? 'bg-purple-500/20 text-purple-200 ring-purple-400/40'
                  : 'bg-white/[0.06] text-white/75 ring-white/10'
              }`}
            >
              <Avatar
                config={(isMyTurn ? currentUser.avatar : opponent?.avatar) || ({} as any)}
                size={20}
              />
              <span className="truncate max-w-[160px]">
                {isMyTurn ? 'Du bist dran' : `${opponent?.name || 'Gegner'} ist dran`}
              </span>
            </div>
          )}

          <span className="justify-self-end inline-flex h-8 sm:h-9 items-center rounded-full bg-white/[0.06] px-2.5 text-[11px] font-mono font-bold tracking-widest text-white/65 ring-1 ring-white/10">
            {lobby.code}
          </span>
        </header>

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
        <main
          className={`my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center ${
            lobby.gameId === 'draw-and-guess' ? 'max-w-2xl p-1.5 sm:p-2' : 'max-w-md p-3'
          }`}
        >
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
              isTvMode={lobby.isTvMode}
            />
          ) : (
            <div className="text-center p-8 rounded-2xl bg-white/5 ring-1 ring-white/10 text-xs text-[#8E8E93]">
              Spielfeld wird initialisiert...
            </div>
          )}
        </main>

        {/* 4. GAME OVER OVERLAY */}
        {isGameOver && (
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
        )}
      </div>
    </div>
  );
}
