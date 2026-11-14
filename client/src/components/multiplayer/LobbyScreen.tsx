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
import { GamePreviewArtwork } from '../GamePreviewArtwork';
import {
  ACCENT_PALETTES,
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
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
  const Icon = game.icon;
  const palette = ACCENT_PALETTES[game.accent];

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
      <div className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in">
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
      className="fixed inset-0 h-full min-h-dvh z-50 flex w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none animate-fade-in"
    >
      <BackgroundCometCanvas opacity={0.85} />

      <div className="app-shell relative z-10 flex flex-1 min-h-0 w-full flex-col justify-between overflow-visible">
        <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
          <CrystalButton size="sm" variant="secondary" tilt="left" onClick={onClose}>
            ZURÜCK
          </CrystalButton>

          <ConnectionStatusBadge />
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col overflow-y-auto px-2.5 pt-4 pb-4">
          {/* Symmetrisches 2-Spalten-Grid mit exakt gleicher Kartenhöhe (items-stretch + h-full) */}
          <div className="my-auto grid w-full items-stretch gap-6 grid-cols-1 md:grid-cols-2">
            {/* 1. LINKES PANEL: Spiel-Vorschau, Icon, Anleitung & Eckdaten (ohne redundanten Abbrechen-Button) */}
            <CrystalPanel
              title={game.title}
              accent={game.accent}
              className="h-full"
              contentClassName="justify-between gap-3.5 py-6 px-5"
            >
              {/* Kompakte visuelle Spielvorschau mit Spiel-Icon-Badge */}
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
                  className="relative w-full h-28 sm:h-32 bg-[#0F172A] p-[3px] shadow-[0_4px_0_rgba(15,23,42,0.25)]"
                >
                  <div
                    style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
                    className="relative h-full w-full overflow-hidden"
                  >
                    <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full" />

                    {/* Spiel-Icon & Kategorie-Tag links oben im Vorschaubild */}
                    <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                      <div
                        style={{
                          backgroundColor: palette.bg,
                          borderColor: palette.outer,
                          clipPath: 'polygon(6% 0%, 100% 6%, 94% 100%, 0% 94%)',
                        }}
                        className="flex h-8 w-8 items-center justify-center border-2 text-white shadow-md"
                      >
                        <Icon className="h-4 w-4 stroke-[2.4]" />
                      </div>
                      <span
                        style={{
                          backgroundColor: palette.badgeBg,
                          color: palette.badgeText,
                          borderColor: palette.badgeBorder,
                        }}
                        className="font-arcade px-2 py-0.5 text-[10px] tracking-wider uppercase border shadow-sm"
                      >
                        {game.gameTypeLabel} • {game.category}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-xs sm:text-sm font-semibold text-[#334155] leading-relaxed px-1">
                  {game.howToPlay}
                </p>
              </div>

              {/* Eckdaten unten bündig */}
              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <CrystalReadout
                  label="SPIELER"
                  value={game.players.toUpperCase()}
                  variant="neutral"
                  className="w-full"
                />
                <CrystalReadout
                  label="SPIELDAUER"
                  value={game.duration.toUpperCase()}
                  variant="gold"
                  className="w-full"
                />
              </div>
            </CrystalPanel>

            {/* 2. RECHTES PANEL: Raum-Name, verbundene Modus-Tabs & hervorgehobener Haupt-CTA */}
            <CrystalPanel
              title="LOBBY STARTEN"
              accent={game.accent}
              className="h-full"
              contentClassName="justify-between gap-4 py-6 px-5"
            >
              {errorMsg && (
                <div className="font-arcade w-full border-2 border-[#7F1D1D] bg-[#EF4444] px-3 py-2 text-center text-xs text-white uppercase">
                  {errorMsg}
                </div>
              )}

              <form
                onSubmit={handleCreateLobby}
                className="flex flex-1 w-full flex-col justify-between gap-4"
              >
                {/* Eingabefeld RAUM-NAME mit optisch sauber angebundenem Würfel-Button */}
                <div className="flex flex-col items-center w-full">
                  <label
                    htmlFor="lobby-name-input"
                    className="font-arcade mb-1.5 text-xs sm:text-sm tracking-wider text-[#334155] uppercase"
                  >
                    RAUM-NAME
                  </label>

                  <div className="flex items-stretch gap-1.5 w-full">
                    <div
                      style={{ clipPath: 'polygon(0% 5%, 100% 0%, 99% 96%, 1% 100%)' }}
                      className="flex-1 bg-[#0F172A] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.25)]"
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
                        style={{ clipPath: 'polygon(0% 5%, 100% 0%, 99% 96%, 1% 100%)' }}
                        className="font-arcade h-11 sm:h-12 w-full bg-[#1E293B] px-3.5 text-center text-sm sm:text-base tracking-wider text-[#F8FAFC] placeholder-[#94A3B8] uppercase focus:outline-none"
                      />
                    </div>

                    {/* Sauber angedockter gelber Würfel-Button mit Hover-Tooltip */}
                    <div className="group/dice relative flex">
                      <button
                        type="button"
                        onClick={handleRollLobbyName}
                        title="Zufälligen Namen generieren"
                        aria-label="Zufälligen Namen generieren"
                        style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                        className="flex h-full w-12 sm:w-13 items-center justify-center bg-[#78350F] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.25)] transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <div
                          style={{ clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 94%)' }}
                          className="flex h-full w-full items-center justify-center border-t-2 border-l-2 border-[#FEF3C7] bg-gradient-to-b from-[#FBBF24] to-[#F59E0B] text-[#0F172A]"
                        >
                          <Dices className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.4]" />
                        </div>
                      </button>

                      {/* Sichtbarer Comic-Arcade Hover-Tooltip */}
                      <div
                        style={{ clipPath: 'polygon(0% 8%, 100% 0%, 97% 94%, 3% 100%)' }}
                        className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap bg-[#0F172A] border-2 border-[#F59E0B] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/dice:opacity-100 group-hover/dice:scale-100 group-focus-within/dice:opacity-100 transition-all duration-150 shadow-lg"
                      >
                        Zufälligen Namen generieren
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zusammenhängende Tab-/Modus-Auswahl ("STANDARD" vs. "TV SCREEN") + dynamische Kurzbeschreibung */}
                <div className="flex flex-col items-center w-full">
                  <span className="font-arcade mb-1.5 text-xs sm:text-sm tracking-wider text-[#334155] uppercase">
                    SPIELMODUS
                  </span>

                  <div
                    style={{ clipPath: 'polygon(0% 4%, 100% 0%, 99% 96%, 1% 100%)' }}
                    className="grid w-full grid-cols-2 gap-1.5 bg-[#CBD5E1] border-[3px] border-[#334155] p-1.5 shadow-inner"
                  >
                    <CrystalButton
                      size="sm"
                      tilt="left"
                      variant={!isTvMode ? game.accent : 'secondary'}
                      onClick={() => {
                        setIsTvMode(false);
                        if (!hasCustomLobbyName) setCreateName(generateSimpleLobbyName(false));
                      }}
                    >
                      <Smartphone className="h-4 w-4 shrink-0" />
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
                    >
                      <Tv className="h-4 w-4 shrink-0" />
                      <span>TV SCREEN</span>
                    </CrystalButton>
                  </div>

                  {/* Einzeilige dynamische Kurzbeschreibung je nach ausgewähltem Modus */}
                  <p className="mt-2 text-center text-xs font-semibold text-[#334155] min-h-[1.15rem]">
                    {isTvMode
                      ? 'TV als Hauptbildschirm, Smartphones als Controller'
                      : 'Alle spielen direkt auf diesem Gerät'}
                  </p>
                </div>

                {/* Primärer Haupt-CTA: Größere Höhe & prominenter Schlagschatten */}
                <div className="w-full pt-1">
                  <CrystalButton
                    type="submit"
                    fullWidth
                    size="lg"
                    variant="primary"
                    tilt="left"
                    disabled={isCreating}
                    className="h-13 sm:h-14 text-base sm:text-lg drop-shadow-[0_8px_16px_rgba(5,150,105,0.45)]"
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
