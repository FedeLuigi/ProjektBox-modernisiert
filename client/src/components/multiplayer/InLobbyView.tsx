import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Play,
  QrCode,
  Tv,
  X,
} from 'lucide-react';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { getLobbyJoinUrl, renderQrCodeToCanvas } from '../../utils/qrCodeHelper';
import { Avatar } from '../Avatar';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LobbyGameSettings } from './LobbyGameSettings';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_SUCCESS_CONFIRMED,
  BTN_SUCCESS_READY,
  HEADER_BACK_BTN,
  HEADER_ROW,
  getGameTheme,
} from '../../styles/uiTokens';

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

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const desktopQrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrModalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const joinUrl = getLobbyJoinUrl(lobby.code);

  const currentUser = getUserProfile();

  // Im TV-Modus ist der TV-Screen kein Mitglied der Lobby, sondern nur der Großbildschirm!
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

  // Wer darf das Spiel starten?
  // Im regulären Modus: Nur der Host
  // Im TV-Modus: Der Raumleiter (Spieler 1 auf Handy) oder jeder Smartphone-Spieler, sobald alle bereit sind!
  const canStartGame = lobby.isTvMode ? (isRoomLeader || allReady) : isHost;

  // Wer darf die Spieleinstellungen ändern?
  // Ausschließlich der Host (bzw. im TV-Modus der Raumleiter auf dem Smartphone)
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
    if (qrCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrCanvasRef.current, joinUrl, 160).catch(console.error);
    }
    if (desktopQrCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(desktopQrCanvasRef.current, joinUrl, 260).catch(console.error);
    }
  }, [joinUrl, lobby.code]);

  useEffect(() => {
    if (isQrModalOpen && qrModalCanvasRef.current && joinUrl) {
      renderQrCodeToCanvas(qrModalCanvasRef.current, joinUrl, 260).catch(console.error);
    }
  }, [isQrModalOpen, joinUrl, lobby.code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
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
  const theme = getGameTheme(lobby.gameId);

  const actionButton = !isReady ? (
    <button
      type="button"
      onClick={handleToggleReady}
      className={`${BTN_PRIMARY_BASE} ${BTN_SUCCESS_READY}`}
    >
      <Check className="h-4 w-4 stroke-[2.5]" />
      <span>Ich bin bereit</span>
    </button>
  ) : canStartGame ? (
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
        {!allReady
          ? activePlayers.length < lobby.minPlayers
            ? `Warte auf Spieler (${activePlayers.length}/${lobby.minPlayers})`
            : `Warte auf Bereit (${readyCount}/${activePlayers.length})`
          : 'Spiel starten'}
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={handleToggleReady}
      className={`${BTN_PRIMARY_BASE} ${BTN_SUCCESS_CONFIRMED}`}
    >
      <Check className="h-4 w-4 stroke-[2.5]" />
      <span>Bereit ✓</span>
    </button>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between animate-fade-in select-none">
      {/* 1. HEADER: Zurück-Pille & Verbindungsstatus */}
      <header className={HEADER_ROW}>
        <button
          type="button"
          onClick={onLeave}
          className={HEADER_BACK_BTN}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Lobby verlassen</span>
        </button>

        <ConnectionStatusBadge />
      </header>

      <div className="mx-auto flex w-full max-w-md md:max-w-4xl lg:max-w-5xl landscape:max-w-4xl flex-1 flex-col justify-between min-h-0">
        {/* Scrollbarer Mittelbereich: Auf großen Screens ausgewogenes 2-Spalten-Layout mit viel Raum */}
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-y-contain px-2.5 sm:px-4 py-3 md:py-4 landscape:py-1 scrollbar-none">
          {errorMsg && (
            <div className={`mb-4 rounded-2xl p-3 text-center text-xs font-bold animate-fade-in shrink-0 ${theme.infoBox}`}>
              {errorMsg}
            </div>
          )}

          <div className="my-auto grid w-full items-start gap-6 md:grid-cols-[1fr_1.1fr] lg:grid-cols-[1fr_1.15fr] md:gap-8 lg:gap-10 landscape:grid-cols-[1fr_1fr] landscape:gap-6 py-2 landscape:py-0">
            {/* ─── LINKE SPALTE: Titel, Raumcode, großer QR-Code & Spielerliste ─── */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left landscape:items-start landscape:text-left md:col-start-1 md:row-start-1 landscape:col-start-1 landscape:row-start-1 gap-4 sm:gap-5 w-full">
              {/* Spiel-Titel */}
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${theme.accentTextSoft}`}>
                {lobby.isTvMode && <Tv className={`h-3.5 w-3.5 ${theme.accentIcon}`} />}
                <span>{gameTitle || lobby.name}</span>
              </div>

              {/* Beitrittscode */}
              <div className="flex flex-col items-center md:items-start w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1.5">
                  Beitrittscode
                </span>

                <div className="flex items-center justify-center md:justify-start gap-3.5 w-full">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label={`Beitrittscode ${lobby.code} kopieren`}
                    className="inline-flex items-center gap-3 sm:gap-3.5 rounded-3xl px-5 py-3 sm:px-6 sm:py-3.5 landscape:px-4 landscape:py-2 bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/12 transition-all active:scale-95 cursor-pointer group shadow-lg"
                  >
                    <span className={`text-4xl sm:text-5xl landscape:text-3xl font-black tracking-[0.22em] pl-[0.22em] text-transparent bg-clip-text bg-gradient-to-r ${theme.codeGradient}`}>
                      {lobby.code}
                    </span>
                    <span className={`grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ${theme.copyHover} transition-colors`}>
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Auf Smartphones: Kompakter QR-Preview Button mit Klick zum Vergrößern */}
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    title="QR-Code vergrößern"
                    aria-label="QR-Code vergrößern"
                    className="md:hidden group relative rounded-2xl bg-white p-2 shadow-md ring-1 ring-white/20 hover:ring-white/50 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  >
                    <canvas ref={qrCanvasRef} width={62} height={62} className="block rounded-lg" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#161622] text-white shadow ring-1 ring-white/25 group-hover:scale-110 transition-transform">
                      <QrCode className="h-3 w-3" />
                    </span>
                  </button>
                </div>
              </div>

              {/* Auf Desktop, Tablet und TV: Eigener, großzügiger QR-Code Bereich mit klarem Abstand */}
              <div
                onClick={() => setIsQrModalOpen(true)}
                className="hidden md:flex items-center gap-4 p-4 rounded-3xl bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-md transition-all cursor-pointer group shadow-md w-full max-w-md"
                title="Klicken zum Vergrößern"
              >
                <div className="rounded-2xl bg-white p-2.5 shadow-md ring-1 ring-white/15 shrink-0 group-hover:scale-105 transition-transform">
                  <canvas ref={desktopQrCanvasRef} width={120} height={120} className="block rounded-xl" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <QrCode className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>QR-Code zum Beitreten</span>
                  </div>
                  <p className="mt-1 text-xs text-[#8E8E93] leading-relaxed">
                    Mitspieler können den Code einfach mit der Smartphone-Kamera scannen, um direkt der Lobby beizutreten.
                  </p>
                </div>
              </div>

              {/* Spielerliste mit vollständigen Namen auf großen Bildschirmen */}
              <div className="flex flex-col items-center md:items-start w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mb-2.5">
                  Spieler ({activePlayers.length}/{lobby.maxPlayers})
                </span>
                <div className="w-full flex flex-wrap items-center justify-center md:justify-start landscape:justify-start gap-2.5">
                  {activePlayers.map((p, idx) => {
                    const isMe = p.id === currentUser.id;
                    return (
                      <div
                        key={p.id || idx}
                        className={`flex items-center gap-2.5 rounded-full pl-2 pr-3.5 py-1.5 ring-1 transition-all ${
                          p.isReady
                            ? 'bg-emerald-500/12 ring-emerald-500/35'
                            : 'bg-[#18181E] ring-white/12'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar config={p.avatar} size={32} />
                          {p.isHost && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-black shadow-xs">
                              <Crown className="h-2 w-2 fill-current" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-white max-w-[130px] sm:max-w-[200px] md:max-w-none md:truncate-none">
                          {p.name}
                          {isMe ? ' (Du)' : ''}
                        </span>
                        {p.isReady ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-400 stroke-[2.75]" />
                        ) : (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── RECHTE SPALTE: Spieleinstellungen & Haupt-Aktion ─── */}
            <div className="flex flex-col justify-between w-full h-full gap-5 md:col-start-2 md:row-start-1 landscape:col-start-2 landscape:row-start-1">
              <div className="w-full">
                <LobbyGameSettings
                  gameId={lobby.gameId}
                  settings={lobby.settings}
                  isHost={canEditSettings}
                  onUpdate={handleUpdateSettings}
                />
              </div>

              {/* Haupt-Aktion auf Desktop, Tablet und Landscape direkt in der rechten Spalte */}
              <div className="hidden md:block landscape:block w-full pt-2">
                {actionButton}
              </div>
            </div>
          </div>
        </div>

        {/* 3. HAUPT-AKTION UNTEN IM HOCHFORMAT (NUR AUF SMARTPHONES) */}
        <div className="shrink-0 px-1 pt-3 pb-1 md:hidden landscape:hidden">
          {actionButton}
        </div>
      </div>

      {/* QR-Code Zoom-Modal */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-3xl bg-[#14141E] p-6 text-center ring-1 ring-white/15 shadow-2xl flex flex-col items-center gap-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-3.5 right-3.5 rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${theme.accentText}`}>
                {gameTitle || lobby.name}
              </span>
              <h3 className="text-lg font-black text-white">QR-Code scannen</h3>
              <p className="text-xs text-[#8E8E93]">Mitspieler scannen den Code zum direkten Beitritt</p>
            </div>

            <div className="rounded-2xl bg-white p-3.5 shadow-lg ring-1 ring-white/20">
              <canvas ref={qrModalCanvasRef} width={220} height={220} className="block rounded-xl" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#8E8E93]">Code:</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] px-3 py-1.5 text-sm font-mono font-black text-amber-300 transition-colors cursor-pointer"
              >
                <span>{lobby.code}</span>
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/60" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full mt-1 rounded-2xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Fertig
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
