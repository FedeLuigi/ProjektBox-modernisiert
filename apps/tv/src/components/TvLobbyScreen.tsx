import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Crown, Loader2, LogOut, RefreshCw, Smartphone, Tv } from 'lucide-react';
import type { Lobby } from '@projektbox/shared/types';
import {
  Avatar,
  BackgroundCometCanvas,
  ConnectionStatusBadge,
  HeaderStatusOverlay,
  LobbyGameSettings,
  OpenButton,
  getLobbyJoinUrl,
  renderQrCodeToCanvas,
  socketService,
  useUserProfile,
  type Game,
} from '@projektbox/ui';
import { TvGameView } from './TvGameView';

interface TvLobbyScreenProps {
  game: Game;
  initialLobby?: Lobby | null;
  onLobbyChange?: (lobby: Lobby | null) => void;
  onMinimize?: (lobby: Lobby | null) => void;
  onClose: () => void;
}

export function TvLobbyScreen({
  game,
  initialLobby,
  onLobbyChange,
  onMinimize,
  onClose,
}: TvLobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(
    Boolean(initialLobby?.status === 'in_progress' || initialLobby?.status === 'paused')
  );
  const [isCreating, setIsCreating] = useState(!initialLobby);
  const [isStarting, setIsStarting] = useState(false);
  const [isConnectionBlocked, setIsConnectionBlocked] = useState(() =>
    socketService.isActionBlocked()
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasAutoCreatedRef = useRef(false);
  const currentUser = useUserProfile();

  const createTvLobby = useCallback(async () => {
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const created = await socketService.createLobby(
        `${game.title} TV`,
        true,
        game.id,
        true
      );
      setCurrentLobby(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'TV-Lobby konnte nicht erstellt werden.');
    } finally {
      setIsCreating(false);
    }
  }, [game.id, game.title]);

  useEffect(() => {
    if (initialLobby) {
      setCurrentLobby(initialLobby);
      setIsCreating(false);
      if (initialLobby.status === 'in_progress' || initialLobby.status === 'paused') {
        setIsInGame(true);
      }
    }
  }, [initialLobby]);

  useEffect(() => {
    if (initialLobby || hasAutoCreatedRef.current) return;
    hasAutoCreatedRef.current = true;
    void createTvLobby();
  }, [createTvLobby, initialLobby]);

  useEffect(() => {
    onLobbyChange?.(currentLobby);
  }, [currentLobby, onLobbyChange]);

  useEffect(() => {
    const unsubMeta = socketService.onConnectionMetaChange(() => {
      setIsConnectionBlocked(socketService.isActionBlocked());
    });
    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setCurrentLobby(updatedLobby);
      setIsInGame(true);
    });
    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby, message }) => {
      setCurrentLobby((prev) => (prev ? { ...prev, ...updatedLobby } : updatedLobby));
      if (updatedLobby.status === 'in_progress' || updatedLobby.status === 'paused') {
        setIsInGame(true);
      }
      if (message) setErrorMsg(message);
    });
    const unsubSync = socketService.onStateSync(({ lobby: syncedLobby }) => {
      setCurrentLobby(syncedLobby);
      if (syncedLobby.status === 'in_progress' || syncedLobby.status === 'paused') {
        setIsInGame(true);
      }
    });
    const unsubDiscon = socketService.onPlayerDisconnected(({ playerName }) => {
      setErrorMsg(`${playerName} hat die Verbindung verloren.`);
    });
    const unsubOffline = socketService.onPlayerOffline(({ playerName }) => {
      setErrorMsg(`${playerName} ist ausgeschieden.`);
    });
    const unsubExpired = socketService.onLobbyExpired(() => {
      setErrorMsg('Dieser TV-Raum ist abgelaufen.');
    });

    return () => {
      unsubMeta();
      unsubStarted();
      unsubUpdated();
      unsubSync();
      unsubDiscon();
      unsubOffline();
      unsubExpired();
    };
  }, []);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const joinUrl = currentLobby ? getLobbyJoinUrl(currentLobby.code) : '';

  useEffect(() => {
    if (qrCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrCanvasRef.current, joinUrl, 520).catch(console.error);
    }
  }, [joinUrl, currentLobby?.code]);

  const handleLeaveLobby = async () => {
    if (currentLobby) {
      await socketService.leaveLobby();
    }
    setCurrentLobby(null);
    onLobbyChange?.(null);
    onClose();
  };

  const handleBack = () => {
    if (onMinimize && currentLobby) {
      onMinimize(currentLobby);
      return;
    }
    void handleLeaveLobby();
  };

  const handleUpdateSettings = async (newSettings: Record<string, any>) => {
    try {
      await socketService.updateLobbySettings(newSettings);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleStartGame = async () => {
    if (!currentLobby || isStarting) return;
    setIsStarting(true);
    try {
      await socketService.startLobby();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsStarting(false);
    }
  };

  if (isInGame && currentLobby) {
    return (
      <TvGameView
        lobby={currentLobby}
        gameTitle={game.title}
        onLeave={handleLeaveLobby}
      />
    );
  }

  const activePlayers = currentLobby
    ? currentLobby.players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline')
    : [];
  const minPlayers = currentLobby?.minPlayers ?? game.minPlayers;
  const maxPlayers = currentLobby?.maxPlayers ?? game.maxPlayers;
  const readyCount = activePlayers.filter((p) => p.isReady).length;
  const allReady =
    Boolean(currentLobby) &&
    activePlayers.length >= minPlayers &&
    activePlayers.length <= maxPlayers &&
    activePlayers.every((p) => p.isReady);

  return (
    <div
      data-tv-scope="modal"
      className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="safe-screen relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1600px] flex-col justify-between px-6 lg:px-10 py-4">
        {/* Kopfzeile */}
        <header className="relative flex w-full items-center justify-between gap-4 border-b border-white/15 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="font-arcade inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-4 text-sm tracking-wider text-white uppercase hover:bg-white/15 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>ZURÜCK</span>
            </button>

            {currentLobby && (
              <button
                type="button"
                onClick={() => void handleLeaveLobby()}
                className="font-arcade inline-flex h-11 items-center gap-2 rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-4 text-sm tracking-wider text-[#FECDD3] uppercase hover:bg-[#E11D48]/35 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>RAUM SCHLIESSEN</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Tv className="h-5 w-5 text-[#FBBF24]" />
            <span className="font-arcade text-lg lg:text-2xl tracking-wider text-white uppercase">
              {game.title}
            </span>
          </div>

          <HeaderStatusOverlay
            lobby={currentLobby}
            currentUserId={currentUser.id}
            message={errorMsg}
            showWhenConnected={false}
            onExitExpired={() => void handleLeaveLobby()}
          />

          <ConnectionStatusBadge />
        </header>

        {/* Hauptbühne */}
        <main className="flex flex-1 min-h-0 w-full flex-col items-center justify-center py-6 overflow-y-auto">
          {!currentLobby ? (
            <div className="flex flex-col items-center gap-4 text-center">
              {isCreating ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-[#FBBF24]" />
                  <span className="font-arcade text-lg tracking-wider text-[#CBD5E1] uppercase">
                    TV-RAUM WIRD ERSTELLT...
                  </span>
                </>
              ) : (
                <>
                  <span className="font-arcade text-lg tracking-wider text-[#FECDD3] uppercase">
                    TV-RAUM KONNTE NICHT ERSTELLT WERDEN
                  </span>
                  <OpenButton
                    size="lg"
                    variant="outline-amber"
                    data-tv-autofocus="true"
                    onClick={() => void createTvLobby()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>ERNEUT VERSUCHEN</span>
                  </OpenButton>
                </>
              )}
            </div>
          ) : (
            <div className="grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 items-center gap-8 lg:gap-12">
              {/* Links: QR-Code zur Smartphone-App + Raumcode */}
              <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/15 bg-[#0F172A]/65 p-6 lg:p-8 text-center backdrop-blur-xl">
                <div className="inline-flex items-center gap-2 font-arcade text-sm lg:text-base tracking-wider text-[#BAE6FD] uppercase">
                  <Smartphone className="h-5 w-5 text-[#38BDF8]" />
                  <span>MIT SMARTPHONE BEITRETEN</span>
                </div>

                <div className="rounded-3xl border-2 border-white/25 bg-white p-4 shadow-[0_22px_50px_rgba(0,0,0,0.5)]">
                  <canvas ref={qrCanvasRef} className="h-60 w-60 lg:h-72 lg:w-72 block" />
                </div>

                <div className="flex flex-col items-center gap-2">
                  <span className="font-arcade text-xs tracking-widest text-[#94A3B8] uppercase">
                    RAUM-CODE
                  </span>
                  <span className="font-arcade rounded-2xl border-2 border-[#F59E0B]/70 bg-[#F59E0B]/15 px-7 py-2 text-3xl lg:text-4xl tracking-[0.28em] pl-[calc(1.75rem+0.28em)] text-[#FDE68A] uppercase">
                    {currentLobby.code}
                  </span>
                </div>
              </div>

              {/* Rechts: Spiel-Optionen, Spielerliste & Start-Button */}
              <div className="flex flex-col gap-5">
                <LobbyGameSettings
                  gameId={game.id}
                  settings={currentLobby.settings}
                  isHost={true}
                  onUpdate={(s) => void handleUpdateSettings(s)}
                />

                <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/65 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-arcade text-sm text-[#CBD5E1] uppercase">
                      VERBUNDENE SPIELER ({activePlayers.length}/{maxPlayers})
                    </span>
                    <span className="font-arcade text-sm text-[#34D399] uppercase">
                      {readyCount}/{Math.max(minPlayers, activePlayers.length)} BEREIT
                    </span>
                  </div>

                  {activePlayers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/15 py-8 text-center font-arcade text-sm text-[#94A3B8] uppercase">
                      SCANNEN &amp; CODE EINGEBEN UM BEIZUTRETEN...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto no-scrollbar">
                      {activePlayers.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                            p.isReady
                              ? 'border-[#34D399]/55 bg-[#10B981]/15'
                              : 'border-white/15 bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar config={p.avatar} size={34} />
                            <div className="min-w-0">
                              <span className="font-arcade block text-sm text-white uppercase truncate">
                                {p.name}
                              </span>
                              {p.isHost && (
                                <span className="font-arcade inline-flex items-center gap-1 text-[10px] text-[#FDE68A] uppercase">
                                  <Crown className="h-3 w-3" />
                                  HOST
                                </span>
                              )}
                            </div>
                          </div>
                          {p.isReady ? (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                              WARTET
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <OpenButton
                  fullWidth
                  size="lg"
                  variant="primary"
                  data-tv-autofocus="true"
                  disabled={!allReady || isStarting || isConnectionBlocked}
                  onClick={() => void handleStartGame()}
                  className="h-14 text-base lg:text-lg"
                >
                  {activePlayers.length < minPlayers
                    ? `WARTE AUF SPIELER (${activePlayers.length}/${minPlayers})`
                    : !allReady
                      ? `WARTE AUF BEREIT (${readyCount}/${activePlayers.length})`
                      : 'SPIEL AUF TV STARTEN'}
                </OpenButton>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
