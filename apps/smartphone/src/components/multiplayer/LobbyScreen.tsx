import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
  LogOut,
  RefreshCw,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import type { Lobby } from '@projektbox/shared/types';
import {
  AvatarCustomizerModal,
  BackgroundCometCanvas,
  GAMES,
  HeaderStatusOverlay,
  LobbyOptionsModal,
  LobbyPlayersGrid,
  OpenButton,
  generateSimpleLobbyName,
  getLobbyJoinUrl,
  renderQrCodeToCanvas,
  saveUserProfile,
  socketService,
  useUserProfile,
  type Game,
} from '@projektbox/ui';
import { MultiplayerGameView } from './MultiplayerGameView';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  onMinimize?: (lobby: Lobby | null) => void;
  onLobbyChange?: (lobby: Lobby | null) => void;
  initialLobby?: Lobby | null;
  initialTvMode?: boolean;
}

export function LobbyScreen({
  game,
  onClose,
  onMinimize,
  onLobbyChange,
  initialLobby,
}: LobbyScreenProps) {
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

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasAutoCreatedRef = useRef(false);

  const currentUser = useUserProfile();
  const gameId = game.id;
  const activeGame =
    (currentLobby?.gameId && GAMES.find((g) => g.id === currentLobby.gameId)) || game;

  const createFreshLobby = useCallback(
    async () => {
      setIsCreating(true);
      setErrorMsg(null);
      try {
        const created = await socketService.createLobby(
          generateSimpleLobbyName(false),
          true,
          gameId,
          false
        );
        setCurrentLobby(created);
      } catch (err: any) {
        setErrorMsg(err.message || 'Lobby konnte nicht erstellt werden.');
      } finally {
        setIsCreating(false);
      }
    },
    [gameId]
  );

  // Synchronisiere initialLobby, falls über Deep-Link oder Session-Wiederherstellung geladen
  useEffect(() => {
    if (initialLobby) {
      setCurrentLobby(initialLobby);
      setIsCreating(false);
      if (initialLobby.status === 'in_progress' || initialLobby.status === 'paused') {
        setIsInGame(true);
      }
    }
  }, [initialLobby]);

  // Erstellt die Smartphone-Lobby beim Öffnen direkt automatisch
  useEffect(() => {
    if (initialLobby || hasAutoCreatedRef.current) return;
    hasAutoCreatedRef.current = true;
    void createFreshLobby();
  }, [createFreshLobby, initialLobby]);

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
      setErrorMsg(`${playerName} hat die Verbindung verloren (60s Wiederverbindungsfrist).`);
    });

    const unsubOffline = socketService.onPlayerOffline(({ playerName }) => {
      setErrorMsg(`${playerName} ist ausgeschieden (Reconnect-Frist abgelaufen).`);
    });

    const unsubHost = socketService.onHostChanged(({ newHostName }) => {
      setErrorMsg(`${newHostName} wurde als neuer Host bestimmt.`);
    });

    const unsubExpired = socketService.onLobbyExpired(() => {
      setErrorMsg('Diese Lobby ist abgelaufen.');
    });

    return () => {
      unsubMeta();
      unsubStarted();
      unsubUpdated();
      unsubSync();
      unsubDiscon();
      unsubOffline();
      unsubHost();
      unsubExpired();
    };
  }, [gameId]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const joinUrl = currentLobby ? getLobbyJoinUrl(currentLobby.code) : '';

  useEffect(() => {
    if (qrCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrCanvasRef.current, joinUrl, 480).catch(console.error);
    }
  }, [joinUrl, currentLobby?.code]);

  const handleBack = () => {
    if (onMinimize && currentLobby) {
      onMinimize(currentLobby);
      return;
    }
    void handleLeaveLobby();
  };

  const handleLeaveLobby = async () => {
    if (currentLobby) {
      await socketService.leaveLobby();
    }
    setCurrentLobby(null);
    onLobbyChange?.(null);
    onClose();
  };

  const handleLeaveGame = async () => {
    await socketService.leaveLobby();
    setIsInGame(false);
    setCurrentLobby(null);
    hasAutoCreatedRef.current = false;
    onLobbyChange?.(null);
    onClose();
  };

  const handleCopyCode = async () => {
    if (!currentLobby) return;
    try {
      await navigator.clipboard.writeText(currentLobby.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleToggleReady = async () => {
    try {
      await socketService.toggleReady();
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

  const handleUpdateSettings = async (newSettings: Record<string, any>) => {
    try {
      await socketService.updateLobbySettings(newSettings);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const myRawPlayer = currentLobby?.players.find((p) => p.id === currentUser.id);
  const isTvScreenHost = Boolean(currentLobby?.isTvMode && myRawPlayer?.isTvScreen);

  if (isInGame && currentLobby) {
    const canMinimizeActiveGame =
      !currentLobby.isSimulated &&
      Boolean(onMinimize) &&
      (currentLobby.status === 'in_progress' || currentLobby.status === 'paused');

    return (
      <MultiplayerGameView
        lobby={currentLobby}
        gameTitle={activeGame.title}
        onLeave={canMinimizeActiveGame ? handleBack : handleLeaveGame}
      />
    );
  }

  const activePlayers = currentLobby
    ? currentLobby.players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline')
    : [];

  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) || myRawPlayer;

  const isHost = myPlayer?.isHost ?? false;
  const isTvControlledGuest = Boolean(currentLobby?.isTvMode && !isTvScreenHost);
  const isReady = myPlayer?.isReady ?? false;

  const minPlayers = currentLobby?.minPlayers ?? 2;
  const maxPlayers = currentLobby?.maxPlayers ?? 8;
  const readyCount = activePlayers.filter((p) => p.isReady).length;

  const allReady =
    Boolean(currentLobby) &&
    activePlayers.length >= minPlayers &&
    activePlayers.length <= maxPlayers &&
    activePlayers.every((p) => p.isReady);

  const canStartGame = currentLobby?.isTvMode ? isTvScreenHost : isHost;
  const canEditSettings = currentLobby?.isTvMode ? isTvScreenHost : isHost;

  const actionButton = !isReady ? (
    <OpenButton
      fullWidth
      size="lg"
      variant="primary"
      disabled={isConnectionBlocked}
      onClick={handleToggleReady}
      className="landscape:h-9 landscape:text-xs"
    >
      BEREIT
    </OpenButton>
  ) : canStartGame ? (
    <OpenButton
      fullWidth
      size="lg"
      variant="primary"
      disabled={!allReady || isStarting || isConnectionBlocked}
      onClick={handleStartGame}
      className="landscape:h-9 landscape:text-xs"
    >
      {!allReady
        ? activePlayers.length < minPlayers
          ? `WARTE AUF SPIELER (${activePlayers.length}/${minPlayers})`
          : `BEREIT (${readyCount}/${activePlayers.length})`
        : 'SPIEL STARTEN'}
    </OpenButton>
  ) : (
    <OpenButton
      fullWidth
      size="lg"
      variant="secondary"
      disabled={isConnectionBlocked}
      onClick={handleToggleReady}
      className="landscape:h-9 landscape:text-xs"
    >
      BEREIT ✓
    </OpenButton>
  );

  const titleBlock = (alignLeft = false) => (
    <div
      className={`lobby-landscape-hide-title flex flex-col ${
        alignLeft ? 'items-start text-left' : 'items-center text-center'
      }`}
    >
      <div className="border-b-2 border-[#F59E0B] px-1 pb-1">
        <h2 className="lobby-landscape-title font-arcade text-2xl sm:text-4xl lg:text-[42px] leading-tight tracking-wider text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
          {activeGame.title}
        </h2>
      </div>
    </div>
  );

  const inviteBlock = (extraLargeQr = false) =>
    currentLobby ? (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="lobby-landscape-qr-box rounded-2xl border border-white/20 bg-white p-3 sm:p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <canvas
            ref={qrCanvasRef}
            className={`lobby-landscape-qr-canvas ${
              extraLargeQr
                ? 'h-60 w-60 sm:h-64 sm:w-64 lg:h-64 lg:w-64'
                : 'h-52 w-52 sm:h-56 sm:w-56 lg:h-56 lg:w-56'
            } block`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            title="Lobby-Code kopieren"
            className="lobby-landscape-code-btn font-arcade rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-4 py-1.5 text-xl sm:text-2xl tracking-[0.22em] pl-[calc(1rem+0.22em)] text-[#FDE68A] uppercase transition-colors hover:bg-[#F59E0B]/25 active:scale-95 cursor-pointer"
          >
            {copiedCode ? 'KOPIERT ✓' : currentLobby.code}
          </button>

          {!currentLobby.isTvMode && (
            <OpenButton
              size="sm"
              variant={copiedLink ? 'primary' : 'secondary'}
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>KOPIERT ✓</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>LINK TEILEN</span>
                </>
              )}
            </OpenButton>
          )}
        </div>
      </div>
    ) : null;

  const playersBlock = currentLobby ? (
    <div className="w-full max-w-md mx-auto">
      <LobbyPlayersGrid
        players={activePlayers}
        maxPlayers={maxPlayers}
        minPlayers={minPlayers}
        readyCount={readyCount}
        currentUserId={currentUser.id}
        avatarSize={56}
        showWaitingSlots={!currentLobby.isTvMode}
        onEditMe={() => setIsAvatarModalOpen(true)}
      />
    </div>
  ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${activeGame.title} Lobby`}
      className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div
        inert={isAvatarModalOpen}
        aria-hidden={isAvatarModalOpen}
        className={`lobby-landscape-shell relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between ${
          isAvatarModalOpen ? 'pointer-events-none' : ''
        }`}
      >
        {/* Kopfzeile: ZURÜCK & VERLASSEN links, Spieltitel im Querformat exakt mittig & Optionen rechtsbündig */}
        <header className="tablet-header relative grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="justify-self-start flex items-center gap-2 shrink-0">
            {!isTvControlledGuest && (
              <button
                type="button"
                onClick={handleBack}
                className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-2 sm:px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span>ZURÜCK</span>
              </button>
            )}

            {currentLobby && (
              <button
                type="button"
                onClick={() => void handleLeaveLobby()}
                title="Lobby endgültig verlassen"
                className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#FDA4AF]/35 bg-[#E11D48]/15 px-2.5 sm:px-3 text-[11px] sm:text-xs tracking-wider text-[#FECDD3] uppercase transition-all hover:bg-[#E11D48]/30 hover:text-white cursor-pointer active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className={isTvControlledGuest ? 'inline' : 'hidden xs:inline'}>VERLASSEN</span>
              </button>
            )}
          </div>

          <div className="lobby-landscape-header-title justify-self-center hidden min-w-0 border-b-2 border-[#F59E0B] px-1.5 pb-0.5 select-none">
            <span className="font-arcade block truncate text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
              {activeGame.title}
            </span>
          </div>

          <div className="justify-self-end flex min-w-0 items-center justify-end gap-2">
            <HeaderStatusOverlay
              lobby={currentLobby}
              currentUserId={currentUser.id}
              message={errorMsg}
              showWhenConnected
              onExitExpired={() => void handleLeaveLobby()}
            />
            {currentLobby && !isTvControlledGuest && (
              <button
                type="button"
                onClick={() => setIsOptionsOpen(true)}
                className="font-arcade inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-xs tracking-wider text-white uppercase hover:bg-white/12 cursor-pointer active:scale-95"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#FBBF24]" />
                <span>OPTIONEN</span>
              </button>
            )}
          </div>
        </header>

        <main className="tablet-screen-main lobby-landscape-main flex flex-1 min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden py-4">
          {!currentLobby ? (
            <div className="my-auto flex flex-col items-center justify-center gap-4 text-center">
              {isCreating ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-[#FBBF24]" />
                  <span className="font-arcade text-sm tracking-wider text-[#CBD5E1] uppercase">
                    LOBBY WIRD ERSTELLT...
                  </span>
                </>
              ) : (
                <>
                  <span className="font-arcade text-sm tracking-wider text-[#FECDD3] uppercase">
                    LOBBY KONNTE NICHT GESTARTET WERDEN
                  </span>
                  <OpenButton
                    size="md"
                    variant="outline-amber"
                    onClick={() => void createFreshLobby()}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>ERNEUT VERSUCHEN</span>
                  </OpenButton>
                </>
              )}
            </div>
          ) : (
            <div className="lobby-landscape-wrap flex flex-1 min-h-0 w-full flex-col justify-between gap-6">
              <div className="lobby-landscape-grid my-auto grid w-full grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
                <div className="lobby-landscape-left flex flex-col items-center gap-5">
                  {titleBlock(false)}
                  {inviteBlock(true)}
                </div>

                <div className="lobby-landscape-right flex flex-col gap-4">
                  {playersBlock}
                </div>
              </div>

              <div className="lobby-landscape-footer flex w-full items-center justify-end pt-2">
                <div className="w-full sm:w-72">{actionButton}</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Profil- & Avatar-Modal direkt aus der Lobby */}
      {isAvatarModalOpen && (
        <AvatarCustomizerModal
          onClose={() => setIsAvatarModalOpen(false)}
          config={currentUser.avatar}
          name={currentUser.name}
          onSave={({ avatar, name }) => {
            saveUserProfile({ avatar, name });
          }}
        />
      )}

      {currentLobby && !isTvControlledGuest && (
        <LobbyOptionsModal
          isOpen={isOptionsOpen}
          gameTitle={activeGame.title}
          gameId={currentLobby.gameId}
          settings={currentLobby.settings}
          isHost={canEditSettings}
          onUpdate={handleUpdateSettings}
          onClose={() => setIsOptionsOpen(false)}
        />
      )}
    </div>
  );
}
