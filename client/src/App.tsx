import { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Trophy, Brain, Zap, Clock, Settings } from 'lucide-react';
import {
  CATEGORIES,
  type Category,
  GAMES,
  type Game,
} from './data/games';
import { CompactGameCard } from './components/CompactGameCard';
import { QuickLaunchTile } from './components/QuickLaunchTile';
import { GameSheet } from './components/GameSheet';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { BackgroundCometCanvas } from './components/BackgroundCometCanvas';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [category, setCategory] = useState<Category>('Alle');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

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

  const triggerHaptic = () => {
    if (!vibrationEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Auf iOS/Desktop stumm ignorieren
    }
  };

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

  const handleSelectGame = (game: Game) => {
    triggerHaptic();
    setSelectedGame(game);
  };

  const handleSelectCategory = (cat: Category) => {
    triggerHaptic();
    setCategory(cat);
  };

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

  // Spiele-Gruppen für die thematischen Sektionen
  const quickLaunchGames = useMemo(() => {
    const ids = ['reaction', 'tic-tac-toe', 'snake', 'memory', 'connect'];
    return ids
      .map((id) => GAMES.find((g) => g.id === id))
      .filter((g): g is Game => Boolean(g));
  }, []);

  const strategyGames = useMemo(
    () =>
      GAMES.filter(
        (g) =>
          g.category === 'Strategie' ||
          g.id === 'tic-tac-toe' ||
          g.id === 'connect' ||
          g.id === 'minesweeper'
      ),
    []
  );

  const puzzleGames = useMemo(
    () =>
      GAMES.filter(
        (g) =>
          g.category === 'Denken' ||
          g.id === 'memory' ||
          g.id === '2048'
      ),
    []
  );

  const arcadeGames = useMemo(
    () =>
      GAMES.filter(
        (g) =>
          g.category === 'Arcade' ||
          g.id === 'reaction' ||
          g.id === 'snake' ||
          g.id === 'space-dodge'
      ),
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSplash) {
        if (e.key === 'Escape') {
          handleSplashFinish();
        }
        return;
      }
      if (showSettings) {
        if (e.key === 'Escape') setShowSettings(false);
        return;
      }
      if (selectedGame) {
        if (e.key === 'Escape') setSelectedGame(null);
      }
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [showSplash, showSettings, selectedGame]);

  const showAll = category === 'Alle';

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#F2F2F7] dark:bg-[#0B0B0F] text-[#1C1C1E] dark:text-white select-none">
      {/* ─── Globale Vollbild-Kometen-Animation hinter allen Menüs & Buttons ─── */}
      <BackgroundCometCanvas opacity={0.65} />

      {/* ─── Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── 1. OBERE LEISTE: Header & iOS Kategorie-Filter ─── */}
      <header className="relative z-30 shrink-0 border-b border-black/[0.04] dark:border-white/[0.06] bg-[#F2F2F7]/85 dark:bg-[#0B0B0F]/85 backdrop-blur-xl px-4 sm:px-6 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.35rem))] pb-2.5 overflow-hidden">
        {/* Weicher, abgedunkelter radialer Farbverlauf (Lila/Blau) als stimmungsvolles Hintergrund-Licht */}
        <div
          className="absolute inset-0 pointer-events-none -z-20"
          style={{
            background:
              'radial-gradient(130% 160% at 50% -20%, rgba(139, 92, 246, 0.22) 0%, rgba(59, 130, 246, 0.12) 40%, rgba(168, 85, 247, 0.05) 75%, transparent 100%)',
          }}
        />

        <div className="flex items-center justify-between mb-2.5">
          {/* Logo & Titel mit Glow & Farbverlauf */}
          <div className="flex items-center gap-2.5">
            <div
              style={{
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.35)',
              }}
              className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#EC4899] text-white ring-1 ring-white/20 transition-transform active:scale-95"
            >
              <Gamepad2 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none bg-gradient-to-r from-zinc-900 via-zinc-800 to-purple-600 dark:from-white dark:via-[#FAF5FF] dark:to-[#D8B4FE] bg-clip-text text-transparent">
                ProjektBox
              </h1>
              <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                Dein Spielplatz
              </span>
            </div>
          </div>

          {/* Rechte Seite: Als einziger Button das Einstellungs-Icon (Zahnrad) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
              aria-label="Einstellungen öffnen"
              title="Einstellungen"
              className="grid h-8.5 w-8.5 place-items-center rounded-full bg-black/[0.04] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1C1C1E] dark:text-white ring-1 ring-black/5 dark:ring-white/10 transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <Settings className="h-4.5 w-4.5 text-[#1C1C1E] dark:text-white" />
            </button>
          </div>
        </div>

        {/* Horizontale Kategorie-Pillen */}
        <nav
          role="tablist"
          aria-label="Kategorien"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5"
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
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1C1C1E] text-white dark:bg-white dark:text-[#1C1C1E] shadow-xs'
                    : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#6C6C70] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ─── 2. MITTE: Vertikal scrollbare Sektionen im App Store / Netflix Style ─── */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] pt-3 space-y-6 scrollbar-none">
        {/* ── Sektion 1: Zuletzt gespielt / Schnellstart (flache Reihe kleiner Kacheln) ── */}
        {(showAll || category === 'Arcade') && (
          <section aria-labelledby="heading-quick-launch">
            <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#EA580C] dark:text-[#FB923C]" />
                <h2
                  id="heading-quick-launch"
                  className="text-sm font-extrabold tracking-tight text-[#1C1C1E] dark:text-white"
                >
                  Zuletzt gespielt / Schnellstart
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                Direkt loslegen
              </span>
            </div>

            {/* Horizontale Wischleiste mit flachen Kacheln (identischer linker Startabstand) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2 scrollbar-none overscroll-x-contain">
              {quickLaunchGames.map((game) => (
                <QuickLaunchTile
                  key={`quick-${game.id}`}
                  game={game}
                  onSelect={() => handleSelectGame(game)}
                />
              ))}
              <div className="w-1 shrink-0" aria-hidden="true" />
            </div>
          </section>
        )}

        {/* ── Sektion 2: Beliebt & Strategie (horizontales Karussell kompakter 4:3-Karten) ── */}
        {(showAll || category === 'Strategie') && (
          <section aria-labelledby="heading-strategy">
            <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-[#7C3AED] dark:text-[#A78BFA]" />
                <h2
                  id="heading-strategy"
                  className="text-sm font-extrabold tracking-tight text-[#1C1C1E] dark:text-white"
                >
                  Beliebt & Strategie
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                {strategyGames.length} Spiele
              </span>
            </div>

            {/* Horizontales Karussell (identischer linker Startabstand) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2 scrollbar-none overscroll-x-contain">
              {strategyGames.map((game) => (
                <CompactGameCard
                  key={`strat-${game.id}`}
                  game={game}
                  onSelect={() => handleSelectGame(game)}
                />
              ))}
              <div className="w-1 shrink-0" aria-hidden="true" />
            </div>
          </section>
        )}

        {/* ── Sektion 3: Denkspiele & Rätsel (horizontales Karussell kompakter 4:3-Karten) ── */}
        {(showAll || category === 'Denken') && (
          <section aria-labelledby="heading-puzzle">
            <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
              <div className="flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-[#EA580C] dark:text-[#FB923C]" />
                <h2
                  id="heading-puzzle"
                  className="text-sm font-extrabold tracking-tight text-[#1C1C1E] dark:text-white"
                >
                  Denkspiele & Rätsel
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                {puzzleGames.length} Spiele
              </span>
            </div>

            {/* Horizontales Karussell (identischer linker Startabstand) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2 scrollbar-none overscroll-x-contain">
              {puzzleGames.map((game) => (
                <CompactGameCard
                  key={`puzzle-${game.id}`}
                  game={game}
                  onSelect={() => handleSelectGame(game)}
                />
              ))}
              <div className="w-1 shrink-0" aria-hidden="true" />
            </div>
          </section>
        )}

        {/* ── Sektion 4: Arcade & Reflexe (horizontales Karussell kompakter 4:3-Karten) ── */}
        {(showAll || category === 'Arcade') && (
          <section aria-labelledby="heading-arcade">
            <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />
                <h2
                  id="heading-arcade"
                  className="text-sm font-extrabold tracking-tight text-[#1C1C1E] dark:text-white"
                >
                  Arcade & Reflexe
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">
                {arcadeGames.length} Spiele
              </span>
            </div>

            {/* Horizontales Karussell (identischer linker Startabstand) */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 scroll-px-4 sm:scroll-px-6 pb-2 scrollbar-none overscroll-x-contain">
              {arcadeGames.map((game) => (
                <CompactGameCard
                  key={`arcade-${game.id}`}
                  game={game}
                  onSelect={() => handleSelectGame(game)}
                />
              ))}
              <div className="w-1 shrink-0" aria-hidden="true" />
            </div>
          </section>
        )}
      </main>

      {/* ─── iOS Detail-Sheet beim Öffnen eines Spiels ─── */}
      <GameSheet game={selectedGame} onClose={() => setSelectedGame(null)} />

      {/* ─── Einstellungsseite im exakten Stil des Game-Detail-Screens ─── */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={handleToggleVibration}
        onInstall={deferredPrompt ? handleInstall : undefined}
        onReplaySplash={() => setShowSplash(true)}
      />
    </div>
  );
}

export default App;
