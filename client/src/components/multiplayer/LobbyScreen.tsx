import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Lock,
  QrCode,
  RefreshCw,
  Search,
  Tv,
} from 'lucide-react';
import type { Game } from '../../data/games';
import type {
  Lobby,
  LobbySummary,
} from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { InLobbyView } from './InLobbyView';
import { TvLobbyView } from './TvLobbyView';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';
import { QrScannerModal } from './QrScannerModal';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
}

type TabType = 'browse' | 'code' | 'create';

export function LobbyScreen({ game, onClose, initialLobby }: LobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // QR-Scanner Modal
  const [showScanner, setShowScanner] = useState(false);

  // Formular "Lobby erstellen"
  const currentUser = getUserProfile();
  const [createName, setCreateName] = useState(`${currentUser.name}s Runde`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Formular "Mit Code beitreten"
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);

  const gameId = game.id;

  // Lobbys laden
  const loadLobbies = async () => {
    setIsLoadingLobbies(true);
    try {
      const list = await socketService.fetchLobbies(gameId);
      setLobbies(list);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lobbys konnten nicht abgerufen werden.');
    } finally {
      setIsLoadingLobbies(false);
    }
  };

  useEffect(() => {
    loadLobbies();
    const unsubList = socketService.onListUpdated(() => {
      loadLobbies();
    });
    return () => {
      unsubList();
    };
  }, [gameId]);

  // Fehler nach 4 Sekunden ausblenden
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Lobby erstellen (inkl. Option TV-Modus)
  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setErrorMsg(null);

    try {
      const created = await socketService.createLobby(
        createName,
        isPrivate,
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

  // Lobby beitreten (aus Liste)
  const handleJoinLobby = async (lobbyId: string) => {
    setErrorMsg(null);
    try {
      const joined = await socketService.joinLobby(lobbyId);
      setCurrentLobby(joined);
    } catch (err: any) {
      setErrorMsg(err.message || 'Beitritt fehlgeschlagen.');
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
    loadLobbies();
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

  // 2. Wenn in einer Lobby -> InLobbyView oder TvLobbyView
  if (currentLobby) {
    return (
      <div
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#07070C] text-white select-none animate-fade-in"
      >
        <BackgroundCometCanvas opacity={0.4} />
        <div
          style={{
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          className="relative z-10 flex h-full w-full flex-col px-4 sm:px-6"
        >
          {isTvScreenHost ? (
            <TvLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              onLeave={handleLeaveLobby}
              onGameStart={() => setIsInGame(true)}
            />
          ) : (
            <InLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              onLeave={handleLeaveLobby}
              onGameStart={() => setIsInGame(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // 3. Lobby Auswahl / Erstellen Screen
  const Icon = game.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#07070C] text-white select-none animate-fade-in"
    >
      {/* ─── Kometen-Hintergrund ─── */}
      <BackgroundCometCanvas opacity={0.45} />

      {/* ─── Ambient Glow ─── */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-40 bg-purple-600/30" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-35 bg-indigo-600/25" />

      {/* ─── Vollbild-Container mit Safe-Area ─── */}
      <div
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        className="relative z-10 flex h-full w-full flex-col justify-between px-4 sm:px-6 max-w-2xl mx-auto"
      >
        {/* 1. OBERE LEISTE */}
        <header className="flex shrink-0 items-center justify-between pb-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-black text-white">{game.title} Online</span>
          </div>

          <ConnectionStatusBadge />
        </header>

        {/* ─── Fehlermeldung ─── */}
        {errorMsg && (
          <div className="mb-2 rounded-2xl bg-rose-500/20 px-3.5 py-2 text-center text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* ─── PROMINENTER QR-CODE SCAN BUTTON ─── */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-full py-3.5 px-4 mb-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-98 hover:brightness-110 cursor-pointer"
        >
          <QrCode className="h-4 w-4" />
          <span>Jetzt scannen (TV QR-Code)</span>
        </button>

        {/* 2. TAB-NAVIGATION (Offene Lobbys / Code / Erstellen) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-xl mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Offene Lobbys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Mit Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Lobby erstellen
          </button>
        </div>

        {/* 3. HAUPTBEREICH (JE NACH TAB) */}
        <main className="my-auto flex-1 overflow-y-auto overscroll-y-contain scrollbar-none py-1">
          {/* TAB 1: OFFENE LOBBYS */}
          {activeTab === 'browse' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1 mb-1 text-xs text-[#8E8E93] font-bold">
                <span>Räume in der Nähe</span>
                <button
                  type="button"
                  onClick={loadLobbies}
                  disabled={isLoadingLobbies}
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingLobbies ? 'animate-spin' : ''}`} />
                  <span>Aktualisieren</span>
                </button>
              </div>

              {isLoadingLobbies && lobbies.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E8E93]">Lobbys werden geladen...</div>
              ) : lobbies.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/[0.03] ring-1 ring-white/10 text-center my-4">
                  <Search className="h-8 w-8 text-[#8E8E93] mb-2 opacity-50" />
                  <p className="text-sm font-bold text-white">Keine offenen Lobbys gefunden</p>
                  <p className="mt-1 text-xs text-[#8E8E93] max-w-xs">
                    Erstelle jetzt deine eigene Runde oder scanne den QR-Code auf deinem Fernseher!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white ring-1 ring-white/15 transition-all active:scale-95 cursor-pointer"
                  >
                    + Neue Lobby erstellen
                  </button>
                </div>
              ) : (
                lobbies.map((lob) => (
                  <div
                    key={lob.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-md transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white truncate">{lob.name}</span>
                        {lob.isTvMode && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 text-purple-300 px-1.5 py-0.5 text-[10px] font-black uppercase ring-1 ring-purple-500/30">
                            <Tv className="h-2.5 w-2.5" />
                            TV
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#8E8E93] flex items-center gap-2">
                        <span>Host: {lob.hostName}</span>
                        <span>•</span>
                        <span>
                          {lob.playerCount}/{lob.maxPlayers} Spieler
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJoinLobby(lob.id)}
                      className="shrink-0 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Beitreten
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: MIT CODE BEITRETEN */}
          {activeTab === 'code' && (
            <div className="flex flex-col gap-3 my-2">
              <form onSubmit={handleJoinByCodeForm} className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl animate-fade-in">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 mb-3">
                  <KeyRound className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-black text-white">Privatem Raum beitreten</h3>
                <p className="mt-1 text-xs text-[#8E8E93] text-center max-w-xs">
                  Gib den 5-stelligen Code ein oder scanne den QR-Code vom Fernseher.
                </p>

                <div className="my-5 w-full max-w-xs">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="z. B. 7K9P2"
                    className="w-full text-center text-2xl font-mono font-black tracking-[0.25em] px-4 py-3 rounded-2xl bg-black/40 ring-1 ring-white/20 focus:ring-2 focus:ring-purple-500 outline-none uppercase text-white placeholder:text-white/20"
                  />
                </div>

                <div className="w-full max-w-xs flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={joinCode.trim().length < 3 || isJoiningCode}
                    className={`w-full py-3.5 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                      joinCode.trim().length >= 3 && !isJoiningCode
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/25'
                        : 'bg-white/10 text-white/40 ring-1 ring-white/10 cursor-not-allowed'
                    }`}
                  >
                    {isJoiningCode ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Mit Code beitreten</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="w-full py-3 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-purple-300 ring-1 ring-purple-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Kamera öffnen & QR scannen</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: LOBBY ERSTELLEN */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateLobby} className="flex flex-col gap-3.5 p-5 rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl animate-fade-in my-2">
              <div>
                <label className="text-xs font-bold text-white/80 block mb-1.5">
                  Lobby-Name
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Gib deiner Lobby einen Namen..."
                  className="w-full text-sm font-semibold px-4 py-3 rounded-2xl bg-black/40 ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none text-white placeholder:text-white/25"
                />
              </div>

              {/* OPTION: ICH BIN AUF DEM FERNSEHER (TV-MODUS) */}
              <div
                onClick={() => setIsTvMode(!isTvMode)}
                role="switch"
                aria-checked={isTvMode}
                className={`flex items-center justify-between p-3.5 rounded-2xl ring-1 cursor-pointer select-none transition-all ${
                  isTvMode
                    ? 'bg-purple-600/15 ring-purple-500/40 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.05] ring-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                      isTvMode
                        ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/40'
                        : 'bg-white/5 text-[#8E8E93]'
                    }`}
                  >
                    <Tv className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Ich bin auf dem Fernseher</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        TV
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8E8E93]">
                      Zeigt großen QR-Code & Anzeigebildschirm. Spieler steuern per Handy.
                    </div>
                  </div>
                </div>

                <div
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    isTvMode ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isTvMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>

              {/* Sichtbarkeit: Öffentlich vs Privat */}
              <div
                onClick={() => setIsPrivate(!isPrivate)}
                role="switch"
                aria-checked={isPrivate}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] ring-1 ring-white/10 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${isPrivate ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30' : 'bg-white/5 text-[#8E8E93]'}`}>
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Privater Raum</div>
                    <div className="text-[11px] text-[#8E8E93]">
                      {isPrivate ? 'Nur über QR-Code oder Einladungscode' : 'In der öffentlichen Liste sichtbar'}
                    </div>
                  </div>
                </div>

                <div
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    isPrivate ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPrivate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!createName.trim() || isCreating}
                className={`mt-1 w-full py-3.5 rounded-full text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                  createName.trim() && !isCreating
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/25'
                    : 'bg-white/10 text-white/40 ring-1 ring-white/10 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{isTvMode ? '📺 TV-Lobby jetzt starten' : 'Lobby jetzt eröffnen'}</span>
                )}
              </button>
            </form>
          )}
        </main>

        {/* 4. UNTERER FUSSBEREICH */}
        <footer className="shrink-0 text-center text-[11px] text-[#8E8E93] pt-2">
          Echtzeit-Duelle • TV-Modus & QR-Code-Beitritt aktiv
        </footer>
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
