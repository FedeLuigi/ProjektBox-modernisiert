import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import {
  CATEGORIES,
  type Category,
  GAMES,
  type Game,
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

  // Proportionales Grid für Hoch- und Querformat (verhindert zu breites Ziehen im Querformat)
  const gridClass =
    games.length === 1
      ? 'grid-cols-1 grid-rows-1 max-w-sm mx-auto w-full'
      : games.length === 2
        ? 'portrait:grid-cols-1 portrait:grid-rows-2 landscape:grid-cols-2 landscape:grid-rows-1 max-w-2xl mx-auto w-full'
        : 'portrait:grid-cols-2 portrait:grid-rows-2 landscape:grid-cols-4 landscape:grid-rows-1 w-full';

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] text-[#1C1C1E] dark:text-white select-none"
    >
      {/* ─── Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── Vollflächiger Haupt-Container mit luftigen Abständen ─── */}
      <div className="flex h-full w-full flex-col justify-between gap-4 sm:gap-6 p-4 sm:p-6 overflow-hidden">
        {/* 1. OBERE LEISTE: Nur der zentrierte iOS Kategorie-Filter (ohne Logo/Titel) */}
        <header className="relative flex shrink-0 items-center justify-center">
          <nav
            role="tablist"
            aria-label="Spielkategorien"
            className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] p-1 backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
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
                  className={`rounded-full px-3.5 py-1.5 sm:px-4 sm:py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
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
              className="absolute right-0 inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-[#2C2C2E] px-3 py-1.5 text-xs font-bold shadow-xs ring-1 ring-black/5 dark:ring-white/10 transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Installieren</span>
            </button>
          )}
        </header>

        {/* 2. HAUPTBÜHNE: Luftiges Spiele-Grid über den gesamten Bildschirm */}
        <main className={`grid flex-1 min-h-0 gap-4 sm:gap-5 ${gridClass}`}>
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              isActive={index === safeIndex}
              onSelect={() => handleSelectGame(index)}
              onPlay={() => setSelectedGame(game)}
            />
          ))}
        </main>
      </div>

      {/* ─── iOS Detail-Sheet beim Öffnen eines Spiels ─── */}
      <GameSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
}

export default App;
