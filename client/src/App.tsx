import { useEffect, useMemo, useState } from 'react';
import {
  Gamepad2, Brain, Zap, Puzzle, Grid2X2, Clock3,
  Download, WifiOff, Smartphone, Maximize2, Play
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

const games: Game[] = [
  {
    id: 'memory',
    title: 'Memory',
    description: 'Finde die passenden Bildpaare und trainiere dein Gedächtnis.',
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
    description: 'Denke voraus und bringe vier Steine in eine Reihe.',
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
    description: 'Wie schnell kannst du reagieren? Stelle dich der Challenge.',
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
    description: 'Ein zeitloser Klassiker. Einfach zu lernen, schwer zu meistern.',
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
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  // Vollbild & Querformat
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
      // Ignorieren falls nicht verfügbar
    }
  };

  useEffect(() => {
    // 1. Zoom komplett blockieren (Pinch-to-zoom & Gesten auf iOS/Android unterbinden)
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

    // 2. Querformat-Check & automatischer Lock
    const checkOrientation = () => {
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('pointerdown', triggerFullscreenLandscape, { once: true });

    // 3. PWA Install Events
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const filteredGames = useMemo(() => {
    if (category === 'Alle') return games;
    return games.filter((g) => g.category === category);
  }, [category]);

  return (
    <div className={`app-screen ${isPortraitMobile ? 'force-landscape' : ''}`}>
      {/* Mobiler dezenter Install-Button (nur sichtbar, wenn installierbar) */}
      {deferredPrompt && !isInstalled && (
        <button
          onClick={handleInstallClick}
          className="mobile-install-pill"
          title="App installieren"
        >
          <Download size={11} /> App installieren
        </button>
      )}

      {/* 1. Kompakte Konsole-Headerbar (auf Smartphones ausgeblendet) */}
      <header className="console-header">
        <div className="brand">
          <span className="brand-mark">
            <Gamepad2 size={18} strokeWidth={2.4} />
          </span>
          <span>projekt<span className="brand-light">box</span></span>
        </div>

        {/* Kategorien-Pills direkt erreichbar */}
        <nav className="category-pills" aria-label="Kategorie">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>

        {/* Schnellaktionen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="category-pill"
              style={{
                background: 'var(--brand)',
                color: 'var(--bg)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Als App installieren"
            >
              <Download size={13} /> Installieren
            </button>
          )}

          <button
            onClick={triggerFullscreenLandscape}
            className="category-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid var(--border)'
            }}
            title="Vollbildmodus starten"
          >
            <Maximize2 size={13} /> Vollbild
          </button>
        </div>
      </header>

      {/* 2. Hauptbühne: 4 Games passen exakt auf einen einzigen Bildschirm ohne Scrollen */}
      <main className="games-deck">
        {filteredGames.map((game, index) => {
          const Icon = game.icon;
          return (
            <div
              key={game.id}
              className="game-console-card"
              onClick={() => {
                triggerFullscreenLandscape();
                setSelectedGame(game);
              }}
            >
              {/* Farbiger Icon-Bereich */}
              <div className={`game-art-area ${game.tone}`}>
                <span className="art-badge">0{index + 1}</span>
                <div className="game-icon-circle">
                  <Icon size={28} strokeWidth={2} />
                </div>
              </div>

              {/* Kompakte Spiel-Info */}
              <div className="game-info-area">
                <div className="game-info-header">
                  <span className="game-meta-tag">{game.category}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>{game.players}</span>
                </div>
                <h3 className="game-title">{game.title}</h3>
                <div className="game-info-footer">
                  <span>{game.duration}</span>
                  <span className="play-action-btn">
                    <Play size={9} fill="currentColor" /> Spielen
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* 3. Kompakte Statuszeile unten (Single View) */}
      <footer className="console-bottom-bar">
        <span>Tippe auf ein Spiel, um loszulegen</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isOffline && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
              <WifiOff size={11} /> Offline bereit
            </span>
          )}
          {isPortraitMobile && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
              <Smartphone size={11} style={{ transform: 'rotate(90deg)' }} /> Querformat aktiv
            </span>
          )}
          <span>© 2026 ProjektBox</span>
        </div>
      </footer>

      {/* Detail-Modal bei Klick */}
      {selectedGame && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedGame(null)}>
          <section className="game-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGame(null)} aria-label="Schließen">×</button>
            <div className={`modal-art ${selectedGame.tone}`}>
              <selectedGame.icon size={38} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>
              {selectedGame.category} · {selectedGame.players} · {selectedGame.duration}
            </div>
            <h2>{selectedGame.title}</h2>
            <p>{selectedGame.description}</p>
            <div className="modal-note">
              <Clock3 size={14} /> Bereit zum Spielen auf jedem Gerät ohne Installation.
            </div>
            <button className="modal-button" onClick={() => setSelectedGame(null)}>
              Jetzt starten
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
