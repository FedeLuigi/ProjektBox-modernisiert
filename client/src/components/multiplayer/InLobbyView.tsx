import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Crown, Loader2, Share2 } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { saveUserProfile, useUserProfile } from '../../utils/userProfile';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import { Avatar } from '../Avatar';
import { AvatarCustomizerModal } from '../AvatarCustomizerModal';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LobbyGameSettings } from './LobbyGameSettings';
import { OpenButton, OpenModalFrame, OpenSubpageHeader } from '../OpenSubpageUI';

interface InLobbyViewProps {
  lobby: Lobby;
  gameTitle?: string;
  onLeave: () => void;
  onGameStart: (lobby?: Lobby) => void;
}

export function InLobbyView({
  lobby: initialLobby,
  gameTitle,
  onLeave,
  onGameStart,
}: InLobbyViewProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const desktopQrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrModalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const joinUrl = getLobbyJoinUrl(lobby.code);

  const currentUser = useUserProfile();

  const activePlayers = lobby.isTvMode
    ? lobby.players.filter((p) => !p.isTvScreen)
    : lobby.players;

  const myPlayer =
    activePlayers.find((p) => p.id === currentUser.id) ||
    lobby.players.find((p) => p.id === currentUser.id);

  const isHost = myPlayer?.isHost ?? false;
  const isRoomLeader = lobby.isTvMode
    ? activePlayers[0]?.id === currentUser.id
    : isHost;
  const isReady = myPlayer?.isReady ?? false;

  const allReady =
    activePlayers.length >= lobby.minPlayers &&
    activePlayers.length <= lobby.maxPlayers &&
    activePlayers.every((p) => p.isReady);

  const canStartGame = lobby.isTvMode ? (isRoomLeader || allReady) : isHost;
  const canEditSettings = lobby.isTvMode ? isRoomLeader : isHost;

  useEffect(() => {
    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby, message }) => {
      setLobby(updatedLobby);
      if (message) setErrorMsg(message);
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      onGameStart(updatedLobby);
    });

    const unsubDiscon = socketService.onPlayerDisconnected(({ playerName }) => {
      setErrorMsg(`${playerName} hat die Verbindung verloren.`);
    });

    return () => {
      unsubUpdated();
      unsubStarted();
      unsubDiscon();
    };
  }, [onGameStart]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (desktopQrCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(desktopQrCanvasRef.current, joinUrl, 360).catch(console.error);
    }
  }, [joinUrl, lobby.code]);

  useEffect(() => {
    if (isQrModalOpen && qrModalCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrModalCanvasRef.current, joinUrl, 360).catch(console.error);
    }
  }, [isQrModalOpen, joinUrl, lobby.code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
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
    if (!allReady || !canStartGame || isStarting) return;
    setIsStarting(true);
    try {
      await socketService.startLobby();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsStarting(false);
    }
  };

  const handleUpdateSettings = async (newSettings: Record<string, any>) => {
    if (!canEditSettings) return;
    try {
      await socketService.updateLobbySettings(newSettings);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const readyCount = activePlayers.filter((p) => p.isReady).length;
  const targetReadyTotal = Math.max(lobby.minPlayers, activePlayers.length);
  const missingPlayersCount = Math.max(0, lobby.minPlayers - activePlayers.length);

  const actionButton = !isReady ? (
    <OpenButton fullWidth size="lg" variant="primary" onClick={handleToggleReady} className="landscape:h-9 landscape:text-xs">
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
        ? activePlayers.length < lobby.minPlayers
          ? `WARTE AUF SPIELER (${activePlayers.length}/${lobby.minPlayers})`
          : `BEREIT (${readyCount}/${activePlayers.length})`
        : 'SPIEL STARTEN'}
    </OpenButton>
  ) : (
    <OpenButton fullWidth size="lg" variant="secondary" onClick={handleToggleReady} className="landscape:h-9 landscape:text-xs">
      BEREIT ✓
    </OpenButton>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between text-white animate-fade-in select-none">
      {/* 1. HEADER: "VERLASSEN" links, Spieltitel Mitte, Verbindungsstatus rechts */}
      <OpenSubpageHeader
        backLabel="VERLASSEN"
        onBack={onLeave}
        title={gameTitle || lobby.name}
        rightSlot={<ConnectionStatusBadge />}
      />

      <div className="tablet-screen-main mx-auto flex w-full max-w-5xl flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-4 pb-4 landscape:py-1.5">
        {errorMsg && (
          <div className="font-arcade mb-3 landscape:mb-1 rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 p-2.5 landscape:p-1.5 text-center text-xs text-[#FECDD3] uppercase">
            {errorMsg}
          </div>
        )}

        <div className="tablet-portrait-stack my-auto grid w-full items-stretch gap-5 landscape:gap-3 grid-cols-1 md:grid-cols-[0.95fr_1.05fr] landscape:grid-cols-2">
          {/* Linkes Open-Gallery-Panel: Beitrittscode, Link-Teilen & QR-Code */}
          <div className="flex h-full flex-col items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 landscape:p-3 landscape:gap-2 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
              <span className="font-arcade text-sm sm:text-base tracking-wider text-white uppercase">
                LOBBY-<span className="text-[#FBBF24]">CODE</span>
              </span>
            </div>

            <div className="flex w-full flex-col items-center gap-2.5 landscape:gap-1.5">
              <span className="font-arcade text-[11px] sm:text-xs landscape:text-[10px] tracking-wider text-[#94A3B8] uppercase">
                {copiedCode ? 'KOPIERT ✓' : 'TIPPEN ZUM KOPIEREN'}
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2.5 landscape:gap-1.5 w-full">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Lobby-Code in die Zwischenablage kopieren"
                  className="font-arcade rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-5 py-2 text-xl sm:text-2xl landscape:text-base tracking-[0.22em] pl-[calc(1.25rem+0.22em)] text-[#FDE68A] uppercase transition-all hover:bg-[#F59E0B]/25 active:scale-95 cursor-pointer"
                >
                  {lobby.code}
                </button>

                <OpenButton
                  size="sm"
                  variant={copiedLink ? 'primary' : 'secondary'}
                  onClick={handleCopyLink}
                  title="Direkten Einladungslink in die Zwischenablage kopieren"
                  className="landscape:h-8 landscape:px-2.5"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" />
                      <span>Link kopiert ✓</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Link teilen</span>
                    </>
                  )}
                </OpenButton>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="my-auto rounded-2xl border border-white/20 bg-white p-3 landscape:p-1.5 shadow-[0_14px_30px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="QR-Code vergrößern"
            >
              <canvas
                ref={desktopQrCanvasRef}
                className="w-40 h-40 sm:w-44 sm:h-44 landscape:w-22 landscape:h-22 block"
              />
            </button>
          </div>

          {/* Rechtes Open-Gallery-Panel: Optionen, Spieler & Start-Button */}
          <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 landscape:p-3 landscape:gap-2 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex w-full flex-col gap-4 landscape:gap-2">
              <div className="flex items-center justify-center">
                <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
                  <span className="font-arcade text-sm sm:text-base tracking-wider text-white uppercase">
                    SPIELER
                  </span>
                </div>
              </div>

              <LobbyGameSettings
                gameId={lobby.gameId}
                settings={lobby.settings}
                isHost={canEditSettings}
                onUpdate={handleUpdateSettings}
              />

              <div className="w-full flex flex-col gap-2.5 landscape:gap-1">
                <div className="flex items-center justify-between w-full px-1">
                  <span className="font-arcade text-xs landscape:text-[11px] text-[#94A3B8] uppercase">
                    SPIELER ({activePlayers.length}/{lobby.maxPlayers})
                  </span>
                  <span className="font-arcade text-xs landscape:text-[11px] text-[#34D399] uppercase">
                    {readyCount}/{targetReadyTotal} BEREIT
                  </span>
                </div>

                <div className="w-full flex flex-col gap-2 landscape:gap-1 landscape:max-h-[96px] landscape:overflow-y-auto">
                  {activePlayers.map((p, idx) => {
                    const isMe = p.id === currentUser.id;
                    return (
                      <div
                        key={p.id || idx}
                        onClick={isMe ? () => setIsAvatarModalOpen(true) : undefined}
                        title={isMe ? 'Klicken, um Name und Avatar anzupassen' : undefined}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2 landscape:px-2.5 landscape:py-1 transition-colors ${
                          isMe ? 'cursor-pointer hover:border-[#F59E0B]/70 ' : ''
                        }${
                          p.isReady
                            ? 'bg-[#10B981]/20 border-[#34D399]/50 text-white'
                            : 'bg-white/[0.04] border-white/15 text-white/90'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 landscape:gap-2 min-w-0 flex-1">
                          <div className="shrink-0">
                            <Avatar config={p.avatar} size={28} />
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-arcade text-xs sm:text-sm landscape:text-xs uppercase break-all">
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
                      className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-3 py-2 landscape:px-2.5 landscape:py-1 text-[#94A3B8]"
                    >
                      <div className="flex items-center gap-2.5 landscape:gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#94A3B8]" />
                        </div>
                        <span className="font-arcade text-xs sm:text-sm landscape:text-xs tracking-wide text-[#94A3B8] uppercase">
                          Warte auf Mitspieler...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full pt-1 landscape:pt-0.5 mt-auto">{actionButton}</div>
          </div>
        </div>
      </div>

      {/* QR-Code Zoom-Modal im Open-Gallery-Stil */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0F172A]/80 backdrop-blur-sm p-4 landscape:p-2 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-xl">
            <OpenModalFrame
              title="QR-"
              accentWord="CODE"
              onClose={() => setIsQrModalOpen(false)}
              contentClassName="gap-4 landscape:gap-2.5"
            >
              <div className="flex flex-col items-center gap-4 w-full landscape:grid landscape:grid-cols-[auto_1fr] landscape:items-center landscape:gap-x-5 landscape:gap-y-2.5">
                <div className="flex flex-col items-center landscape:items-start gap-1.5 landscape:gap-1 w-full text-center landscape:text-left landscape:col-start-2 landscape:row-start-1">
                  <span className="font-arcade text-3xl sm:text-4xl landscape:text-2xl tracking-[0.25em] pl-[0.25em] landscape:pl-0 text-[#FDE68A] uppercase">
                    {lobby.code}
                  </span>
                  <p className="text-xs sm:text-sm landscape:text-xs text-[#CBD5E1] leading-snug max-w-[260px] landscape:max-w-none">
                    Scanne den Code mit deinem Smartphone zum Beitreten.
                  </p>
                </div>

                <div className="w-[78%] max-w-[240px] landscape:w-36 landscape:h-36 landscape:max-w-none aspect-square rounded-2xl border border-white/20 bg-white p-4 sm:p-5 landscape:p-2 shadow-[0_14px_30px_rgba(0,0,0,0.4)] flex items-center justify-center mx-auto landscape:mx-0 landscape:col-start-1 landscape:row-start-1 landscape:row-span-2">
                  <canvas
                    ref={qrModalCanvasRef}
                    className="w-full h-full block"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 landscape:gap-2 w-full pt-1 landscape:pt-0 landscape:col-start-2 landscape:row-start-2">
                  <OpenButton
                    size="md"
                    fullWidth
                    variant={copiedCode ? 'primary' : 'secondary'}
                    onClick={handleCopyCode}
                    className="landscape:h-9 landscape:px-2.5 landscape:text-xs"
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
                    className="landscape:h-9 landscape:px-2.5 landscape:text-xs"
                  >
                    SCHLIESSEN
                  </OpenButton>
                </div>
              </div>
            </OpenModalFrame>
          </div>
        </div>
      )}

      {/* Profil- und Avatar-Modal direkt aus der Lobby */}
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
