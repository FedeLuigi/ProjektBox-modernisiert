import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Crown,
  HelpCircle,
  Layers,
  Palette,
  Play,
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
  HEADER_BACK_BTN,
  HEADER_ROW,
  STAGE_TWO_COL,
  getGameTheme,
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

  const theme = getGameTheme(lobby.gameId);

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

        <ConnectionStatusBadge />
      </header>

      {/* ─── 2. ZWEIGETEILTE BÜHNE (offen, ohne verschachtelte Kästen) ─── */}
      <main className={`${STAGE_TWO_COL} overflow-y-auto overscroll-y-contain scrollbar-none px-2.5 py-3`}>
        <div className="grid w-full items-center gap-6 sm:gap-8 md:gap-10 lg:gap-12 grid-cols-1 text-center md:grid-cols-[1fr_1.15fr] md:text-left landscape:grid-cols-[1fr_1.15fr] landscape:text-left">
          {/* Linke Seite: Spiel-Titel, QR-Code & Beitrittscode */}
          <div className="flex flex-col items-center md:items-start landscape:items-start">
            <h1 className="text-2xl sm:text-4xl landscape:text-2xl sm:landscape:text-3xl font-black tracking-tight leading-tight text-white">
              {gameTitle || lobby.name}
            </h1>

            <div className="mt-5 flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-4 justify-center md:justify-start">
              <div className="rounded-[24px] bg-white p-3.5 shadow-lg ring-1 ring-white/15 shrink-0">
                <canvas ref={canvasRef} className="block rounded-xl" />
              </div>

              <div className="flex flex-col items-center md:items-start landscape:items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  Beitrittscode
                </span>

                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={`Beitrittscode ${lobby.code} kopieren`}
                  className="mt-1.5 inline-flex items-center gap-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.11] px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer group"
                >
                  <span className={`font-mono text-3xl sm:text-4xl font-black tracking-[0.22em] pl-[0.22em] text-transparent bg-clip-text bg-gradient-to-r ${theme.codeGradient}`}>
                    {lobby.code}
                  </span>
                  <span className={`grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white ${theme.copyHover} transition-colors`}>
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Live-synchronisierte Spieleinstellungen auf dem TV */}
            {lobby.settings && (
              <div className="mt-4 flex flex-wrap items-center gap-2 portrait:justify-center">
                {lobby.gameId === 'draw-and-guess' ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] text-white/90 text-xs font-bold ring-1 ring-white/15">
                      <Layers className="h-3.5 w-3.5 text-orange-400" />
                      <span>{lobby.settings.rounds || 3} Runden</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] text-white/90 text-xs font-bold ring-1 ring-white/15">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>{lobby.settings.roundDuration || 60}s</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] text-white/90 text-xs font-bold ring-1 ring-white/15">
                      <HelpCircle className="h-3.5 w-3.5 text-yellow-400" />
                      <span>{lobby.settings.hints !== false ? 'Mit Hinweisen' : 'Ohne Hinweise'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] text-white/90 text-xs font-bold ring-1 ring-white/15">
                      <Palette className="h-3.5 w-3.5 text-orange-400" />
                      <span>Kategorie: {lobby.settings.category || 'Alle'}</span>
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] text-white/90 text-xs font-bold ring-1 ring-white/15">
                    <Layers className="h-3.5 w-3.5 text-purple-400" />
                    <span>
                      {lobby.settings.rounds === 1 ? '1 Runde' : `Best of ${lobby.settings.rounds || 3}`}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Rechte Seite: Kompakte Spieler-Chips & Start-Button */}
          <div className="flex flex-col w-full text-left gap-5">
            <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93]">
              <span className="inline-flex items-center gap-1.5 text-white/80">
                <Users className={`h-3.5 w-3.5 ${theme.accentText}`} />
                <span>
                  Spieler ({activePlayers.length}/{lobby.maxPlayers})
                </span>
              </span>
              <span>{readyCount}/{activePlayers.length} bereit</span>
            </div>

            {activePlayers.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.08]">
                <Users className="h-7 w-7 text-[#8E8E93] mb-2" />
                <span className="text-sm font-bold text-white/75">
                  Warte auf Spieler…
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {activePlayers.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 ring-1 animate-fade-in ${
                      player.isReady
                        ? 'bg-emerald-500/12 ring-emerald-500/35'
                        : 'bg-[#18181E] ring-white/12'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar config={player.avatar} size={36} />
                      {idx === 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs">
                          <Crown className="h-2.5 w-2.5 fill-current" />
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-bold text-white max-w-[140px] sm:max-w-[220px] md:max-w-none md:truncate-none">
                      {player.name}
                    </span>

                    {player.isReady ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400 stroke-[2.75]" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={!allReady || isStarting}
              onClick={handleStartGame}
              className={`${BTN_PRIMARY_BASE} ${
                allReady && !isStarting ? theme.primaryBtn : BTN_PRIMARY_DISABLED
              }`}
            >
              <Play className="h-4 w-4 fill-current" />
              <span>
                {activePlayers.length < lobby.minPlayers
                  ? `Warte auf ${lobby.minPlayers} Spieler…`
                  : !allReady
                    ? `Warte auf Bereit (${readyCount}/${activePlayers.length})`
                    : 'Spiel starten'}
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
