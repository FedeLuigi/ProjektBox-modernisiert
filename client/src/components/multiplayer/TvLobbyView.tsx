import { useEffect, useRef, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { GAMES } from '../../data/games';
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
  const gameAccent = GAMES.find((g) => g.id === lobby.gameId)?.accent ?? 'emerald';
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
    <div className="flex h-full w-full flex-col justify-between text-[#1E293B] select-none animate-fade-in">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onLeave}>
          VERLASSEN
        </CrystalButton>

        <CrystalReadout value={gameTitle || lobby.name} />

        <ConnectionStatusBadge />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col overflow-y-auto px-2.5 pt-4 pb-3">
        <div className="my-auto grid w-full items-stretch gap-6 grid-cols-1 md:grid-cols-2">
          {/* Linkes Kristall-Panel: QR-Code & Lobby-Code */}
          <CrystalPanel
            title="TV-LOBBY"
            accent="amber"
            className="h-full"
            contentClassName="justify-between gap-4 py-6 px-6 sm:px-8"
          >
            <p className="-mt-2 text-center text-xs sm:text-sm font-semibold text-[#475569]">
              Scanne den Code mit deinem Smartphone zum Beitreten.
            </p>

            <div className="w-[75%] max-w-[230px] aspect-square border-[4px] border-[#1E293B] bg-white p-4 shadow-[0_6px_0_rgba(15,23,42,0.3)] flex items-center justify-center mx-auto">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <div onClick={handleCopy} className="cursor-pointer">
              <CrystalReadout
                variant="gold"
                label={copiedCode ? 'KOPIERT!' : 'LOBBY-CODE'}
                value={
                  <span className="tracking-[0.22em] pl-[0.22em] text-xl sm:text-2xl">
                    {lobby.code}
                  </span>
                }
              />
            </div>
          </CrystalPanel>

          {/* Rechtes Kristall-Panel: Verbundene Smartphone-Spieler & SPIEL STARTEN */}
          <CrystalPanel
            title={`SPIELER (${activePlayers.length}/${lobby.maxPlayers})`}
            accent={gameAccent}
            className="h-full"
            contentClassName="justify-between gap-4 py-6 px-5 sm:px-6"
          >
            {activePlayers.length === 0 ? (
              <div className="my-auto w-full py-8 px-4 text-center border-[3px] border-dashed border-[#64748B] bg-[#E2E8F0]/70">
                <span className="font-arcade text-sm sm:text-base tracking-wider text-[#475569] uppercase">
                  Warte auf Mitspieler per QR-Code oder Lobby-Code...
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 w-full my-auto">
                {activePlayers.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`flex w-full items-center justify-between gap-2.5 border-[3px] px-3.5 py-2 shadow-[0_3px_0_rgba(15,23,42,0.18)] ${
                      player.isReady
                        ? 'bg-[#059669] border-[#064E3B] text-white'
                        : 'bg-[#F8FAFC] border-[#334155] text-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar config={player.avatar} size={34} />
                      <span className="font-arcade text-sm uppercase break-all">{player.name}</span>
                      {idx === 0 && (
                        <span className="inline-flex items-center gap-1 border-2 border-[#78350F] bg-[#F59E0B] px-1.5 py-0.5 font-arcade text-[10px] text-[#0F172A] shrink-0">
                          <Crown className="h-3 w-3 fill-current" />
                        </span>
                      )}
                    </div>
                    {player.isReady && <Check className="h-4 w-4 shrink-0 stroke-[3]" />}
                  </div>
                ))}
              </div>
            )}

            <CrystalButton
              fullWidth
              size="lg"
              variant="primary"
              tilt="left"
              disabled={!allReady || isStarting}
              onClick={handleStartGame}
            >
              {activePlayers.length < lobby.minPlayers
                ? `WARTE AUF SPIELER (${activePlayers.length}/${lobby.minPlayers})`
                : !allReady
                  ? `BEREIT (${readyCount}/${activePlayers.length})`
                  : 'SPIEL STARTEN'}
            </CrystalButton>
          </CrystalPanel>
        </div>
      </main>
    </div>
  );
}
