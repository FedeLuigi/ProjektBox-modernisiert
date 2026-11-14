import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Gamepad2,
  Heart,
  History,
  Play,
  QrCode,
  Search,
  Settings,
  Sparkles,
  Swords,
  Tv,
  Users,
  X,
} from 'lucide-react';
import {
  GAMES,
  type Game,
  type PlayerCountFilter,
  type SortOption,
} from './data/games';
import { GameCard } from './components/GameCard';
import { GamePreviewArtwork } from './components/GamePreviewArtwork';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { IslandBackground } from './components/IslandBackground';
import { Avatar } from './components/Avatar';
import { CrystalPanel, CrystalReadout } from './components/CrystalUI';
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

  // Navigation, Suche, Filter & Sortierung
  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<PlayerCountFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Favoriten & Zuletzt gespielt (persistent in localStorage)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteGameIds());
  const [recentEntries, setRecentEntries] = useState<RecentGameEntry[]>(() => getRecentGames());

  // Schnellbeitritt per Raum-Code direkt auf der Startseite
  const [quickJoinCode, setQuickJoinCode] = useState('');

  // Modals & aktiver Spielstart
  const [isJoiningDeepLink, setIsJoiningDeepLink] = useState(Boolean(initialDeepLinkCode));
  const [showTvJoinModal, setShowTvJoinModal] = useState(false);
  const [tvJoinError, setTvJoinError] = useState<string | null>(null);
  const [isJoiningLobby, setIsJoiningLobby] = useState(false);
  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [launchInTvMode, setLaunchInTvMode] = useState(false);
  const [deepLinkLobby, setDeepLinkLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

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
      triggerHaptic();
      const updatedRecent = recordGamePlayed(game.id);
      setRecentEntries(updatedRecent);
      setLaunchInTvMode(tvMode);
      setMultiplayerGame(game);
    },
    [triggerHaptic]
  );

  // Map für schnellen Zugriff auf den letzten Spielzeitpunkt
  const recentPlayedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of recentEntries) {
      map.set(item.gameId, item.playedAt);
    }
    return map;
  }, [recentEntries]);

  // Gefilterte und sortierte Spieleliste nach Spieltyp, Spielerzahl & Suchbegriff
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = GAMES.filter((game) => {
      // 1. Sektion / Spieltyp-Filter
      if (activeSection === 'duel' && game.gameType !== 'duel') return false;
      if (activeSection === 'party' && game.gameType !== 'party') return false;
      if (activeSection === 'favorites' && !favoriteIds.includes(game.id)) return false;
      if (activeSection === 'recent' && !recentPlayedMap.has(game.id)) return false;

      // 2. Spielerzahl-Filter
      if (playerFilter === '2' && game.maxPlayers !== 2) return false;
      if (playerFilter === '3+' && game.maxPlayers < 3) return false;

      // 3. Freitext-Suchfunktion (Titel, Untertitel, Beschreibung, Tags, Spielerzahl)
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

    // 4. Sortierung
    return [...list].sort((a, b) => {
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
  }, [activeSection, favoriteIds, playerFilter, recentPlayedMap, searchQuery, sortBy]);

  // Zuletzt gespielte Spiele als Objekte
  const recentGamesList = useMemo(() => {
    return recentEntries
      .map((entry) => GAMES.find((g) => g.id === entry.gameId))
      .filter((g): g is Game => Boolean(g));
  }, [recentEntries]);

  // Aktuell im Hero-Banner hervorgehobenes Spiel
  const safeFeaturedIndex = featuredIndex >= GAMES.length ? 0 : featuredIndex;
  const featuredGame = GAMES[safeFeaturedIndex] || GAMES[0];

  const handleNextFeatured = useCallback(() => {
    triggerHaptic();
    setFeaturedIndex((prev) => (prev + 1) % GAMES.length);
  }, [triggerHaptic]);

  const handlePrevFeatured = useCallback(() => {
    triggerHaptic();
    setFeaturedIndex((prev) => (prev - 1 + GAMES.length) % GAMES.length);
  }, [triggerHaptic]);

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

  const joinByCode = useCallback(
    async (code: string) => {
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
        setQuickJoinCode('');
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
    },
    []
  );

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
  }, [showSplash, showSettings, multiplayerGame, showTvJoinModal]);

  const handleResetFilters = () => {
    triggerHaptic();
    setActiveSection('all');
    setPlayerFilter('all');
    setSearchQuery('');
    setSortBy('featured');
  };

  const sectionMeta: Record<NavSection, { title: string; subtitle: string }> = {
    all: {
      title: 'Multiplayer-Spiele',
      subtitle: 'Sortiert nach Spieltyp, Spielerzahl und Spieldauer',
    },
    duel: {
      title: '1v1 Taktik-Duelle',
      subtitle: 'Spannende Kopf-an-Kopf-Matches für genau 2 Spieler',
    },
    party: {
      title: 'Party & Gruppenspiele',
      subtitle: 'Kreative Runden für 2 bis 8 Spieler – ideal mit TV-Modus',
    },
    favorites: {
      title: 'Deine Favoriten',
      subtitle: 'Schnellzugriff auf deine markierten Lieblingsspiele',
    },
    recent: {
      title: 'Zuletzt gespielt',
      subtitle: 'Springe direkt zurück in deine letzten Partien',
    },
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#131D2E] text-[#F8FAFC] select-none">
      {/* ─── 0. Animierter Ladebildschirm beim Start ─── */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      {/* ─── 1. Atmosphärischer Hintergrund ─── */}
      <IslandBackground />

      {/* ─── Verbindungs-Overlay bei QR-Code Deep-Link Beitritt ─── */}
      {isJoiningDeepLink && !multiplayerGame && (
        <div className="fixed inset-0 min-h-dvh z-50 flex w-full flex-col items-center justify-center bg-[#0F172A]/80 backdrop-blur-xs select-none p-4">
          <div className="w-full max-w-sm animate-fade-in">
            <CrystalPanel accent="amber" title="TV CONNECT" contentClassName="gap-3">
              <CrystalReadout label="LOBBY CODE" value={initialDeepLinkCode ?? '----'} />
              <p className="font-arcade text-sm tracking-wider text-[#334155] uppercase mt-1">
                TRETE TV-LOBBY BEI...
              </p>
            </CrystalPanel>
          </div>
        </div>
      )}

      {/* ─── 2. HAUPT-APP-LAYOUT (Inspiriert vom Dashboard-Layout mit klarer visueller Hierarchie) ─── */}
      <div className="relative z-10 flex flex-1 min-h-0 w-full overflow-hidden">
        {/* ═══ LINKE SIDEBAR NAVIGATION (Desktop) ═══ */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-[#26354D] bg-[#152033]/90 backdrop-blur-md p-5">
          <div className="flex flex-col gap-6">
            {/* ProjektBox Marken-Logo */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#F43F5E] via-[#8B5CF6] to-[#3B82F6] text-white shadow-[0_6px_16px_rgba(139,92,246,0.4)]">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <div>
                <span className="font-arcade block text-xl tracking-wider text-white uppercase leading-none">
                  PROJEKT <span className="text-[#FBBF24]">BOX</span>
                </span>
                <span className="text-[11px] font-medium text-[#94A3B8]">
                  Multiplayer Arcade
                </span>
              </div>
            </div>

            {/* Hauptnavigation */}
            <nav className="flex flex-col gap-1.5" aria-label="Hauptnavigation">
              {[
                {
                  id: 'all' as NavSection,
                  label: 'Alle Spiele',
                  icon: Compass,
                  iconColor: 'text-[#38BDF8] bg-[#38BDF8]/15',
                  badge: GAMES.length,
                },
                {
                  id: 'duel' as NavSection,
                  label: '1v1 Duelle (2 Sp.)',
                  icon: Swords,
                  iconColor: 'text-[#F43F5E] bg-[#F43F5E]/15',
                  badge: GAMES.filter((g) => g.gameType === 'duel').length,
                },
                {
                  id: 'party' as NavSection,
                  label: 'Party & Gruppe (2–8)',
                  icon: Sparkles,
                  iconColor: 'text-[#F59E0B] bg-[#F59E0B]/15',
                  badge: GAMES.filter((g) => g.gameType === 'party').length,
                },
                {
                  id: 'favorites' as NavSection,
                  label: 'Favoriten',
                  icon: Heart,
                  iconColor: 'text-[#EC4899] bg-[#EC4899]/15',
                  badge: favoriteIds.length,
                },
                {
                  id: 'recent' as NavSection,
                  label: 'Zuletzt gespielt',
                  icon: History,
                  iconColor: 'text-[#10B981] bg-[#10B981]/15',
                  badge: recentEntries.length,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setActiveSection(item.id);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#3B82F6] text-white shadow-[0_6px_18px_rgba(139,92,246,0.35)]'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-white/20 text-white' : item.iconColor
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-[#1E293B] text-[#94A3B8]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="my-2 border-t border-[#26354D]" />

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setShowSettings(true);
                }}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white transition-all cursor-pointer"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#64748B]/20 text-[#94A3B8]">
                  <Settings className="h-4 w-4" />
                </span>
                <span>Einstellungen</span>
              </button>
            </nav>
          </div>

          {/* Untere Callout-Card in der Sidebar (TV-Party & App-Install) */}
          <div className="rounded-2xl border border-[#2E4263] bg-gradient-to-b from-[#1E293B] to-[#131C2E] p-4 text-center shadow-lg">
            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
              <Tv className="h-6 w-6" />
            </div>
            <h4 className="font-arcade text-base tracking-wide text-white uppercase">
              TV-Party Modus
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
              Starte ein Spiel auf dem großen Bildschirm und trete per QR-Code mit dem Handy bei!
            </p>
            <button
              type="button"
              onClick={() => handleLaunchGame(featuredGame, true)}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#3B82F6] py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
            >
              TV-Lobby starten
            </button>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#38BDF8]/40 bg-[#0284C7]/20 py-2 px-3 text-xs font-semibold text-[#7DD3FC] hover:bg-[#0284C7]/30 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>App installieren</span>
              </button>
            )}
          </div>
        </aside>

        {/* ═══ RECHTER HAUPTBEREICH: TOP-HEADER + SCROLLBARER CONTENT ═══ */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* ─── OBERE LEISTE: Mobiles Logo • Suchfunktion • Spielerprofil (ohne ablenkende Münzanzeige) ─── */}
          <header
            style={{
              paddingTop: 'calc(0.6rem + env(safe-area-inset-top, 0px))',
            }}
            className="shrink-0 border-b border-[#26354D]/80 bg-[#152033]/85 backdrop-blur-md px-3.5 sm:px-6 pb-3"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 sm:gap-4">
              {/* Kompaktes Markenlogo auf kleinen Displays */}
              <div className="flex lg:hidden items-center gap-2 shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F43F5E] via-[#8B5CF6] to-[#3B82F6] text-white shadow-sm">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <span className="font-arcade hidden xs:inline text-base tracking-wider text-white uppercase">
                  PROJEKT <span className="text-[#FBBF24]">BOX</span>
                </span>
              </div>

              {/* Suchleiste (Search Now) */}
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Spiele, Spieltyp oder Spielerzahl suchen..."
                  aria-label="Spiele durchsuchen"
                  className="w-full rounded-xl border border-[#293B56] bg-[#1B283D] pl-10 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-[#94A3B8] focus:border-[#38BDF8] focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Suche löschen"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#94A3B8] hover:bg-[#293B56] hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Rechts: TV-Code Button (mobil) + Spielerprofil-Pill */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setTvJoinError(null);
                    setShowTvJoinModal(true);
                  }}
                  title="Mit Raum-Code oder QR-Scanner beitreten"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 px-3 py-2 text-xs font-bold text-[#FDE68A] transition-colors active:scale-95 cursor-pointer"
                >
                  <QrCode className="h-4 w-4 text-[#FBBF24]" />
                  <span className="hidden sm:inline">Raum-Code</span>
                </button>

                {/* Spielerprofil-Button (öffnet Profil & Einstellungen) */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setShowSettings(true);
                  }}
                  title="Spielerprofil & Einstellungen öffnen"
                  className="flex items-center gap-2.5 rounded-xl border border-[#293B56] bg-[#1B283D] hover:border-[#475569] p-1.5 sm:pr-3.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Avatar config={userProfile.avatar} size={30} />
                  <span className="hidden md:inline text-xs sm:text-sm font-semibold text-[#F8FAFC] max-w-[130px] truncate">
                    {userProfile.name}
                  </span>
                  <Settings className="h-4 w-4 text-[#94A3B8] hidden sm:inline" />
                </button>
              </div>
            </div>
          </header>

          {/* ─── HAUPT-SCROLLBEREICH (Optimale Orientierung auf großen & kleinen Displays) ─── */}
          <main className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-20 lg:pb-8">
              {/* ═══ 1. TOP STAGE: HERO SPIELVORSCHAU + SCHNELLBEITRITT-KARTE (wenn keine Suche aktiv) ═══ */}
              {activeSection === 'all' && !searchQuery.trim() && (
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
                  {/* Linke Seite (2/3): Große Live-Spielvorschau (wie "Live Online Games" im Referenzbild) */}
                  <div className="xl:col-span-2 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] animate-pulse" />
                        <h2 className="font-arcade text-base sm:text-lg tracking-wide text-white uppercase">
                          Empfohlenes Highlight
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(featuredGame.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                            favoriteIds.includes(featuredGame.id)
                              ? 'border-[#F43F5E] bg-[#F43F5E]/20 text-[#FDA4AF]'
                              : 'border-[#2E4263] bg-[#1B283D] text-[#CBD5E1] hover:text-white'
                          }`}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              favoriteIds.includes(featuredGame.id)
                                ? 'fill-[#F43F5E] text-[#F43F5E]'
                                : ''
                            }`}
                          />
                          <span>
                            {favoriteIds.includes(featuredGame.id)
                              ? 'Favorit'
                              : 'Merken'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLaunchGame(featuredGame, false)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Jetzt spielen</span>
                        </button>
                      </div>
                    </div>

                    {/* Großes Vorschau-Banner */}
                    <div
                      onClick={() => handleLaunchGame(featuredGame, false)}
                      className="group relative flex-1 min-h-[220px] sm:min-h-[250px] overflow-hidden rounded-2xl border-2 border-[#2E4263] hover:border-[#38BDF8] shadow-xl cursor-pointer transition-all"
                    >
                      <GamePreviewArtwork
                        gameId={featuredGame.id}
                        variant="hero"
                        className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Lesbarkeits-Overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090F1A] via-[#090F1A]/60 to-transparent" />

                      <div className="relative z-10 flex h-full min-h-[220px] sm:min-h-[250px] flex-col justify-between p-4 sm:p-6">
                        {/* Obere Info-Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#EC4899] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                            {featuredGame.gameTypeLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0F172A]/85 px-2.5 py-1 text-xs font-semibold text-[#E2E8F0]">
                            <Users className="h-3.5 w-3.5 text-[#38BDF8]" />
                            {featuredGame.players}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0F172A]/85 px-2.5 py-1 text-xs font-semibold text-[#FDE68A]">
                            <Clock className="h-3.5 w-3.5 text-[#FBBF24]" />
                            {featuredGame.duration}
                          </span>
                        </div>

                        {/* Untere Spiel-Infos + Karussell-Pfeile */}
                        <div className="flex items-end justify-between gap-4 pt-6">
                          <div className="max-w-xl">
                            <h3 className="font-arcade text-2xl sm:text-3xl tracking-wide text-white uppercase drop-shadow">
                              {featuredGame.title}
                            </h3>
                            <p className="mt-1 text-xs sm:text-sm text-[#E2E8F0] line-clamp-2 leading-relaxed">
                              {featuredGame.description}
                            </p>
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 shrink-0"
                          >
                            <button
                              type="button"
                              onClick={handlePrevFeatured}
                              aria-label="Vorheriges Highlight"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#0F172A]/80 text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextFeatured}
                              aria-label="Nächstes Highlight"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-[#0F172A]/80 text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rechte Seite (1/3): Direkt-Beitritt & Raum-Code Karte (wie "Invite Your Friend" im Referenzbild) */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-arcade text-base sm:text-lg tracking-wide text-white uppercase">
                        Schnellbeitritt
                      </h2>
                      <span className="text-xs font-medium text-[#94A3B8]">
                        Handy & TV
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col justify-between rounded-2xl border-2 border-[#2E4263] bg-gradient-to-br from-[#19263C] to-[#131D2E] p-5 shadow-xl">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#EA580C] text-white shadow-md">
                          <QrCode className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white leading-snug">
                            Mit Freunden oder TV verbinden
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                            Gib einen 6-stelligen Raum-Code ein oder scanne den QR-Code vom Fernseher.
                          </p>
                        </div>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (quickJoinCode.trim()) {
                            joinByCode(quickJoinCode);
                          } else {
                            setShowTvJoinModal(true);
                          }
                        }}
                        className="mt-4 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center gap-2 rounded-xl border border-[#2E4263] bg-[#0F172A]/90 p-1.5">
                          <input
                            type="text"
                            maxLength={8}
                            value={quickJoinCode}
                            onChange={(e) => setQuickJoinCode(e.target.value.toUpperCase())}
                            placeholder="CODE EINGEBEN (z. B. AB12CD)"
                            aria-label="Raum-Code eingeben"
                            className="font-arcade w-full bg-transparent px-2.5 py-1.5 text-sm tracking-widest text-white placeholder-[#64748B] uppercase focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isJoiningLobby}
                            className="shrink-0 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                          >
                            {isJoiningLobby ? '...' : 'Start'}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setTvJoinError(null);
                            setShowTvJoinModal(true);
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#2E4263] bg-[#1E293B]/80 hover:bg-[#293B56] py-2 text-xs font-semibold text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5 text-[#38BDF8]" />
                          <span>Kamera QR-Scanner öffnen</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </section>
              )}

              {/* ═══ 2. SCHNELLZUGRIFF: ZULETZT GESPIELT (wenn vorhanden und im "Alle"-Tab) ═══ */}
              {activeSection === 'all' && !searchQuery.trim() && recentGamesList.length > 0 && (
                <section className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-[#10B981]" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-[#CBD5E1]">
                        Zuletzt gespielt
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('recent')}
                      className="text-xs font-semibold text-[#38BDF8] hover:underline cursor-pointer"
                    >
                      Alle anzeigen
                    </button>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                    {recentGamesList.map((game) => {
                      const Icon = game.icon;
                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => handleLaunchGame(game, false)}
                          className="flex shrink-0 items-center gap-3 rounded-xl border border-[#293B56] bg-[#162235]/90 hover:border-[#38BDF8] px-3.5 py-2.5 text-left transition-all active:scale-95 cursor-pointer"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E293B] text-[#38BDF8]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white leading-tight">
                              {game.title}
                            </div>
                            <div className="text-[11px] text-[#94A3B8]">
                              {game.players} • {game.duration}
                            </div>
                          </div>
                          <Play className="ml-2 h-4 w-4 text-[#10B981] fill-current" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ═══ 3. HAUPT-SPIELAUSWAHL: FILTER NACH SPIELTYP & SPIELERZAHL + KARTEN-GRID ═══ */}
              <section className="flex flex-col gap-4">
                {/* Sektionstitel + Sortierung */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="font-arcade text-xl sm:text-2xl tracking-wide text-white uppercase">
                        {sectionMeta[activeSection].title}
                      </h1>
                      <span className="rounded-lg bg-[#1E293B] border border-[#2E4263] px-2.5 py-0.5 text-xs font-bold text-[#38BDF8]">
                        {filteredGames.length}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#94A3B8]">
                      {sectionMeta[activeSection].subtitle}
                    </p>
                  </div>

                  {/* Sortier-Auswahl */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <ArrowUpDown className="h-4 w-4 text-[#94A3B8] shrink-0" />
                    <label htmlFor="sort-select" className="sr-only">
                      Sortieren nach
                    </label>
                    <select
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="rounded-xl border border-[#293B56] bg-[#1B283D] px-3 py-2 text-xs font-semibold text-[#E2E8F0] focus:border-[#38BDF8] focus:outline-none cursor-pointer"
                    >
                      <option value="featured">Sortierung: Empfohlen</option>
                      <option value="players-asc">Spielerzahl: 2 → 8 Spieler</option>
                      <option value="players-desc">Spielerzahl: 8 → 2 Spieler</option>
                      <option value="duration-asc">Spieldauer: Kurz → Lang</option>
                      <option value="alpha">Alphabetisch: A–Z</option>
                    </select>
                  </div>
                </div>

                {/* Filter-Leiste nach Spieltyp & Spielerzahl (wie die horizontale Kategorieleiste im Referenzbild) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#26354D] pb-3">
                  {/* Spieltyp-Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {[
                      { id: 'all' as NavSection, label: 'Alle Typen' },
                      { id: 'duel' as NavSection, label: '⚔️ 1v1 Taktik-Duell' },
                      { id: 'party' as NavSection, label: '🎉 Party & Kreativ' },
                      { id: 'favorites' as NavSection, label: `❤️ Favoriten (${favoriteIds.length})` },
                      { id: 'recent' as NavSection, label: `🕒 Zuletzt (${recentEntries.length})` },
                    ].map((tab) => {
                      const active = activeSection === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setActiveSection(tab.id);
                          }}
                          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#38BDF8] text-[#0F172A] shadow-[0_4px_12px_rgba(56,189,248,0.3)]'
                              : 'bg-[#1B283D] text-[#CBD5E1] hover:bg-[#26354D] hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Spielerzahl-Filter-Pills */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-[#94A3B8] mr-1 hidden sm:inline">
                      Spielerzahl:
                    </span>
                    {[
                      { id: 'all' as PlayerCountFilter, label: 'Alle' },
                      { id: '2' as PlayerCountFilter, label: '2 Spieler' },
                      { id: '3+' as PlayerCountFilter, label: '2–8 Spieler' },
                    ].map((pf) => {
                      const active = playerFilter === pf.id;
                      return (
                        <button
                          key={pf.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setPlayerFilter(pf.id);
                          }}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'border-[#8B5CF6] bg-[#8B5CF6]/25 text-white'
                              : 'border-[#293B56] bg-[#162235] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          {pf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spiele-Grid mit großen, aussagekräftigen Vorschaukarten */}
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        isSelected={featuredGame?.id === game.id}
                        isFavorite={favoriteIds.includes(game.id)}
                        lastPlayedAt={recentPlayedMap.get(game.id)}
                        onSelect={() => {
                          const idx = GAMES.findIndex((g) => g.id === game.id);
                          if (idx >= 0) setFeaturedIndex(idx);
                          handleLaunchGame(game, false);
                        }}
                        onPlay={(tvMode) => handleLaunchGame(game, Boolean(tvMode))}
                        onToggleFavorite={() => handleToggleFavorite(game.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#293B56] bg-[#162235]/60 p-10 text-center">
                    <Gamepad2 className="h-10 w-10 text-[#64748B] mb-3" />
                    <h3 className="font-arcade text-lg text-white uppercase">
                      Keine passenden Spiele gefunden
                    </h3>
                    <p className="mt-1 max-w-md text-xs sm:text-sm text-[#94A3B8]">
                      {activeSection === 'favorites'
                        ? 'Du hast noch keine Favoriten markiert. Tippe auf das Herz-Symbol einer Spielkarte, um sie hier zu speichern!'
                        : activeSection === 'recent'
                          ? 'Du hast noch kein Spiel gestartet. Wähle ein Spiel aus, um direkt loszulegen!'
                          : 'Für deine aktuelle Suche oder Filterauswahl gibt es keine Treffer.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 rounded-xl bg-[#38BDF8] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0F172A] hover:brightness-110 transition-all cursor-pointer"
                    >
                      Alle Spiele anzeigen
                    </button>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* ─── 3. UNTERE NAVIGATION FÜR KLEINE DISPLAYS (Mobile Orientation Bar) ─── */}
      <nav
        aria-label="Mobile Navigation"
        style={{
          paddingBottom: 'calc(0.35rem + env(safe-area-inset-bottom, 0px))',
        }}
        className="lg:hidden relative z-30 flex shrink-0 items-center justify-around border-t border-[#26354D] bg-[#152033]/95 backdrop-blur-md px-2 pt-2"
      >
        {[
          { id: 'all' as NavSection, label: 'Alle', icon: Compass },
          { id: 'duel' as NavSection, label: '2 Spieler', icon: Swords },
          { id: 'party' as NavSection, label: 'Party', icon: Sparkles },
          { id: 'favorites' as NavSection, label: 'Favoriten', icon: Heart },
          { id: 'recent' as NavSection, label: 'Zuletzt', icon: History },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic();
                setActiveSection(item.id);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                active ? 'text-[#38BDF8]' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── 4. MULTIPLAYER & TV LOBBY-SCREEN BEIM START EINES SPIELS ─── */}
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

      {/* ─── 5. MODAL FÜR TV-BEITRITT (QR-Code Scan & Code-Eingabe) ─── */}
      <TvJoinModal
        isOpen={showTvJoinModal}
        onClose={() => setShowTvJoinModal(false)}
        onJoin={joinByCode}
        isJoining={isJoiningLobby}
        errorMessage={tvJoinError}
      />

      {/* ─── 6. EINSTELLUNGEN & SPIELERPROFIL ("OPTIONS" Panel) ─── */}
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
