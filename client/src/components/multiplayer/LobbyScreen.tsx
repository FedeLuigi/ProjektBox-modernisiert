import { useEffect, useState } from 'react';
import { ArrowLeft, Dices, Plus, RefreshCw, Smartphone, Tv } from 'lucide-react';
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
import { OpenButton } from '../OpenSubpageUI';

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
    return 'lobby-open-centered';
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
      <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in">
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

  const roomNameInput = (boxed = false, alignLeft = false) => (
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
          boxed
            ? 'font-sans h-11 sm:h-12 landscape:h-9 flex-1 min-w-0 rounded-xl border border-white/20 bg-white/[0.06] px-4 text-center text-sm sm:text-base landscape:text-xs font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:bg-white/[0.09] focus:outline-none caret-[#FBBF24]'
            : `font-sans h-11 landscape:h-9 flex-1 min-w-0 border-b-2 border-white/25 bg-transparent px-2 text-base sm:text-lg landscape:text-sm font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:outline-none caret-[#FBBF24] ${
                alignLeft ? 'text-left' : 'text-center'
              }`
        }
      />

      <div className="group/dice relative flex shrink-0">
        <button
          type="button"
          onClick={handleRollLobbyName}
          title="Zufälligen Namen generieren"
          aria-label="Zufälligen Namen generieren"
          className={`flex items-center justify-center border border-[#F59E0B]/60 text-[#FDE68A] transition-colors active:scale-95 cursor-pointer ${
            boxed
              ? 'h-11 sm:h-12 landscape:h-9 w-11 sm:w-12 landscape:w-9 rounded-xl bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25'
              : 'h-10 w-10 landscape:h-8 landscape:w-8 rounded-lg bg-transparent hover:bg-[#F59E0B]/15 self-end mb-0.5'
          }`}
        >
          <Dices className="h-4.5 w-4.5 landscape:h-4 landscape:w-4 stroke-[2.2]" />
        </button>

        <div className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap rounded-lg border border-[#F59E0B]/60 bg-[#0F172A] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/dice:opacity-100 group-hover/dice:scale-100 group-focus-within/dice:opacity-100 transition-all duration-150 shadow-lg">
          Zufälligen Namen generieren
        </div>
      </div>
    </div>
  );

  const underlineModeTabs = (
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
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {active && (
              <span className="absolute right-0 bottom-0 left-0 h-[3px] rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B]" />
            )}
          </button>
        );
      })}
    </div>
  );

  const pillModeButtons = (
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

      <div className="relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-5 landscape:py-2">
        {/* Kopfzeile: ZURÜCK-Button links & Internetverbindungsanzeige rechts bleiben unverändert; „+“ mittig neben Spieltitel */}
        <header className="tablet-header flex w-full shrink-0 flex-nowrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>ZURÜCK</span>
          </button>

          <div className="flex items-center gap-2 select-none">
            <span className="font-arcade hidden sm:inline text-sm md:text-base tracking-wider text-white/85 uppercase">
              {game.title}
            </span>
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              title="Lobby-Design & Layout wechseln"
              aria-label="Lobby-Design & Layout wechseln"
              className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <ConnectionStatusBadge />
        </header>

        <main className="tablet-screen-main flex flex-1 min-h-0 w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden py-4 landscape:py-1">
          {errorMsg && (
            <div className="font-arcade mb-4 w-full max-w-md rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
              {errorMsg}
            </div>
          )}

          {/* 1. SPLIT-SHOWCASE: Links Artwork, rechts offenes Setup */}
          {lobbyLayout === 'lobby-split-showcase' && (
            <div className="my-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-[1.15fr_1fr] items-center gap-8 md:gap-12">
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
                  <h2 id="lobby-screen-title" className="font-arcade text-xl sm:text-2xl tracking-wider text-white uppercase">
                    {game.title}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#94A3B8]">{game.description}</p>
                </div>
              </div>

              <form onSubmit={handleCreateLobby} className="flex flex-col gap-6">
                <div className="border-b-2 border-[#F59E0B] self-start pb-0.5">
                  <span className="font-arcade text-xl sm:text-2xl tracking-wider text-white uppercase">
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    RAUM-NAME
                  </label>
                  {roomNameInput(false, true)}
                </div>

                <div className="flex flex-col items-start gap-2">
                  <span className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {underlineModeTabs}
                  <p className="text-xs text-[#CBD5E1]">
                    {isTvMode ? 'TV als Hauptbildschirm, Smartphones als Controller' : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                <div className="max-w-xs">{createButton}</div>
              </form>
            </div>
          )}

          {/* 2. EDITORIAL BREITBILD: Großzügige linksbündige Typografie + horizontale Zeile */}
          {lobbyLayout === 'lobby-editorial-wide' && (
            <form onSubmit={handleCreateLobby} className="my-auto flex w-full max-w-5xl flex-col gap-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                  <span className="font-arcade text-xs tracking-widest text-[#FBBF24] uppercase">
                    {game.players} • {game.duration}
                  </span>
                  <h2 id="lobby-screen-title" className="font-arcade mt-1 text-3xl sm:text-5xl tracking-wider text-white uppercase">
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </h2>
                </div>
                <p className="max-w-md text-xs sm:text-sm text-[#94A3B8]">{game.description}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_auto_auto] items-end gap-6 lg:gap-8">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    RAUM-NAME
                  </label>
                  {roomNameInput(false, true)}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    MODUS
                  </span>
                  {underlineModeTabs}
                </div>

                <div className="w-full lg:w-56">{createButton}</div>
              </div>
            </form>
          )}

          {/* 3. BÜHNE + BOTTOM-LEISTE: Oben Showcase, unten durchgängige offene Startleiste */}
          {lobbyLayout === 'lobby-bottom-bar' && (
            <form onSubmit={handleCreateLobby} className="flex flex-1 min-h-0 w-full flex-col justify-between gap-6">
              <div className="my-auto grid w-full grid-cols-1 md:grid-cols-[1fr_1.1fr] items-center gap-8 py-4">
                <div className="aspect-[16/10] w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
                  <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-3">
                  <span
                    style={{ backgroundColor: palette.bg }}
                    className="font-arcade self-start rounded-full px-3 py-1 text-xs text-white uppercase"
                  >
                    {game.players} • {game.duration}
                  </span>
                  <h2 id="lobby-screen-title" className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase">
                    {game.title}
                  </h2>
                  <p className="max-w-lg text-sm sm:text-base text-[#CBD5E1]">{game.description}</p>
                </div>
              </div>

              <div className="flex w-full flex-col lg:flex-row items-stretch lg:items-end gap-5 border-t border-white/15 pt-5">
                <div className="flex-1 min-w-0">{roomNameInput(false, true)}</div>
                <div className="self-center lg:self-end shrink-0">{underlineModeTabs}</div>
                <div className="w-full lg:w-56 shrink-0">{createButton}</div>
              </div>
            </form>
          )}

          {/* 4. SCHWEBENDE GLAS-KARTE */}
          {lobbyLayout === 'lobby-glass-card' && (
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

              <form onSubmit={handleCreateLobby} className="flex w-full flex-col justify-between gap-4 sm:gap-5 landscape:gap-2.5">
                <div className="flex flex-col items-center w-full">
                  <label
                    htmlFor="lobby-name-input"
                    className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase"
                  >
                    RAUM-NAME
                  </label>
                  {roomNameInput(true, false)}
                </div>

                <div className="flex flex-col items-center w-full">
                  <span className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {pillModeButtons}
                  <p className="landscape:hidden mt-2 text-center text-xs text-[#CBD5E1] min-h-[1.15rem]">
                    {isTvMode ? 'TV als Hauptbildschirm, Smartphones als Controller' : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                <div className="w-full pt-1 landscape:pt-0">{createButton}</div>
              </form>
            </div>
          )}

          {/* 5. SEITENLEISTE + BÜHNE */}
          {lobbyLayout === 'lobby-left-rail' && (
            <div className="flex flex-1 min-h-0 w-full flex-col lg:flex-row gap-8 lg:gap-12">
              <aside className="flex shrink-0 flex-col justify-between gap-5 border-b lg:border-b-0 lg:border-r border-white/15 pb-5 lg:pb-0 lg:pr-10 lg:w-80">
                <div className="flex flex-col gap-3">
                  <span
                    style={{ backgroundColor: palette.bg }}
                    className="font-arcade self-start rounded-full px-3 py-1 text-[11px] text-white uppercase"
                  >
                    {game.players} • {game.duration}
                  </span>
                  <h2 id="lobby-screen-title" className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                    {game.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-[#94A3B8]">{game.description}</p>
                </div>

                <div className="hidden lg:block overflow-hidden rounded-2xl border border-white/15 aspect-[16/10]">
                  <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                </div>
              </aside>

              <form onSubmit={handleCreateLobby} className="my-auto flex flex-1 flex-col justify-center gap-7">
                <div className="border-b-2 border-[#F59E0B] self-start pb-1">
                  <span className="font-arcade text-2xl sm:text-3xl tracking-wider text-white uppercase">
                    LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-w-2xl">
                  <label htmlFor="lobby-name-input" className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    RAUM-NAME
                  </label>
                  {roomNameInput(false, true)}
                </div>

                <div className="flex flex-col items-start gap-2">
                  <span className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase">
                    SPIELMODUS
                  </span>
                  {underlineModeTabs}
                </div>

                <div className="max-w-xs">{createButton}</div>
              </form>
            </div>
          )}

          {/* 6. OFFENE BÜHNE (ZENTRIERT) */}
          {lobbyLayout === 'lobby-open-centered' && (
            <form
              onSubmit={handleCreateLobby}
              className="my-auto flex w-full max-w-md flex-col items-center gap-6 landscape:gap-3 px-2 text-center"
            >
              <div className="border-b-2 border-[#F59E0B] px-3 pb-1">
                <h2
                  id="lobby-screen-title"
                  className="font-arcade text-2xl sm:text-3xl landscape:text-xl tracking-wider text-white uppercase"
                >
                  LOBBY <span className="text-[#FBBF24]">STARTEN</span>
                </h2>
              </div>

              <div className="flex w-full flex-col items-center gap-2 landscape:gap-1">
                <label
                  htmlFor="lobby-name-input"
                  className="font-arcade text-xs tracking-wider text-[#94A3B8] uppercase"
                >
                  RAUM-NAME
                </label>
                {roomNameInput(false, false)}
              </div>

              {underlineModeTabs}

              <p className="landscape:hidden text-xs text-[#CBD5E1] -mt-3">
                {isTvMode
                  ? 'TV als Hauptbildschirm, Smartphones als Controller'
                  : 'Alle spielen direkt auf diesem Gerät'}
              </p>

              <div className="w-full max-w-xs">{createButton}</div>
            </form>
          )}
        </main>

        <div aria-hidden="true" className="hidden sm:block h-2" />
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
