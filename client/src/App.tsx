import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import {
  GAMES,
  type Game,
  type SortOption,
} from './data/games';
import { GameCard } from './components/GameCard';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { IslandBackground } from './components/IslandBackground';
import {
  ArcadeLogoHeader,
  ArcadeMenuModal,
  PlayerProfileBar,
  SECTION_ITEMS,
} from './components/ArcadeHudElements';
import { CrystalButton, CrystalPanel, CrystalReadout } from './components/CrystalUI';
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { TvJoinModal } from './components/multiplayer/TvJoinModal';
import {
  getFavoriteGameIds,
  getRecentGames,
  recordGamePlayed,
  type RecentGameEntry,
  saveFavoriteGameIds,
  STORAGE_KEYS,
  useUserProfile,
} from './utils/userProfile';
import { socketService } from './services/socket';
import { parseLobbyCode } from './utils/qrCodeHelper';
import type { Lobby } from './types/multiplayer';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type NavSection = 'all' | 'duel' | 'party' | 'favorites' | 'recent';

const SORT_CYCLE: { id: SortOption; label: string }[] = [
  { id: 'alpha', label: 'A–Z' },
  { id: 'featured', label: 'EMPFOHLEN' },
  { id: 'players-asc', label: '2 → 8 SPIELER' },
  { id: 'players-desc', label: '8 → 2 SPIELER' },
  { id: 'duration-asc', label: 'DAUER' },
];

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

  // Filter, Suche, Sortierung, Favoriten & Zuletzt gespielt
  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteGameIds());
  const [recentEntries, setRecentEntries] = useState<RecentGameEntry[]>(() => getRecentGames());

  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [launchInTvMode, setLaunchInTvMode] = useState(false);
  const [deepLinkLobby, setDeepLinkLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Standardmäßig liegt der Fokus auf dem mittleren Spiel (Index 1 = Vier gewinnt)
  const [activeGameId, setActiveGameId] = useState<string>('connect');

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

  const recentPlayedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of recentEntries) {
      map.set(item.gameId, item.playedAt);
    }
    return map;
  }, [recentEntries]);

  // Nur das tatsächlich zuletzt gespielte Spiel erhält das grüne "ZULETZT"-Badge
  const mostRecentGameId = recentEntries[0]?.gameId ?? null;

  const games = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = GAMES.filter((game) => {
      if (activeSection === 'duel' && game.gameType !== 'duel') return false;
      if (activeSection === 'party' && game.gameType !== 'party') return false;
      if (activeSection === 'favorites' && !favoriteIds.includes(game.id)) return false;
      if (activeSection === 'recent' && !recentPlayedMap.has(game.id)) return false;

      if (query.length > 0) {
        const haystack = [
          game.title,
          game.subtitle,
          game.description,
          game.category,
          game.gameTypeLabel,
          game.players,
          ...game.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (activeSection === 'recent') {
        return (recentPlayedMap.get(b.id) || 0) - (recentPlayedMap.get(a.id) || 0);
      }
      if (sortBy === 'players-asc') {
        return a.maxPlayers - b.maxPlayers || a.title.localeCompare(b.title);
      }
      if (sortBy === 'players-desc') {
        return b.maxPlayers - a.maxPlayers || a.title.localeCompare(b.title);
      }
      if (sortBy === 'duration-asc') {
        return a.durationMinutes - b.durationMinutes;
      }
      if (sortBy === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [activeSection, favoriteIds, recentPlayedMap, searchQuery, sortBy]);

  // Aktives Spiel bestimmen
  const activeGame = useMemo(() => {
    if (games.length === 0) return GAMES[0];
    const found = games.find((g) => g.id === activeGameId);
    if (found) return found;
    return games[Math.floor(games.length / 2)] || games[0];
  }, [games, activeGameId]);

  // Bei 3 Spielen wird das aktive Spiel immer in die mittlere Fokus-Position rotiert
  const displayedGames = useMemo(() => {
    if (games.length !== 3) return games;
    const idx = games.findIndex((g) => g.id === activeGame.id);
    if (idx === -1 || idx === 1) return games;
    if (idx === 0) {
      return [games[2], games[0], games[1]];
    }
    return [games[1], games[2], games[0]];
  }, [games, activeGame]);

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

  const handleToggleFavorite = useCallback(
    (gameId: string) => {
      triggerHaptic();
      setFavoriteIds((prev) => {
        const next = prev.includes(gameId)
          ? prev.filter((id) => id !== gameId)
          : [...prev, gameId];
        saveFavoriteGameIds(next);
        return next;
      });
    },
    [triggerHaptic]
  );

  const handleLaunchGame = useCallback(
    (game: Game, tvMode = false) => {
      if (!game) return;
      triggerHaptic();
      const updatedRecent = recordGamePlayed(game.id);
      setRecentEntries(updatedRecent);
      setLaunchInTvMode(tvMode);
      setMultiplayerGame(game);
    },
    [triggerHaptic]
  );

  const handleCycleSort = () => {
    triggerHaptic();
    const currentIdx = SORT_CYCLE.findIndex((s) => s.id === sortBy);
    const nextIdx = (currentIdx + 1) % SORT_CYCLE.length;
    setSortBy(SORT_CYCLE[nextIdx].id);
  };

  const scrollToCenterCard = useCallback((idx: number) => {
    const container = cardsScrollRef.current;
    if (!container) return;
    const cardEl = container.children[idx] as HTMLElement | undefined;
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const handleSelectGame = useCallback(
    (gameId: string, renderedIdx: number) => {
      triggerHaptic();
      setActiveGameId(gameId);
      scrollToCenterCard(games.length === 3 ? 1 : renderedIdx);
    },
    [triggerHaptic, scrollToCenterCard, games.length]
  );

  const handleNext = useCallback(() => {
    if (games.length === 0) return;
    triggerHaptic();
    const currentIdx = games.findIndex((g) => g.id === activeGame.id);
    const nextIdx = (currentIdx + 1) % games.length;
    setActiveGameId(games[nextIdx].id);
    scrollToCenterCard(games.length === 3 ? 1 : nextIdx);
  }, [triggerHaptic, games, activeGame, scrollToCenterCard]);

  const handlePrev = useCallback(() => {
    if (games.length === 0) return;
    triggerHaptic();
    const currentIdx = games.findIndex((g) => g.id === activeGame.id);
    const prevIdx = (currentIdx - 1 + games.length) % games.length;
    setActiveGameId(games[prevIdx].id);
    scrollToCenterCard(games.length === 3 ? 1 : prevIdx);
  }, [triggerHaptic, games, activeGame, scrollToCenterCard]);

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

  const joinByCode = useCallback(async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsJoiningLobby(true);
    setTvJoinError(null);
    try {
      const lobby = await socketService.joinLobby(cleanCode);
      const matchedGame = GAMES.find((g) => g.id === lobby.gameId) || GAMES[0];
      const updatedRecent = recordGamePlayed(matchedGame.id);
      setRecentEntries(updatedRecent);
      setDeepLinkLobby(lobby);
      setLaunchInTvMode(false);
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
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

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
      if (showMenuModal) {
        if (e.key === 'Escape') setShowMenuModal(false);
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
        if (activeGame) handleLaunchGame(activeGame, false);
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
    showMenuModal,
    activeGame,
    handleNext,
    handlePrev,
    handleLaunchGame,
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

  const currentSortLabel = SORT_CYCLE.find((s) => s.id === sortBy)?.label || 'EMPFOHLEN';

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#1B2B40] text-[#1E293B] select-none">
      {/* ─── 0. Animierter Crystal-Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── 1. Globaler Crystal-Facetten-Hintergrund ─── */}
      <IslandBackground />

      {/* ─── Verbindungs-Overlay bei QR-Code Beitritt im Crystal-Panel-Stil ─── */}
      {isJoiningDeepLink && !multiplayerGame && (
        <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center bg-[#0F172A]/75 backdrop-blur-xs select-none p-4">
          <div className="w-full max-w-sm animate-fade-in">
            <CrystalPanel accent="amber" title="TV CONNECT" contentClassName="gap-3">
              <CrystalReadout label="LOBBY CODE" value={initialDeepLinkCode ?? '----'} />
              <p className="font-arcade text-sm tracking-wider text-[#334155] uppercase mt-1">
                JOINING TV LOBBY...
              </p>
            </CrystalPanel>
          </div>
        </div>
      )}

      {/* ─── 2. Haupt-HUD & Crystal-Bühne (kompakte Abstände ohne unnötigen vertikalen Leerraum) ─── */}
      <div className="safe-screen relative z-10 flex h-full w-full flex-col overflow-hidden">
        {/* ═══ OBERE LEISTE: Crystal-Suchfeld links • PROJEKT BOX Logo Mitte • TV-Code & Spielerprofil rechts ═══ */}
        <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 px-2 sm:px-4 pt-0.5 pb-1">
          {/* Links: Facettierte Crystal-Suchleiste */}
          <div className="flex items-center gap-2 flex-1 max-w-[220px] sm:max-w-[270px]">
            <div
              style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
              className="w-full bg-[#0F172A] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.45)]"
            >
              <div
                style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
                className="relative flex items-center bg-[#1E293B] border border-[#475569] px-3 py-1.5"
              >
                <Search className="h-4 w-4 text-[#FBBF24] shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SPIEL SUCHEN..."
                  aria-label="Spiele durchsuchen"
                  className="font-arcade w-full bg-transparent text-xs sm:text-sm tracking-wider text-[#F8FAFC] placeholder-[#94A3B8] uppercase focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Suche löschen"
                    className="ml-1 text-[#94A3B8] hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mitte: Trapezförmiger Crystal-Header ("PROJEKT BOX") */}
          <div className="mx-auto hidden md:block">
            <ArcadeLogoHeader />
          </div>

          {/* Rechts: TV-Join Button + Spieler-Anzeige + Optionen & Menü Icon-Buttons */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <CrystalButton
              size="sm"
              tilt="right"
              variant="amber"
              title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
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
              avatar={userProfile.avatar}
              onOpenSettings={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
              onOpenMenu={() => {
                triggerHaptic();
                setShowMenuModal(true);
              }}
            />
          </div>
        </header>

        {/* ═══ HAUPT-BÜHNE: SPIELAUSWAHL HEADER + FILTER/SORTIER-LEISTE + ZENTRIERTES KARUSSELL ═══ */}
        <main className="relative flex flex-1 min-h-0 w-full flex-col justify-center px-2 sm:px-6">
          <div className="mx-auto flex w-full max-w-[1005px] flex-col gap-1.5 sm:gap-2">
            {/* 1. ÜBERSCHRIFT & FILTER-/SORTIER-LEISTE (bündig mit den Außenkanten der Spielkarten) */}
            <div className="flex flex-col gap-1 px-1 sm:px-2">
              <div className="flex items-center justify-between">
                <span className="font-arcade text-xs sm:text-sm tracking-widest text-[#FDE68A] drop-shadow-[0_2px_0_rgba(15,23,42,0.85)] uppercase">
                  SPIELAUSWAHL
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
                {/* Links: Filter-Chips */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {SECTION_ITEMS.map((item, idx) => {
                    const count =
                      item.id === 'favorites'
                        ? favoriteIds.length
                        : item.id === 'recent'
                          ? recentEntries.length
                          : null;

                    return (
                      <CrystalButton
                        key={item.id}
                        size="sm"
                        tilt={idx % 2 === 0 ? 'left' : 'right'}
                        variant={activeSection === item.id ? item.accent : 'secondary'}
                        onClick={() => {
                          triggerHaptic();
                          setActiveSection(item.id);
                        }}
                      >
                        <span>{item.shortLabel}</span>
                        {count !== null && count > 0 && (
                          <span className="ml-0.5 opacity-90">({count})</span>
                        )}
                      </CrystalButton>
                    );
                  })}
                </div>

                {/* Ganz rechts (bündig mit der rechten Spielkarte): Sortier-Button */}
                <div className="ml-auto shrink-0 pl-2">
                  <CrystalButton
                    size="sm"
                    tilt="right"
                    variant="secondary"
                    onClick={handleCycleSort}
                    title="Sortierreihenfolge ändern"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>{currentSortLabel}</span>
                  </CrystalButton>
                </div>
              </div>
            </div>

            {/* 2. KARTEN-KARUSSELL MIT DEZENTEN PFEIL-BUTTONS LINKS & RECHTS */}
            {displayedGames.length > 0 ? (
              <div className="relative flex w-full items-center justify-center">
                {/* Dezenter Pfeil-Button links */}
                {displayedGames.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    title="Vorheriges Spiel"
                    aria-label="Vorheriges Spiel"
                    style={{ clipPath: 'polygon(8% 0%, 100% 6%, 92% 100%, 0% 94%)' }}
                    className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center bg-[#0F172A]/80 hover:bg-[#1E293B] text-[#E2E8F0] hover:text-[#FBBF24] border-2 border-[#475569] hover:border-[#F59E0B] shadow-lg transition-all active:scale-90 cursor-pointer z-30 mr-1.5"
                  >
                    <ChevronLeft className="h-6 w-6 stroke-[2.6]" />
                  </button>
                )}

                {/* Horizontale Kartenreihe */}
                <div
                  ref={cardsScrollRef}
                  onPointerDown={onPointerDownStrip}
                  onPointerMove={onPointerMoveStrip}
                  onPointerUp={onPointerUpStrip}
                  onPointerCancel={onPointerUpStrip}
                  className="no-scrollbar relative z-10 flex w-full items-center justify-start md:justify-center gap-3.5 sm:gap-5 overflow-x-auto px-2 py-3 sm:py-4 landscape:py-1 scroll-smooth"
                >
                  {displayedGames.map((game, index) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isActive={game.id === activeGame.id}
                      isFavorite={favoriteIds.includes(game.id)}
                      isLastPlayed={mostRecentGameId === game.id}
                      onSelect={() => {
                        if (!dragMoved.current) handleSelectGame(game.id, index);
                      }}
                      onPlay={(tvMode) => {
                        if (!dragMoved.current) handleLaunchGame(game, Boolean(tvMode));
                      }}
                      onToggleFavorite={() => handleToggleFavorite(game.id)}
                    />
                  ))}
                </div>

                {/* Dezenter Pfeil-Button rechts */}
                {displayedGames.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    title="Nächstes Spiel"
                    aria-label="Nächstes Spiel"
                    style={{ clipPath: 'polygon(0% 6%, 92% 0%, 100% 94%, 8% 100%)' }}
                    className="hidden sm:flex shrink-0 h-11 w-11 items-center justify-center bg-[#0F172A]/80 hover:bg-[#1E293B] text-[#E2E8F0] hover:text-[#FBBF24] border-2 border-[#475569] hover:border-[#F59E0B] shadow-lg transition-all active:scale-90 cursor-pointer z-30 ml-1.5"
                  >
                    <ChevronRight className="h-6 w-6 stroke-[2.6]" />
                  </button>
                )}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-md px-4 py-4">
                <CrystalPanel title="KEINE SPIELE" accent="amber" contentClassName="gap-3 py-6">
                  <p className="font-arcade text-center text-sm text-[#334155] uppercase px-2">
                    {activeSection === 'favorites'
                      ? 'NOCH KEINE FAVORITEN MARKIERT (HERZ-SYMBOL AUF KARTE TIPPEN).'
                      : activeSection === 'recent'
                        ? 'NOCH KEIN SPIEL ZULETZT GESPIELT.'
                        : 'KEIN SPIEL FÜR DIESE SUCHE GEFUNDEN.'}
                  </p>
                  <CrystalButton
                    size="md"
                    variant="amber"
                    onClick={() => {
                      triggerHaptic();
                      setActiveSection('all');
                      setSearchQuery('');
                    }}
                  >
                    ALLE SPIELE ZEIGEN
                  </CrystalButton>
                </CrystalPanel>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── 3. Filter- & Kategorie-Modal im CrystalPanel-Stil ─── */}
      <ArcadeMenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        activeSection={activeSection}
        onSelectSection={(sec) => {
          triggerHaptic();
          setActiveSection(sec);
        }}
        canInstall={Boolean(deferredPrompt)}
        onInstall={handleInstall}
      />

      {/* ─── 4. Multiplayer & TV Lobby-Screen beim Start eines Spiels ─── */}
      {multiplayerGame && (
        <LobbyScreen
          game={multiplayerGame}
          initialLobby={deepLinkLobby}
          initialTvMode={launchInTvMode}
          onClose={() => {
            setMultiplayerGame(null);
            setDeepLinkLobby(null);
            setLaunchInTvMode(false);
          }}
        />
      )}

      {/* ─── 5. Modal für TV-Beitritt (QR-Code Scan & Code-Eingabe) ─── */}
      <TvJoinModal
        isOpen={showTvJoinModal}
        onClose={() => setShowTvJoinModal(false)}
        onJoin={joinByCode}
        isJoining={isJoiningLobby}
        errorMessage={tvJoinError}
      />

      {/* ─── 6. Einstellungen ("OPTIONS" Panel) ─── */}
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
