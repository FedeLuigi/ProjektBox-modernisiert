import { useEffect, useState } from 'react';
import { Dices, Plus, RefreshCw, Smartphone, Tv } from 'lucide-react';
import { type Game } from '../../data/games';
import type { Lobby } from '../../types/multiplayer';
import { socketService } from '../../services/socket';
import { useUserProfile } from '../../utils/userProfile';
import { generateSimpleLobbyName } from '../../utils/nameGenerator';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { InLobbyView } from './InLobbyView';
import { TvLobbyView } from './TvLobbyView';
import { MultiplayerGameView } from './MultiplayerGameView';
import { TvGameView } from './TvGameView';
import {
  LOBBY_LAYOUT_OPTIONS,
  LobbyLayoutModal,
  type LobbyLayoutId,
} from './LobbyLayoutModal';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { ACCENT_PALETTES } from '../CrystalUI';
import { GamePreviewArtwork } from '../GamePreviewArtwork';
import { OpenButton, OpenSubpageHeader } from '../OpenSubpageUI';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
  initialTvMode?: boolean;
}

export function LobbyScreen({ game, onClose, initialLobby, initialTvMode = false }: LobbyScreenProps) {
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(initialLobby || null);
  const [isInGame, setIsInGame] = useState(Boolean(initialLobby?.status === 'in-game'));

  useEffect(() => {
    if (initialLobby) {
      setCurrentLobby(initialLobby);
      if (initialLobby.status === 'in-game') {
        setIsInGame(true);
      }
    }
  }, [initialLobby]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUser = useUserProfile();
  const [createName, setCreateName] = useState(() => generateSimpleLobbyName(initialTvMode));
  const [hasCustomLobbyName, setHasCustomLobbyName] = useState(false);
  const [isTvMode, setIsTvMode] = useState(initialTvMode);
  const [isCreating, setIsCreating] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [lobbyLayout, setLobbyLayout] = useState<LobbyLayoutId>(() => {
    try {
      const saved = localStorage.getItem('projektbox.lobbyLayout') as LobbyLayoutId | null;
      if (saved && LOBBY_LAYOUT_OPTIONS.some((o) => o.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'lobby-card';
  });

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

  const handleCreateLobby = async (e?: React.FormEvent, forceTvMode?: boolean) => {
    if (e) e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    setErrorMsg(null);

    const tvFlag = typeof forceTvMode === 'boolean' ? forceTvMode : isTvMode;
    const finalLobbyName = createName.trim() || generateSimpleLobbyName(tvFlag);

    try {
      const created = await socketService.createLobby(
        finalLobbyName,
        true,
        gameId,
        tvFlag
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

  if (currentLobby) {
    return (
      <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in">
        <BackgroundCometCanvas opacity={0.85} />

        <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-visible">
          {isTvScreenHost ? (
            <TvLobbyView
              lobby={currentLobby}
              gameTitle={game.title}
              categoryLabel={game.category}
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

  const palette = ACCENT_PALETTES[game.accent];

  const handleSelectMode = (tv: boolean) => {
    setIsTvMode(tv);
    if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(tv));
  };

  const handleSelectLayout = (next: LobbyLayoutId) => {
    setLobbyLayout(next);
    try {
      localStorage.setItem('projektbox.lobbyLayout', next);
    } catch {
      // ignore
    }
  };

  const roomNameInput = (borderless = false) => (
    <div className="flex items-stretch gap-2 w-full">
      <input
        id="lobby-name-input"
        type="text"
        maxLength={30}
        value={createName}
        onChange={(e) => {
          const val = e.target.value;
          setCreateName(val);
          setHasCustomLobbyName(val.trim().length > 0);
        }}
        placeholder="Raumnamen eingeben..."
        className={
          borderless
            ? 'font-sans h-11 flex-1 min-w-0 border-b-2 border-white/25 bg-transparent px-2 text-center text-base sm:text-lg font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:outline-none caret-[#FBBF24]'
            : 'font-sans h-11 sm:h-12 landscape:h-9 flex-1 min-w-0 rounded-xl border border-white/20 bg-white/[0.06] px-4 text-center text-sm sm:text-base landscape:text-xs font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:bg-white/[0.09] focus:outline-none caret-[#FBBF24]'
        }
      />

      <div className="group/dice relative flex shrink-0">
        <button
          type="button"
          onClick={handleRollLobbyName}
          title="Zufälligen Namen generieren"
          aria-label="Zufälligen Namen generieren"
          className="flex h-11 sm:h-12 landscape:h-9 w-11 sm:w-12 landscape:w-9 items-center justify-center rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#FDE68A] transition-colors hover:bg-[#F59E0B]/25 active:scale-95 cursor-pointer"
        >
          <Dices className="h-5 w-5 landscape:h-4 landscape:w-4 stroke-[2.2]" />
        </button>

        <div className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap rounded-lg border border-[#F59E0B]/60 bg-[#0F172A] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/dice:opacity-100 group-hover/dice:scale-100 group-focus-within/dice:opacity-100 transition-all duration-150 shadow-lg">
          Zufälligen Namen generieren
        </div>
      </div>
    </div>
  );

  const modeButtons = (
    <div className="grid w-full grid-cols-2 gap-2">
      <OpenButton
        size="sm"
        variant={!isTvMode ? 'amber' : 'secondary'}
        onClick={() => handleSelectMode(false)}
        className="h-10 landscape:h-8"
      >
        <Smartphone className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
        <span>STANDARD</span>
      </OpenButton>

      <OpenButton
        size="sm"
        variant={isTvMode ? 'amber' : 'secondary'}
        onClick={() => handleSelectMode(true)}
        className="h-10 landscape:h-8"
      >
        <Tv className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
        <span>TV SCREEN</span>
      </OpenButton>
    </div>
  );

  const createButton = (
    <OpenButton
      type="submit"
      fullWidth
      size="lg"
      variant="primary"
      disabled={isCreating}
      className="landscape:h-9 landscape:text-xs"
    >
      {isCreating ? (
        <>
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>ERSTELLE...</span>
        </>
      ) : (
        <span>RAUM ERSTELLEN</span>
      )}
    </OpenButton>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-screen-title"
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-visible">
        <OpenSubpageHeader
          backLabel="ZURÜCK"
          onBack={onClose}
          title={game.title}
          titleAction={
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              title="Lobby-Layouts entdecken & umschalten"
              aria-label="Lobby-Layouts entdecken & umschalten"
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          }
          rightSlot={<ConnectionStatusBadge />}
        />

        <main className="tablet-screen-main mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 pt-3 pb-4 landscape:py-2">
          {errorMsg && (
            <div className="font-arcade mb-4 w-full max-w-xl rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
              {errorMsg}
            </div>
          )}

          {/* 1. SPLIT-BÜHNE: Links Spiel-Vorschau, rechts Lobby-Setup */}
          {lobbyLayout === 'lobby-split' && (
            <div className="my-auto grid w-full max-w-4xl grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-8">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                  <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                  <span
                    style={{ backgroundColor: palette.bg }}
                    className="font-arcade absolute bottom-3 left-3 rounded-full px-3 py-1 text-[11px] text-white uppercase shadow"
                  >
                    {game.players} • {game.duration}
                  </span>
                </div>
                <div className="px-1">
                  <h2 id="lobby-screen-title" className="font-arcade text-xl tracking-wider text-white uppercase">
                    {game.title}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">{game.description}</p>
                </div>
              </div>

              <form
                onSubmit={handleCreateLobby}
                className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="border-b-2 border-[#F59E0B] self-start pb-0.5">
                  <span className="font-arcade text-base tracking-wider text-white uppercase">
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    RAUM-NAME
                  </label>
                  {roomNameInput(false)}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {modeButtons}
                  <p className="text-xs text-[#CBD5E1]">
                    {isTvMode ? 'TV als Hauptbildschirm, Smartphones als Controller' : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                {createButton}
              </form>
            </div>
          )}

          {/* 2. OFFENE BÜHNE: Komplett rahmenlos über dem Kometen-Hintergrund */}
          {lobbyLayout === 'lobby-open' && (
            <form
              onSubmit={handleCreateLobby}
              className="my-auto flex w-full max-w-md flex-col items-center gap-6 px-2 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <h2 id="lobby-screen-title" className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                  LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                </h2>
              </div>

              <div className="flex w-full flex-col items-center gap-2">
                <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                  RAUM-NAME
                </label>
                {roomNameInput(true)}
              </div>

              <div className="flex items-center gap-6 border-b border-white/15">
                {[
                  { tv: false, label: 'STANDARD', Icon: Smartphone },
                  { tv: true, label: 'TV SCREEN', Icon: Tv },
                ].map(({ tv, label, Icon }) => {
                  const active = isTvMode === tv;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSelectMode(tv)}
                      className={`font-arcade relative inline-flex items-center gap-2 pb-2 text-xs sm:text-sm tracking-wider uppercase transition-colors cursor-pointer ${
                        active ? 'text-[#FDE68A]' : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                      {active && (
                        <span className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-[#CBD5E1] -mt-3">
                {isTvMode ? 'TV als Hauptbildschirm, Smartphones als Controller' : 'Alle spielen direkt auf diesem Gerät'}
              </p>

              <div className="w-full max-w-xs">{createButton}</div>
            </form>
          )}

          {/* 3. BANNER-FOKUS: Spiel-Artwork als atmosphärischer Header-Streifen */}
          {lobbyLayout === 'lobby-hero-banner' && (
            <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0F172A]/80 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/45 to-transparent" />
                <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between gap-2">
                  <div>
                    <h2 id="lobby-screen-title" className="font-arcade text-lg sm:text-xl tracking-wider text-white uppercase">
                      LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                    </h2>
                    <p className="text-xs text-[#CBD5E1] truncate">{game.subtitle}</p>
                  </div>
                  <span
                    style={{ backgroundColor: palette.bg }}
                    className="font-arcade shrink-0 rounded-full px-2.5 py-0.5 text-[10px] text-white uppercase"
                  >
                    {game.players}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateLobby} className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    RAUM-NAME
                  </label>
                  {roomNameInput(false)}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {modeButtons}
                </div>

                {createButton}
              </form>
            </div>
          )}

          {/* 4. KOMPAKT-STREIFEN: Horizontale Steuerleiste */}
          {lobbyLayout === 'lobby-compact-dock' && (
            <div className="my-auto flex w-full max-w-4xl flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
                  <h2 id="lobby-screen-title" className="font-arcade text-xl sm:text-2xl tracking-wider text-white uppercase">
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </h2>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  {game.players} • {game.duration} • {isTvMode ? 'TV als Hauptbildschirm' : 'Direkt auf diesem Gerät'}
                </p>
              </div>

              <form
                onSubmit={handleCreateLobby}
                className="flex w-full flex-col md:flex-row items-stretch md:items-center gap-3 rounded-2xl border border-white/15 bg-[#0F172A]/75 p-4 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="flex-1 min-w-0">{roomNameInput(false)}</div>
                <div className="w-full md:w-64 shrink-0">{modeButtons}</div>
                <div className="w-full md:w-48 shrink-0">{createButton}</div>
              </form>
            </div>
          )}

          {/* 5. KLASSIK-GLAS: Zentrierte dunkle Glasfläche */}
          {lobbyLayout === 'lobby-card' && (
            <div className="my-auto w-full max-w-md md:max-w-lg rounded-2xl border border-white/15 bg-[#0F172A]/75 p-5 sm:p-6 landscape:p-4 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
              <div className="mb-4 landscape:mb-2.5 flex items-center justify-center">
                <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
                  <h2
                    id="lobby-screen-title"
                    className="font-arcade text-base sm:text-xl landscape:text-sm tracking-wider text-white uppercase"
                  >
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </h2>
                </div>
              </div>

              <form
                onSubmit={handleCreateLobby}
                className="flex w-full flex-col justify-between gap-4 sm:gap-5 landscape:gap-2.5"
              >
                <div className="flex flex-col items-center w-full">
                  <label
                    htmlFor="lobby-name-input"
                    className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase"
                  >
                    RAUM-NAME
                  </label>
                  {roomNameInput(false)}
                </div>

                <div className="flex flex-col items-center w-full">
                  <span className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {modeButtons}
                  <p className="landscape:hidden mt-2 text-center text-xs text-[#CBD5E1] min-h-[1.15rem]">
                    {isTvMode
                      ? 'TV als Hauptbildschirm, Smartphones als Controller'
                      : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                <div className="w-full pt-1 landscape:pt-0">{createButton}</div>
              </form>
            </div>
          )}
        </main>
      </div>

      <LobbyLayoutModal
        isOpen={showLayoutModal}
        activeLayout={lobbyLayout}
        onSelectLayout={handleSelectLayout}
        onClose={() => setShowLayoutModal(false)}
      />
    </div>
  );
}
