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
import {
  CrystalButton,
  CrystalPanel,
} from '../CrystalUI';

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
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-visible">
        <header className="tablet-header flex shrink-0 items-center justify-between gap-2 pb-2">
          <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onClose}>
            ZURÜCK
          </CrystalButton>

          <ConnectionStatusBadge />
        </header>

        <main className="tablet-screen-main mx-auto flex w-full max-w-xl flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-3 pt-2 sm:pt-4 pb-2 sm:pb-4 landscape:pt-1 landscape:pb-1">
          {/* Zentrale, einheitliche Lobby-Karte für Smartphone, Tablet & Desktop (ohne linke Beschreibungsbox) */}
          <div className="my-auto w-full max-w-md md:max-w-lg pt-3 landscape:pt-1">
            <CrystalPanel
              topTabLabel={game.title}
              title="LOBBY STARTEN"
              accent={game.accent}
              className="w-full"
              contentClassName="justify-between gap-4 sm:gap-5 landscape:gap-2 py-5 px-4 sm:py-6 sm:px-6 landscape:py-3 landscape:px-4"
            >
              {errorMsg && (
                <div className="font-arcade w-full border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-2 landscape:py-1 text-center text-xs text-white uppercase">
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
                    className="font-arcade mb-1.5 landscape:mb-0.5 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#334155] uppercase"
                  >
                    RAUM-NAME
                  </label>

                  <div className="flex items-stretch gap-1.5 w-full">
                    <div
                      style={{ clipPath: 'polygon(0% 5%, 100% 0%, 99% 96%, 1% 100%)' }}
                      className="flex-1 bg-[#334155] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.16)]"
                    >
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
                        style={{
                          clipPath: 'polygon(0% 5%, 100% 0%, 99% 96%, 1% 100%)',
                          paddingInline: '16px',
                        }}
                        className="crystal-input-light font-sans h-11 sm:h-12 landscape:h-8 w-full bg-[#F8FAFC] border-2 border-[#CBD5E1] focus:border-[#4F46E5] px-4 text-center text-sm sm:text-base landscape:text-xs font-extrabold tracking-wide text-[#0F172A] placeholder:text-[#64748B] uppercase focus:outline-none caret-[#4F46E5]"
                      />
                    </div>

                    {/* Gelber Würfel-Button mit Hover-Tooltip */}
                    <div className="group/dice relative flex">
                      <button
                        type="button"
                        onClick={handleRollLobbyName}
                        title="Zufälligen Namen generieren"
                        aria-label="Zufälligen Namen generieren"
                        style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                        className="flex h-full w-11 sm:w-12 landscape:w-9 items-center justify-center bg-[#78350F] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.25)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <div
                          style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                          className="flex h-full w-full items-center justify-center border-t-2 border-l-2 border-[#FEF3C7] bg-gradient-to-b from-[#FBBF24] to-[#F59E0B] text-[#0F172A]"
                        >
                          <Dices className="h-5 w-5 sm:h-6 sm:w-6 landscape:h-4 landscape:w-4 stroke-[2.4]" />
                        </div>
                      </button>

                      <div
                        style={{ clipPath: 'polygon(0% 8%, 100% 0%, 97% 94%, 3% 100%)' }}
                        className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap bg-[#0F172A] border-2 border-[#F59E0B] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/dice:opacity-100 group-hover/dice:scale-100 group-focus-within/dice:opacity-100 transition-all duration-150 shadow-lg"
                      >
                        Zufälligen Namen generieren
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modus-Auswahl ("STANDARD" vs. "TV SCREEN") + Kurzbeschreibung */}
                <div className="flex flex-col items-center w-full">
                  <span className="font-arcade mb-1.5 landscape:mb-0.5 text-xs sm:text-sm landscape:text-xs tracking-wider text-[#334155] uppercase">
                    SPIELMODUS
                  </span>

                  <div className="grid w-full grid-cols-2 gap-1.5 border-[3px] border-transparent p-1.5 landscape:p-1">
                    <CrystalButton
                      size="sm"
                      tilt="left"
                      variant={!isTvMode ? game.accent : 'secondary'}
                      onClick={() => {
                        setIsTvMode(false);
                        if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(false));
                      }}
                      className="landscape:h-7 landscape:text-xs"
                    >
                      <Smartphone className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
                      <span>STANDARD</span>
                    </CrystalButton>

                    <CrystalButton
                      size="sm"
                      tilt="right"
                      variant={isTvMode ? game.accent : 'secondary'}
                      onClick={() => {
                        setIsTvMode(true);
                        if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(true));
                      }}
                      className="landscape:h-7 landscape:text-xs"
                    >
                      <Tv className="h-4 w-4 landscape:h-3.5 landscape:w-3.5 shrink-0" />
                      <span>TV SCREEN</span>
                    </CrystalButton>
                  </div>

                  <p className="landscape:hidden mt-2 text-center text-xs font-semibold text-[#334155] min-h-[1.15rem]">
                    {isTvMode
                      ? 'TV als Hauptbildschirm, Smartphones als Controller'
                      : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                {/* Primärer Haupt-CTA: RAUM ERSTELLEN */}
                <div className="w-full pt-1 landscape:pt-0">
                  <CrystalButton
                    type="submit"
                    fullWidth
                    size="lg"
                    variant="primary"
                    tilt="left"
                    disabled={isCreating}
                    className="h-12 sm:h-14 landscape:h-9 text-base sm:text-lg landscape:text-xs drop-shadow-[0_8px_16px_rgba(5,150,105,0.45)]"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>ERSTELLE...</span>
                      </>
                    ) : (
                      <span>RAUM ERSTELLEN</span>
                    )}
                  </CrystalButton>
                </div>
              </form>
            </CrystalPanel>
          </div>
        </main>
      </div>
    </div>
  );
}
