import { useEffect, useState } from 'react';
import { ArrowLeft, Dices, RefreshCw, Smartphone, Tv } from 'lucide-react';
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
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-screen-title"
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-white select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      {/* Eine einzige durchgängige offene Bühne inkl. integrierter Kopfzeile */}
      <div className="relative z-10 mx-auto flex flex-1 min-h-0 w-full max-w-[1440px] flex-col justify-between px-4 sm:px-6 lg:px-10 py-3 sm:py-5 landscape:py-2">
        {/* Integrierte offene Kopfzeile (ohne harte Trennlinie) */}
        <header className="tablet-header flex w-full shrink-0 flex-nowrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-arcade inline-flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.05] px-3 text-[11px] sm:text-xs tracking-wider text-white/90 uppercase transition-all hover:bg-white/12 hover:text-white cursor-pointer active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>ZURÜCK</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-center select-none">
            <span className="font-arcade text-sm md:text-base tracking-wider text-white/85 uppercase">
              {game.title}
            </span>
            <span className="text-xs text-[#94A3B8]">• {game.players}</span>
          </div>

          <ConnectionStatusBadge />
        </header>

        {/* Offene Hauptbühne direkt über dem Kometen-Hintergrund */}
        <main className="tablet-screen-main flex flex-1 min-h-0 w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden py-4 landscape:py-1">
          {errorMsg && (
            <div className="font-arcade mb-4 w-full max-w-md rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
              {errorMsg}
            </div>
          )}

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
                  className="font-sans h-11 landscape:h-9 flex-1 min-w-0 border-b-2 border-white/25 bg-transparent px-2 text-center text-base sm:text-lg landscape:text-sm font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:outline-none caret-[#FBBF24]"
                />

                <div className="group/dice relative flex shrink-0">
                  <button
                    type="button"
                    onClick={handleRollLobbyName}
                    title="Zufälligen Namen generieren"
                    aria-label="Zufälligen Namen generieren"
                    className="flex h-10 w-10 landscape:h-8 landscape:w-8 items-center justify-center rounded-lg border border-[#F59E0B]/60 bg-transparent text-[#FDE68A] transition-colors hover:bg-[#F59E0B]/15 active:scale-95 cursor-pointer self-end mb-0.5"
                  >
                    <Dices className="h-4.5 w-4.5 landscape:h-4 landscape:w-4 stroke-[2.2]" />
                  </button>

                  <div className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap rounded-lg border border-[#F59E0B]/60 bg-[#0F172A] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/dice:opacity-100 group-hover/dice:scale-100 group-focus-within/dice:opacity-100 transition-all duration-150 shadow-lg">
                    Zufälligen Namen generieren
                  </div>
                </div>
              </div>
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
                    onClick={() => {
                      setIsTvMode(tv);
                      if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(tv));
                    }}
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

            <p className="landscape:hidden text-xs text-[#CBD5E1] -mt-3">
              {isTvMode
                ? 'TV als Hauptbildschirm, Smartphones als Controller'
                : 'Alle spielen direkt auf diesem Gerät'}
            </p>

            <div className="w-full max-w-xs">
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
            </div>
          </form>
        </main>

        <div aria-hidden="true" className="hidden sm:block h-2" />
      </div>
    </div>
  );
}
