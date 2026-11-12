import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Trophy, Tv, Wifi } from 'lucide-react';
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
  const isDrawAndGuess = lobby.gameId === 'draw-and-guess';
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const player1 = activePlayers[0];
  const player2 = activePlayers[1];

  const currentTurnPlayer = activePlayers.find((p) => p.id === gameState?.currentTurn);
  const isGameOver = gameState?.status === 'won' || gameState?.status === 'draw';
  const isRoundOver = gameState?.roundStatus === 'round_over';
  const winner = activePlayers.find((p) => p.id === gameState?.winnerId);
  const isDraw = gameState?.status === 'draw';

  // Live-Countdown für TV-Header
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
    <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col justify-between overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in">
      <BackgroundCometCanvas opacity={0.35} />

      {/* ─── Ambient Glow ─── */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-35 bg-purple-600/30" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-35 bg-pink-600/25" />

      {/* ─── Großbild-Container mit sicherem Abstand zu den Bildschirmrändern ─── */}
      <div
        style={{
          paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
        className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between px-6 sm:px-12 lg:px-16 xl:px-24 2xl:px-32 max-w-[1600px] mx-auto"
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

          {/* Mittiger Wort-Hinweis & Kategorie bei Zeichnen & Raten */}
          {isDrawAndGuess && !isGameOver && (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className="px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 text-xs font-black uppercase tracking-wider">
                {gameState?.categoryName || 'Allgemein'}
              </span>
              {!isRoundOver && (
                <div className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-white">
                  {gameState?.wordHint || '_ _ _ _'}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            {isDrawAndGuess && !isGameOver && !isRoundOver && (
              <>
                <span className="text-xs font-semibold text-[#8E8E93]">
                  Runde {gameState?.round || 1} / {gameState?.maxRounds || 4}
                </span>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-black text-xs sm:text-sm ring-1 ${
                    timeLeft <= 10
                      ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
                      : 'bg-white/10 text-white ring-white/20'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{timeLeft}s</span>
                </div>
              </>
            )}

            <span className="text-xs font-semibold text-[#8E8E93] hidden md:inline">
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

        {/* 2. MITTE: 3-SPALTEN-LAYOUT FÜR ZEICHNEN & RATEN ODER STANDARD-DUELL */}
        {isDrawAndGuess ? (
          <main className="my-auto flex flex-1 items-center justify-between gap-6 lg:gap-10 xl:gap-14 py-2 w-full overflow-visible">
            {/* Linke Spalte: Spieler & Rangliste (Einheitliche Höhe mit rechter Spalte) */}
            <div className="w-64 lg:w-72 shrink-0 flex flex-col h-[52vh] sm:h-[56vh] rounded-3xl bg-white/[0.03] ring-1 ring-white/10 p-4 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#8E8E93] pb-2.5 mb-1 border-b border-white/10 shrink-0">
                <span>SPIELER & PUNKTE</span>
                <span className="font-mono text-purple-400">{activePlayers.length}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-2.5 py-2 pb-4 overscroll-contain scrollbar-none">
                {activePlayers.map((p, idx) => {
                  const isCurrentDrawer = p.id === gameState?.currentDrawerId;
                  const hasGuessed = gameState?.correctGuesserIds?.includes(p.id);
                  const score = gameState?.scores?.[p.id] || 0;
                  return (
                    <div
                      key={p.id || idx}
                      className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                        isCurrentDrawer
                          ? 'bg-amber-500/20 ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                          : 'bg-white/[0.04] ring-1 ring-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar config={p.avatar} size={38} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate max-w-[105px]">{p.name}</div>
                          <div className="text-[10px] font-semibold">
                            {isCurrentDrawer ? (
                              <span className="text-amber-400 font-black">🎨 Zeichnet</span>
                            ) : hasGuessed ? (
                              <span className="text-emerald-400 font-bold">✅ Erraten!</span>
                            ) : (
                              <span className="text-purple-300">🤔 Rät</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-white px-2 py-0.5 rounded-full bg-white/10 shrink-0">
                        {score} Pkt
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mittlere Spalte: TV-Leinwand (Hero) */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto h-[52vh] sm:h-[56vh] min-w-0">
              {/* Status-Pille: Sofort ausblenden, sobald die Runde vorbei ist! */}
              {!isRoundOver && !isGameOver && (
                <div className="mb-2.5 px-4 py-1.5 rounded-full bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2 shrink-0 animate-fade-in">
                  <Wifi className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                  <span>
                    🎨 <strong className="text-amber-400">{currentTurnPlayer?.name || 'Zeichner'}</strong> malt gerade auf dem Smartphone...
                  </span>
                </div>
              )}

              <div className="w-full flex-1 flex items-center justify-center pointer-events-none">
                {BoardComponent ? (
                  <BoardComponent
                    gameState={gameState}
                    myPlayer={{ id: 'tv_screen', name: 'Fernseher', isTvScreen: true } as any}
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

            {/* Rechte Spalte: Live-Tipps Feed (Einheitliche Höhe mit linker Spalte) */}
            <div className="w-64 lg:w-72 shrink-0 flex flex-col h-[52vh] sm:h-[56vh] rounded-3xl bg-white/[0.03] ring-1 ring-white/10 p-4 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#8E8E93] pb-2.5 mb-1 border-b border-white/10 shrink-0">
                <span>WAS ERRATEN WURDE</span>
                <span className="font-mono text-purple-400">{gameState?.guesses?.length || 0} Tipps</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-2.5 py-2 pb-4 overscroll-contain scrollbar-none">
                {gameState?.guesses && gameState.guesses.length > 0 ? (
                  gameState.guesses.map((g: any) => (
                    <div
                      key={g.id}
                      className={`text-xs p-2.5 rounded-xl flex items-center justify-between animate-fade-in ${
                        g.isCorrect
                          ? 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/40 font-black'
                          : 'bg-white/[0.04] text-[#AEAEB2] ring-1 ring-white/5'
                      }`}
                    >
                      <span className="truncate pr-1">
                        <strong>{g.playerName}:</strong> &quot;{g.text}&quot;
                      </span>
                      <span className="shrink-0">{g.isCorrect ? '✅' : '❌'}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-4 rounded-2xl border-2 border-dashed border-white/10 text-xs text-[#636366] italic">
                    Noch keine Tipps abgegeben. Die Spieler raten auf ihren Handys...
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : (
          /* Standard Duell-Layout (Tic-Tac-Toe, 4 Gewinnt) */
          <main className="my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-12 xl:gap-16 py-4 w-full">
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
              {!isGameOver && (
                <div className="mb-4 px-6 py-2 rounded-full bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-md text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-purple-400 animate-pulse" />
                  <span>
                    Zug von <strong className="text-purple-300">{currentTurnPlayer?.name || 'Spieler'}</strong> auf Smartphone
                  </span>
                </div>
              )}

              <div className="pointer-events-none scale-105 sm:scale-115 transform-gpu">
                {BoardComponent ? (
                  <BoardComponent
                    gameState={gameState}
                    myPlayer={{ id: 'tv_screen', name: 'Fernseher', isTvScreen: true } as any}
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
        )}

        {/* 3. UNTEN: HINWEIS-LEISTE */}
        <footer className="shrink-0 text-center text-xs font-semibold text-[#8E8E93] pb-2">
          📱 Die Spieler steuern das Spiel mit ihrem Smartphone. Keine Eingaben auf dem TV nötig.
        </footer>

        {/* 4. GEWINNER-MODAL / ERGEBNISFENSTER (ALS MODALER OVERLAY, VERDECKT NICHT DAS LAUFENDE SPIEL) */}
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full p-8 rounded-3xl bg-[#141420]/98 ring-2 ring-purple-500/50 shadow-2xl text-center">
              <div className="flex justify-center mb-3">
                {winner && <Trophy className="h-16 w-16 text-amber-400 animate-bounce" />}
                {isDraw && <span className="text-5xl">🤝</span>}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {winner ? (
                  <span className="text-emerald-400">{winner.name} gewinnt! 🎉</span>
                ) : (
                  <span className="text-amber-400">Unentschieden!</span>
                )}
              </h2>

              {/* Endstand / Punkteliste */}
              <div className="mt-4 flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 text-xs">
                <span className="font-bold text-[#8E8E93] uppercase text-[10px] tracking-wider">Endstand</span>
                {activePlayers
                  .slice()
                  .sort((a, b) => (gameState?.scores?.[b.id] || 0) - (gameState?.scores?.[a.id] || 0))
                  .map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-purple-400">#{idx + 1}</span>
                        <span className="font-bold text-white">{p.name}</span>
                      </div>
                      <span className="font-mono font-black text-amber-400">{gameState?.scores?.[p.id] || 0} Pkt</span>
                    </div>
                  ))}
              </div>

              <p className="mt-4 text-xs text-[#AEAEB2]">
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
          </div>
        )}
      </div>
    </div>
  );
}
