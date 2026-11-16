import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import {
  GAMES,
  type Game,
} from './data/games';
import { GameCard } from './components/GameCard';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal';
import { IslandBackground } from './components/IslandBackground';
import {
  ArcadeLogoHeader,
  ArcadeMenuModal,
  PlayerAvatarButton,
  PlayerProfileBar,
  SectionFilterBar,
} from './components/ArcadeHudElements';
import { CrystalButton, CrystalIconButton, CrystalPanel, CrystalReadout } from './components/CrystalUI';
import { LayoutExplorerModal, type MenuLayoutVariant } from './components/LayoutExplorerModal';
import {
  OpenFloatingDockLayout,
  OpenGalleryLayout,
  OpenGlassPillsLayout,
  OpenMinimalLayout,
  OpenStageLayout,
} from './components/MainMenuLayouts';
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { TvJoinModal } from './components/multiplayer/TvJoinModal';
import {
  getFavoriteGameIds,
  getRecentGames,
  recordGamePlayed,
  type RecentGameEntry,
  saveFavoriteGameIds,
  saveUserProfile,
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

  // Filter, Suche, Favoriten & Zuletzt gespielt
  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteGameIds());
  const [recentEntries, setRecentEntries] = useState<RecentGameEntry[]>(() => getRecentGames());

  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [launchInTvMode, setLaunchInTvMode] = useState(false);
  const [deepLinkLobby, setDeepLinkLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBlankPage, setShowBlankPage] = useState(false);
  const [menuLayout, setMenuLayout] = useState<MenuLayoutVariant>(() => {
    try {
      const saved = localStorage.getItem('projektbox_menu_layout');
      if (
        saved === 'carousel' ||
        saved === 'open' ||
        saved === 'open-pills' ||
        saved === 'open-dock' ||
        saved === 'open-gallery' ||
        saved === 'open-minimal'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'carousel';
  });
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
  const programmaticScrollRef = useRef(false);

  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerHeight <= 540 && window.innerWidth > window.innerHeight
      : false
  );
  const [isCompactScreen, setIsCompactScreen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 430 : false
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setIsLandscapeMobile(window.innerHeight <= 540 && window.innerWidth > window.innerHeight);
      setIsCompactScreen(window.innerWidth < 430);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

    if (activeSection === 'recent') {
      return [...filtered].sort(
        (a, b) => (recentPlayedMap.get(b.id) || 0) - (recentPlayedMap.get(a.id) || 0)
      );
    }
    return filtered;
  }, [activeSection, favoriteIds, recentPlayedMap, searchQuery]);

  // Aktives Spiel bestimmen
  const activeGame = useMemo(() => {
    if (games.length === 0) return GAMES[0];
    const found = games.find((g) => g.id === activeGameId);
    if (found) return found;
    return games[Math.floor(games.length / 2)] || games[0];
  }, [games, activeGameId]);

  // Auf Desktop (>= 768px) wird bei 3 Spielen das aktive Spiel in die mittlere Fokus-Position rotiert;
  // auf Mobile (< 768px) & im Smartphone-Querformat bleibt die Reihenfolge für flüssiges CSS Scroll-Snap stabil.
  const displayedGames = useMemo(() => {
    if (isMobileViewport || isLandscapeMobile || games.length !== 3) return games;
    const idx = games.findIndex((g) => g.id === activeGame.id);
    if (idx === -1 || idx === 1) return games;
    if (idx === 0) {
      return [games[2], games[0], games[1]];
    }
    return [games[1], games[2], games[0]];
  }, [games, activeGame, isMobileViewport, isLandscapeMobile]);

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

  // Gemeinsamer Filter-Status für Inline-Leiste und kompaktes Sandwich-Modal:
  // Beim Umschalten der Darstellung bleibt die Auswahl daher immer erhalten.
  const handleSelectSection = useCallback(
    (sec: NavSection) => {
      triggerHaptic();
      setActiveSection(sec);
    },
    [triggerHaptic]
  );

  const handleOpenFilterMenu = useCallback(() => {
    triggerHaptic();
    setShowMenuModal(true);
  }, [triggerHaptic]);

  const filterCounts = useMemo<Partial<Record<NavSection, number>>>(
    () => ({ favorites: favoriteIds.length, recent: recentEntries.length }),
    [favoriteIds.length, recentEntries.length]
  );

  const scrollToCenterCard = useCallback((idx: number, instant = false) => {
    const container = cardsScrollRef.current;
    if (!container) return;
    const cardEl = container.children[idx] as HTMLElement | undefined;
    if (!cardEl) return;

    programmaticScrollRef.current = true;
    const targetLeft =
      cardEl.offsetLeft - (container.clientWidth - cardEl.offsetWidth) / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: instant ? 'auto' : 'smooth',
    });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 380);
  }, []);

  // Beim Start & nach dem Splash-Screen die aktive Karte auf Mobile mittig einrasten
  // (im Smartphone-Querformat zeigen wir 2 volle Karten nebeneinander ab Position 0)
  useEffect(() => {
    if (displayedGames.length === 0) return;
    if (isLandscapeMobile) {
      const raf = requestAnimationFrame(() => {
        cardsScrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
      });
      return () => cancelAnimationFrame(raf);
    }
    if (!isMobileViewport) return;
    const activeIdx = displayedGames.findIndex((g) => g.id === activeGame.id);
    const targetIdx = activeIdx >= 0 ? activeIdx : Math.floor(displayedGames.length / 2);
    const raf = requestAnimationFrame(() => {
      scrollToCenterCard(targetIdx, true);
    });
    return () => cancelAnimationFrame(raf);
  }, [isMobileViewport, isLandscapeMobile, showSplash, activeSection, displayedGames, activeGame.id, scrollToCenterCard]);

  const handleCarouselScroll = useCallback(() => {
    if ((!isMobileViewport && !isLandscapeMobile) || programmaticScrollRef.current) return;
    const container = cardsScrollRef.current;
    if (!container || displayedGames.length === 0) return;

    const centerX = container.scrollLeft + container.clientWidth / 2;
    let closestIdx = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - centerX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    const centeredGame = displayedGames[closestIdx];
    if (centeredGame && centeredGame.id !== activeGame.id) {
      setActiveGameId(centeredGame.id);
    }
  }, [isMobileViewport, isLandscapeMobile, displayedGames, activeGame.id]);

  const handleSelectGame = useCallback(
    (gameId: string, renderedIdx: number) => {
      triggerHaptic();
      setActiveGameId(gameId);
      if (isLandscapeMobile) {
        const container = cardsScrollRef.current;
        const cardEl = container?.children[renderedIdx] as HTMLElement | undefined;
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
      }
      scrollToCenterCard(!isMobileViewport && games.length === 3 ? 1 : renderedIdx);
    },
    [triggerHaptic, scrollToCenterCard, games.length, isMobileViewport, isLandscapeMobile]
  );

  const handleNext = useCallback(() => {
    if (games.length === 0) return;
    triggerHaptic();
    if (isLandscapeMobile) {
      const container = cardsScrollRef.current;
      const firstCard = container?.children[0] as HTMLElement | undefined;
      if (container && firstCard) {
        const step = firstCard.offsetWidth + 16;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const nextLeft = container.scrollLeft < maxScroll - 12 ? container.scrollLeft + step : 0;
        container.scrollTo({ left: nextLeft, behavior: 'smooth' });
      }
      const currentIdx = games.findIndex((g) => g.id === activeGame.id);
      const nextIdx = (currentIdx + 1) % games.length;
      setActiveGameId(games[nextIdx].id);
      return;
    }
    const currentIdx = games.findIndex((g) => g.id === activeGame.id);
    const nextIdx = (currentIdx + 1) % games.length;
    setActiveGameId(games[nextIdx].id);
    scrollToCenterCard(!isMobileViewport && games.length === 3 ? 1 : nextIdx);
  }, [triggerHaptic, games, activeGame, scrollToCenterCard, isMobileViewport, isLandscapeMobile]);

  const handlePrev = useCallback(() => {
    if (games.length === 0) return;
    triggerHaptic();
    if (isLandscapeMobile) {
      const container = cardsScrollRef.current;
      const firstCard = container?.children[0] as HTMLElement | undefined;
      if (container && firstCard) {
        const step = firstCard.offsetWidth + 16;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const prevLeft = container.scrollLeft > 12 ? Math.max(0, container.scrollLeft - step) : maxScroll;
        container.scrollTo({ left: prevLeft, behavior: 'smooth' });
      }
      const currentIdx = games.findIndex((g) => g.id === activeGame.id);
      const prevIdx = (currentIdx - 1 + games.length) % games.length;
      setActiveGameId(games[prevIdx].id);
      return;
    }
    const currentIdx = games.findIndex((g) => g.id === activeGame.id);
    const prevIdx = (currentIdx - 1 + games.length) % games.length;
    setActiveGameId(games[prevIdx].id);
    scrollToCenterCard(!isMobileViewport && games.length === 3 ? 1 : prevIdx);
  }, [triggerHaptic, games, activeGame, scrollToCenterCard, isMobileViewport, isLandscapeMobile]);

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
      if (showAvatarModal) {
        if (e.key === 'Escape') setShowAvatarModal(false);
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
      if (showBlankPage) {
        if (e.key === 'Escape') setShowBlankPage(false);
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
    showAvatarModal,
    multiplayerGame,
    showTvJoinModal,
    showMenuModal,
    showBlankPage,
    activeGame,
    handleNext,
    handlePrev,
    handleLaunchGame,
  ]);

  const onPointerDownStrip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !cardsScrollRef.current) return;
    isPointerDown.current = true;
    dragMoved.current = false;
    startClientX.current = e.clientX;
    startScrollX.current = cardsScrollRef.current.scrollLeft;
  };

  const onPointerMoveStrip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !isPointerDown.current || !cardsScrollRef.current) return;
    const dx = e.clientX - startClientX.current;
    if (Math.abs(dx) > 6) dragMoved.current = true;
    cardsScrollRef.current.scrollLeft = startScrollX.current - dx;
  };

  const onPointerUpStrip = () => {
    isPointerDown.current = false;
  };

  const renderSearchBox = (compact = false) => (
    <div
      style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
      className="w-full min-w-0 bg-[#0F172A] p-[2.5px] sm:p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.45)]"
    >
      <div
        style={{ clipPath: 'polygon(0% 6%, 100% 0%, 98% 95%, 2% 100%)' }}
        className={`relative flex min-w-0 items-center bg-[#1E293B] border border-[#475569] ${
          compact ? 'px-2 py-0.5 h-7' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 xl:h-9'
        }`}
      >
        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FBBF24] shrink-0 mr-1.5 sm:mr-2" />
        <input
          type="text"
          size={1}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isCompactScreen || compact ? 'SUCHEN...' : 'SPIEL SUCHEN...'}
          aria-label="Spiele durchsuchen"
          style={{ color: '#FFFFFF', caretColor: '#FFFFFF' }}
          className={`font-arcade min-w-0 flex-1 w-full bg-transparent font-bold tracking-wider text-white placeholder:text-white/55 uppercase focus:outline-none caret-white ${
            compact ? 'text-[11px]' : 'text-xs sm:text-sm'
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Suche löschen"
            className="ml-1 shrink-0 text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-dvh min-h-dvh w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-[#1E293B] select-none">
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
        {/* ═══ OBERE LEISTE: Avatar links • PROJEKT BOX Logo & Button Mitte • TV-Code & Optionen rechts ═══ */}
        <header className="tablet-header landscape-top-bar relative z-30 flex md:grid md:grid-cols-[1fr_auto_1fr] shrink-0 flex-nowrap items-center justify-between gap-1.5 sm:gap-2 px-1.5 sm:px-4 pt-0.5 pb-1 landscape:py-0.5 landscape:px-0">
          {/* Links: Spieler-Avatar */}
          <div className="shrink-0 flex items-center md:justify-self-start">
            <PlayerAvatarButton
              avatar={userProfile.avatar}
              onClick={() => {
                triggerHaptic();
                setShowAvatarModal(true);
              }}
            />
          </div>

          {/* Mitte: Trapezförmiger Crystal-Header ("PROJEKT BOX") + neuer Button daneben */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 md:justify-self-center">
            <div className="landscape-hide-logo landscape:hidden!">
              <ArcadeLogoHeader />
            </div>
            <CrystalIconButton
              size="sm"
              variant="crystal"
              tilt="right"
              onClick={() => {
                triggerHaptic();
                setShowBlankPage(true);
              }}
              title="Leere Ansicht öffnen"
              aria-label="Leere Ansicht öffnen"
            >
              <Plus className="h-4 w-4 stroke-[2.8]" />
            </CrystalIconButton>
          </div>

          {/* Rechts: TV-Join Button + Optionen */}
          <div className="shrink-0 flex items-center gap-1 sm:gap-2 md:justify-self-end">
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
              showAvatar={false}
              onOpenSettings={() => {
                triggerHaptic();
                setShowSettings(true);
              }}
            />
          </div>
        </header>

        {/* ═══ HAUPT-BÜHNE: Klare Aufteilung in festen FILTERBEREICH (oben) und flexiblen SPIELEBEREICH ═══
            Der Container hat eine von der Spieleanzahl unabhängige Höhe (flex-1, auf großen Screens begrenzt),
            dadurch bleibt die Filterleiste bei vielen, wenigen und null Spielen exakt an derselben Position. */}
        <main className="tablet-main-area widescreen-main-area relative flex flex-1 min-h-0 w-full flex-col justify-start md:justify-center pt-3 md:pt-0 px-0 sm:px-6 landscape:p-0 landscape:justify-stretch">
          <div className="widescreen-main-container landscape-main-container mx-auto flex w-full flex-1 min-h-0 md:max-h-[46rem] max-w-[1005px] xl:max-w-[1420px] landscape:max-w-none flex-col gap-1.5 sm:gap-2">
            {/* 1. STANDARD-FILTERBEREICH: Nur bei Classic Karussell & Basis Open Stage (die anderen offenen Designs bringen eigene Filter-/Such-Varianten mit) */}
            {(menuLayout === 'carousel' || menuLayout === 'open') && (
            <div className="shrink-0">
              {/* ═══ MOBILE LANDSCAPE (max-height: 540px): ALLES IN EINER EINZIGEN HORIZONTALEN ZEILE ═══ */}
              <div className="hidden landscape:flex items-center justify-between gap-2.5 px-0.5 py-0 w-full">
                <span className="font-arcade text-xs tracking-widest text-[#FDE68A] drop-shadow-[0_2px_0_rgba(15,23,42,0.85)] uppercase shrink-0">
                  SPIELAUSWAHL
                </span>

                <SectionFilterBar
                  activeSection={activeSection}
                  onSelectSection={handleSelectSection}
                  onOpenMenu={handleOpenFilterMenu}
                  counts={filterCounts}
                  gapClassName="gap-1.5"
                  buttonClassName="h-7 px-2.5 text-xs"
                />

                <div className="shrink-0 w-[145px] sm:w-[185px]">
                  {renderSearchBox(true)}
                </div>
              </div>

              {/* ═══ STANDARDFALL (PORTRAIT & DESKTOP): 2 ZEILEN ═══ */}
              <div className="flex landscape:hidden flex-col gap-1.5 px-3 sm:px-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-arcade text-xs sm:text-sm tracking-widest text-[#FDE68A] drop-shadow-[0_2px_0_rgba(15,23,42,0.85)] uppercase">
                    SPIELAUSWAHL
                  </span>

                  {/* Auf Mobile (< 768px) rechtsbündig direkt neben "SPIELAUSWAHL" */}
                  <div className="md:hidden shrink-0 w-[165px] sm:w-[205px]">
                    {renderSearchBox()}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 py-0.5">
                  {/* Links: Filter direkt sichtbar – Sandwich-Menü nur bei tatsächlichem Platzmangel */}
                  <SectionFilterBar
                    activeSection={activeSection}
                    onSelectSection={handleSelectSection}
                    onOpenMenu={handleOpenFilterMenu}
                    counts={filterCounts}
                  />

                  {/* Auf Desktop & Tablet (>= 768px) rechts neben den Kategorien */}
                  <div className="hidden md:block ml-auto shrink-0 pl-2 w-[210px] lg:w-[240px] xl:w-[260px]">
                    {renderSearchBox()}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* 2. SPIELEBEREICH: Karussell, Offene Designs oder Leer-Meldung */}
            <section
              aria-label="Spiele"
              className="flex flex-1 min-h-0 w-full flex-col justify-start md:justify-center landscape:justify-stretch"
            >
            {menuLayout === 'open-pills' ? (
              <OpenGlassPillsLayout
                games={displayedGames}
                activeGame={activeGame}
                favoriteIds={favoriteIds}
                activeSection={activeSection}
                searchQuery={searchQuery}
                filterCounts={filterCounts}
                onSelectGame={setActiveGameId}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onSelectSection={handleSelectSection}
                onSearchChange={setSearchQuery}
              />
            ) : menuLayout === 'open-dock' ? (
              <OpenFloatingDockLayout
                games={displayedGames}
                activeGame={activeGame}
                favoriteIds={favoriteIds}
                activeSection={activeSection}
                searchQuery={searchQuery}
                filterCounts={filterCounts}
                onSelectGame={setActiveGameId}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onSelectSection={handleSelectSection}
                onSearchChange={setSearchQuery}
              />
            ) : menuLayout === 'open-gallery' ? (
              <OpenGalleryLayout
                games={displayedGames}
                activeGame={activeGame}
                favoriteIds={favoriteIds}
                activeSection={activeSection}
                searchQuery={searchQuery}
                filterCounts={filterCounts}
                onSelectGame={setActiveGameId}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onSelectSection={handleSelectSection}
                onSearchChange={setSearchQuery}
              />
            ) : menuLayout === 'open-minimal' ? (
              <OpenMinimalLayout
                games={displayedGames}
                activeGame={activeGame}
                favoriteIds={favoriteIds}
                activeSection={activeSection}
                searchQuery={searchQuery}
                filterCounts={filterCounts}
                onSelectGame={setActiveGameId}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onSelectSection={handleSelectSection}
                onSearchChange={setSearchQuery}
              />
            ) : displayedGames.length > 0 ? (
              menuLayout === 'open' ? (
                <OpenStageLayout
                  games={displayedGames}
                  activeGame={activeGame}
                  favoriteIds={favoriteIds}
                  activeSection={activeSection}
                  searchQuery={searchQuery}
                  filterCounts={filterCounts}
                  onSelectGame={setActiveGameId}
                  onLaunchGame={handleLaunchGame}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectSection={handleSelectSection}
                  onSearchChange={setSearchQuery}
                />
              ) : (
              <div className="landscape-carousel-row relative flex w-full landscape:flex-1 landscape:min-h-0 items-center landscape:items-stretch justify-center">
                {/* Markanter, schräg angeschnittener Pfeil-Button links */}
                {displayedGames.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    title="Vorheriges Spiel"
                    aria-label="Vorheriges Spiel"
                    style={{ clipPath: 'polygon(12% 0%, 100% 6%, 88% 100%, 0% 94%)' }}
                    className="widescreen-nav-arrow landscape-nav-arrow hidden sm:flex landscape:flex shrink-0 h-11 w-11 xl:h-16 xl:w-14 landscape:h-12 landscape:w-9 items-center justify-center bg-gradient-to-b from-[#1E293B] to-[#0F172A] hover:from-[#334155] hover:to-[#1E293B] text-[#F8FAFC] hover:text-[#FBBF24] border-2 border-[#475569] hover:border-[#F59E0B] shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all active:scale-95 cursor-pointer z-30 mr-2 xl:mr-3 landscape:mr-0"
                  >
                    <ChevronLeft className="h-6 w-6 xl:h-8 xl:w-8 landscape:h-5 landscape:w-5 stroke-[3]" />
                  </button>
                )}

                {/* Horizontale Kartenreihe mit CSS Scroll-Snap & 2 vollen Karten im Querformat */}
                <div
                  ref={cardsScrollRef}
                  onScroll={handleCarouselScroll}
                  onPointerDown={onPointerDownStrip}
                  onPointerMove={onPointerMoveStrip}
                  onPointerUp={onPointerUpStrip}
                  onPointerCancel={onPointerUpStrip}
                  className="tablet-carousel-container widescreen-carousel-container landscape-carousel-track no-scrollbar relative z-10 flex w-full snap-x snap-mandatory md:snap-none items-center justify-start md:justify-center gap-3 sm:gap-5 overflow-x-auto px-[8.5vw] sm:px-6 md:px-2 py-2 sm:py-4 landscape:p-0 scroll-smooth"
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

                {/* Markanter, schräg angeschnittener Pfeil-Button rechts */}
                {displayedGames.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    title="Nächstes Spiel"
                    aria-label="Nächstes Spiel"
                    style={{ clipPath: 'polygon(0% 6%, 88% 0%, 100% 94%, 12% 100%)' }}
                    className="widescreen-nav-arrow landscape-nav-arrow hidden sm:flex landscape:flex shrink-0 h-11 w-11 xl:h-16 xl:w-14 landscape:h-12 landscape:w-9 items-center justify-center bg-gradient-to-b from-[#1E293B] to-[#0F172A] hover:from-[#334155] hover:to-[#1E293B] text-[#F8FAFC] hover:text-[#FBBF24] border-2 border-[#475569] hover:border-[#F59E0B] shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all active:scale-95 cursor-pointer z-30 ml-2 xl:ml-3 landscape:ml-0"
                  >
                    <ChevronRight className="h-6 w-6 xl:h-8 xl:w-8 landscape:h-5 landscape:w-5 stroke-[3]" />
                  </button>
                )}
              </div>
              )
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
            </section>
          </div>
        </main>
      </div>

      {/* ─── 3. Kompaktes Filter-Modal (nur erreichbar, wenn die Filterleiste aus Platzmangel eingeklappt ist) ─── */}
      <ArcadeMenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
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

      {/* ─── 7. Spielerprofil: Name & Avatar zentral an einer Stelle ─── */}
      {showAvatarModal && (
        <AvatarCustomizerModal
          onClose={() => setShowAvatarModal(false)}
          config={userProfile.avatar}
          name={userProfile.name}
          onSave={({ avatar, name }) => {
            saveUserProfile({ avatar, name });
          }}
        />
      )}

      {/* ─── 8. Design-Exploration: Hauptmenü-Layout-Varianten testen ─── */}
      {showBlankPage && (
        <LayoutExplorerModal
          activeLayout={menuLayout}
          onSelectLayout={(variant) => {
            triggerHaptic();
            setMenuLayout(variant);
            try {
              localStorage.setItem('projektbox_menu_layout', variant);
            } catch {
              // ignore
            }
            setShowBlankPage(false);
          }}
          onClose={() => {
            triggerHaptic();
            setShowBlankPage(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
