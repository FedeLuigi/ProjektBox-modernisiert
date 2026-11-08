import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { type Category, GAMES, type Game } from './data/games';
import { FeaturedCard } from './components/FeaturedCard';
import { GameDock } from './components/GameDock';
import { GameSheet } from './components/GameSheet';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
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

  useEffect(() => {
    // Multi-Touch Pinch-Zoom auf iOS Safari unterbinden
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventGesture = (e: Event) => e.preventDefault();

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    // Tastatursteuerung
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [games, safeIndex, selectedGame, activeGame]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
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

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] text-[#1C1C1E] dark:text-white select-none"
    >
      {/* Optionaler iOS-Pille Install-Button falls Browser Installation anbietet */}
      {deferredPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="fixed top-3 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-white/85 dark:bg-[#2C2C2E]/90 px-3.5 py-1.5 text-xs font-bold shadow-md ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl transition-transform active:scale-95"
        >
          <Download className="h-3.5 w-3.5" />
          App laden
        </button>
      )}

      {/* Hauptbühne: Automatisch für Hochformat (Portrait) & Querformat (Landscape) optimiert */}
      <main className="ios-safe-stage mx-auto grid h-full w-full max-w-6xl flex-1 gap-4 sm:gap-6 overflow-hidden portrait:grid-cols-1 portrait:grid-rows-[1.12fr_1fr] landscape:grid-cols-[1fr_1.3fr] landscape:grid-rows-1">
        <FeaturedCard
          game={activeGame}
          currentIndex={safeIndex}
          totalCount={games.length}
          onPlay={setSelectedGame}
        />

        <GameDock
          games={games}
          category={category}
          activeIndex={safeIndex}
          onSelectCategory={handleSelectCategory}
          onSelectGame={handleSelectGame}
          onOpenGame={setSelectedGame}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </main>

      {/* iOS Detail-Sheet beim Tippen auf "SPIELEN" */}
      <GameSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
}

export default App;
