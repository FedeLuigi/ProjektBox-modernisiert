import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Dices,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { type Game, TONE_STYLES } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { getUserProfile } from '../../utils/userProfile';
import { generateSimpleLobbyName } from '../../utils/nameGenerator';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { InLobbyView } from './InLobbyView';
import { TvLobbyView } from './TvLobbyView';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { GameBackground } from '../GameBackground';
import {
  BTN_PRIMARY_BASE,
  BTN_PRIMARY_DISABLED,
  BTN_PRIMARY_ENABLED,
  HEADER_BACK_BTN,
  HEADER_ROW,
  SWITCH_TRACK_OFF,
  SWITCH_TRACK_ON,
} from '../../styles/uiTokens';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
}

export function LobbyScreen({ game, onClose, initialLobby }: LobbyScreenProps) {
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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formular "Lobby erstellen"
  const currentUser = getUserProfile();
  const [createName, setCreateName] = useState(() => generateSimpleLobbyName(false));
  const [hasCustomLobbyName, setHasCustomLobbyName] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleLeaveLobby = async () => {
    await socketService.leaveLobby();
    setCurrentLobby(null);
    setIsInGame(false);
  };

  const myPlayer = currentLobby?.players.find((p) => p.id === currentUser.id);
  const isTvScreenHost = Boolean(currentLobby?.isTvMode && myPlayer?.isTvScreen);
  const style = TONE_STYLES[game.tone];

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

  // 2. Wenn in einer Lobby -> InLobbyView oder TvLobbyView (exakt selbe App-Shell & Hintergrund wie GameSheet)
  if (currentLobby) {
    return (
      <div className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in">
        <BackgroundCometCanvas opacity={0.45} />

        <div className="pointer-events-none absolute inset-0 opacity-30 scale-125 transform-gpu">
          <GameBackground gameId={game.id} />
        </div>

        <div
          className={`pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-70 ${style.glow}`}
        />
        <div
          className={`pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-50 ${style.glow}`}
        />

        <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-hidden">
          {isTvScreenHost ? (
            <TvLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              categoryLabel={game.category}
              categoryBadgeClass={style.badge}
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-screen-title"
      className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none animate-fade-in"
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
      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Zurück-Pille links, Verbindungsstatus rechts */}
        <header className={HEADER_ROW}>
          <button
            type="button"
            onClick={onClose}
            className={HEADER_BACK_BTN}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <ConnectionStatusBadge />
        </header>

        {/* 2. MITTE: Offene Party-Bühne ohne verschachtelte Kästen */}
        <main className="mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col justify-center overflow-y-auto overscroll-y-contain scrollbar-none py-4">
          <div className="flex flex-col items-center text-center mb-6 landscape:mb-4">
            <div
              className={`grid h-16 w-16 sm:h-20 sm:w-20 landscape:h-14 landscape:w-14 place-items-center rounded-[22px] sm:rounded-[26px] shadow-md ring-1 ring-white/[0.12] ${style.artBg} ${style.accentText}`}
            >
              <Icon
                className="h-8 w-8 sm:h-10 sm:w-10 landscape:h-7 landscape:w-7"
                strokeWidth={2.1}
              />
            </div>

            <h1
              id="lobby-screen-title"
              className="mt-3 landscape:mt-2 text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white"
            >
              {game.title}
            </h1>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-2xl bg-rose-500/20 px-3.5 py-2 text-center text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 animate-fade-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateLobby} className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5 px-1">
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
                  className="w-full text-sm font-semibold pl-4 pr-11 py-3 rounded-2xl bg-[#16161E] ring-1 ring-white/12 focus:ring-2 focus:ring-purple-500 outline-none text-white placeholder:text-white/25"
                />
                <button
                  type="button"
                  onClick={handleRollLobbyName}
                  title="Neuen Namen würfeln"
                  aria-label="Neuen Namen würfeln"
                  className="absolute right-2 grid h-8 w-8 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white/75 hover:text-white ring-1 ring-white/10 transition-colors active:scale-90 cursor-pointer"
                >
                  <Dices className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Kompakter TV-Modus Toggle */}
            <div
              onClick={handleToggleTvMode}
              role="switch"
              aria-checked={isTvMode}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl ring-1 cursor-pointer select-none transition-all ${
                isTvMode
                  ? 'bg-purple-500/[0.12] ring-purple-400/35'
                  : 'bg-[#16161E]/80 hover:bg-[#16161E] ring-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <Tv
                  className={`h-4 w-4 transition-colors ${
                    isTvMode ? 'text-purple-300' : 'text-[#8E8E93]'
                  }`}
                />
                <span className="text-sm font-bold text-white">TV-Modus</span>
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

            {/* Ein klarer Start-Button */}
            <button
              type="submit"
              disabled={isCreating}
              className={`mt-1 ${BTN_PRIMARY_BASE} ${
                !isCreating ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
              }`}
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isTvMode && <Tv className="h-4 w-4" />}
                  <span>{isTvMode ? 'TV-Lobby starten' : 'Lobby starten'}</span>
                </>
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
