import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
  ComingSoonBanner,
  IslandMascotWidget,
  PlayerProfileBar,
  PurpleActionCircleButton,
  UnlockEpisodeModal,
} from './components/ArcadeHudElements';
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { TvJoinModal } from './components/multiplayer/TvJoinModal';
import { getUserProfile } from './utils/userProfile';
import { socketService } from './services/socket';
import { parseLobbyCode } from './utils/qrCodeHelper';
import type { Lobby } from './types/multiplayer';
import { Tv } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const MASCOT_QUOTES = [
  'Impress me.',
  'Schaffst du 3 Sterne?',
  'Zeig dein Talent!',
  'Knack den Highscore!',
  'Bereit für die Insel?',
];

export function App() {
  // Deep-Link Prüfung sofort beim ersten Render (verhindert Reload / Splash-Flackern)
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

  // Arcade-Zustände aus dem Redesign
  const [activeIndex, setActiveIndex] = useState(0);
  const [unlockModalGame, setUnlockModalGame] = useState<Game | null>(null);
  const [modalMode, setModalMode] = useState<'menu' | 'shop' | 'settings' | null>(null);
  const [coins, setCoins] = useState(72);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() =>
    GAMES.filter((g) => g.defaultUnlocked).map((g) => g.id)
  );
  const [starsByGame, setStarsByGame] = useState<Record<string, number>>(() =>
    Object.fromEntries(GAMES.map((g) => [g.id, g.starsEarned ?? 22]))
  );
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Einstellungen mit localStorage-Persistenz
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('projektbox_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('projektbox_vibration_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Horizontales Maus-Drag & Scroll-Handling für die Episoden-Kartenreihe
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

  const progressPercent = useMemo(() => {
    const unlockedStars = GAMES.reduce((sum, g) => {
      if (!unlockedIds.includes(g.id)) return sum;
      return sum + (starsByGame[g.id] ?? g.starsEarned ?? 22);
    }, 0);
    const maxStars = GAMES.reduce((sum, g) => sum + (g.starsTotal ?? 135), 0);
    return Math.max(3, Math.min(100, Math.round((unlockedStars / maxStars) * 100)));
  }, [unlockedIds, starsByGame]);

  const triggerHaptic = useCallback(() => {
    if (!vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignorieren
    }
  }, [vibrationEnabled]);

  const handleToggleSound = (enabled: boolean) => {
    triggerHaptic();
    setSoundEnabled(enabled);
    localStorage.setItem('projektbox_sound_enabled', String(enabled));
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
    localStorage.setItem('projektbox_vibration_enabled', String(enabled));
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
    if (allUnlocked) {
      setUnlockedIds(GAMES.filter((g) => g.defaultUnlocked).map((g) => g.id));
    } else {
      setUnlockedIds(GAMES.map((g) => g.id));
    }
  };

  const handleResetProgress = () => {
    triggerHaptic();
    setCoins(72);
    setUnlockedIds(GAMES.filter((g) => g.defaultUnlocked).map((g) => g.id));
    setStarsByGame(Object.fromEntries(GAMES.map((g) => [g.id, g.starsEarned ?? 22])));
    setCategory('Alle');
  };

  // Zentraler Beitritt per Code / QR-Code: leitet sofort in die Lobby des jeweiligen Spiels weiter
  const joinByCode = async (code: string) => {
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
  };

  // Beim Start Nutzerprofil sicherstellen und Deep-Link (?join=CODE) prüfen
  useEffect(() => {
    getUserProfile();

    const checkDeepLink = () => {
      const code = parseLobbyCode(window.location.href);
      if (code && !multiplayerGame) {
        joinByCode(code);
      }
    };

    checkDeepLink();
    window.addEventListener('popstate', checkDeepLink);
    return () => window.removeEventListener('popstate', checkDeepLink);
  }, []);

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
        if (unlockedIds.includes(activeGame.id)) {
          setMultiplayerGame(activeGame);
        } else {
          setUnlockModalGame(activeGame);
        }
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
    unlockedIds,
    handleNext,
    handlePrev,
  ]);

  // Maus-Ziehen zum horizontalen Scrollen der Kartenleiste
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
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#2979B5] text-white select-none">
      {/* ─── 0. Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── 1. Illustrierter Tropen-Insel & Ozean-Karten-Hintergrund ─── */}
      <IslandBackground />

      {/* ─── Schneller Verbindungs-Bildschirm bei QR-Code Beitritt (kein Neuladen / Flackern) ─── */}
      {isJoiningDeepLink && !multiplayerGame && (
        <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center bg-[#0B0B0F]/90 backdrop-blur-md text-white select-none pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="relative z-10 flex flex-col items-center p-6 text-center max-w-sm mx-auto animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-600/25 text-purple-300 ring-2 ring-purple-500/40 mb-4 shadow-[0_0_30px_rgba(168,85,247,0.35)] animate-pulse">
              <Tv className="h-8 w-8 text-purple-300" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Verbinde mit Fernseher...</h2>
            <p className="mt-1.5 text-xs text-[#8E8E93]">
              Lobby-Code: <strong className="text-purple-300 tracking-widest">{initialDeepLinkCode}</strong>
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-1.5 text-xs font-bold text-white ring-1 ring-white/10">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Tritt der TV-Lobby bei...</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Haupt-HUD & Episoden-Bühne ─── */}
      <div className="safe-screen relative z-10 flex h-full w-full flex-col justify-between overflow-hidden">
        {/* ═══ OBERE LEISTE: Münzen links (72) • PROJEKT BOX RELOADED Mitte • Player 1949 + ≡ rechts ═══ */}
        <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 px-1 sm:px-3 pt-0.5">
          {/* Links: Goldmünzen-Zähler ("72") */}
          <div className="shrink-0">
            <CoinCounterPill
              coins={coins}
              onClick={() => {
                triggerHaptic();
                setModalMode('shop');
              }}
            />
          </div>

          {/* Mitte: Großes Arcade-Logo ("PROJEKT BOX RELOADED") */}
          <div className="mx-auto">
            <ArcadeLogoHeader />
          </div>

          {/* Rechts: Roter Charakter-Avatar + "Player 1949" + Türkiser Menü-Button */}
          <div className="shrink-0 pr-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setTvJoinError(null);
                setShowTvJoinModal(true);
              }}
              title="Mit TV-Code beitreten"
              className="hidden md:inline-flex h-9 items-center justify-center gap-1.5 px-3 rounded-full bg-[#2B337A] hover:bg-[#3C4696] text-[#67E8F9] ring-2 ring-[#3C4696] font-bold text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Tv className="h-4 w-4" />
              <span>TV-Code</span>
            </button>

            <PlayerProfileBar
              playerName="Player 1949"
              activeCategory={category}
              onOpenMenu={() => {
                triggerHaptic();
                setModalMode('menu');
              }}
            />
          </div>
        </header>

        {/* ═══ HAUPTBEREICH: Links Insel-Buttons & Maskottchen • Rechts Horizontale Episoden-Poster ═══ */}
        <div className="relative flex flex-1 min-h-0 w-full items-center justify-between gap-2 sm:gap-4 pt-1 pb-1">
          {/* ─── LINKE SPALTE: Shop-Button, "Coming Soon!" Pfeil, "Impress me." Maskottchen & Zahnrad-Button ─── */}
          <aside className="relative z-20 flex h-full shrink-0 flex-col justify-between py-1 pl-1 sm:pl-2 w-[135px] sm:w-[235px] md:w-[285px] landscape:w-[175px] landscape:sm:w-[245px] landscape:md:w-[295px] portrait:hidden sm:portrait:flex">
            {/* Oben links: Lila Einkaufswagen-Button */}
            <div className="flex items-start">
              <PurpleActionCircleButton
                variant="shop"
                label="Insel-Shop öffnen"
                onClick={() => {
                  triggerHaptic();
                  setModalMode('shop');
                }}
              />
            </div>

            {/* Mitte links über der Insel: Schräger "Coming Soon!" Pfeil */}
            <div className="my-auto self-center pl-4 sm:pl-8">
              <ComingSoonBanner
                onClick={() => {
                  triggerHaptic();
                  setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
                }}
              />
            </div>

            {/* Unten links: Maskottchen mit "Impress me." + "3%" & darunter der lila Zahnrad-Button */}
            <div className="flex flex-col items-start gap-1">
              <div className="self-center sm:self-end pr-1 sm:pr-3">
                <IslandMascotWidget
                  quote={MASCOT_QUOTES[quoteIndex]}
                  progressPercent={progressPercent}
                  onClickMascot={() => {
                    triggerHaptic();
                    setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
                  }}
                />
              </div>

              <PurpleActionCircleButton
                variant="settings"
                label="Einstellungen öffnen"
                onClick={() => {
                  triggerHaptic();
                  setShowSettings(true);
                }}
              />
            </div>
          </aside>

          {/* ─── RECHTER / HAUPT-BEREICH: Horizontale Reihe der hohen Episoden-Karten ─── */}
          <main className="relative flex h-full flex-1 min-w-0 flex-col justify-center">
            <div className="relative flex items-center w-full">
              <div className="pointer-events-none hidden sm:block absolute left-1 bottom-0 top-[46%] w-5 border-l-2 border-b-2 border-white/75 z-0" />

              <div
                ref={cardsScrollRef}
                onPointerDown={onPointerDownStrip}
                onPointerMove={onPointerMoveStrip}
                onPointerUp={onPointerUpStrip}
                onPointerCancel={onPointerUpStrip}
                className="no-scrollbar relative z-10 flex w-full items-center gap-3.5 sm:gap-5 md:gap-6 overflow-x-auto px-3 sm:px-5 py-3 scroll-smooth"
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
            </div>

            {/* Kompakte Portrait-Leiste unten (nur auf schmalen Hochformat-Smartphones sichtbar) */}
            <div className="mt-2 flex sm:portrait:hidden landscape:hidden items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <PurpleActionCircleButton
                  variant="shop"
                  label="Insel-Shop öffnen"
                  onClick={() => {
                    triggerHaptic();
                    setModalMode('shop');
                  }}
                />
                <PurpleActionCircleButton
                  variant="settings"
                  label="Einstellungen öffnen"
                  onClick={() => {
                    triggerHaptic();
                    setShowSettings(true);
                  }}
                />
              </div>

              <div className="scale-90 origin-bottom-right">
                <IslandMascotWidget
                  quote={MASCOT_QUOTES[quoteIndex]}
                  progressPercent={progressPercent}
                  onClickMascot={() => {
                    triggerHaptic();
                    setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length);
                  }}
                />
              </div>
            </div>
          </main>
        </div>

        {/* ═══ UNTEN RECHTS: Runde "EC" Plakette & Lila Pfeil-Button (wie im Vorbild) ═══ */}
        <div className="pointer-events-none absolute right-3 sm:right-6 bottom-2 sm:bottom-3 z-30 flex flex-col items-center gap-2">
          {/* Dunkler runder "EC" Badge-Button (Schaltet bei Klick bequem alle Schlösser frei/zu) */}
          <button
            type="button"
            onClick={handleToggleAllUnlocked}
            title={
              allUnlocked
                ? 'Karten-Schlösser wieder anzeigen'
                : 'Alle Episoden-Schlösser sofort öffnen'
            }
            className="pointer-events-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-[4px] border-[#3E5866] bg-[#647D89] text-white shadow-[0_5px_14px_rgba(0,0,0,0.45)] transition-transform active:scale-90 hover:scale-105 cursor-pointer"
          >
            <span className="font-arcade text-sm sm:text-base tracking-wider text-white/95">
              EC
            </span>
          </button>

          {/* Kleiner lila Pfeil-Button ganz unten rechts am Rand */}
          <div className="pointer-events-auto -mb-4 sm:-mb-5">
            <PurpleActionCircleButton
              variant="up"
              label="Nächste Episode zeigen"
              onClick={handleNext}
            />
          </div>
        </div>
      </div>

      {/* ─── 3. Episode-Freischalten / Direkt-Spielen Popup bei Klick auf ein Schloss ─── */}
      <UnlockEpisodeModal
        game={unlockModalGame}
        coins={coins}
        onClose={() => setUnlockModalGame(null)}
        onUnlockWithCoins={handleUnlockWithCoins}
        onPlayDirectly={handlePlayDirectly}
      />

      {/* ─── 4. Menü-, Shop- & Einstellungs-Modal ─── */}
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

      {/* ─── Einstellungen ─── */}
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
