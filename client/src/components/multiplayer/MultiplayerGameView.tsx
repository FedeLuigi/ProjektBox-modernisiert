import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, RotateCcw, WifiOff } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { useUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import { OpenButton } from '../OpenSubpageUI';

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

  const currentUser = useUserProfile();
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);
  const opponent = activePlayers.find((p) => p.id !== currentUser.id);

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const isMyTurn = isDrawAndGuess
    ? gameState?.status === 'playing'
    : gameState?.status === 'playing' && gameState.currentTurn === currentUser.id;

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

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

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
  const isDraw = gameState?.status === 'draw';

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        className="relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between pt-[calc(8px+env(safe-area-inset-top,0px))] pb-[calc(8px+env(safe-area-inset-bottom,0px))] px-4 sm:px-6 lg:px-8"
      >
        {/* 1. OPEN-GALLERY TOP-BAR */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/15 pb-2">
          <div className="justify-self-start">
            <OpenButton size="sm" variant="secondary" onClick={onLeave}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>EXIT</span>
            </OpenButton>
          </div>

          {isDrawAndGuess ? (
            <div className="justify-self-center flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-1 backdrop-blur-md">
              <Avatar config={currentUser.avatar} size={22} />
              <span className="font-arcade text-sm text-white">
                {gameState?.scores?.[currentUser.id] || 0} : {gameState?.scores?.[opponent?.id || ''] || 0}
              </span>
              <Avatar config={opponent?.avatar || ({} as any)} size={22} />
            </div>
          ) : (
            <div
              className={`justify-self-center rounded-lg border px-3 py-1 font-arcade text-xs tracking-wider uppercase ${
                isMyTurn
                  ? 'border-[#34D399]/50 bg-[#10B981]/20 text-[#6EE7B7]'
                  : 'border-white/15 bg-white/[0.05] text-[#CBD5E1]'
              }`}
            >
              {isMyTurn ? 'DEIN ZUG' : `${opponent?.name || 'MITSPIELER'}`}
            </div>
          )}

          <div className="justify-self-end rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1 font-arcade text-xs tracking-widest text-[#FDE68A] uppercase">
            {lobby.code}
          </div>
        </header>

        {errorMsg && (
          <div className="font-arcade mx-auto my-1 max-w-sm rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-1.5 text-center text-xs text-[#FECDD3] uppercase">
            {errorMsg}
          </div>
        )}

        {disconnectedOpponent && (
          <div className="font-arcade mx-auto my-1 flex items-center gap-2 rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3.5 py-2 text-center text-xs text-[#FDE68A] uppercase animate-pulse">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>WARTE AUF {disconnectedOpponent}...</span>
          </div>
        )}

        {/* 2. MITTE: OFFENE ERGEBNIS-BÜHNE ODER SPIELFELD */}
        {isGameOver ? (
          <main className="my-auto mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-2 py-4">
            <div className="my-auto flex w-full flex-col items-center gap-6 text-center animate-fade-in">
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <h2 className="font-arcade text-2xl sm:text-4xl tracking-wider text-white uppercase">
                  {isWinner ? (
                    <>
                      SIEG<span className="text-[#34D399]">!</span>
                    </>
                  ) : isDraw ? (
                    'UNENTSCHIEDEN!'
                  ) : (
                    'SPIEL BEENDET'
                  )}
                </h2>
              </div>

              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3">
                  <span className="font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
                    PUNKTE
                  </span>
                  <span className="font-arcade mt-1 text-2xl text-[#FDE68A]">
                    {String(gameState?.scores?.[currentUser.id] ?? (isWinner ? 1 : 0))}
                  </span>
                </div>

                <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3">
                  <span className="font-arcade text-[11px] tracking-wider text-[#94A3B8] uppercase">
                    {isDrawAndGuess && gameState?.secretWord ? 'GESUCHTES WORT' : 'REVANCHE'}
                  </span>
                  <span className="font-arcade mt-1 text-lg sm:text-xl text-white truncate max-w-full">
                    {isDrawAndGuess && gameState?.secretWord
                      ? gameState.secretWord
                      : `${lobby.rematchVotes.length}/${activePlayers.length} BEREIT`}
                  </span>
                </div>
              </div>

              <div className="flex w-full max-w-sm flex-col sm:flex-row items-center gap-3">
                <OpenButton
                  fullWidth
                  size="lg"
                  variant="primary"
                  disabled={hasVotedRematch}
                  onClick={handleRematch}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{hasVotedRematch ? 'WARTE...' : 'REVANCHE'}</span>
                </OpenButton>
                <OpenButton
                  size="lg"
                  variant="secondary"
                  onClick={onLeave}
                  className="w-full sm:w-auto sm:min-w-[130px]"
                >
                  ZURÜCK
                </OpenButton>
              </div>
            </div>
          </main>
        ) : (
          <main className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col items-center justify-center overflow-hidden p-1 sm:p-2">
            {BoardComponent && myPlayer ? (
              <BoardComponent
                gameId={lobby.gameId}
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
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-7 w-7 animate-spin text-[#FBBF24]" />
                <span className="font-arcade text-sm text-[#CBD5E1] uppercase">
                  SPIELFELD WIRD GELADEN...
                </span>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
