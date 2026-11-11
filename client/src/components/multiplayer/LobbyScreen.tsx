import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  Dices,
  KeyRound,
  QrCode,
  RefreshCw,
  Sparkles,
  Tv,
  Users,
  Wifi,
} from 'lucide-react';
import { GAMES, type Game, TONE_STYLES } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { generateSimpleLobbyName } from '../../utils/nameGenerator';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { InLobbyView } from './InLobbyView';
import { TvLobbyView } from './TvLobbyView';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';
import { QrScannerModal } from './QrScannerModal';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { GameBackground } from '../GameBackground';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  BTN_SECONDARY_ACCENT,
  BTN_SECONDARY_BASE,
  HEADER_BACK_BTN,
  HEADER_BADGE_PILL,
  HEADER_ROW,
  SEGMENT_CONTAINER,
  SEGMENT_TAB_ACTIVE,
  SEGMENT_TAB_BASE,
  SEGMENT_TAB_INACTIVE,
  STAGE_TWO_COL,
  SURFACE_CARD,
  SWITCH_TRACK_OFF,
  SWITCH_TRACK_ON,
} from '../../styles/uiTokens';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
  onGameChange?: (game: Game) => void;
}

type TabType = 'code' | 'create';

export function LobbyScreen({ game, onClose, initialLobby, onGameChange }: LobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(Boolean(initialLobby?.status === 'in-game'));

  // Synchronisiere initialLobby sofort in den internen Zustand
  useEffect(() => {
    if (initialLobby) {
      setCurrentLobby(initialLobby);
      if (initialLobby.status === 'in-game') {
        setIsInGame(true);
      }
    }
  }, [initialLobby]);

  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // QR-Scanner Modal
  const [showScanner, setShowScanner] = useState(false);

  // Formular "Lobby erstellen"
  const currentUser = getUserProfile();
  const [createName, setCreateName] = useState(() => generateSimpleLobbyName(false));
  const [hasCustomLobbyName, setHasCustomLobbyName] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Formular "Mit Code beitreten"
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);

  const gameId = game.id;

  useEffect(() => {
    const unsubStarted = socketService.onGameStarted(({ lobby: updatedLobby }) => {
      setCurrentLobby(updatedLobby);
      setIsInGame(true);
    });

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updatedLobby }) => {
      setCurrentLobby((prev) => (prev ? { ...prev, ...updatedLobby } : updatedLobby));
    });

    return () => {
      unsubStarted();
      unsubUpdated();
    };
  }, [gameId]);

  // Fehler nach 4 Sekunden ausblenden
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleRollLobbyName = () => {
    setCreateName(generateSimpleLobbyName(isTvMode, createName));
    setHasCustomLobbyName(false);
  };

  const handleToggleTvMode = () => {
    const nextIsTv = !isTvMode;
    setIsTvMode(nextIsTv);
    if (!hasCustomLobbyName) {
      setCreateName(generateSimpleLobbyName(nextIsTv));
    }
  };

  // Lobby erstellen (immer privat, Zugriff nur via Code oder TV QR-Code)
  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setErrorMsg(null);

    const finalLobbyName = createName.trim() || generateSimpleLobbyName(isTvMode);

    try {
      const created = await socketService.createLobby(
        finalLobbyName,
        true, // Immer privat
        gameId,
        isTvMode
      );
      setCurrentLobby(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lobby konnte nicht erstellt werden.');
    } finally {
      setIsCreating(false);
    }
  };

  // Mit Code beitreten (über Formular oder QR-Scan)
  const joinWithCode = async (codeToJoin: string) => {
    const cleanCode = codeToJoin.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3 || isJoiningCode) return;

    setIsJoiningCode(true);
    setErrorMsg(null);

    try {
      const joined = await socketService.joinLobby(cleanCode);
      setCurrentLobby(joined);
      setShowScanner(false);

      // Falls die beigetretene Lobby zu einem anderen Spiel gehört:
      if (joined.gameId !== game.id) {
        const targetGame = GAMES.find((g) => g.id === joined.gameId);
        if (targetGame && onGameChange) {
          onGameChange(targetGame);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lobby mit diesem Code nicht gefunden.');
    } finally {
      setIsJoiningCode(false);
    }
  };

  const handleJoinByCodeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await joinWithCode(joinCode);
  };

  const handleLeaveLobby = async () => {
    await socketService.leaveLobby();
    setCurrentLobby(null);
    setIsInGame(false);
  };

  const myPlayer = currentLobby?.players.find((p) => p.id === currentUser.id);
  const isTvScreenHost = Boolean(currentLobby?.isTvMode && myPlayer?.isTvScreen);

  // 1. Wenn ein Spiel läuft -> Vollbild TV oder Multiplayer Game View
  if (isInGame && currentLobby) {
    if (isTvScreenHost) {
      return (
        <TvGameView
          lobby={currentLobby}
          gameTitle={game.title}
          onLeave={handleLeaveLobby}
        />
      );
    }

    return (
      <MultiplayerGameView
        lobby={currentLobby}
        gameTitle={game.title}
        onLeave={handleLeaveLobby}
      />
    );
  }

  // 2. Wenn in einer Lobby -> InLobbyView oder TvLobbyView (exakt selbe App-Shell wie Hauptmenü & Spiel-Vorbereitung)
  if (currentLobby) {
    return (
      <div className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in">
        <BackgroundCometCanvas opacity={0.4} />
        <div className="app-shell relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
          {isTvScreenHost ? (
            <TvLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              onLeave={handleLeaveLobby}
              onGameStart={(startedLobby) => {
                if (startedLobby) setCurrentLobby(startedLobby);
                setIsInGame(true);
              }}
            />
          ) : (
            <InLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              onLeave={handleLeaveLobby}
              onGameStart={(startedLobby) => {
                if (startedLobby) setCurrentLobby(startedLobby);
                setIsInGame(true);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // 3. Lobby Auswahl / Erstellen Screen
  const Icon = game.icon;
  const style = TONE_STYLES[game.tone];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-screen-title"
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in"
    >
      {/* ─── Vollbild-Kometen-Animation hinter Spiel-Details (exakt wie in GameSheet) ─── */}
      <BackgroundCometCanvas opacity={0.45} />

      {/* ─── Spezifischer illustrierter Spiel-Hintergrund (Vollbild) ─── */}
      <div className="absolute inset-0 pointer-events-none opacity-30 scale-125 transform-gpu">
        <GameBackground gameId={game.id} />
      </div>

      {/* ─── Sanftes Ambient-Hintergrundlicht passend zum Spielton ─── */}
      <div
        className={`pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-70 ${style.glow}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50 ${style.glow}`}
      />

      {/* ─── Vollbild-Container mit einheitlichem Raster (.app-shell) ─── */}
      <div className="app-shell relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Zurück-Pille links, Status & Kategorie-Badge rechts */}
        <header className={HEADER_ROW}>
          <button
            type="button"
            onClick={onClose}
            className={HEADER_BACK_BTN}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <div className="flex items-center gap-2.5">
            <ConnectionStatusBadge />
            <span
              className={`${HEADER_BADGE_PILL} uppercase shadow-2xs ${style.badge}`}
            >
              {game.category}
            </span>
          </div>
        </header>

        {/* 2. MITTE: Zweigeteilte Bühne (Links: Icon & Meta, Rechts: Lobby-Option Card) */}
        <main className={`${STAGE_TWO_COL} overflow-y-auto overscroll-y-contain scrollbar-none`}>
          <div className="grid w-full items-center gap-6 sm:gap-8 lg:gap-12 portrait:grid-cols-1 portrait:text-center landscape:grid-cols-[1fr_1.3fr] landscape:text-left lg:grid-cols-[1fr_1.3fr] lg:text-left">
            {/* Linke Seite: Großes Squircle-Icon & Spiel-Präsentation */}
            <div className="flex flex-col portrait:items-center landscape:items-start lg:items-start">
              <div
                className={`grid h-20 w-20 sm:h-26 sm:w-26 landscape:h-18 landscape:w-18 place-items-center rounded-[26px] sm:rounded-[32px] shadow-md ring-1 ring-white/[0.12] ${style.artBg} ${style.accentText}`}
              >
                <Icon
                  className="h-10 w-10 sm:h-13 sm:w-13 landscape:h-9 landscape:w-9"
                  strokeWidth={2.1}
                />
              </div>

              <div
                className={`mt-4 sm:mt-5 landscape:mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${style.accentText}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{game.subtitle}</span>
              </div>

              <h1
                id="lobby-screen-title"
                className="mt-1.5 text-2xl sm:text-4xl landscape:text-2xl sm:landscape:text-3xl font-black tracking-tight leading-tight text-white"
              >
                {game.title}
              </h1>

              {/* Luftige Info-Pillen (Spieleranzahl, Dauer, Online Multiplayer) */}
              <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center portrait:justify-center landscape:justify-start lg:justify-start gap-2.5 text-xs font-semibold text-[#AEAEB2]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 py-1.5 ring-1 ring-white/[0.08] backdrop-blur-md text-white">
                  <Users className="h-3.5 w-3.5 text-purple-300" />
                  <span>{game.players}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 py-1.5 ring-1 ring-white/[0.08] backdrop-blur-md text-white">
                  <Clock3 className="h-3.5 w-3.5 text-purple-300" />
                  <span>{game.duration}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 text-purple-300 px-3.5 py-1.5 ring-1 ring-purple-500/25 backdrop-blur-md font-bold">
                  <Wifi className="h-3.5 w-3.5 text-purple-400" />
                  <span>Online Multiplayer</span>
                </span>
              </div>

              <p className="hidden landscape:block lg:block mt-4 text-xs sm:text-sm leading-relaxed text-[#8E8E93] max-w-sm">
                Tritt einer bestehenden Runde bei, verbinde dich mit dem TV per QR-Code oder erstelle deine eigene Spiel-Lobby.
              </p>
            </div>

            {/* Rechte Seite: Konsistente Lobby-Card */}
            <div className={`flex flex-col w-full text-left ${SURFACE_CARD}`}>
              {/* Fehlermeldung */}
              {errorMsg && (
                <div className="mb-3 rounded-2xl bg-rose-500/20 px-3.5 py-2 text-center text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 animate-fade-in">
                  {errorMsg}
                </div>
              )}

              {/* ─── SEKUNDÄRE SCHNELLAKTION (STUFE 2 ACCENT): TV QR-Code scannen ─── */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className={`${BTN_SECONDARY_BASE} ${BTN_SECONDARY_ACCENT} mb-3.5`}
              >
                <QrCode className="h-4 w-4 text-purple-300" />
                <span>Jetzt scannen (TV QR-Code)</span>
              </button>

              {/* Dezenter Trenner */}
              <div className="relative my-1 mb-3.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <span className="relative bg-[#18181C] px-3 text-[11px] font-medium text-[#8E8E93]">
                  oder manuell beitreten
                </span>
              </div>

              {/* ─── TAB-NAVIGATION (STUFE 4 SEGMENTED: Neutrales Dark-Glass) ─── */}
              <div className={`${SEGMENT_CONTAINER} grid-cols-2 mb-3.5 shrink-0`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`${SEGMENT_TAB_BASE} ${
                    activeTab === 'code' ? SEGMENT_TAB_ACTIVE : SEGMENT_TAB_INACTIVE
                  }`}
                >
                  Mit Code beitreten
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`${SEGMENT_TAB_BASE} ${
                    activeTab === 'create' ? SEGMENT_TAB_ACTIVE : SEGMENT_TAB_INACTIVE
                  }`}
                >
                  Lobby erstellen
                </button>
              </div>

              {/* ─── TAB-INHALTE ─── */}
              <div className="min-h-[232px] flex flex-col justify-center">
                {/* TAB 1: MIT CODE BEITRETEN */}
                {activeTab === 'code' && (
                  <form onSubmit={handleJoinByCodeForm} className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 backdrop-blur-xl animate-fade-in">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 mb-2">
                      <KeyRound className="h-5 w-5" />
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-white">Privatem Raum beitreten</h3>
                    <p className="mt-0.5 text-xs text-[#8E8E93] text-center max-w-xs">
                      Gib den 5-stelligen Code ein oder scanne den QR-Code vom Fernseher.
                    </p>

                    <div className="my-3.5 w-full">
                      <input
                        type="text"
                        maxLength={6}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="z. B. 7K9P2"
                        className="w-full text-center text-xl sm:text-2xl font-mono font-black tracking-[0.25em] px-4 py-2.5 rounded-2xl bg-black/40 ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none uppercase text-white placeholder:text-white/20"
                      />
                    </div>

                    {/* STUFE 1 (PRIMARY): Genau eine Hauptaktion im Formular */}
                    <button
                      type="submit"
                      disabled={joinCode.trim().length < 3 || isJoiningCode}
                      className={`${BTN_PRIMARY_BASE} ${
                        joinCode.trim().length >= 3 && !isJoiningCode
                          ? BTN_PRIMARY_ENABLED
                          : BTN_PRIMARY_DISABLED
                      }`}
                    >
                      {isJoiningCode ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Mit Code beitreten</span>}
                    </button>
                  </form>
                )}

                {/* TAB 2: LOBBY ERSTELLEN */}
                {activeTab === 'create' && (
                  <form onSubmit={handleCreateLobby} className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 backdrop-blur-xl animate-fade-in">
                    <div>
                      <label className="text-xs font-bold text-white/80 block mb-1.5">
                        Lobby-Name
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          maxLength={30}
                          value={createName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreateName(val);
                            setHasCustomLobbyName(val.trim().length > 0);
                          }}
                          placeholder={isTvMode ? 'z. B. TV-Runde' : 'z. B. Spielrunde'}
                          className="w-full text-xs sm:text-sm font-semibold pl-3.5 pr-11 py-2.5 rounded-2xl bg-black/40 ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none text-white placeholder:text-white/25"
                        />
                        <button
                          type="button"
                          onClick={handleRollLobbyName}
                          title="Anderen einfachen Namen vorschlagen"
                          className="absolute right-2 grid h-7 w-7 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white/75 hover:text-white ring-1 ring-white/10 transition-colors active:scale-90 cursor-pointer"
                        >
                          <Dices className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* OPTION: ICH BIN AUF DEM FERNSEHER (STUFE 4 SWITCH) */}
                    <div
                      onClick={handleToggleTvMode}
                      role="switch"
                      aria-checked={isTvMode}
                      className={`flex items-center justify-between p-3 rounded-2xl ring-1 cursor-pointer select-none transition-all ${
                        isTvMode
                          ? 'bg-purple-500/[0.1] ring-purple-400/35 shadow-xs'
                          : 'bg-white/[0.03] hover:bg-white/[0.05] ring-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                            isTvMode
                              ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30'
                              : 'bg-white/5 text-[#8E8E93]'
                          }`}
                        >
                          <Tv className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            <span>Ich bin auf dem Fernseher</span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                              TV
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8E8E93]">
                            Zeigt großen TV-Screen. Spieler steuern per Smartphone.
                          </div>
                        </div>
                      </div>

                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          isTvMode ? SWITCH_TRACK_ON : SWITCH_TRACK_OFF
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isTvMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                    </div>

                    {/* STUFE 1 (PRIMARY): Lobby starten */}
                    <button
                      type="submit"
                      disabled={isCreating}
                      className={`${BTN_PRIMARY_BASE} ${
                        !isCreating ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
                      }`}
                    >
                      {isCreating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {isTvMode && <Tv className="h-4 w-4" />}
                          <span>{isTvMode ? 'TV-Lobby jetzt starten' : 'Lobby jetzt eröffnen'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* ─── KAMERA-SCANNER OVERLAY MODAL ─── */}
      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(code) => joinWithCode(code)}
        onSwitchToCodeEntry={() => {
          setShowScanner(false);
          setActiveTab('code');
        }}
      />
    </div>
  );
}
