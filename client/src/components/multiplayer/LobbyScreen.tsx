import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Loader2,
  Plus,
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
import { ACCENT_PALETTES } from '../CrystalUI';
import { GamePreviewArtwork } from '../GamePreviewArtwork';
import { OpenButton, OpenModalFrame } from '../OpenSubpageUI';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LobbyGameSettings } from './LobbyGameSettings';
import {
  LOBBY_LAYOUT_OPTIONS,
  LobbyLayoutModal,
  type LobbyLayoutId,
} from './LobbyLayoutModal';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
  initialTvMode?: boolean;
}

export function LobbyScreen({
  game,
  onClose,
  initialLobby,
  initialTvMode = false,
}: LobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(Boolean(initialLobby?.status === 'in-game'));
  const [isTvMode, setIsTvMode] = useState(initialLobby?.isTvMode ?? initialTvMode);
  const [isCreating, setIsCreating] = useState(!initialLobby);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  const [lobbyLayout, setLobbyLayout] = useState<LobbyLayoutId>(() => {
    try {
      const saved = localStorage.getItem('projektbox.lobbyLayout') as LobbyLayoutId | null;
      if (saved && LOBBY_LAYOUT_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'lobby-open-stage';
  });

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrModalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasAutoCreatedRef = useRef(false);

  const currentUser = useUserProfile();
  const gameId = game.id;
  const palette = ACCENT_PALETTES[game.accent];

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

  // Synchronisiere initialLobby, falls über Deep-Link beigetreten
  useEffect(() => {
    if (initialLobby) {
      setCurrentLobby(initialLobby);
      setIsTvMode(Boolean(initialLobby.isTvMode));
      setIsCreating(false);
      if (initialLobby.status === 'in-game') {
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
    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setCurrentLobby(updatedLobby);
      setIsInGame(true);
    });

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby, message }) => {
      setCurrentLobby((prev) => (prev ? { ...prev, ...updatedLobby } : updatedLobby));
      if (message) setErrorMsg(message);
    });

    const unsubDiscon = socketService.onPlayerDisconnected(({ playerName }) => {
      setErrorMsg(`${playerName} hat die Verbindung verloren.`);
    });

    return () => {
      unsubStarted();
      unsubUpdated();
      unsubDiscon();
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
      renderQrCodeToCanvas(qrCanvasRef.current, joinUrl, 360).catch(console.error);
    }
  }, [joinUrl, currentLobby?.code, lobbyLayout]);

  useEffect(() => {
    if (isQrModalOpen && qrModalCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrModalCanvasRef.current, joinUrl, 360).catch(console.error);
    }
  }, [isQrModalOpen, joinUrl, currentLobby?.code]);

  const handleBack = async () => {
    if (currentLobby) {
      await socketService.leaveLobby();
    }
    onClose();
  };

  const handleLeaveGame = async () => {
    await socketService.leaveLobby();
    setIsInGame(false);
    setCurrentLobby(null);
    hasAutoCreatedRef.current = false;
    onClose();
  };

  const handleSwitchMode = async (nextTv: boolean) => {
    if (nextTv === isTvMode || isCreating) return;
    setIsTvMode(nextTv);
    if (currentLobby) {
      await socketService.leaveLobby();
      setCurrentLobby(null);
    }
    await createFreshLobby(nextTv);
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

  const handleSelectLayout = (next: LobbyLayoutId) => {
    setLobbyLayout(next);
    try {
      localStorage.setItem('projektbox.lobbyLayout', next);
    } catch {
      // ignore
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
    ? currentLobby.isTvMode
      ? currentLobby.players.filter((p) => !p.isTvScreen)
      : currentLobby.players
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
      disabled={!allReady || isStarting}
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
      disabled={!allReady || isStarting}
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
            disabled={!canSwitchMode || isCreating}
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

  const inviteBlock = (compactQr = false) =>
    currentLobby ? (
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-arcade text-[10px] sm:text-xs tracking-wider text-[#94A3B8] uppercase">
            {copiedCode ? 'KOPIERT ✓' : 'LOBBY-CODE (TIPPEN ZUM KOPIEREN)'}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="font-arcade rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-4 py-1.5 text-xl sm:text-2xl tracking-[0.22em] pl-[calc(1rem+0.22em)] text-[#FDE68A] uppercase transition-colors hover:bg-[#F59E0B]/25 active:scale-95 cursor-pointer"
            >
              {currentLobby.code}
            </button>

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
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQrModalOpen(true)}
          title="QR-Code vergrößern"
          className="rounded-2xl border border-white/20 bg-white p-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <canvas
            ref={qrCanvasRef}
            className={`${compactQr ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-36 w-36 sm:h-44 sm:w-44'} block`}
          />
        </button>
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

      <div className="flex w-full flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar">
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
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-5 landscape:py-2">
        {/* Kopfzeile: ZURÜCK links & Internetverbindungsanzeige rechts bleiben unverändert; „+“ mittig */}
        <header className="tablet-header flex w-full shrink-0 flex-nowrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleBack()}
            className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>ZURÜCK</span>
          </button>

          <div className="flex items-center gap-2 select-none">
            <span className="font-arcade hidden sm:inline text-sm md:text-base tracking-wider text-white/85 uppercase">
              {currentLobby?.name || game.title}
            </span>
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              title="Lobby-Design & Layout wechseln"
              aria-label="Lobby-Design & Layout wechseln"
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <ConnectionStatusBadge />
        </header>

        <main className="tablet-screen-main flex flex-1 min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden py-4">
          {errorMsg && (
            <div className="font-arcade mx-auto mb-4 w-full max-w-xl rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
              {errorMsg}
            </div>
          )}

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
            <>
              {/* 1. OFFENE BÜHNE (2-SPALTEN) */}
              {lobbyLayout === 'lobby-open-stage' && (
                <div className="my-auto mx-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-[0.9fr_1.1fr] items-center gap-8 md:gap-12">
                  <div className="flex flex-col items-center gap-5 border-b md:border-b-0 md:border-r border-white/15 pb-6 md:pb-0 md:pr-10">
                    <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
                      <span className="font-arcade text-xl tracking-wider text-white uppercase">
                        {game.title}
                      </span>
                    </div>
                    {modeTabs}
                    {inviteBlock(false)}
                  </div>

                  <div className="flex flex-col gap-4">
                    {settingsBlock}
                    {playersBlock}
                    <div className="pt-1">{actionButton}</div>
                  </div>
                </div>
              )}

              {/* 2. SPLIT-SHOWCASE (MIT SPIEL-ARTWORK) */}
              {lobbyLayout === 'lobby-split-showcase' && (
                <div className="my-auto mx-auto grid w-full max-w-5xl grid-cols-1 lg:grid-cols-[1fr_1.1fr] items-center gap-8 lg:gap-12">
                  <div className="flex flex-col gap-4">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                      <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                      <span
                        style={{ backgroundColor: palette.bg }}
                        className="font-arcade absolute bottom-3 left-3 rounded-full px-3 py-1 text-[11px] text-white uppercase shadow"
                      >
                        {game.players} • {game.duration}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                      {inviteBlock(true)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-arcade text-lg tracking-wider text-white uppercase">
                        LOBBY <span className="text-[#FBBF24]">SETUP</span>
                      </span>
                      {modeTabs}
                    </div>
                    {settingsBlock}
                    {playersBlock}
                    {actionButton}
                  </div>
                </div>
              )}

              {/* 3. EDITORIAL 3-ZONEN */}
              {lobbyLayout === 'lobby-editorial-grid' && (
                <div className="my-auto flex w-full flex-col gap-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-3">
                    <div>
                      <span className="font-arcade text-xs tracking-widest text-[#FBBF24] uppercase">
                        {game.players} • {game.duration}
                      </span>
                      <h2 className="font-arcade mt-0.5 text-2xl sm:text-3xl tracking-wider text-white uppercase">
                        {game.title}
                      </h2>
                    </div>
                    {modeTabs}
                    <div className="w-full sm:w-64">{actionButton}</div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 items-start gap-6 lg:gap-8">
                    <div className="flex flex-col items-center lg:border-r lg:border-white/15 lg:pr-6">
                      {inviteBlock(false)}
                    </div>
                    <div className="lg:border-r lg:border-white/15 lg:pr-6">
                      {settingsBlock}
                    </div>
                    <div>{playersBlock}</div>
                  </div>
                </div>
              )}

              {/* 4. BÜHNE + BOTTOM-LEISTE */}
              {lobbyLayout === 'lobby-bottom-action' && (
                <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-6">
                  <div className="my-auto grid w-full grid-cols-1 md:grid-cols-[0.85fr_1.15fr] items-center gap-8">
                    <div className="flex flex-col items-center">{inviteBlock(false)}</div>
                    <div className="flex flex-col gap-4">
                      {settingsBlock}
                      {playersBlock}
                    </div>
                  </div>

                  <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/15 pt-4">
                    {modeTabs}
                    <div className="w-full sm:w-72">{actionButton}</div>
                  </div>
                </div>
              )}

              {/* 5. SCHWEBENDE GLAS-PANELS */}
              {lobbyLayout === 'lobby-glass-panels' && (
                <div className="my-auto mx-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-[0.95fr_1.05fr] items-stretch gap-5">
                  <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    {modeTabs}
                    {inviteBlock(false)}
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                    <div className="flex flex-col gap-4">
                      {settingsBlock}
                      {playersBlock}
                    </div>
                    {actionButton}
                  </div>
                </div>
              )}

              {/* 6. KINO / TV-FOKUS */}
              {lobbyLayout === 'lobby-compact-tv' && (
                <div className="my-auto mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    {modeTabs}
                    {inviteBlock(false)}
                  </div>

                  <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-4">
                    {settingsBlock}
                    {playersBlock}
                  </div>

                  <div className="w-full max-w-sm">{actionButton}</div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* QR-Code Zoom-Modal */}
      {isQrModalOpen && currentLobby && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto bg-[#0F172A]/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-xl">
            <OpenModalFrame
              title="QR-"
              accentWord="CODE"
              onClose={() => setIsQrModalOpen(false)}
              contentClassName="gap-4 landscape:gap-2.5"
            >
              <div className="flex flex-col items-center gap-4 w-full landscape:grid landscape:grid-cols-[auto_1fr] landscape:items-center landscape:gap-x-5">
                <div className="flex flex-col items-center landscape:items-start gap-1.5 text-center landscape:text-left landscape:col-start-2 landscape:row-start-1">
                  <span className="font-arcade text-3xl sm:text-4xl tracking-[0.25em] pl-[0.25em] landscape:pl-0 text-[#FDE68A] uppercase">
                    {currentLobby.code}
                  </span>
                  <p className="text-xs sm:text-sm text-[#CBD5E1] leading-snug max-w-[260px]">
                    Scanne den Code mit deinem Smartphone zum Beitreten.
                  </p>
                </div>

                <div className="w-[78%] max-w-[240px] landscape:w-36 landscape:h-36 aspect-square rounded-2xl border border-white/20 bg-white p-4 flex items-center justify-center mx-auto landscape:mx-0 landscape:col-start-1 landscape:row-start-1 landscape:row-span-2">
                  <canvas ref={qrModalCanvasRef} className="w-full h-full block" />
                </div>

                <div className="grid grid-cols-2 gap-3 w-full landscape:col-start-2 landscape:row-start-2">
                  <OpenButton
                    size="md"
                    fullWidth
                    variant={copiedCode ? 'primary' : 'secondary'}
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4 shrink-0 stroke-[3]" />
                        <span>KOPIERT!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 shrink-0" />
                        <span>KOPIEREN</span>
                      </>
                    )}
                  </OpenButton>

                  <OpenButton
                    size="md"
                    fullWidth
                    variant="outline-amber"
                    onClick={() => setIsQrModalOpen(false)}
                  >
                    SCHLIESSEN
                  </OpenButton>
                </div>
              </div>
            </OpenModalFrame>
          </div>
        </div>
      )}

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

      {/* Layout-Auswahl („+“-Button) */}
      <LobbyLayoutModal
        isOpen={showLayoutModal}
        activeLayout={lobbyLayout}
        onSelectLayout={handleSelectLayout}
        onClose={() => setShowLayoutModal(false)}
      />
    </div>
  );
}
