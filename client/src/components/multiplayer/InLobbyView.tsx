import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Crown } from 'lucide-react';
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
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

  const actionButton = !isReady ? (
    <CrystalButton fullWidth size="lg" tilt="left" onClick={handleToggleReady}>
      READY
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
          ? `WAITING (${activePlayers.length}/${lobby.minPlayers})`
          : `READY (${readyCount}/${activePlayers.length})`
        : 'PLAY'}
    </CrystalButton>
  ) : (
    <CrystalButton fullWidth size="lg" variant="secondary" tilt="right" onClick={handleToggleReady}>
      READY ✓
    </CrystalButton>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between animate-fade-in select-none">
      {/* 1. HEADER: "EXIT" links, Spieltitel Mitte, Verbindungsstatus rechts */}
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2 w-full max-w-5xl mx-auto px-1">
        <CrystalButton size="sm" tilt="left" onClick={onLeave}>
          EXIT
        </CrystalButton>

        <CrystalReadout value={gameTitle || lobby.name} />

        <ConnectionStatusBadge />
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0 overflow-y-auto px-2 pt-3 pb-2">
        {errorMsg && (
          <div className="font-arcade mb-3 border-[3px] border-[#17608E] bg-[#88D6F8] p-2.5 text-center text-xs text-[#15608E] uppercase">
            {errorMsg}
          </div>
        )}

        <div className="my-auto grid w-full items-center gap-5 grid-cols-1 md:grid-cols-[0.9fr_1.1fr]">
          {/* Linkes Kristall-Panel: Beitrittscode & QR-Code */}
          <CrystalPanel topTabLabel="LOBBY CODE" contentClassName="gap-3.5 py-5">
            <div onClick={handleCopyCode} className="cursor-pointer">
              <CrystalReadout
                label={copiedCode ? 'COPIED ✓' : 'TAP TO COPY'}
                value={lobby.code}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="border-[4px] border-[#17608E] bg-white p-3 shadow-[0_6px_0_rgba(14,62,96,0.35)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="QR-Code vergrößern"
            >
              <canvas
                ref={desktopQrCanvasRef}
                className="w-40 h-40 sm:w-44 sm:h-44 block"
              />
            </button>
          </CrystalPanel>

          {/* Rechtes Kristall-Panel: Optionen, Spieler & PLAY Button */}
          <CrystalPanel title="PLAYERS" contentClassName="gap-4 py-5 px-4 sm:px-5">
            <LobbyGameSettings
              gameId={lobby.gameId}
              settings={lobby.settings}
              isHost={canEditSettings}
              onUpdate={handleUpdateSettings}
            />

            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between w-full px-1">
                <span className="font-arcade text-xs text-[#15608E] uppercase">
                  PLAYERS ({activePlayers.length}/{lobby.maxPlayers})
                </span>
                <span className="font-arcade text-xs text-[#17689A] uppercase">
                  {readyCount}/{activePlayers.length} READY
                </span>
              </div>

              <div className="w-full flex flex-wrap items-center gap-2">
                {activePlayers.map((p, idx) => {
                  const isMe = p.id === currentUser.id;
                  return (
                    <div
                      key={p.id || idx}
                      className={`flex items-center gap-2 border-[3px] px-3 py-1.5 ${
                        p.isReady
                          ? 'bg-[#2B9FD6] border-[#0E5A8A] text-white'
                          : 'bg-[#B8ECFD] border-[#17608E] text-[#15608E]'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar config={p.avatar} size={28} />
                        {p.isHost && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center bg-[#F6B969] border border-[#9E5D19] text-[#15608E]">
                            <Crown className="h-2 w-2 fill-current" />
                          </span>
                        )}
                      </div>
                      <span className="font-arcade text-xs sm:text-sm uppercase truncate max-w-[130px]">
                        {p.name}
                        {isMe ? ' (YOU)' : ''}
                      </span>
                      {p.isReady && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full pt-1">{actionButton}</div>
          </CrystalPanel>
        </div>
      </div>

      {/* QR-Code Zoom-Modal im Crystal-Panel-Stil */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#103858]/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <CrystalPanel topTabLabel="QR CODE" title={lobby.code} contentClassName="gap-3.5">
              <div className="border-[4px] border-[#17608E] bg-white p-3">
                <canvas ref={qrModalCanvasRef} width={220} height={220} className="block" />
              </div>

              <div className="flex items-center gap-2 w-full justify-center">
                <CrystalButton size="sm" variant="secondary" onClick={handleCopyCode}>
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>COPY</span>
                </CrystalButton>
                <CrystalButton size="sm" onClick={() => setIsQrModalOpen(false)}>
                  OK
                </CrystalButton>
              </div>
            </CrystalPanel>
          </div>
        </div>
      )}
    </div>
  );
}
