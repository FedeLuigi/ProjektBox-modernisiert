import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Gamepad2, Brain, Zap, Puzzle, Grid2X2, Clock3,
  Users, Play, ChevronLeft, ChevronRight, Download, Sparkles
} from 'lucide-react';

type Category = 'Alle' | 'Strategie' | 'Denken' | 'Arcade';

type Game = {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, 'Alle'>;
  players: string;
  duration: string;
  icon: typeof Brain;
  tone: 'peach' | 'lavender' | 'mint' | 'blue';
  status: 'Bereit' | 'In Arbeit';
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const allGames: Game[] = [
  {
    id: 'memory',
    title: 'Memory',
    description: 'Finde die passenden Bildpaare und trainiere dein visuelles Gedächtnis.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '5 Min.',
    icon: Brain,
    tone: 'peach',
    status: 'Bereit',
  },
  {
    id: 'connect',
    title: 'Vier gewinnt',
    description: 'Denke voraus und bringe vier deiner Steine in eine diagonale oder gerade Reihe.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '5 Min.',
    icon: Grid2X2,
    tone: 'lavender',
    status: 'Bereit',
  },
  {
    id: 'reaction',
    title: 'Reaktions-Test',
    description: 'Wie schnell kannst du reagieren? Stelle dich der Reflex-Challenge gegen die Zeit.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '2 Min.',
    icon: Zap,
    tone: 'mint',
    status: 'Bereit',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Der zeitlose Klassiker. Schnelle Runden, einfach zu lernen, schwer zu meistern.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '3 Min.',
    icon: Puzzle,
    tone: 'blue',
    status: 'Bereit',
  },
];

const categories: Category[] = ['Alle', 'Strategie', 'Denken', 'Arcade'];

export function App() {
  const [category, setCategory] = useState<Category>('Alle');
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  // Touch Swipe Koordinaten
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Gefilterte Spieleliste
  const games = useMemo(() => {
    if (category === 'Alle') return allGames;
    return allGames.filter((g) => g.category === category);
  }, [category]);

  // Sicherstellen, dass activeIndex innerhalb des Bereichs bleibt
  const safeActiveIndex = activeIndex >= games.length ? 0 : activeIndex;
  const activeGame = games[safeActiveIndex] || games[0];

  // Haptisches Feedback (sanftes Vibrieren bei Spielauswahl)
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {
      // Ignorieren falls nicht verfügbar
    }
  };

  const handleSelectGame = (index: number) => {
    if (index !== safeActiveIndex) {
      triggerHaptic();
      setActiveIndex(index);
    }
  };

  const handleNextGame = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % games.length);
  };

  const handlePrevGame = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  // Vollbild & Querformat anfordern
  const triggerFullscreenLandscape = async () => {
    try {
      const doc = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (doc.requestFullscreen) {
          await doc.requestFullscreen();
        } else if (doc.webkitRequestFullscreen) {
          await doc.webkitRequestFullscreen();
        }
      }
      const orientation = window.screen?.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
      if (orientation?.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // Ignorieren falls nicht unterstützt
    }
  };

  useEffect(() => {
    // 1. Zoom auf Mobilgeräten komplett blockieren
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    // 2. Querformat-Check
    const checkOrientation = () => {
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Bei Berührung Vollbild anfordern
    window.addEventListener('pointerdown', triggerFullscreenLandscape, { once: true });

    // 3. Tastatur-Steuerung (Pfeiltasten Links/Rechts & Enter zum Starten)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedGame) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextGame();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevGame();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerFullscreenLandscape();
        setSelectedGame(activeGame);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 4. PWA Install Event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('pointerdown', triggerFullscreenLandscape);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [games, safeActiveIndex, selectedGame, activeGame]);

  // Touch Swipe Gesten (Wischen nach links/rechts mit dem Daumen)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Nur horizontale Wischgesten auswerten (> 35px Schwellenwert)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) {
        handleNextGame(); // Wisch nach links -> Nächstes Spiel
      } else {
        handlePrevGame(); // Wisch nach rechts -> Vorheriges Spiel
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const ActiveIcon = activeGame.icon;

  return (
    <div
      className={`app-screen ${isPortraitMobile ? 'force-landscape' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Dezenter mobiler PWA-Install-Button */}
      {deferredPrompt && !isInstalled && (
        <button
          onClick={handleInstallClick}
          className="mobile-install-pill"
          title="App auf Homescreen installieren"
        >
          <Download size={11} /> App installieren
        </button>
      )}

      {/* Hauptbühne: Handheld-Konsole Aufteilung (Showcase links, Dock rechts) */}
      <main className="console-stage">
        {/* Linke Seite: Hero Showcase Card des ausgewählten Spiels */}
        <section className={`hero-showcase ${activeGame.tone}`}>
          <div className="hero-showcase-bg-decor" />

          <div className="hero-header">
            <span className="hero-index-pill">
              SPIEL 0{safeActiveIndex + 1} / 0{games.length}
            </span>
            <div className="hero-badge-group">
              <span className="hero-tag">
                <Sparkles size={10} style={{ display: 'inline', marginRight: 3 }} />
                {activeGame.category}
              </span>
            </div>
          </div>

          <div className="hero-body">
            <div className="hero-icon-large">
              <ActiveIcon size={34} strokeWidth={2.2} />
            </div>
            <h2 className="hero-title">{activeGame.title}</h2>
            <p className="hero-description">{activeGame.description}</p>
          </div>

          <div className="hero-footer">
            <div className="hero-meta-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} /> {activeGame.players}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock3 size={12} /> {activeGame.duration}
              </span>
            </div>

            <button
              className="hero-play-button"
              onClick={() => {
                triggerFullscreenLandscape();
                setSelectedGame(activeGame);
              }}
            >
              <Play size={13} fill="currentColor" /> JETZT SPIELEN
            </button>
          </div>
        </section>

        {/* Rechte Seite: Interaktives Spiele-Dock */}
        <section className="dock-panel">
          {/* Oben: Kategorie-Filter */}
          <div className="dock-header-bar">
            <div className="category-chip-row">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-chip ${category === cat ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic();
                    setCategory(cat);
                    setActiveIndex(0);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--text-faint)', fontWeight: 800 }}>
              <Gamepad2 size={13} /> PROJEKTBOX
            </span>
          </div>

          {/* 2x2 Interaktives Karten-Grid */}
          <div className="dock-grid">
            {games.map((game, index) => {
              const Icon = game.icon;
              const isCurrent = index === safeActiveIndex;

              return (
                <div
                  key={game.id}
                  className={`dock-card ${isCurrent ? 'active' : ''}`}
                  onClick={() => handleSelectGame(index)}
                  onDoubleClick={() => {
                    triggerFullscreenLandscape();
                    setSelectedGame(game);
                  }}
                >
                  <div className={`dock-card-icon ${game.tone}`}>
                    <Icon size={22} strokeWidth={2} />
                  </div>

                  <div className="dock-card-content">
                    <h3 className="dock-card-title">{game.title}</h3>
                    <div className="dock-card-meta">
                      <span>{game.category}</span>
                      <span>•</span>
                      <span>{game.players}</span>
                    </div>
                  </div>

                  <span className="dock-card-indicator" />
                </div>
              );
            })}
          </div>

          {/* Unten: Interaktive Daumen-Navigation (< > Pfeile & Dots) */}
          <div className="dock-nav-bar">
            <button
              className="dock-arrow-btn"
              onClick={handlePrevGame}
              aria-label="Vorheriges Spiel"
              title="Vorheriges Spiel"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="dock-pagination">
              {games.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectGame(idx)}
                  className={`dock-dot ${idx === safeActiveIndex ? 'active' : ''}`}
                  aria-label={`Gehe zu Spiel ${idx + 1}`}
                />
              ))}
            </div>

            <button
              className="dock-arrow-btn"
              onClick={handleNextGame}
              aria-label="Nächstes Spiel"
              title="Nächstes Spiel"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </main>

      {/* Spiel-Modal bei Klick auf "JETZT SPIELEN" */}
      {selectedGame && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedGame(null)}>
          <section className="game-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGame(null)} aria-label="Schließen">×</button>
            <div className={`modal-art ${selectedGame.tone}`}>
              <selectedGame.icon size={36} strokeWidth={2} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>
              {selectedGame.category} · {selectedGame.players} · {selectedGame.duration}
            </div>
            <h2>{selectedGame.title}</h2>
            <p>{selectedGame.description}</p>
            <div className="modal-note">
              <Clock3 size={14} /> Bereit zum Spielen auf jedem Handheld & Smartphone.
            </div>
            <button className="modal-button" onClick={() => setSelectedGame(null)}>
              Starten
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
