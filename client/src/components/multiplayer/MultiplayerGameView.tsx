import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { GAMES } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { useUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry, isSoloGame } from '../../games/registry';
import {
  formatSoloScore,
  getSoloHighscore,
  isLowerBetterGame,
  saveSoloHighscore,
} from '../../utils/soloScores';
import { SoloResultCard } from './SoloResultCard';
import {
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
  CrystalStatBar,
} from '../CrystalUI';
import { getGameWorldStage } from '../../styles/uiTokens';

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
  const gameAccent = GAMES.find((g) => g.id === lobby.gameId)?.accent ?? 'emerald';
  const activePlayers = lobby.isTvMode
    ? lobby.players.filter((p) => !p.isTvScreen)
    : lobby.players;
  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);
  const opponent = activePlayers.find((p) => p.id !== currentUser.id);

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const soloMode = isSoloGame(lobby.gameId) && activePlayers.length <= 1 && !opponent;
  const isMyTurn = isDrawAndGuess || soloMode
    ? (gameState?.status === 'playing')
    : (gameState?.status === 'playing' && gameState.currentTurn === currentUser.id);
  const [soloBestScore, setSoloBestScore] = useState<number | null>(() =>
    getSoloHighscore(lobby.gameId)
  );
  const [isNewSoloRecord, setIsNewSoloRecord] = useState(false);

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
      if (soloMode && newState?.status === 'won') {
        const myFinalScore = newState?.scores?.[currentUser.id] || 0;
        const lowerIsBetter =
          typeof newState?.lastMove?.lowerIsBetter === 'boolean'
            ? newState.lastMove.lowerIsBetter
            : isLowerBetterGame(lobby.gameId);
        const { bestScore, isNewRecord } = saveSoloHighscore(
          lobby.gameId,
          myFinalScore,
          lowerIsBetter
        );
        setSoloBestScore(bestScore);
        setIsNewSoloRecord(isNewRecord);
      }
      setIsSubmitting(false);
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      setIsNewSoloRecord(false);
      setIsSubmitting(false);
    });

    const unsubRestart = socketService.onGameRestarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      setIsNewSoloRecord(false);
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
  const worldStage = getGameWorldStage(lobby.gameId);

  return (
    <div
      className={`fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-gradient-to-br ${worldStage.bgGradient} text-[#1E293B] select-none animate-fade-in`}
    >
      <div
        className={`pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl ${worldStage.glowPrimary}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl ${worldStage.glowSecondary}`}
      />
      <BackgroundCometCanvas opacity={0.45} />

      <div
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between pt-[calc(6px+env(safe-area-inset-top,0px))] pb-[calc(6px+env(safe-area-inset-bottom,0px))] pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] sm:px-4 lg:px-6"
      >
        {/* 1. CRYSTAL TOP-BAR: EXIT links, Spielstatus Mitte, Code rechts */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-1.5">
          <div className="justify-self-start">
            <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onLeave}>
              EXIT
            </CrystalButton>
          </div>

          {isDrawAndGuess ? (
            <div className="justify-self-center flex items-center gap-2 border-[3px] border-[#334155] bg-[#F8FAFC] px-3 py-1 shadow-[inset_0_2px_0_#FFFFFF,0_3px_0_rgba(15,23,42,0.2)]">
              <Avatar config={currentUser.avatar} size={22} />
              <span className="font-arcade text-sm text-[#1E293B]">
                {gameState?.scores?.[currentUser.id] || 0} : {gameState?.scores?.[opponent?.id || ''] || 0}
              </span>
              <Avatar config={opponent?.avatar || ({} as any)} size={22} />
            </div>
          ) : soloMode ? (
            <div className="justify-self-center">
              <CrystalReadout
                value={formatSoloScore(lobby.gameId, gameState?.scores?.[currentUser.id] || 0)}
              />
            </div>
          ) : (
            <div className="justify-self-center">
              <CrystalReadout
                variant={isMyTurn ? 'emerald' : 'neutral'}
                value={isMyTurn ? 'YOUR TURN' : `${opponent?.name || 'OPPONENT'}`}
              />
            </div>
          )}

          <div className="justify-self-end">
            <CrystalStatBar type="coin" value={lobby.code} />
          </div>
        </header>

        {errorMsg && (
          <div className="font-arcade mx-auto my-1 max-w-sm border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-1.5 text-center text-xs text-white uppercase">
            {errorMsg}
          </div>
        )}

        {disconnectedOpponent && (
          <div className="font-arcade mx-auto my-1 flex items-center gap-2 border-2 border-[#92400E] bg-[#FEF3C7] px-3.5 py-2 text-center text-xs text-[#78350F] uppercase animate-pulse">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>WAITING FOR {disconnectedOpponent}...</span>
          </div>
        )}

        {/* 2. MITTE: "LEVEL 16"-ERGEBNIS-PANEL ODER SPIELFELD */}
        {isGameOver ? (
          <main className="my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center overflow-y-auto px-2 pt-7 pb-4">
            {soloMode ? (
              <SoloResultCard
                gameId={lobby.gameId}
                score={gameState?.scores?.[currentUser.id] || 0}
                bestScore={soloBestScore}
                isNewRecord={isNewSoloRecord}
                resultLabel={gameState?.lastMove?.label}
                secondaryLabel="EXIT"
                onPlayAgain={handleRematch}
                onExit={onLeave}
              />
            ) : (
              <div className="my-auto w-full max-w-md animate-fade-in">
                <CrystalPanel
                  title={isWinner ? 'SIEG!' : isDraw ? 'UNENTSCHIEDEN!' : 'SPIEL BEENDET'}
                  accent={isWinner ? 'emerald' : gameAccent}
                  contentClassName="gap-3.5 py-6"
                >
                  <CrystalReadout
                    label="PUNKTE"
                    value={String(gameState?.scores?.[currentUser.id] ?? (isWinner ? 1 : 0))}
                  />
                  <CrystalReadout
                    label={isDrawAndGuess && gameState?.secretWord ? 'GESUCHTES WORT' : 'REVANCHE'}
                    value={
                      isDrawAndGuess && gameState?.secretWord
                        ? gameState.secretWord
                        : `${lobby.rematchVotes.length}/${activePlayers.length} BEREIT`
                    }
                  />

                  <div className="mt-2 flex w-full flex-col items-center gap-2.5 px-2">
                    <CrystalButton
                      fullWidth
                      size="md"
                      variant={gameAccent}
                      tilt="left"
                      disabled={hasVotedRematch}
                      onClick={handleRematch}
                    >
                      {hasVotedRematch ? 'WARTE AUF MITSPIELER...' : 'REVANCHE'}
                    </CrystalButton>
                    <CrystalButton
                      size="md"
                      variant="secondary"
                      tilt="right"
                      onClick={onLeave}
                      className="min-w-[130px]"
                    >
                      ZURÜCK
                    </CrystalButton>
                  </div>
                </CrystalPanel>
              </div>
            )}
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
                isSolo={soloMode}
                onMove={handleSendMove}
                disabled={isSubmitting}
                isTvMode={lobby.isTvMode}
              />
            ) : (
              <CrystalPanel title="LOADING..." accent={gameAccent} contentClassName="py-8">
                <span className="font-arcade text-sm text-[#334155] uppercase">
                  PREPARING BOARD...
                </span>
              </CrystalPanel>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
