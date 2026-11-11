import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Crown,
  Play,
  Sparkles,
  Tv,
  Users,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import {
  HEADER_BACK_BTN,
  HEADER_BADGE_PILL,
  HEADER_ROW,
  PRIMARY_BTN_BASE,
  PRIMARY_BTN_DISABLED,
  PRIMARY_BTN_ENABLED,
  SURFACE_CARD,
} from '../../styles/uiTokens';

interface TvLobbyViewProps {
  lobby: Lobby;
  gameTitle?: string;
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
  const allReady =
    activePlayers.length >= lobby.minPlayers &&
    activePlayers.length <= lobby.maxPlayers &&
    activePlayers.every((p) => p.isReady);

  // QR-Code rendern
  useEffect(() => {
    if (canvasRef.current && joinUrl) {
      renderQrCodeToCanvas(canvasRef.current, joinUrl, 300).catch(console.error);
    }
  }, [joinUrl]);

  // Socket.io Live-Updates
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
      // fallback
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
    <div className="relative flex h-full w-full flex-col justify-between text-white select-none">
      {/* ─── 1. KOPFZEILE: Fernseher-Modus & Beenden ─── */}
      <header className={`${HEADER_ROW} border-b border-white/10`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`${HEADER_BADGE_PILL} shrink-0 bg-purple-600/25 text-purple-300 uppercase ring-1 ring-purple-500/35 backdrop-blur-md`}
          >
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">Fernseher-Modus (TV)</span>
            <span className="sm:hidden">TV-Modus</span>
          </div>

          <h1 className="truncate text-lg sm:text-2xl font-black tracking-tight text-white">
            {gameTitle || lobby.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={onLeave}
          className={HEADER_BACK_BTN}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Lobby beenden</span>
        </button>
      </header>

      {/* ─── 2. GROSSBILD-ZENTRALE: QR-Code links, Spielerliste rechts ─── */}
      <main className="my-auto mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-8 lg:gap-12 items-center py-4 overflow-y-auto scrollbar-none">
        {/* Linke Seite: Großer QR-Code mit Rand & leuchtendem Schein */}
        <div className="flex flex-col items-center text-center">
          <div className="p-4 sm:p-5 bg-white rounded-[32px] shadow-[0_0_60px_rgba(168,85,247,0.35)] ring-8 ring-white/20 transition-transform transform-gpu hover:scale-[1.02]">
            <canvas ref={canvasRef} className="rounded-2xl block" />
          </div>

          {/* 5-stelliger Code im Großformat */}
          <div className="mt-5 flex flex-col items-center">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#8E8E93]">
              Oder Beitrittscode eingeben
            </span>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-1.5 inline-flex items-center gap-3 px-6 py-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] ring-2 ring-purple-400/50 backdrop-blur-md active:scale-95 cursor-pointer transition-all"
            >
              <span className="font-mono text-3xl sm:text-4xl font-black tracking-[0.25em] text-white">
                {lobby.code}
              </span>
              <Copy className="h-5 w-5 text-purple-300" />
            </button>

            <span className="mt-2 text-xs font-semibold text-purple-300">
              {copiedCode ? 'Link kopiert! 🎉' : joinUrl}
            </span>

            <p className="mt-3 text-xs text-[#AEAEB2] max-w-xs leading-relaxed">
              📱 Halte deine Smartphone-Kamera auf den QR-Code, um dieser Runde beizutreten.
            </p>
          </div>
        </div>

        {/* Rechte Seite: Spielerliste & TV-Status */}
        <div className={`flex flex-col justify-center ${SURFACE_CARD}`}>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-black text-white">Mitspieler im Raum</h2>
              <p className="text-xs text-[#8E8E93]">
                {activePlayers.length} von {lobby.maxPlayers} Spielern beigetreten
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400">Live-Sync</span>
            </div>
          </div>

          {/* Spieler-Karten */}
          <div className="mt-5 flex flex-col gap-3 min-h-[160px]">
            {activePlayers.length === 0 ? (
              <div className="my-auto py-8 text-center flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl">
                <Users className="h-8 w-8 text-[#8E8E93] mb-2 animate-pulse" />
                <span className="text-sm font-bold text-[#8E8E93]">
                  Warte auf Spieler mit Smartphone...
                </span>
                <span className="text-xs text-[#636366] mt-1">
                  Scanne den QR-Code links, um als Spieler 1 beizutreten.
                </span>
              </div>
            ) : (
              activePlayers.map((player, idx) => (
                <div
                  key={player.id || idx}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-md animate-fade-in"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar config={player.avatar} size={50} />
                      {idx === 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-black shadow-sm">
                          <Crown className="h-3 w-3 fill-current" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>{player.name}</span>
                        <span className="text-xs text-purple-400">
                          (Spieler {idx + 1})
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#8E8E93]">
                        Steuert über Smartphone
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-black px-3.5 py-1.5 rounded-full ring-1 ${
                      player.isReady
                        ? 'bg-emerald-500/25 text-emerald-300 ring-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 ring-amber-500/30 animate-pulse'
                    }`}
                  >
                    {player.isReady ? 'Bereit ✓' : 'Noch nicht bereit'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Start-Button auf Fernseher */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
            <button
              type="button"
              disabled={!allReady || isStarting}
              onClick={handleStartGame}
              className={`${PRIMARY_BTN_BASE} ${
                allReady && !isStarting ? PRIMARY_BTN_ENABLED : PRIMARY_BTN_DISABLED
              }`}
            >
              <Play className="h-5 w-5 fill-current" />
              <span>
                {activePlayers.length < lobby.minPlayers
                  ? `Warte auf ${lobby.minPlayers} Spieler...`
                  : !allReady
                    ? 'Warte bis alle Spieler bereit sind...'
                    : 'Spiel auf Fernseher starten'}
              </span>
            </button>

            <p className="text-[11px] text-center text-[#8E8E93]">
              Der Fernseher dient als Großbild-Anzeige. Die Spieler steuern und starten mit dem Smartphone.
            </p>
          </div>
        </div>
      </main>

      {/* ─── 3. FUSSZEILE ─── */}
      <footer className="shrink-0 text-center text-xs font-semibold text-[#8E8E93] pt-2">
        <Sparkles className="inline h-3.5 w-3.5 text-purple-400 mr-1.5" />
        Echtzeit Socket.io TV-Modus • ProjektBox Multiplayer
      </footer>
    </div>
  );
}
