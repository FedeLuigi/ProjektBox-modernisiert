import { useEffect, useState } from 'react';
import { Dices, RefreshCw, Smartphone, Tv } from 'lucide-react';
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
          rightSlot={<ConnectionStatusBadge />}
        />

        <main className="tablet-screen-main mx-auto flex w-full max-w-xl flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 pt-3 pb-4 landscape:py-2">
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

            {errorMsg && (
              <div className="font-arcade mb-4 rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/20 px-3 py-2 text-center text-xs text-[#FECDD3] uppercase">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={handleCreateLobby}
              className="flex w-full flex-col justify-between gap-4 sm:gap-5 landscape:gap-2.5"
            >
              {/* Eingabefeld RAUM-NAME mit Würfel-Button */}
              <div className="flex flex-col items-center w-full">
                <label
                  htmlFor="lobby-name-input"
                  className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase"
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
                    className="font-sans h-11 sm:h-12 landscape:h-9 flex-1 min-w-0 rounded-xl border border-white/20 bg-white/[0.06] px-4 text-center text-sm sm:text-base landscape:text-xs font-bold tracking-wide text-white placeholder:text-white/40 uppercase focus:border-[#F59E0B] focus:bg-white/[0.09] focus:outline-none caret-[#FBBF24]"
                  />

                  <div className="group/dice relative flex">
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
              </div>

              {/* Modus-Auswahl ("STANDARD" vs. "TV SCREEN") */}
              <div className="flex flex-col items-center w-full">
                <span className="font-arcade mb-1.5 landscape:mb-1 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#94A3B8] uppercase">
                  SPIELMODUS
                </span>

                <div className="grid w-full grid-cols-2 gap-2">
                  <OpenButton
                    size="sm"
                    variant={!isTvMode ? 'amber' : 'secondary'}
                    onClick={() => {
                      setIsTvMode(false);
                      if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(false));
                    }}
                    className="h-10 landscape:h-8"
                  >
                    <Smartphone className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
                    <span>STANDARD</span>
                  </OpenButton>

                  <OpenButton
                    size="sm"
                    variant={isTvMode ? 'amber' : 'secondary'}
                    onClick={() => {
                      setIsTvMode(true);
                      if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(true));
                    }}
                    className="h-10 landscape:h-8"
                  >
                    <Tv className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
                    <span>TV SCREEN</span>
                  </OpenButton>
                </div>

                <p className="landscape:hidden mt-2 text-center text-xs text-[#CBD5E1] min-h-[1.15rem]">
                  {isTvMode
                    ? 'TV als Hauptbildschirm, Smartphones als Controller'
                    : 'Alle spielen direkt auf diesem Gerät'}
                </p>
              </div>

              {/* Primärer Haupt-CTA: RAUM ERSTELLEN */}
              <div className="w-full pt-1 landscape:pt-0">
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
          </div>
        </main>
      </div>
    </div>
  );
}
