import { useEffect, useState } from 'react';
import { Dices, RefreshCw } from 'lucide-react';
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
import { SoloGameView } from './SoloGameView';
import { BackgroundCometCanvas } from '../BackgroundCometCanvas';
import { isSoloGame } from '../../games/registry';
import { formatSoloScore, getSoloHighscore } from '../../utils/soloScores';
import {
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
} from '../CrystalUI';

interface LobbyScreenProps {
  game: Game;
  onClose: () => void;
  initialLobby?: Lobby | null;
}

export function LobbyScreen({ game, onClose, initialLobby }: LobbyScreenProps) {
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
  const [createName, setCreateName] = useState(() => generateSimpleLobbyName(false));
  const [hasCustomLobbyName, setHasCustomLobbyName] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isSoloCapable = isSoloGame(game.id);
  const [isDirectSolo, setIsDirectSolo] = useState(false);
  const [showLobbyForm, setShowLobbyForm] = useState(!isSoloCapable);
  const soloBest = isSoloCapable ? getSoloHighscore(game.id) : null;

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

  if (isDirectSolo) {
    return <SoloGameView game={game} onLeave={onClose} />;
  }

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
      <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#3B82B6] text-[#15608E] select-none animate-fade-in">
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
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#3B82B6] text-[#15608E] select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-visible">
        {/* 1. OBERE LEISTE: "HOME" / "EXIT" Crystal-Button links, Verbindungsstatus rechts */}
        <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
          <CrystalButton size="sm" tilt="left" onClick={onClose}>
            HOME
          </CrystalButton>

          <ConnectionStatusBadge />
        </header>

        {/* 2. MITTE: Links "LEVEL 16"-Stil Spiel-Info-Panel, Rechts "DIFFICULTY"-Stil Modus-Auswahl */}
        <main className="mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col overflow-y-auto px-2.5 pt-7 pb-3">
          <div className="my-auto grid w-full items-center gap-6 grid-cols-1 md:grid-cols-2">
            {/* Linkes Panel: 1:1 wie "LEVEL 16" im Referenzbild */}
            <CrystalPanel stars={3} title={game.title} contentClassName="gap-3.5 py-6">
              <CrystalReadout
                label="SCORE"
                value={soloBest !== null ? formatSoloScore(game.id, soloBest) : String(game.defaultScore)}
              />
              <CrystalReadout label="REWARD" value={game.players.toUpperCase()} />

              <div className="mt-2">
                <CrystalButton size="md" variant="secondary" onClick={onClose} className="min-w-[130px]">
                  EXIT
                </CrystalButton>
              </div>
            </CrystalPanel>

            {/* Rechtes Panel: 1:1 wie "DIFFICULTY" ("EASY / NORMAL / HARD") im Referenzbild */}
            <CrystalPanel title="DIFFICULTY" contentClassName="gap-3.5 py-6 px-5">
              {errorMsg && (
                <div className="font-arcade w-full border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-2 text-center text-xs text-white uppercase">
                  {errorMsg}
                </div>
              )}

              {isSoloCapable && !showLobbyForm ? (
                <div className="flex w-full flex-col gap-3">
                  <CrystalButton
                    fullWidth
                    size="lg"
                    tilt="left"
                    onClick={() => setIsDirectSolo(true)}
                  >
                    SOLO PLAY
                  </CrystalButton>

                  <CrystalButton
                    fullWidth
                    size="lg"
                    tilt="right"
                    variant="secondary"
                    onClick={() => {
                      setIsTvMode(false);
                      setShowLobbyForm(true);
                    }}
                  >
                    MULTIPLAYER
                  </CrystalButton>

                  <CrystalButton
                    fullWidth
                    size="lg"
                    tilt="left"
                    variant="secondary"
                    onClick={() => {
                      setIsTvMode(true);
                      handleCreateLobby(undefined, true);
                    }}
                  >
                    TV MODE
                  </CrystalButton>
                </div>
              ) : (
                <form onSubmit={handleCreateLobby} className="flex w-full flex-col gap-3.5">
                  {/* Lobby-Name im SCORE/REWARD Readout-Stil */}
                  <div className="flex flex-col items-center w-full">
                    <span className="font-arcade mb-1 text-sm tracking-wider text-[#15608E] uppercase">
                      LOBBY NAME
                    </span>
                    <div className="flex items-center gap-2 w-full justify-center">
                      <div
                        style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                        className="flex-1 bg-[#17689A] p-[2.5px]"
                      >
                        <input
                          type="text"
                          maxLength={30}
                          value={createName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCreateName(val);
                            setHasCustomLobbyName(val.trim().length > 0);
                          }}
                          placeholder="LOBBY..."
                          style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 96%, 2% 100%)' }}
                          className="font-arcade w-full bg-[#39A9DD] px-4 py-2 text-center text-base tracking-wider text-white uppercase focus:outline-none"
                        />
                      </div>

                      <CrystalIconButton
                        size="sm"
                        tilt="right"
                        onClick={handleRollLobbyName}
                        title="Neuen Namen würfeln"
                      >
                        <Dices className="h-5 w-5" />
                      </CrystalIconButton>
                    </div>
                  </div>

                  {/* Modus-Auswahl als "NORMAL" vs "HARD" Crystal-Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <CrystalButton
                      size="sm"
                      tilt="left"
                      variant={!isTvMode ? 'primary' : 'secondary'}
                      onClick={() => {
                        setIsTvMode(false);
                        if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(false));
                      }}
                    >
                      STANDARD
                    </CrystalButton>
                    <CrystalButton
                      size="sm"
                      tilt="right"
                      variant={isTvMode ? 'primary' : 'secondary'}
                      onClick={() => {
                        setIsTvMode(true);
                        if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(true));
                      }}
                    >
                      TV SCREEN
                    </CrystalButton>
                  </div>

                  <CrystalButton
                    type="submit"
                    fullWidth
                    size="lg"
                    tilt="left"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>STARTING...</span>
                      </>
                    ) : (
                      <span>PLAY</span>
                    )}
                  </CrystalButton>

                  {isSoloCapable && (
                    <CrystalButton
                      fullWidth
                      size="sm"
                      variant="secondary"
                      tilt="right"
                      onClick={() => setShowLobbyForm(false)}
                    >
                      BACK
                    </CrystalButton>
                  )}
                </form>
              )}
            </CrystalPanel>
          </div>
        </main>
      </div>
    </div>
  );
}
