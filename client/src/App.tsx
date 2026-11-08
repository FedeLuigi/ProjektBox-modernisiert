import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Gamepad2,
  Play,
} from 'lucide-react';
import {
  CATEGORIES,
  type Category,
  GAMES,
  type Game,
  TONE_STYLES,
} from './data/games';
import { GameCard } from './components/GameCard';
import { GameSheet } from './components/GameSheet';
import { SplashScreen } from './components/SplashScreen';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [category, setCategory] = useState<Category>('Alle');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const games = useMemo(() => {
    if (category === 'Alle') return GAMES;
    return GAMES.filter((g) => g.category === category);
  }, [category]);

  const safeIndex = activeIndex >= games.length ? 0 : activeIndex;
  const activeGame = games[safeIndex] || games[0];
  const activeStyle = TONE_STYLES[activeGame.tone];
  const ActiveIcon = activeGame.icon;

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Auf iOS/Desktop stumm ignorieren
    }
  };

  const handleSelectGame = (index: number) => {
    if (index !== safeIndex) {
      triggerHaptic();
      setActiveIndex(index);
    }
  };

  const handleNext = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % games.length);
  };

  const handlePrev = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  const handleSelectCategory = (cat: Category) => {
    triggerHaptic();
    setCategory(cat);
    setActiveIndex(0);
  };

  const handleSplashFinish = () => {
    triggerHaptic();
    setShowSplash(false);
  };

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
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          handleSplashFinish();
        }
        return;
      }
      if (selectedGame) {
        if (e.key === 'Escape') setSelectedGame(null);
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
        setSelectedGame(activeGame);
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
  }, [games, safeIndex, selectedGame, activeGame, showSplash]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (showSplash) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (showSplash) return;
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Dynamisches Grid je nach Anzahl der gefilterten Spiele
  const gridClass =
    games.length === 1
      ? 'grid-cols-1 grid-rows-1 max-w-xl mx-auto w-full'
      : games.length === 2
        ? 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1'
        : 'grid-cols-2 grid-rows-2 lg:grid-cols-4 lg:grid-rows-1';

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] text-[#1C1C1E] dark:text-white select-none"
    >
      {/* ─── Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── Haupt-Container mit iOS Safe-Area Abständen ─── */}
      <div className="ios-safe-stage mx-auto flex h-full w-full max-w-6xl flex-col justify-between gap-3 sm:gap-5 overflow-hidden">
        {/* 1. OBERE LEISTE: Marken-Header & iOS Segmented Filter */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2.5">
          {/* Links: App-Logo & Titel */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-[12px] bg-gradient-to-br from-[#7C5CFA] to-[#EC4899] text-white shadow-sm">
              <Gamepad2 className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                  ProjektBox
                </h1>
                <span className="rounded-full bg-black/[0.06] dark:bg-white/[0.1] px-2 py-0.5 text-[10px] font-bold text-[#6C6C70] dark:text-[#AEAEB2]">
                  {games.length} {games.length === 1 ? 'Spiel' : 'Spiele'}
                </span>
              </div>
              <p className="hidden sm:block text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D] mt-0.5">
                Tippe auf ein Spiel zum direkten Starten
              </p>
            </div>
          </div>

          {/* Rechts: iOS Segmented Control (Kategorien) + PWA Install */}
          <div className="flex items-center gap-2">
            <nav
              role="tablist"
              aria-label="Spielkategorien"
              className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] p-1 backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
            >
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                        : 'text-[#6C6C70] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </nav>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                title="App installieren"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-[#2C2C2E] px-3 py-1.5 text-xs font-bold shadow-xs ring-1 ring-black/5 dark:ring-white/10 transition-transform active:scale-95 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Installieren</span>
              </button>
            )}
          </div>
        </header>

        {/* 2. MITTLERE BÜHNE: Modernes, übersichtliches Bento-Spiele-Grid (ohne Dopplung) */}
        <main className={`grid flex-1 min-h-0 gap-3 sm:gap-4 ${gridClass}`}>
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              isActive={index === safeIndex}
              isExpanded={games.length <= 2}
              onSelect={() => handleSelectGame(index)}
              onPlay={() => setSelectedGame(game)}
            />
          ))}
        </main>

        {/* 3. UNTERES SCHWEBENDES iOS QUICK-DOCK: Aktive Auswahl & Direkt-Start */}
        <footer className="flex shrink-0 items-center justify-between gap-3 rounded-full bg-white/85 dark:bg-[#18181C]/90 p-2 pl-2.5 sm:p-2.5 sm:pl-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-2xl">
          {/* Links: Aktuell fokussiertes Spiel */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={`grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full ${activeStyle.iconBox}`}
            >
              <ActiveIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs sm:text-sm font-extrabold tracking-tight">
                {activeGame.title}
              </div>
              <div className="truncate text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                {activeGame.category} · {activeGame.players}
              </div>
            </div>
          </div>

          {/* Mitte: Interaktive Punkte-Navigation */}
          <div className="hidden xs:flex items-center gap-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-3 py-1.5">
            {games.map((game, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(idx)}
                  aria-label={`Wähle ${game.title}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? `w-5 ${activeStyle.dot}`
                      : 'w-2 bg-black/20 dark:bg-white/25 hover:bg-black/35 dark:hover:bg-white/40'
                  }`}
                />
              );
            })}
          </div>

          {/* Rechts: Vor/Zurück-Pfeile & Primärer Start-Button */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Vorheriges Spiel"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-white transition-transform active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Nächstes Spiel"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#1C1C1E] dark:text-white transition-transform active:scale-90 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedGame(activeGame)}
              className={`ml-1 inline-flex items-center gap-1.5 rounded-full px-4 py-2 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${activeStyle.playBtn}`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Starten</span>
            </button>
          </div>
        </footer>
      </div>

      {/* ─── iOS Detail-Sheet beim Öffnen eines Spiels ─── */}
      <GameSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
}

export default App;
