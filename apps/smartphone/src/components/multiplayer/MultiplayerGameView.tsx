import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, LogOut, Play, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { Lobby } from '@projektbox/shared/types';
import {
  Avatar,
  BackgroundCometCanvas,
  HeaderStatusOverlay,
  OpenButton,
  clientGameRegistry,
  socketService,
  useUserProfile,
} from '@projektbox/ui';

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
  const [isZombieMenuOpen, setIsZombieMenuOpen] = useState(false);

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
  const isZombieSurvival = lobby.gameId === 'zombie-survival';

  const BoardComponent = clientGameRegistry.get(lobby.gameId);

  return (
    <div className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.85} />

      <div
        className={
          isZombieSurvival && !isGameOver
            ? 'relative z-10 flex flex-1 min-h-0 w-full h-full flex-col justify-between'
            : 'safe-game-shell relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between'
        }
      >
        {/* 1. OPEN-GALLERY TOP-BAR (bei Zombie 3D ausgeblendet für echtes Vollbild) */}
        {(!isZombieSurvival || isGameOver) && (
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
          ) : lobby.gameId === 'zombie-survival' ? (
            <div className="justify-self-center flex items-center rounded-xl border border-[#F43F5E]/40 bg-[#0F172A]/70 px-3 py-1 backdrop-blur-md font-arcade text-xs text-[#FDA4AF] uppercase">
              <span>ZOMBIE 3D</span>
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

          <div className="justify-self-end flex min-w-0 items-center justify-end gap-2">
            <HeaderStatusOverlay
              lobby={lobby}
              currentUserId={currentUser.id}
              message={errorMsg}
              showWhenConnected
              connectedClassName="hidden sm:block"
              onExitExpired={onLeave}
            />
            <div className="shrink-0 rounded-lg border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-3 py-1 font-arcade text-xs tracking-widest text-[#FDE68A] uppercase">
              {lobby.code}
            </div>
          </div>
        </header>
        )}

        {/* Schwebender OPTIONEN-Button oben rechts im Vollbild-Zombie-Spiel */}
        {isZombieSurvival && !isGameOver && (
          <>
            <button
              type="button"
              onClick={() => setIsZombieMenuOpen(true)}
              className="fixed top-2.5 right-2.5 left-auto z-40 self-end w-fit inline-flex items-center gap-1.5 border border-white/15 bg-[#070B12]/85 px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-white uppercase backdrop-blur-md active:scale-95"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>OPTIONEN</span>
            </button>

            {isZombieMenuOpen && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Spielmenü"
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/82 p-5 backdrop-blur-md animate-fade-in"
              >
                <div className="flex w-full max-w-xs flex-col gap-4 border border-white/15 border-t-2 border-t-[#EF4444] bg-[#070B12] p-5 text-center shadow-2xl">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.22em] text-[#94A3B8] uppercase">
                      ZOMBIE ARENA 3D • RAUM {lobby.code}
                    </span>
                    <h2 className="font-mono text-lg font-bold tracking-[0.18em] text-white uppercase">
                      SPIELMENÜ
                    </h2>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsZombieMenuOpen(false)}
                      className="inline-flex w-full items-center justify-center gap-2 border border-[#10B981]/60 bg-[#10B981]/20 px-4 py-2.5 font-mono text-xs font-bold tracking-[0.16em] text-[#6EE7B7] uppercase active:scale-95"
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
                      className="inline-flex w-full items-center justify-center gap-2 border border-[#EF4444]/60 bg-[#EF4444]/20 px-4 py-2.5 font-mono text-xs font-bold tracking-[0.16em] text-[#FCA5A5] uppercase active:scale-95"
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
                <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 max-h-[30vh] sm:max-h-[38vh] overflow-y-auto py-2">
                  {[...activePlayers]
                    .sort(
                      (a, b) =>
                        (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
                    )
                    .map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex flex-col items-center gap-2 text-center min-w-0"
                      >
                        <div
                          className={`relative rounded-full ${
                            p.id === currentUser.id
                              ? isMoneyGame
                                ? 'ring-[3px] ring-[#34D399]'
                                : 'ring-[3px] ring-[#22D3EE]'
                              : 'ring-2 ring-white/20'
                          }`}
                        >
                          <Avatar config={p.avatar} size={50} />
                          <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B] font-arcade text-[10px] text-[#0F172A] ring-2 ring-[#1B2B40]">
                            #{idx + 1}
                          </span>
                        </div>
                        <span className="font-arcade w-full truncate text-xs text-white uppercase">
                          {p.name}
                        </span>
                        <span className="font-arcade text-xs sm:text-sm text-[#FDE68A]">
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

              <div className="flex w-full max-w-sm flex-col-reverse sm:flex-row items-center gap-3">
                <OpenButton
                  size="lg"
                  variant="rose"
                  onClick={onLeave}
                  className="w-full sm:flex-1"
                >
                  ZURÜCK ZUM MENÜ
                </OpenButton>
                <OpenButton
                  fullWidth
                  size="lg"
                  variant="primary"
                  disabled={hasVotedRematch || isConnectionBlocked}
                  onClick={handleRematch}
                  className="sm:flex-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{hasVotedRematch ? 'WARTE...' : 'REVANCHE'}</span>
                </OpenButton>
              </div>
            </div>
          </main>
        ) : (
          <main
            className={`game-landscape-main mx-auto flex w-full flex-1 min-h-0 flex-col overflow-hidden ${
              isZombieSurvival ? 'p-0' : 'items-center py-1.5 sm:py-3'
            }`}
          >
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
