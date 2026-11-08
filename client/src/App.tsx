import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
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

  // Echtzeit-Wischgeste (Diashow Drag)
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const games = useMemo(() => {
    if (category === 'Alle') return GAMES;
    return GAMES.filter((g) => g.category === category);
  }, [category]);

  const safeIndex = activeIndex >= games.length ? 0 : activeIndex;
  const activeGame = games[safeIndex] || games[0];
  const activeStyle = TONE_STYLES[activeGame.tone];

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
    if (index !== safeIndex && index >= 0 && index < games.length) {
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

  // Diashow Touch-Steuerung mit Live-Mitziehen
  const onTouchStart = (e: React.TouchEvent) => {
    if (showSplash || selectedGame) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      setDragX(diffX * 0.75);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (showSplash || selectedGame || touchStartX.current === null || touchStartY.current === null) {
      setIsDragging(false);
      setDragX(0);
      return;
    }

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }

    setIsDragging(false);
    setDragX(0);
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
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] text-[#1C1C1E] dark:text-white select-none"
    >
      {/* ─── Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── Haupt-Container mit sicherem Abstand zur iPhone 11 Notch / Lautsprecher ─── */}
      <div className="safe-screen flex h-full w-full flex-col justify-between overflow-hidden">
        {/* 1. OBERE LEISTE: Zentrierter iOS Kategorie-Filter */}
        <header className="relative z-30 flex shrink-0 items-center justify-center">
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
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

        {/* 2. MITTE: Kompakte, wischbare Diashow (Carousel) */}
        <main className="relative flex flex-1 min-h-0 w-full items-center justify-center overflow-visible">
          {/* Links-Pfeil (bei mehr als 1 Spiel) */}
          {games.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Vorheriges Spiel"
              className="absolute left-0 sm:left-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/85 dark:bg-[#1C1C1E]/90 text-[#1C1C1E] dark:text-white shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-xl transition-transform active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Diashow-Kartenbühne */}
          <div className="relative flex h-full w-full items-center justify-center">
            {games.map((game, index) => {
              const offset = index - safeIndex;
              const isVisible = Math.abs(offset) <= 1;

              return (
                <div
                  key={game.id}
                  style={{
                    transform: `translate3d(calc(${offset * 106}% + ${dragX}px), 0, 0)`,
                    transition: isDragging
                      ? 'none'
                      : 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
                  }}
                  className={`absolute flex items-center justify-center ${
                    isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <GameCard
                    game={game}
                    isActive={index === safeIndex}
                    onSelect={() => handleSelectGame(index)}
                    onPlay={() => setSelectedGame(game)}
                  />
                </div>
              );
            })}
          </div>

          {/* Rechts-Pfeil (bei mehr als 1 Spiel) */}
          {games.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Nächstes Spiel"
              className="absolute right-0 sm:right-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/85 dark:bg-[#1C1C1E]/90 text-[#1C1C1E] dark:text-white shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.1] backdrop-blur-xl transition-transform active:scale-90 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </main>

        {/* 3. UNTEN: Dezente Diashow-Punkte (Slide-Indikator) */}
        <div className="relative z-30 flex shrink-0 flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-3.5 py-2 backdrop-blur-md">
            {games.map((game, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(idx)}
                  aria-label={`Gehe zu ${game.title}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? `w-6 ${activeStyle.dot}`
                      : 'w-2 bg-black/20 dark:bg-white/25 hover:bg-black/40 dark:hover:bg-white/40'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-[#8E8E93] dark:text-[#636366]">
            Wischen zum Blättern ({safeIndex + 1}/{games.length})
          </span>
        </div>
      </div>

      {/* ─── iOS Detail-Sheet beim Öffnen eines Spiels ─── */}
      <GameSheet game={selectedGame} onClose={() => setSelectedGame(null)} />
    </div>
  );
}

export default App;
