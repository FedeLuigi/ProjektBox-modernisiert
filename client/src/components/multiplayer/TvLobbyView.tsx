import { useEffect, useRef, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import {
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
} from '../CrystalUI';

interface TvLobbyViewProps {
  lobby: Lobby;
  gameTitle?: string;
  categoryLabel?: string;
  categoryBadgeClass?: string;
  onLeave: () => void;
  onGameStart: (lobby?: Lobby) => void;
}

export function TvLobbyView({
  lobby: initialLobby,
  gameTitle,
  onLeave,
  onGameStart,
}: TvLobbyViewProps) {
  const [lobby, setLobby] = useState<Lobby>(initialLobby);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const joinUrl = getLobbyJoinUrl(lobby.code);
  const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
  const readyCount = activePlayers.filter((p) => p.isReady).length;
  const allReady =
    activePlayers.length >= lobby.minPlayers &&
    activePlayers.length <= lobby.maxPlayers &&
    activePlayers.every((p) => p.isReady);

  useEffect(() => {
    if (canvasRef.current && joinUrl) {
      renderQrCodeToCanvas(canvasRef.current, joinUrl, 220).catch(console.error);
    }
  }, [joinUrl]);

  useEffect(() => {
    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setLobby(updatedLobby);
      onGameStart(updatedLobby);
    });

    return () => {
      unsubUpdated();
      unsubStarted();
    };
  }, [onGameStart]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleStartGame = async () => {
    if (!allReady || isStarting) return;
    setIsStarting(true);
    try {
      await socketService.startLobby();
    } catch {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between text-[#15608E] select-none animate-fade-in">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <CrystalButton size="sm" tilt="left" onClick={onLeave}>
          EXIT
        </CrystalButton>

        <CrystalReadout value={gameTitle || lobby.name} />

        <ConnectionStatusBadge />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col overflow-y-auto px-2.5 pt-4 pb-3">
        <div className="my-auto grid w-full items-center gap-6 grid-cols-1 md:grid-cols-2">
          {/* Linkes Kristall-Panel: QR-Code & Lobby-Code */}
          <CrystalPanel topTabLabel="TV LOBBY" title={gameTitle || lobby.name} contentClassName="gap-4 py-5">
            <div className="border-[4px] border-[#17608E] bg-white p-3.5 shadow-[0_6px_0_rgba(14,62,96,0.35)]">
              <canvas ref={canvasRef} className="block" />
            </div>

            <div onClick={handleCopy} className="cursor-pointer">
              <CrystalReadout
                label={copiedCode ? 'COPIED ✓' : 'JOIN CODE'}
                value={lobby.code}
              />
            </div>
          </CrystalPanel>

          {/* Rechtes Kristall-Panel: Verbundene Smartphone-Spieler & PLAY */}
          <CrystalPanel
            title={`PLAYERS (${activePlayers.length}/${lobby.maxPlayers})`}
            contentClassName="gap-4 py-6 px-5"
          >
            {activePlayers.length === 0 ? (
              <div className="w-full py-8 px-4 text-center border-[3px] border-[#17608E] bg-[#B8ECFD]/80">
                <span className="font-arcade text-base tracking-wider text-[#15608E] uppercase">
                  SCAN QR CODE WITH PHONE...
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2.5 w-full">
                {activePlayers.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`flex items-center gap-2.5 border-[3px] px-3.5 py-2 ${
                      player.isReady
                        ? 'bg-[#2B9FD6] border-[#0E5A8A] text-white'
                        : 'bg-[#B8ECFD] border-[#17608E] text-[#15608E]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar config={player.avatar} size={34} />
                      {idx === 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-[#F6B969] border border-[#9E5D19] text-[#15608E]">
                          <Crown className="h-2.5 w-2.5 fill-current" />
                        </span>
                      )}
                    </div>
                    <span className="font-arcade text-sm uppercase">{player.name}</span>
                    {player.isReady && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                  </div>
                ))}
              </div>
            )}

            <CrystalButton
              fullWidth
              size="lg"
              tilt="left"
              disabled={!allReady || isStarting}
              onClick={handleStartGame}
            >
              {activePlayers.length < lobby.minPlayers
                ? `WAITING (${activePlayers.length}/${lobby.minPlayers})`
                : !allReady
                  ? `READY (${readyCount}/${activePlayers.length})`
                  : 'PLAY'}
            </CrystalButton>
          </CrystalPanel>
        </div>
      </main>
    </div>
  );
}
