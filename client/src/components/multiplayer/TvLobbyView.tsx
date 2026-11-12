import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  QrCode,
  Smartphone,
  Tv,
  Users,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  HEADER_BACK_BTN,
  HEADER_BADGE_PILL,
  HEADER_ROW,
  INFO_PILL,
  STAGE_TWO_COL,
  STATUS_PILL_NEUTRAL,
  STATUS_PILL_SUCCESS,
  SURFACE_CARD,
  SURFACE_ITEM_ROW,
} from '../../styles/uiTokens';

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
  categoryLabel,
  categoryBadgeClass,
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

  // QR-Code rendern
  useEffect(() => {
    if (canvasRef.current && joinUrl) {
      renderQrCodeToCanvas(canvasRef.current, joinUrl, 220).catch(console.error);
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
    <div className="flex h-full w-full flex-col justify-between text-white select-none animate-fade-in">
      {/* ─── 1. KOPFZEILE: Einheitlich zu GameSheet & LobbyScreen (Zurück links, Status & Kategorie rechts) ─── */}
      <header className={HEADER_ROW}>
        <button
          type="button"
          onClick={onLeave}
          className={HEADER_BACK_BTN}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Lobby beenden</span>
        </button>

        <div className="flex items-center gap-2.5">
          <ConnectionStatusBadge />
          <span
            className={`${HEADER_BADGE_PILL} uppercase shadow-2xs ${
              categoryBadgeClass || 'bg-purple-500/18 text-purple-200 ring-1 ring-purple-400/35'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span>{categoryLabel ? `TV • ${categoryLabel}` : 'TV-Modus'}</span>
          </span>
        </div>
      </header>

      {/* ─── 2. ZWEIGETEILTE BÜHNE (wie GameSheet & LobbyScreen) ─── */}
      <main className={`${STAGE_TWO_COL} overflow-y-auto overscroll-y-contain scrollbar-none`}>
        <div className="grid w-full items-center gap-6 sm:gap-8 lg:gap-12 portrait:grid-cols-1 portrait:text-center landscape:grid-cols-[1fr_1.25fr] landscape:text-left lg:grid-cols-[1fr_1.25fr] lg:text-left">
          {/* Linke Seite: Spiel-Präsentation, QR-Code & Beitrittscode */}
          <div className="flex flex-col portrait:items-center landscape:items-start lg:items-start">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-300">
              <QrCode className="h-3.5 w-3.5" />
              <span>{lobby.name} • Fernseher-Lobby</span>
            </div>

            <h1 className="mt-1.5 text-2xl sm:text-4xl landscape:text-2xl sm:landscape:text-3xl font-black tracking-tight leading-tight text-white">
              {gameTitle || lobby.name}
            </h1>

            {/* Konsistente Info-Pillen */}
            <div className="mt-3.5 flex flex-wrap items-center portrait:justify-center landscape:justify-start lg:justify-start gap-2.5">
              <span className={INFO_PILL}>
                <Users className="h-3.5 w-3.5 text-purple-300" />
                <span>
                  {activePlayers.length}/{lobby.maxPlayers} Spieler
                </span>
              </span>
              <span className={INFO_PILL}>
                <Smartphone className="h-3.5 w-3.5 text-purple-300" />
                <span>Handy-Steuerung</span>
              </span>
            </div>

            {/* Ruhiger QR- & Beitrittscode-Block im selben Stil */}
            <div className="mt-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4 portrait:justify-center">
              <div className="rounded-[24px] bg-white p-3.5 shadow-lg ring-1 ring-white/15 shrink-0">
                <canvas ref={canvasRef} className="block rounded-xl" />
              </div>

              <div className="flex flex-col portrait:items-center landscape:items-start lg:items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  Beitrittscode oder Scan
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="mt-1.5 inline-flex items-center gap-3 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer group"
                >
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
                    {lobby.code}
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white group-hover:bg-purple-500/40 transition-colors">
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </span>
                </button>

                <span className="mt-2 text-xs font-semibold text-purple-300">
                  {copiedCode ? 'Link kopiert' : 'Tippen, um Einladungslink zu kopieren'}
                </span>
                <p className="mt-1.5 text-xs text-[#8E8E93] max-w-xs leading-relaxed">
                  Scanne den QR-Code mit der Smartphone-Kamera, um direkt der TV-Runde beizutreten.
                </p>
              </div>
            </div>
          </div>

          {/* Rechte Seite: Einheitliche Dark-Glass-Karte (SURFACE_CARD) */}
          <div className={`flex flex-col w-full text-left ${SURFACE_CARD}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Mitspieler im Raum
                </h2>
                <p className="mt-0.5 text-xs text-[#8E8E93]">
                  {activePlayers.length} von {lobby.maxPlayers} Spielern beigetreten • {readyCount} bereit
                </p>
              </div>

              <span className={STATUS_PILL_SUCCESS}>
                Live
              </span>
            </div>

            {/* Spieler-Karten */}
            <div className="mt-4 flex flex-col gap-2.5 min-h-[168px]">
              {activePlayers.length === 0 ? (
                <div className="my-auto py-8 px-4 text-center flex flex-col items-center justify-center rounded-2xl bg-black/25 ring-1 ring-white/[0.08]">
                  <Users className="h-7 w-7 text-[#8E8E93] mb-2" />
                  <span className="text-sm font-bold text-white/80">
                    Warte auf Spieler mit Smartphone...
                  </span>
                  <span className="text-xs text-[#8E8E93] mt-1">
                    Scanne den QR-Code oder gib den Raum-Code am Handy ein.
                  </span>
                </div>
              ) : (
                activePlayers.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`flex items-center justify-between gap-3 ${SURFACE_ITEM_ROW} animate-fade-in`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar config={player.avatar} size={44} />
                        {idx === 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs">
                            <Crown className="h-2.5 w-2.5 fill-current" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{player.name}</span>
                          <span className="text-xs font-semibold text-purple-400 shrink-0">
                            (Spieler {idx + 1})
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-[#8E8E93]">
                          Steuert über Smartphone
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 ${
                        player.isReady ? STATUS_PILL_SUCCESS : STATUS_PILL_NEUTRAL
                      }`}
                    >
                      {player.isReady ? 'Bereit ✓' : 'Wartet...'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Einziger Primary-CTA am Ende der Karte (Stufe 1) */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={!allReady || isStarting}
                onClick={handleStartGame}
                className={`${BTN_PRIMARY_BASE} ${
                  allReady && !isStarting ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
                }`}
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  {activePlayers.length < lobby.minPlayers
                    ? `Warte auf ${lobby.minPlayers} Spieler...`
                    : !allReady
                      ? 'Warte bis alle Spieler bereit sind...'
                      : 'Spiel auf Fernseher starten'}
                </span>
              </button>

              <p className="text-[11px] text-center text-[#8E8E93]">
                Der Fernseher dient als Großbild-Anzeige. Gestartet wird am TV oder durch Spieler 1.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
