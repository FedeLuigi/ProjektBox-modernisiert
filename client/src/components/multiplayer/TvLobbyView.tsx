import { useEffect, useRef, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import { OpenButton, OpenSubpageHeader } from '../OpenSubpageUI';

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
    <div className="flex h-full w-full flex-col justify-between text-white select-none animate-fade-in">
      <OpenSubpageHeader
        backLabel="VERLASSEN"
        onBack={onLeave}
        title={gameTitle || lobby.name}
        rightSlot={<ConnectionStatusBadge />}
      />

      <main className="tablet-screen-main mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-4 pb-4">
        <div className="tablet-portrait-stack my-auto grid w-full items-stretch gap-6 grid-cols-1 md:grid-cols-2">
          {/* Linkes Open-Gallery-Panel: QR-Code & Lobby-Code */}
          <div className="flex h-full flex-col items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
              <span className="font-arcade text-base tracking-wider text-white uppercase">
                TV-<span className="text-[#FBBF24]">LOBBY</span>
              </span>
            </div>

            <p className="text-center text-xs sm:text-sm text-[#CBD5E1]">
              Scanne den Code mit deinem Smartphone zum Beitreten.
            </p>

            <div className="w-[75%] max-w-[230px] aspect-square rounded-2xl border border-white/20 bg-white p-4 shadow-[0_14px_30px_rgba(0,0,0,0.4)] flex items-center justify-center mx-auto">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-6 py-2.5 transition-colors hover:bg-[#F59E0B]/25 cursor-pointer active:scale-95"
            >
              <span className="font-arcade text-[10px] tracking-wider text-[#FDE68A]/80 uppercase">
                {copiedCode ? 'KOPIERT!' : 'LOBBY-CODE'}
              </span>
              <span className="font-arcade tracking-[0.22em] pl-[0.22em] text-xl sm:text-2xl text-[#FDE68A] uppercase">
                {lobby.code}
              </span>
            </button>
          </div>

          {/* Rechtes Open-Gallery-Panel: Verbundene Smartphone-Spieler & SPIEL STARTEN */}
          <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-6 sm:p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-center">
              <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
                <span className="font-arcade text-base tracking-wider text-white uppercase">
                  SPIELER <span className="text-[#FBBF24]">({activePlayers.length}/{lobby.maxPlayers})</span>
                </span>
              </div>
            </div>

            {activePlayers.length === 0 ? (
              <div className="my-auto w-full rounded-xl border border-dashed border-white/20 bg-white/[0.03] py-8 px-4 text-center">
                <span className="font-arcade text-sm sm:text-base tracking-wider text-[#94A3B8] uppercase">
                  Warte auf Mitspieler per QR-Code oder Lobby-Code...
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 w-full my-auto">
                {activePlayers.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 ${
                      player.isReady
                        ? 'bg-[#10B981]/20 border-[#34D399]/50 text-white'
                        : 'bg-white/[0.04] border-white/15 text-white/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar config={player.avatar} size={34} />
                      <span className="font-arcade text-sm uppercase break-all">{player.name}</span>
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#F59E0B]/50 bg-[#F59E0B] px-1.5 py-0.5 font-arcade text-[10px] text-[#0F172A] shrink-0">
                          <Crown className="h-3 w-3 fill-current" />
                        </span>
                      )}
                    </div>
                    {player.isReady && <Check className="h-4 w-4 shrink-0 text-[#34D399] stroke-[3]" />}
                  </div>
                ))}
              </div>
            )}

            <OpenButton
              fullWidth
              size="lg"
              variant="primary"
              disabled={!allReady || isStarting}
              onClick={handleStartGame}
            >
              {activePlayers.length < lobby.minPlayers
                ? `WARTE AUF SPIELER (${activePlayers.length}/${lobby.minPlayers})`
                : !allReady
                  ? `BEREIT (${readyCount}/${activePlayers.length})`
                  : 'SPIEL STARTEN'}
            </OpenButton>
          </div>
        </div>
      </main>
    </div>
  );
}
