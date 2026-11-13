import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES,
  type Category,
  GAMES,
  type Game,
} from './data/games';
import { GameCard } from './components/GameCard';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { IslandBackground } from './components/IslandBackground';
import {
  ArcadeLogoHeader,
  ArcadeMenuModal,
  CoinCounterPill,
  CrystalQuickIconGrid,
  PlayerProfileBar,
  UnlockEpisodeModal,
} from './components/ArcadeHudElements';
import { CrystalButton, CrystalPanel, CrystalReadout } from './components/CrystalUI';
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { TvJoinModal } from './components/multiplayer/TvJoinModal';
import { STORAGE_KEYS, useUserProfile } from './utils/userProfile';
import { socketService } from './services/socket';
import { parseLobbyCode } from './utils/qrCodeHelper';
import type { Lobby } from './types/multiplayer';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const userProfile = useUserProfile();

  const initialDeepLinkCode = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return parseLobbyCode(window.location.href);
  }, []);

  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined' && parseLobbyCode(window.location.href)) {
      return false;
    }
    return true;
  });

  const [isJoiningDeepLink, setIsJoiningDeepLink] = useState(Boolean(initialDeepLinkCode));
  const [showTvJoinModal, setShowTvJoinModal] = useState(false);
  const [tvJoinError, setTvJoinError] = useState<string | null>(null);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [category, setCategory] = useState<Category>('Alle');
  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [deepLinkLobby, setDeepLinkLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [unlockModalGame, setUnlockModalGame] = useState<Game | null>(null);
  const [modalMode, setModalMode] = useState<'menu' | 'shop' | 'settings' | null>(null);
  const [coins, setCoins] = useState(63581);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => GAMES.map((g) => g.id));
  const [starsByGame, setStarsByGame] = useState<Record<string, number>>(() =>
    Object.fromEntries(GAMES.map((g) => [g.id, g.starsEarned ?? 22]))
  );

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const cardsScrollRef = useRef<HTMLDivElement | null>(null);
  const isPointerDown = useRef(false);
  const dragMoved = useRef(false);
  const startScrollX = useRef(0);
  const startClientX = useRef(0);

  const games = useMemo(() => {
    if (category === 'Alle') return GAMES;
    return GAMES.filter((g) => g.category === category);
  }, [category]);

  const safeIndex = activeIndex >= games.length ? 0 : activeIndex;
  const activeGame = games[safeIndex] || games[0];
  const allUnlocked = unlockedIds.length === GAMES.length;

  const triggerHaptic = useCallback(() => {
    if (!vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // ignore
    }
  }, [vibrationEnabled]);

  const handleToggleSound = (enabled: boolean) => {
    triggerHaptic();
    setSoundEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
    } catch {
      // ignore
    }
  };

  const handleToggleVibration = (enabled: boolean) => {
    if (enabled) {
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } catch {
        // ignore
      }
    }
    setVibrationEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, String(enabled));
    } catch {
      // ignore
    }
  };

  const scrollToCardIndex = useCallback((idx: number) => {
    const container = cardsScrollRef.current;
    if (!container) return;
    const cardEl = container.children[idx] as HTMLElement | undefined;
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const handleSelectGame = (index: number) => {
    if (index >= 0 && index < games.length) {
      triggerHaptic();
      setActiveIndex(index);
    }
  };

  const handleNext = useCallback(() => {
    triggerHaptic();
    const nextIdx = (safeIndex + 1) % games.length;
    setActiveIndex(nextIdx);
    scrollToCardIndex(nextIdx);
  }, [triggerHaptic, safeIndex, games.length, scrollToCardIndex]);

  const handlePrev = useCallback(() => {
    triggerHaptic();
    const prevIdx = (safeIndex - 1 + games.length) % games.length;
    setActiveIndex(prevIdx);
    scrollToCardIndex(prevIdx);
  }, [triggerHaptic, safeIndex, games.length, scrollToCardIndex]);

  const handleSplashFinish = () => {
    triggerHaptic();
    setShowSplash(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleUnlockWithCoins = (game: Game) => {
    triggerHaptic();
    const cost = game.unlockCost ?? 20;
    if (coins >= cost && !unlockedIds.includes(game.id)) {
      setCoins((c) => c - cost);
      setUnlockedIds((prev) => [...prev, game.id]);
    }
    setUnlockModalGame(null);
    setMultiplayerGame(game);
  };

  const handlePlayDirectly = (game: Game) => {
    triggerHaptic();
    if (!unlockedIds.includes(game.id)) {
      setUnlockedIds((prev) => [...prev, game.id]);
    }
    setUnlockModalGame(null);
    setMultiplayerGame(game);
  };

  const handleToggleAllUnlocked = () => {
    triggerHaptic();
    setUnlockedIds(GAMES.map((g) => g.id));
  };

  const handleResetProgress = () => {
    triggerHaptic();
    setCoins(63581);
    setUnlockedIds(GAMES.map((g) => g.id));
    setStarsByGame(Object.fromEntries(GAMES.map((g) => [g.id, g.starsEarned ?? 22])));
    setCategory('Alle');
  };

  const joinByCode = useCallback(async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsJoiningLobby(true);
    setTvJoinError(null);
    try {
      const lobby = await socketService.joinLobby(cleanCode);
      const matchedGame = GAMES.find((g) => g.id === lobby.gameId) || GAMES[0];
      setDeepLinkLobby(lobby);
      setMultiplayerGame(matchedGame);
      setShowTvJoinModal(false);
      setIsJoiningDeepLink(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      console.warn('Lobby-Beitritt fehlgeschlagen:', err);
      setTvJoinError(err.message || 'Lobby konnte nicht gefunden werden.');
      setIsJoiningDeepLink(false);
      setShowTvJoinModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setIsJoiningLobby(false);
    }
  }, []);

  useEffect(() => {
    const checkDeepLink = () => {
      const code = parseLobbyCode(window.location.href);
      if (code && !multiplayerGame) {
        joinByCode(code);
      }
    };

    checkDeepLink();
    window.addEventListener('popstate', checkDeepLink);
    return () => window.removeEventListener('popstate', checkDeepLink);
  }, [joinByCode, multiplayerGame]);

  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventGesture = (e: Event) => e.preventDefault();

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSplash) {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          handleSplashFinish();
        }
        return;
      }
      if (multiplayerGame) {
        if (e.key === 'Escape') {
          setMultiplayerGame(null);
          setDeepLinkLobby(null);
        }
        return;
      }
      if (showSettings) {
        if (e.key === 'Escape') setShowSettings(false);
        return;
      }
      if (showTvJoinModal) {
        if (e.key === 'Escape') setShowTvJoinModal(false);
        return;
      }
      if (unlockModalGame || modalMode) {
        if (e.key === 'Escape') {
          setUnlockModalGame(null);
          setModalMode(null);
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMultiplayerGame(activeGame);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [
    showSplash,
    showSettings,
    multiplayerGame,
    showTvJoinModal,
    unlockModalGame,
    modalMode,
    activeGame,
    handleNext,
    handlePrev,
  ]);

  const onPointerDownStrip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardsScrollRef.current) return;
    isPointerDown.current = true;
    dragMoved.current = false;
    startClientX.current = e.clientX;
    startScrollX.current = cardsScrollRef.current.scrollLeft;
  };

  const onPointerMoveStrip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current || !cardsScrollRef.current) return;
    const dx = e.clientX - startClientX.current;
    if (Math.abs(dx) > 6) dragMoved.current = true;
    cardsScrollRef.current.scrollLeft = startScrollX.current - dx;
  };

  const onPointerUpStrip = () => {
    isPointerDown.current = false;
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#3B82B6] text-[#15608E] select-none">
      {/* ─── 0. Animierter Crystal-Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── 1. Globaler Crystal-Facetten-Hintergrund (#3B82B6) ─── */}
      <IslandBackground />

      {/* ─── Verbindungs-Overlay bei QR-Code Beitritt im "LEVEL 16" Crystal-Panel-Stil ─── */}
      {isJoiningDeepLink && !multiplayerGame && (
        <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center bg-[#103858]/70 backdrop-blur-xs select-none p-4">
          <div className="w-full max-w-sm animate-fade-in">
            <CrystalPanel stars={3} title="TV CONNECT" contentClassName="gap-3">
              <CrystalReadout label="LOBBY CODE" value={initialDeepLinkCode ?? '----'} />
              <p className="font-arcade text-sm tracking-wider text-[#15608E] uppercase mt-1">
                JOINING TV LOBBY...
              </p>
            </CrystalPanel>
          </div>
        </div>
      )}

      {/* ─── 2. Haupt-HUD & Crystal-Bühne ─── */}
      <div className="safe-screen relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* ═══ OBERE LEISTE: Stern- & Münz-Leisten links • PROJEKT BOX Mitte • Spieler & Icon-Buttons rechts ═══ */}
        <header className="relative z-30 flex shrink-0 items-center justify-between gap-1.5 sm:gap-2 px-1 sm:px-2 pt-0.5">
          {/* Links: Stern- & Münz-Fortschrittsleisten */}
          <div className="shrink-0">
            <CoinCounterPill
              coins={coins}
              starsTotal={25873}
              onClick={() => {
                triggerHaptic();
                setModalMode('shop');
              }}
            />
          </div>

          {/* Mitte: Trapezförmiger Crystal-Header ("PROJEKT BOX") */}
          <div className="mx-auto hidden lg:block">
            <ArcadeLogoHeader />
          </div>

          {/* Rechts: TV-Join Button + Spieler-Anzeige + Optionen & Menü Icon-Buttons */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <CrystalButton
              size="sm"
              tilt="right"
              onClick={() => {
                triggerHaptic();
                setTvJoinError(null);
                setShowTvJoinModal(true);
              }}
            >
              TV CODE
            </CrystalButton>

            <PlayerProfileBar
              playerName={userProfile.name}
              activeCategory={category}
              onOpenSettings={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
              onOpenMenu={() => {
                triggerHaptic();
                setModalMode('menu');
              }}
            />
          </div>
        </header>

        {/* ═══ HAUPTBEREICH: Links 6er-Icon-Grid + "DIFFICULTY"-Stil Kategorie-Panel • Rechts "LEVEL 16"-Stil Spielkarten ═══ */}
        <div className="relative flex flex-1 min-h-0 w-full items-center justify-between gap-3 sm:gap-5 pt-1 pb-1">
          {/* ─── LINKE SPALTE (wie linke & obere rechte Seite des Referenzbildes) ─── */}
          <aside className="relative z-20 hidden lg:flex h-full shrink-0 flex-col justify-center gap-4 pl-2 w-[265px]">
            <div className="flex flex-col items-center gap-2.5">
              <CrystalQuickIconGrid
                onPlayRandom={() => {
                  triggerHaptic();
                  setMultiplayerGame(activeGame);
                }}
                onOpenSettings={() => {
                  triggerHaptic();
                  setShowSettings(true);
                }}
                onOpenMenu={() => {
                  triggerHaptic();
                  setModalMode('menu');
                }}
                onOpenTvJoin={() => {
                  triggerHaptic();
                  setTvJoinError(null);
                  setShowTvJoinModal(true);
                }}
                onResetFilter={() => {
                  triggerHaptic();
                  setCategory('Alle');
                  setActiveIndex(0);
                }}
              />
            </div>

            <CrystalPanel title="MODUS" contentClassName="gap-2.5 py-4 px-4">
              {CATEGORIES.map((cat, idx) => (
                <CrystalButton
                  key={cat}
                  fullWidth
                  size="sm"
                  tilt={idx % 2 === 0 ? 'left' : 'right'}
                  variant={category === cat ? 'primary' : 'secondary'}
                  onClick={() => {
                    triggerHaptic();
                    setCategory(cat);
                    setActiveIndex(0);
                  }}
                >
                  {cat}
                </CrystalButton>
              ))}
            </CrystalPanel>
          </aside>

          {/* ─── HAUPT-BÜHNE: Horizontale Reihe der "LEVEL 16" Kristall-Spielkarten ─── */}
          <main className="relative flex h-full flex-1 min-w-0 flex-col justify-center">
            {/* Kompakte Kategorie-Buttons für Mobile / Tablet oberhalb der Karten */}
            <div className="mb-1.5 landscape:mb-0.5 flex lg:hidden items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto px-2 py-0.5 no-scrollbar shrink-0">
              {CATEGORIES.map((cat, idx) => (
                <CrystalButton
                  key={cat}
                  size="sm"
                  tilt={idx % 2 === 0 ? 'left' : 'right'}
                  variant={category === cat ? 'primary' : 'secondary'}
                  onClick={() => {
                    triggerHaptic();
                    setCategory(cat);
                    setActiveIndex(0);
                  }}
                >
                  {cat}
                </CrystalButton>
              ))}
            </div>

            {/* Horizontale Kartenreihe */}
            <div
              ref={cardsScrollRef}
              onPointerDown={onPointerDownStrip}
              onPointerMove={onPointerMoveStrip}
              onPointerUp={onPointerUpStrip}
              onPointerCancel={onPointerUpStrip}
              className="no-scrollbar relative z-10 flex w-full items-center gap-3.5 sm:gap-6 overflow-x-auto px-3 sm:px-6 py-3 sm:py-5 landscape:py-1.5 scroll-smooth"
            >
              {games.map((game, index) => {
                const isUnlocked = unlockedIds.includes(game.id);
                const currentStars = starsByGame[game.id] ?? game.starsEarned ?? 22;

                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    isActive={index === safeIndex}
                    isUnlocked={isUnlocked}
                    starsEarned={currentStars}
                    onSelect={() => {
                      if (!dragMoved.current) handleSelectGame(index);
                    }}
                    onPlay={() => {
                      if (!dragMoved.current) setMultiplayerGame(game);
                    }}
                    onUnlockRequest={() => {
                      if (!dragMoved.current) setUnlockModalGame(game);
                    }}
                  />
                );
              })}
            </div>

            {/* Untere Schnell-Steuerleiste (im flachen Smartphone-Querformat ausgeblendet, da die Karten direkt antippbar sind) */}
            <div className="mt-1 landscape:hidden flex items-center justify-center gap-2 sm:gap-4 px-2 shrink-0">
              <CrystalButton size="sm" variant="secondary" tilt="left" onClick={handlePrev}>
                PREV
              </CrystalButton>
              <CrystalButton
                size="md"
                tilt="right"
                onClick={() => {
                  triggerHaptic();
                  setMultiplayerGame(activeGame);
                }}
              >
                PLAY {activeGame?.title}
              </CrystalButton>
              <CrystalButton size="sm" variant="secondary" tilt="left" onClick={handleNext}>
                NEXT
              </CrystalButton>
            </div>
          </main>
        </div>
      </div>

      {/* ─── 3. Episode-Freischalten / Direkt-Spielen Popup ─── */}
      <UnlockEpisodeModal
        game={unlockModalGame}
        coins={coins}
        onClose={() => setUnlockModalGame(null)}
        onUnlockWithCoins={handleUnlockWithCoins}
        onPlayDirectly={handlePlayDirectly}
      />

      {/* ─── 4. Menü-, Bonus- & Einstellungs-Modal ─── */}
      <ArcadeMenuModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        category={category}
        onSelectCategory={(cat) => {
          triggerHaptic();
          setCategory(cat);
          setActiveIndex(0);
        }}
        allUnlocked={allUnlocked}
        onToggleAllUnlocked={handleToggleAllUnlocked}
        coins={coins}
        onAddBonusCoins={() => {
          triggerHaptic();
          setCoins((c) => c + 50);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => handleToggleSound(!soundEnabled)}
        hapticsEnabled={vibrationEnabled}
        onToggleHaptics={() => handleToggleVibration(!vibrationEnabled)}
        onResetProgress={handleResetProgress}
        canInstall={Boolean(deferredPrompt)}
        onInstall={handleInstall}
      />

      {/* ─── 5. Multiplayer & Solo Lobby-Screen beim Start eines Spiels ─── */}
      {multiplayerGame && (
        <LobbyScreen
          game={multiplayerGame}
          initialLobby={deepLinkLobby}
          onClose={() => {
            setMultiplayerGame(null);
            setDeepLinkLobby(null);
          }}
        />
      )}

      {/* ─── Modal für TV-Beitritt (QR-Code Scan & Code-Eingabe direkt aus dem Hauptmenü) ─── */}
      <TvJoinModal
        isOpen={showTvJoinModal}
        onClose={() => setShowTvJoinModal(false)}
        onJoin={joinByCode}
        isJoining={isJoiningLobby}
        errorMessage={tvJoinError}
      />

      {/* ─── Einstellungen ("OPTIONS" Panel) ─── */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={handleToggleVibration}
        onInstall={deferredPrompt ? handleInstall : undefined}
      />
    </div>
  );
}

export default App;
