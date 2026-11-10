import { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Trophy, Brain, Zap, Clock, Settings, Tv } from 'lucide-react';
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
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { TvJoinModal } from './components/multiplayer/TvJoinModal';
import { getUserProfile } from './utils/userProfile';
import { socketService } from './services/socket';
import { parseLobbyCode } from './utils/qrCodeHelper';
import type { Lobby } from './types/multiplayer';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  // Deep-Link Prüfung sofort beim ersten Render (verhindert Reload / Splash-Flackern)
  const initialDeepLinkCode = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return parseLobbyCode(window.location.href);
  }, []);

  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Wenn per QR-Code / Deep-Link beigetreten wird: NIEMALS Splash-Screen zeigen
      if (parseLobbyCode(window.location.href)) {
        return false;
      }
      // 2. Wurde die Startanimation bereits einmal geladen (z. B. bei Reload)? -> Überspringen!
      try {
        if (localStorage.getItem('projektbox_splash_seen_v1') === 'true') {
          return false;
        }
      } catch {
        // ignore
      }
    }
    return true;
  });

  const [isJoiningDeepLink, setIsJoiningDeepLink] = useState(Boolean(initialDeepLinkCode));
  const [showTvJoinModal, setShowTvJoinModal] = useState(false);
  const [tvJoinError, setTvJoinError] = useState<string | null>(null);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [category, setCategory] = useState<Category>('Alle');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [deepLinkLobby, setDeepLinkLobby] = useState<Lobby | null>(null);
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
    try {
      localStorage.setItem('projektbox_splash_seen_v1', 'true');
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Spiele-Gruppen für die thematischen Sektionen
  const quickLaunchGames = useMemo(() => {
    const ids = ['draw-and-guess', 'reaction', 'tic-tac-toe', 'snake', 'memory', 'connect'];
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
          g.id === 'draw-and-guess' ||
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
      setSelectedGame(null);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSplash) {
        if (e.key === 'Escape') {
          handleSplashFinish();
        }
        return;
      }
      if (multiplayerGame) {
        if (e.key === 'Escape') setMultiplayerGame(null);
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
  }, [showSplash, showSettings, selectedGame, multiplayerGame]);

  const showAll = category === 'Alle';

  return (
    <div
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed inset-0 flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#0B0B0F] text-white select-none pb-[env(safe-area-inset-bottom)]"
    >
      {/* ─── Sanfter Ambient-Hintergrund-Farbverlauf über die ganze Seite (wie beim Game-Screen, fixiert) ─── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(110% 75% at 50% -10%, rgba(139, 92, 246, 0.18) 0%, rgba(99, 102, 241, 0.09) 40%, transparent 80%)',
        }}
      />
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-60 bg-purple-600/20" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-50 bg-indigo-600/15" />

      {/* ─── Globale Vollbild-Kometen-Animation hinter allen Menüs & Buttons ─── */}
      <BackgroundCometCanvas opacity={0.65} />

      {/* ─── Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── Schneller Verbindungs-Bildschirm bei QR-Code Beitritt (kein Neuladen / Flackern) ─── */}
      {isJoiningDeepLink && !multiplayerGame && (
        <div className="fixed inset-0 z-50 flex h-full min-h-screen w-full flex-col items-center justify-center bg-[#07070C] text-white select-none">
          <BackgroundCometCanvas opacity={0.35} />
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

      {/* ─── 1. OBERE LEISTE: Transparenter, ruhiger Header & iOS Kategorie-Filter ─── */}
      <header
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        className="relative z-30 shrink-0 bg-transparent px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-2"
      >
        <div className="flex items-center justify-between mb-2.5">
          {/* Logo & Titel: ruhig, dezent, mit dem Hintergrund verschmolzen */}
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-indigo-500/10 text-purple-300/85 ring-1 ring-white/[0.08] shadow-[0_2px_16px_rgba(139,92,246,0.18)] transition-transform active:scale-95"
            >
              <Gamepad2 className="h-4 w-4 text-purple-300/85" strokeWidth={1.8} />
            </div>
            <h1 className="text-sm sm:text-base font-bold tracking-wide text-zinc-200/90 leading-none">
              ProjektBox
            </h1>
          </div>

          {/* Rechte Seite: TV beitreten & Einstellungen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setTvJoinError(null);
                setShowTvJoinModal(true);
              }}
              aria-label="Fernseher beitreten"
              title="Fernseher beitreten"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-black text-xs shadow-md shadow-purple-500/25 transition-transform active:scale-95 hover:brightness-110 cursor-pointer"
            >
              <Tv className="h-3.5 w-3.5 text-purple-200" />
              <span>TV beitreten</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
              aria-label="Einstellungen öffnen"
              title="Einstellungen"
              className="grid h-8.5 w-8.5 place-items-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 ring-1 ring-white/[0.06] transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              <Settings className="h-4.5 w-4.5 text-zinc-300" />
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
                    ? 'bg-white text-[#1C1C1E] shadow-xs'
                    : 'bg-white/[0.08] text-[#98989D] hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ─── 2. MITTE: Vertikal scrollbare Sektionen im App Store / Netflix Style ─── */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-8 pt-3 space-y-6 scrollbar-none">
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
      <GameSheet
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        onPlay={(game) => {
          setSelectedGame(null);
          setMultiplayerGame(game);
        }}
      />

      {/* ─── Multiplayer Lobby- & Spielbildschirm (für alle Spiele) ─── */}
      {multiplayerGame && (
        <LobbyScreen
          game={multiplayerGame}
          initialLobby={deepLinkLobby}
          onGameChange={(newGame) => setMultiplayerGame(newGame)}
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

      {/* ─── Einstellungsseite im exakten Stil des Game-Detail-Screens ─── */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={handleToggleVibration}
        onInstall={deferredPrompt ? handleInstall : undefined}
        onReplaySplash={() => {
          try {
            localStorage.removeItem('projektbox_splash_seen_v1');
          } catch {
            // ignore
          }
          setShowSplash(true);
        }}
      />
    </div>
  );
}

export default App;
