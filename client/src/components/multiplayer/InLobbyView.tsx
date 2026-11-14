import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Crown, Loader2, Share2 } from 'lucide-react';
import { GAMES } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { useUserProfile } from '../../utils/userProfile';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LobbyGameSettings } from './LobbyGameSettings';
import {
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
} from '../CrystalUI';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const desktopQrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrModalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const joinUrl = getLobbyJoinUrl(lobby.code);
  const gameAccent = GAMES.find((g) => g.id === lobby.gameId)?.accent ?? 'emerald';

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
    <CrystalButton fullWidth size="lg" tilt="left" onClick={handleToggleReady}>
      BEREIT
    </CrystalButton>
  ) : canStartGame ? (
    <CrystalButton
      fullWidth
      size="lg"
      tilt="left"
      disabled={!allReady || isStarting}
      onClick={handleStartGame}
    >
      {!allReady
        ? activePlayers.length < lobby.minPlayers
          ? `WARTE AUF SPIELER (${activePlayers.length}/${lobby.minPlayers})`
          : `BEREIT (${readyCount}/${activePlayers.length})`
        : 'SPIEL STARTEN'}
    </CrystalButton>
  ) : (
    <CrystalButton fullWidth size="lg" variant="secondary" tilt="right" onClick={handleToggleReady}>
      BEREIT ✓
    </CrystalButton>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between animate-fade-in select-none">
      {/* 1. HEADER: "VERLASSEN" links, Spieltitel Mitte, Verbindungsstatus rechts */}
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2 w-full max-w-5xl mx-auto px-1">
        <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onLeave}>
          VERLASSEN
        </CrystalButton>

        <CrystalReadout value={gameTitle || lobby.name} />

        <ConnectionStatusBadge />
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0 overflow-y-auto px-2 pt-3 pb-2">
        {errorMsg && (
          <div className="font-arcade mb-3 border-[3px] border-[#991B1B] bg-[#FEE2E2] p-2.5 text-center text-xs text-[#991B1B] uppercase">
            {errorMsg}
          </div>
        )}

        <div className="my-auto grid w-full items-stretch gap-5 grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
          {/* Linkes Kristall-Panel: Beitrittscode, Link-Teilen & QR-Code */}
          <CrystalPanel
            title="LOBBY-CODE"
            accent="amber"
            className="h-full"
            contentClassName="justify-between gap-4 py-5 px-4 sm:px-6"
          >
            <div className="flex w-full flex-col items-center gap-2">
              <span className="font-arcade text-[11px] sm:text-xs tracking-wider text-[#334155] uppercase">
                {copiedCode ? 'KOPIERT ✓' : 'TIPPEN ZUM KOPIEREN'}
              </span>

              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                <div
                  onClick={handleCopyCode}
                  title="Lobby-Code in die Zwischenablage kopieren"
                  className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <CrystalReadout variant="gold" value={lobby.code} />
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Direkten Einladungslink in die Zwischenablage kopieren"
                  style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                  className={`font-arcade inline-flex items-center justify-center gap-1.5 border-[2.5px] px-3 py-2 text-xs uppercase tracking-wider shadow-[0_3px_0_rgba(15,23,42,0.22)] transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shrink-0 ${
                    copiedLink
                      ? 'border-[#064E3B] bg-[#059669] text-white'
                      : 'border-[#0F172A] bg-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]'
                  }`}
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
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="my-auto border-[4px] border-[#1E293B] bg-white p-3 shadow-[0_6px_0_rgba(15,23,42,0.3)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="QR-Code vergrößern"
            >
              <canvas
                ref={desktopQrCanvasRef}
                className="w-40 h-40 sm:w-44 sm:h-44 block"
              />
            </button>
          </CrystalPanel>

          {/* Rechtes Kristall-Panel: Optionen, Spieler & Start-Button */}
          <CrystalPanel
            title="SPIELER"
            accent={gameAccent}
            className="h-full"
            contentClassName="justify-between gap-4 py-5 px-4 sm:px-6"
          >
            <div className="flex w-full flex-col gap-4">
              <LobbyGameSettings
                gameId={lobby.gameId}
                settings={lobby.settings}
                isHost={canEditSettings}
                onUpdate={handleUpdateSettings}
              />

              <div className="w-full flex flex-col gap-2.5">
                <div className="flex items-center justify-between w-full px-1">
                  <span className="font-arcade text-xs text-[#1E293B] uppercase">
                    SPIELER ({activePlayers.length}/{lobby.maxPlayers})
                  </span>
                  <span className="font-arcade text-xs text-[#047857] uppercase">
                    {readyCount}/{targetReadyTotal} BEREIT
                  </span>
                </div>

                <div className="w-full flex flex-col gap-2">
                  {activePlayers.map((p, idx) => {
                    const isMe = p.id === currentUser.id;
                    return (
                      <div
                        key={p.id || idx}
                        className={`flex w-full items-center justify-between gap-2.5 border-[3px] px-3 py-2 shadow-[0_3px_0_rgba(15,23,42,0.18)] ${
                          p.isReady
                            ? 'bg-[#059669] border-[#064E3B] text-white'
                            : 'bg-[#F8FAFC] border-[#334155] text-[#1E293B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="shrink-0">
                            <Avatar config={p.avatar} size={32} />
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span className="font-arcade text-xs sm:text-sm uppercase break-all">
                              {p.name}
                              {isMe ? ' (DU)' : ''}
                            </span>
                            {p.isHost && (
                              <span
                                title="Host dieser Lobby"
                                className="inline-flex items-center gap-1 border-2 border-[#78350F] bg-[#F59E0B] px-1.5 py-0.5 font-arcade text-[10px] text-[#0F172A] shadow-[0_1.5px_0_rgba(15,23,42,0.25)] shrink-0"
                              >
                                <Crown className="h-3 w-3 fill-current" />
                              </span>
                            )}
                          </div>
                        </div>

                        {p.isReady && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                      </div>
                    );
                  })}

                  {Array.from({ length: missingPlayersCount }).map((_, slotIdx) => (
                    <div
                      key={`open-slot-${slotIdx}`}
                      className="flex w-full items-center justify-between gap-2.5 border-[3px] border-dashed border-[#64748B] bg-[#E2E8F0]/70 px-3 py-2 text-[#475569]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#64748B] bg-[#CBD5E1]/60">
                          <Loader2 className="h-4 w-4 animate-spin text-[#475569]" />
                        </div>
                        <span className="font-arcade text-xs sm:text-sm tracking-wide text-[#475569] uppercase">
                          Warte auf Mitspieler...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full pt-1 mt-auto">{actionButton}</div>
          </CrystalPanel>
        </div>
      </div>

      {/* QR-Code Zoom-Modal im Crystal-Panel-Stil */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CrystalPanel
              topTabLabel="QR-CODE"
              accent="amber"
              contentClassName="gap-4 py-6 px-6 sm:px-8"
            >
              {/* Prominenter Lobby-Code mit großem Zeichenabstand + Hinweistext */}
              <div className="flex flex-col items-center gap-1.5 w-full text-center">
                <span className="font-arcade text-3xl sm:text-4xl tracking-[0.25em] pl-[0.25em] text-[#0F172A] drop-shadow-[0_2px_0_rgba(255,255,255,0.9)] uppercase">
                  {lobby.code}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#475569] leading-snug max-w-[260px]">
                  Scanne den Code mit deinem Smartphone zum Beitreten.
                </p>
              </div>

              {/* QR-Code auf ~78% der Kartenbreite begrenzt mit großzügiger weißer Quiet-Zone */}
              <div className="w-[78%] max-w-[240px] aspect-square border-[4px] border-[#1E293B] bg-white p-4 sm:p-5 shadow-[0_6px_0_rgba(15,23,42,0.3)] flex items-center justify-center mx-auto">
                <canvas
                  ref={qrModalCanvasRef}
                  className="w-full h-full block"
                />
              </div>

              {/* Vergrößerte Aktions-Buttons mit "KOPIERT!"-Feedback */}
              <div className="grid grid-cols-2 gap-3 w-full pt-1">
                <CrystalButton
                  size="md"
                  fullWidth
                  variant="secondary"
                  tilt="left"
                  onClick={handleCopyCode}
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4 shrink-0 text-[#059669] stroke-[3]" />
                      <span>KOPIERT!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>CODE KOPIEREN</span>
                    </>
                  )}
                </CrystalButton>

                <CrystalButton
                  size="md"
                  fullWidth
                  variant="primary"
                  tilt="right"
                  onClick={() => setIsQrModalOpen(false)}
                >
                  SCHLIESSEN
                </CrystalButton>
              </div>
            </CrystalPanel>
          </div>
        </div>
      )}
    </div>
  );
}
