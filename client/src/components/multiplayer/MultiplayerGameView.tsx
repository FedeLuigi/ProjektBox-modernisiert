import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { useUserProfile } from '../../utils/userProfile';
import { Avatar } from '../Avatar';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { clientGameRegistry } from '../../games/registry';
import { OpenButton } from '../OpenSubpageUI';
import { ConnectionStatusBadge, HeaderStatusOverlay } from './ConnectionStatusBadge';

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
  const [isConnectionBlocked, setIsConnectionBlocked] = useState(() =>
    socketService.isActionBlocked()
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUser = useUserProfile();
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);
  const opponent = activePlayers.find((p) => p.id !== currentUser.id);
  const isLobbyPaused = lobby.status === 'paused';

  const gameState = lobby.gameState;
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const isStadtLandFluss = lobby.gameId === 'stadt-land-fluss';
  const isRoulette = lobby.gameId === 'roulette';
  const isTexasHoldem = lobby.gameId === 'texas-holdem';
  const isMoneyGame = isRoulette || isTexasHoldem;
  const isSimultaneousParty = isDrawAndGuess || isStadtLandFluss || isRoulette;
  const isMyTurn = isSimultaneousParty
    ? gameState?.status === 'playing'
    : isTexasHoldem
      ? gameState?.status === 'playing' &&
        (gameState.currentTurn === currentUser.id || gameState.phase === 'showdown')
      : gameState?.status === 'playing' && gameState.currentTurn === currentUser.id;

  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);

  useEffect(() => {
    const unsubMeta = socketService.onConnectionMetaChange(() => {
      setIsConnectionBlocked(socketService.isActionBlocked());
    });

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

    const unsubSync = socketService.onStateSync(({ lobby: syncedLobby }) => {
      setLobby(syncedLobby);
      setIsSubmitting(false);
    });

    const unsubDiscon = socketService.onPlayerDisconnected(({ lobby: updatedLobby }) => {
      if (updatedLobby) setLobby((prev) => ({ ...prev, ...updatedLobby }));
    });

    const unsubOffline = socketService.onPlayerOffline(({ playerName, lobby: updatedLobby }) => {
      if (updatedLobby) setLobby((prev) => ({ ...prev, ...updatedLobby }));
      setErrorMsg(`${playerName} ist ausgeschieden (Zeitüberschreitung).`);
    });

    const unsubHost = socketService.onHostChanged(({ newHostName, lobby: updatedLobby }) => {
      if (updatedLobby) setLobby((prev) => ({ ...prev, ...updatedLobby }));
      setErrorMsg(`${newHostName} ist jetzt neuer Host.`);
    });

    return () => {
      unsubMeta();
      unsubState();
      unsubStarted();
      unsubRestart();
      unsubUpdated();
      unsubSync();
      unsubDiscon();
      unsubOffline();
      unsubHost();
    };
  }, []);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleSendMove = async (moveData: any) => {
    const isPokerMetaAction =
      isTexasHoldem && (moveData?.type === 'next_round' || moveData?.type === 'time_up');
    if ((!isMyTurn && !isPokerMetaAction) || isConnectionBlocked || isLobbyPaused) return;
    if (gameState?.status !== 'playing') return;
    const isSilentOrRapid =
      moveData?.type === 'save_draft' ||
      (isRoulette &&
        (moveData?.type === 'place_bet' ||
          moveData?.type === 'remove_bet' ||
          moveData?.type === 'move_bet' ||
          moveData?.type === 'undo_bet' ||
          moveData?.type === 'clear_bets' ||
          moveData?.type === 'rebet' ||
          moveData?.type === 'double_bets'));
    if (!isSilentOrRapid && isSubmitting) return;

    if (!isSilentOrRapid) {
      setIsSubmitting(true);
    }
    try {
      await socketService.sendMove(moveData);
    } catch (err: any) {
      if (moveData?.type !== 'save_draft') {
        setErrorMsg(err.message || 'Ungültiger Zug.');
      }
    } finally {
      if (!isSilentOrRapid) {
        setIsSubmitting(false);
      }
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
    <div className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        className="safe-game-shell relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between"
      >
        {/* 1. OPEN-GALLERY TOP-BAR */}
        <header className="game-landscape-header relative grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
          <div className="justify-self-start">
            <OpenButton size="sm" variant="secondary" onClick={onLeave}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>EXIT</span>
            </OpenButton>
          </div>

          {isDrawAndGuess ? (
            <div className="justify-self-center flex items-center gap-1.5 sm:gap-2.5 rounded-xl border border-white/15 bg-white/[0.06] px-2.5 sm:px-3.5 py-1 backdrop-blur-md shrink-0">
              <Avatar config={currentUser.avatar} size={20} />
              <span className="font-arcade text-xs sm:text-sm text-white whitespace-nowrap">
                {gameState?.scores?.[currentUser.id] || 0} : {gameState?.scores?.[opponent?.id || ''] || 0}
              </span>
              <Avatar config={opponent?.avatar || ({} as any)} size={20} />
            </div>
          ) : isStadtLandFluss ? (
            <div className="justify-self-center flex items-center rounded-xl border border-[#22D3EE]/35 bg-[#0F172A]/70 px-3 py-1 backdrop-blur-md font-arcade text-xs text-white uppercase">
              <span>{gameState?.scores?.[currentUser.id] || 0} PKT</span>
            </div>
          ) : isMoneyGame ? (
            <div className="justify-self-center flex items-center gap-1.5 rounded-xl border border-[#34D399]/40 bg-[#064E3B]/75 px-3 py-1 backdrop-blur-md font-arcade text-xs text-[#A7F3D0] uppercase">
              <span>
                {Math.round(
                  gameState?.scores?.[currentUser.id] ?? gameState?.startingBalance ?? 1000
                ).toLocaleString('de-DE')}{' '}
                €
              </span>
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

          <div className="justify-self-end flex items-center gap-2">
            <div className="hidden sm:block">
              <ConnectionStatusBadge />
            </div>
            <div className="rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1 font-arcade text-xs tracking-widest text-[#FDE68A] uppercase">
              {lobby.code}
            </div>
          </div>

          <HeaderStatusOverlay
            lobby={lobby}
            currentUserId={currentUser.id}
            message={errorMsg}
            showWhenConnected={false}
            onExitExpired={onLeave}
          />
        </header>

        {/* 2. MITTE: OFFENE ERGEBNIS-BÜHNE ODER SPIELFELD */}
        {isGameOver ? (
          <main className="mx-auto flex w-full max-w-lg flex-1 min-h-0 flex-col items-center overflow-y-auto px-2 py-2 sm:py-4">
            <div className="my-auto flex w-full flex-col items-center gap-3 sm:gap-5 text-center animate-fade-in">
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <h2 className="font-arcade text-xl sm:text-4xl tracking-wider text-white uppercase">
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

              {(isStadtLandFluss || isMoneyGame) && (
                <div className="flex w-full flex-col gap-1.5 sm:gap-2 max-h-[30vh] sm:max-h-[38vh] overflow-y-auto">
                  {[...activePlayers]
                    .sort(
                      (a, b) =>
                        (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
                    )
                    .map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2 ${
                          p.id === currentUser.id
                            ? isMoneyGame
                              ? 'border-[#34D399]/55 bg-[#064E3B]/45'
                              : 'border-[#22D3EE]/55 bg-[#164E63]/35'
                            : 'border-white/15 bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-arcade text-xs text-[#FBBF24]">#{idx + 1}</span>
                          <Avatar config={p.avatar} size={24} />
                          <span className="font-arcade text-xs text-white uppercase truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="font-arcade text-sm text-[#FDE68A]">
                          {isMoneyGame
                            ? `${Math.round(gameState?.scores?.[p.id] ?? 0).toLocaleString('de-DE')} €`
                            : `${String(gameState?.scores?.[p.id] ?? 0)} PKT`}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <div className="grid w-full grid-cols-2 gap-2 sm:gap-3">
                <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-3">
                  <span className="font-arcade text-[10px] sm:text-[11px] tracking-wider text-[#94A3B8] uppercase">
                    {isMoneyGame ? 'ENDGUTHABEN' : 'PUNKTE'}
                  </span>
                  <span className="font-arcade mt-0.5 sm:mt-1 text-lg sm:text-2xl text-[#FDE68A]">
                    {isMoneyGame
                      ? `${Math.round(gameState?.scores?.[currentUser.id] ?? 0).toLocaleString('de-DE')} €`
                      : String(gameState?.scores?.[currentUser.id] ?? (isWinner ? 1 : 0))}
                  </span>
                </div>

                <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-3">
                  <span className="font-arcade text-[10px] sm:text-[11px] tracking-wider text-[#94A3B8] uppercase">
                    {isDrawAndGuess && gameState?.secretWord ? 'GESUCHTES WORT' : 'REVANCHE'}
                  </span>
                  <span className="font-arcade mt-0.5 sm:mt-1 text-sm sm:text-xl text-white truncate max-w-full">
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
                  disabled={hasVotedRematch || isConnectionBlocked}
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
          <main className="game-landscape-main mx-auto flex w-full flex-1 min-h-0 flex-col items-center overflow-hidden py-1.5 sm:py-3">
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
                disabled={isSubmitting || isConnectionBlocked || isLobbyPaused}
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
