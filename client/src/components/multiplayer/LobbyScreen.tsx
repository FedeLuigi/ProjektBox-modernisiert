import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  LogOut,
  RefreshCw,
  Share2,
  Smartphone,
  Tv,
} from 'lucide-react';
import { type Game } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { saveUserProfile, useUserProfile } from '../../utils/userProfile';
import { generateSimpleLobbyName } from '../../utils/nameGenerator';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import { Avatar } from '../Avatar';
import { AvatarCustomizerModal } from '../AvatarCustomizerModal';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { OpenButton } from '../OpenSubpageUI';
import { HeaderStatusOverlay } from './ConnectionStatusBadge';
import { LobbyGameSettings } from './LobbyGameSettings';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';

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
  initialTvMode = false,
}: LobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(
    Boolean(initialLobby?.status === 'in_progress' || initialLobby?.status === 'paused')
  );
  const [isTvMode, setIsTvMode] = useState(initialLobby?.isTvMode ?? initialTvMode);
  const [isCreating, setIsCreating] = useState(!initialLobby);
  const [isStarting, setIsStarting] = useState(false);
  const [isConnectionBlocked, setIsConnectionBlocked] = useState(() =>
    socketService.isActionBlocked()
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasAutoCreatedRef = useRef(false);

  const currentUser = useUserProfile();
  const gameId = game.id;

  const createFreshLobby = useCallback(
    async (tvFlag: boolean) => {
      setIsCreating(true);
      setErrorMsg(null);
      try {
        const created = await socketService.createLobby(
          generateSimpleLobbyName(tvFlag),
          true,
          gameId,
          tvFlag
        );
        setCurrentLobby(created);
        setIsTvMode(Boolean(created.isTvMode));
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
      setIsTvMode(Boolean(initialLobby.isTvMode));
      setIsCreating(false);
      if (initialLobby.status === 'in_progress' || initialLobby.status === 'paused') {
        setIsInGame(true);
      }
    }
  }, [initialLobby]);

  // Erstellt die Lobby beim Öffnen direkt automatisch (kein Zwischenschritt mehr)
  useEffect(() => {
    if (initialLobby || hasAutoCreatedRef.current) return;
    hasAutoCreatedRef.current = true;
    void createFreshLobby(initialTvMode);
  }, [createFreshLobby, initialLobby, initialTvMode]);

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
      setIsTvMode(Boolean(updatedLobby.isTvMode));
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

  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const handleSwitchMode = async (nextTv: boolean) => {
    if (nextTv === isTvMode || isCreating || isSwitchingMode) return;
    if (!currentLobby) {
      setIsTvMode(nextTv);
      await createFreshLobby(nextTv);
      return;
    }

    const previousTv = isTvMode;
    setIsSwitchingMode(true);
    setIsTvMode(nextTv);
    setErrorMsg(null);
    try {
      const updated = await socketService.switchLobbyMode(nextTv);
      setCurrentLobby(updated);
      setIsTvMode(Boolean(updated.isTvMode));
    } catch (err: any) {
      setIsTvMode(previousTv);
      setErrorMsg(err.message || 'Modus konnte nicht gewechselt werden.');
    } finally {
      setIsSwitchingMode(false);
    }
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
    if (isTvScreenHost) {
      return (
        <TvGameView
          lobby={currentLobby}
          gameTitle={game.title}
          onLeave={handleLeaveGame}
        />
      );
    }
    return (
      <MultiplayerGameView
        lobby={currentLobby}
        gameTitle={game.title}
        onLeave={handleLeaveGame}
      />
    );
  }

  const activePlayers = currentLobby
    ? currentLobby.players.filter((p) => !p.isTvScreen && p.connectionState !== 'offline')
    : [];

  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) || myRawPlayer;

  const isHost = myPlayer?.isHost ?? false;
  const isRoomLeader = currentLobby?.isTvMode
    ? activePlayers[0]?.id === currentUser.id || isTvScreenHost
    : isHost;
  const isReady = myPlayer?.isReady ?? false;

  const minPlayers = currentLobby?.minPlayers ?? 2;
  const maxPlayers = currentLobby?.maxPlayers ?? 8;
  const readyCount = activePlayers.filter((p) => p.isReady).length;
  const targetReadyTotal = Math.max(minPlayers, activePlayers.length);
  const missingPlayersCount = Math.max(0, minPlayers - activePlayers.length);

  const allReady =
    Boolean(currentLobby) &&
    activePlayers.length >= minPlayers &&
    activePlayers.length <= maxPlayers &&
    activePlayers.every((p) => p.isReady);

  const canStartGame = currentLobby?.isTvMode
    ? isTvScreenHost || isRoomLeader || allReady
    : isHost;
  const canEditSettings = isRoomLeader;
  const canSwitchMode = activePlayers.length <= 1 && (isHost || isTvScreenHost);

  const actionButton = isTvScreenHost ? (
    <OpenButton
      fullWidth
      size="lg"
      variant="primary"
      disabled={!allReady || isStarting || isConnectionBlocked}
      onClick={handleStartGame}
      className="landscape:h-9 landscape:text-xs"
    >
      {activePlayers.length < minPlayers
        ? `WARTE AUF SPIELER (${activePlayers.length}/${minPlayers})`
        : !allReady
          ? `BEREIT (${readyCount}/${activePlayers.length})`
          : 'SPIEL STARTEN'}
    </OpenButton>
  ) : !isReady ? (
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

  const modeTabs = (
    <div className="flex items-center gap-5 border-b border-white/15">
      {[
        { tv: false, label: 'STANDARD', Icon: Smartphone },
        { tv: true, label: 'TV SCREEN', Icon: Tv },
      ].map(({ tv, label, Icon }) => {
        const active = isTvMode === tv;
        return (
          <button
            key={label}
            type="button"
            disabled={!canSwitchMode || isCreating || isSwitchingMode || isConnectionBlocked}
            onClick={() => void handleSwitchMode(tv)}
            title={
              !canSwitchMode
                ? 'Moduswechsel nur möglich, solange noch keine Mitspieler beigetreten sind'
                : undefined
            }
            className={`font-arcade relative inline-flex items-center gap-1.5 pb-1.5 text-xs tracking-wider uppercase transition-colors ${
              active ? 'text-[#FDE68A]' : 'text-[#94A3B8] hover:text-white'
            } ${!canSwitchMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
            {active && (
              <span className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
            )}
          </button>
        );
      })}
    </div>
  );

  const titleBlock = (alignLeft = false) => (
    <div
      className={`lobby-landscape-hide-title flex flex-col ${
        alignLeft ? 'items-start text-left' : 'items-center text-center'
      }`}
    >
      <div className="border-b-2 border-[#F59E0B] px-1 pb-1">
        <h2 className="lobby-landscape-title font-arcade text-2xl sm:text-4xl lg:text-[42px] leading-tight tracking-wider text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
          {game.title}
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
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="font-arcade text-xs text-[#94A3B8] uppercase">
          SPIELER ({activePlayers.length}/{maxPlayers})
        </span>
        <span className="font-arcade text-xs text-[#34D399] uppercase">
          {readyCount}/{targetReadyTotal} BEREIT
        </span>
      </div>

      <div className="lobby-landscape-players flex w-full flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar">
        {activePlayers.map((p, idx) => {
          const isMe = p.id === currentUser.id;
          return (
            <div
              key={p.id || idx}
              onClick={isMe ? () => setIsAvatarModalOpen(true) : undefined}
              title={isMe ? 'Klicken, um Name und Avatar anzupassen' : undefined}
              className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                isMe ? 'cursor-pointer hover:border-[#F59E0B]/70 ' : ''
              }${
                p.isReady
                  ? 'bg-[#10B981]/20 border-[#34D399]/50 text-white'
                  : 'bg-white/[0.04] border-white/15 text-white/90'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="shrink-0">
                  <Avatar config={p.avatar} size={28} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="font-arcade text-xs sm:text-sm uppercase break-all">
                    {p.name}
                    {isMe ? ' (DU)' : ''}
                  </span>
                  {p.isHost && (
                    <span
                      title="Host dieser Lobby"
                      className="inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B] px-1.5 py-0.5 font-arcade text-[10px] text-[#0F172A] shrink-0"
                    >
                      <Crown className="h-3 w-3 fill-current" />
                    </span>
                  )}
                  {p.connectionState === 'disconnected' && !p.connected && (
                    <span
                      title="Verbindung unterbrochen – Wiederverbindung läuft"
                      className="inline-flex items-center rounded-md border border-[#F59E0B]/50 bg-[#F59E0B]/15 px-1.5 py-0.5 font-arcade text-[10px] text-[#FDE68A] uppercase animate-pulse shrink-0"
                    >
                      GETRENNT
                    </span>
                  )}
                </div>
              </div>

              {p.isReady && <Check className="h-4 w-4 shrink-0 text-[#34D399] stroke-[3]" />}
            </div>
          );
        })}

        {Array.from({ length: missingPlayersCount }).map((_, slotIdx) => (
          <div
            key={`open-slot-${slotIdx}`}
            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-3 py-2 text-[#94A3B8]"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#94A3B8]" />
            </div>
            <span className="font-arcade text-xs tracking-wide uppercase">
              Warte auf Mitspieler...
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const settingsBlock = currentLobby ? (
    <LobbyGameSettings
      gameId={currentLobby.gameId}
      settings={currentLobby.settings}
      isHost={canEditSettings}
      onUpdate={handleUpdateSettings}
    />
  ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${game.title} Lobby`}
      className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div
        inert={isAvatarModalOpen}
        aria-hidden={isAvatarModalOpen}
        className={`lobby-landscape-shell relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between pt-[calc(12px+env(safe-area-inset-top,0px))] pb-[calc(12px+env(safe-area-inset-bottom,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pt-[calc(20px+env(safe-area-inset-top,0px))] sm:pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:px-6 lg:px-10 ${
          isAvatarModalOpen ? 'pointer-events-none' : ''
        }`}
      >
        {/* Kopfzeile: ZURÜCK & VERLASSEN links, schwebender Verbindungs-/Lobby-Status mittig im Header & Spieltitel rechts im Querformat */}
        <header className="tablet-header relative flex w-full shrink-0 flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1 sm:gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-2 sm:px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span>ZURÜCK</span>
            </button>

            {currentLobby && (
              <button
                type="button"
                onClick={() => void handleLeaveLobby()}
                title="Lobby endgültig verlassen"
                className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#FDA4AF]/35 bg-[#E11D48]/15 px-2 sm:px-3 text-[11px] sm:text-xs tracking-wider text-[#FECDD3] uppercase transition-all hover:bg-[#E11D48]/30 hover:text-white cursor-pointer active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xs:inline">VERLASSEN</span>
              </button>
            )}
          </div>

          <HeaderStatusOverlay
            lobby={currentLobby}
            currentUserId={currentUser.id}
            message={errorMsg}
            showWhenConnected={true}
            onExitExpired={() => void handleLeaveLobby()}
          />

          <div className="flex items-center justify-end min-w-0 shrink-0">
            <div className="lobby-landscape-header-title hidden min-w-0 border-b-2 border-[#F59E0B] px-1.5 pb-0.5 select-none">
              <span className="font-arcade block truncate text-sm sm:text-base tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
                {game.title}
              </span>
            </div>
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
                    onClick={() => void createFreshLobby(isTvMode)}
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
                  {settingsBlock}
                  {playersBlock}
                </div>
              </div>

              <div className="lobby-landscape-footer flex w-full flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                {modeTabs}
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
    </div>
  );
}
