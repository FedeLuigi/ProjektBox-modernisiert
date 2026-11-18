import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAMES, type Game } from './data/games';
import { SplashScreen } from './components/SplashScreen';
import { SettingsSheet } from './components/SettingsSheet';
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal';
import { IslandBackground } from './components/IslandBackground';
import { CrystalPanel, CrystalReadout } from './components/CrystalUI';
import { MainMenuHeader } from './components/MainMenuHeader';
import { OpenGalleryLayout } from './components/MainMenuLayouts';
import { LobbyScreen } from './components/multiplayer/LobbyScreen';
import { SimulationModal } from './components/multiplayer/SimulationModal';
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
import {
  installGlobalAudioHandlers,
  syncBackgroundMusic,
} from './utils/soundEffects';
import { parseLobbyCode } from './utils/qrCodeHelper';
import { usePwaUpdate } from './utils/pwa';
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
  // Hauptmenü erst kurz vor Ende des Splash-Intros mounten, damit Frame 0-3 komplett ruckelfrei laufen
  const [isMenuPrepared, setIsMenuPrepared] = useState(() => {
    if (typeof window !== 'undefined' && parseLobbyCode(window.location.href)) {
      return true;
    }
    return false;
  });
  const { hasUpdate, applyUpdate } = usePwaUpdate();

  const [isJoiningDeepLink, setIsJoiningDeepLink] = useState(Boolean(initialDeepLinkCode));
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [startingSimulationGameId, setStartingSimulationGameId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
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
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
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

  const recentPlayedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of recentEntries) {
      map.set(item.gameId, item.playedAt);
    }
    return map;
  }, [recentEntries]);

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
    syncBackgroundMusic(enabled);
  };

  useEffect(() => {
    return installGlobalAudioHandlers();
  }, []);

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

      if (
        activeLobby &&
        !activeLobby.isSimulated &&
        activeLobby.gameId === game.id &&
        Boolean(activeLobby.isTvMode) === tvMode
      ) {
        setDeepLinkLobby(activeLobby);
        setLaunchInTvMode(tvMode);
        setMultiplayerGame(game);
        return;
      }

      if (activeLobby) {
        void socketService.leaveLobby();
        setActiveLobby(null);
      }
      setDeepLinkLobby(null);
      setLaunchInTvMode(tvMode);
      setMultiplayerGame(game);
    },
    [triggerHaptic, activeLobby]
  );

  const handleOpenActiveLobby = useCallback(() => {
    if (!activeLobby) return;
    triggerHaptic();
    const matchedGame = GAMES.find((g) => g.id === activeLobby.gameId) || GAMES[0];
    setDeepLinkLobby(activeLobby);
    setLaunchInTvMode(Boolean(activeLobby.isTvMode));
    setMultiplayerGame(matchedGame);
  }, [activeLobby, triggerHaptic]);

  const handleSelectSection = useCallback(
    (sec: NavSection) => {
      triggerHaptic();
      setActiveSection(sec);
    },
    [triggerHaptic]
  );

  const filterCounts = useMemo<Partial<Record<NavSection, number>>>(
    () => ({ favorites: favoriteIds.length, recent: recentEntries.length }),
    [favoriteIds.length, recentEntries.length]
  );

  const handleSplashPrepareExit = useCallback(() => {
    setIsMenuPrepared(true);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setIsMenuPrepared(true);
    setShowSplash(false);
  }, []);

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
      setActiveLobby(lobby);
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

  const handleStartSimulation = useCallback(
    async (game: Game, tvMode: boolean, botCount: number) => {
      if (isStartingSimulation) return;
      triggerHaptic();
      setIsStartingSimulation(true);
      setStartingSimulationGameId(game.id);
      setSimulationError(null);
      try {
        const simLobby = await socketService.simulateGame(game.id, tvMode, botCount);
        const updatedRecent = recordGamePlayed(game.id);
        setRecentEntries(updatedRecent);
        setActiveLobby(simLobby);
        setDeepLinkLobby(simLobby);
        setLaunchInTvMode(Boolean(simLobby.isTvMode));
        setMultiplayerGame(game);
        setShowSimulationModal(false);
      } catch (err: any) {
        setSimulationError(err.message || 'Simulation konnte nicht gestartet werden.');
      } finally {
        setIsStartingSimulation(false);
        setStartingSimulationGameId(null);
      }
    },
    [isStartingSimulation, triggerHaptic]
  );

  const hasRestoredSessionRef = useRef(false);

  useEffect(() => {
    if (!activeLobby || multiplayerGame) return;

    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updated }) => {
      setActiveLobby((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : updated));
    });

    const unsubStarted = socketService.onGameStarted(({ lobby: updated }) => {
      setActiveLobby(updated);
      const matchedGame = GAMES.find((g) => g.id === updated.gameId) || GAMES[0];
      setDeepLinkLobby(updated);
      setLaunchInTvMode(Boolean(updated.isTvMode));
      setMultiplayerGame(matchedGame);
    });

    const unsubExpired = socketService.onLobbyExpired(({ lobbyId }) => {
      setActiveLobby((prev) => (prev?.id === lobbyId ? null : prev));
    });

    const unsubSessExpired = socketService.onSessionExpired(() => {
      setActiveLobby(null);
    });

    return () => {
      unsubUpdated();
      unsubStarted();
      unsubExpired();
      unsubSessExpired();
    };
  }, [activeLobby, multiplayerGame]);

  useEffect(() => {
    const checkDeepLink = () => {
      const code = parseLobbyCode(window.location.href);
      if (code && !multiplayerGame) {
        joinByCode(code);
        return true;
      }
      return false;
    };

    window.addEventListener('popstate', checkDeepLink);

    const hasDeepLink = checkDeepLink();
    let cancelled = false;

    if (!hasDeepLink && !hasRestoredSessionRef.current) {
      hasRestoredSessionRef.current = true;
      void socketService.restoreSession().then((restoredLobby) => {
        if (cancelled || !restoredLobby) return;
        const matchedGame = GAMES.find((g) => g.id === restoredLobby.gameId) || GAMES[0];
        setActiveLobby(restoredLobby);
        setDeepLinkLobby(restoredLobby);
        setLaunchInTvMode(Boolean(restoredLobby.isTvMode));
        setMultiplayerGame(matchedGame);
        setIsMenuPrepared(true);
        setShowSplash(false);
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', checkDeepLink);
    };
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
          if (activeLobby) {
            setDeepLinkLobby(activeLobby);
          } else {
            setDeepLinkLobby(null);
          }
          setMultiplayerGame(null);
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
      if (showSimulationModal && !isStartingSimulation) {
        if (e.key === 'Escape') setShowSimulationModal(false);
        return;
      }
      if (showTvJoinModal) {
        if (e.key === 'Escape') setShowTvJoinModal(false);
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
    activeLobby,
    showSimulationModal,
    isStartingSimulation,
    showTvJoinModal,
    handleSplashFinish,
  ]);

  const hasActiveOverlay =
    showSplash ||
    isJoiningDeepLink ||
    Boolean(multiplayerGame) ||
    showSimulationModal ||
    showTvJoinModal ||
    showSettings ||
    showAvatarModal;

  useEffect(() => {
    if (hasActiveOverlay && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [hasActiveOverlay]);

  return (
    <div className="relative flex h-full min-h-lvh w-full flex-col overflow-hidden overflow-x-hidden bg-[#1B2B40] text-[#1E293B] select-none">
      {/* ─── 0. Animierter Crystal-Ladebildschirm beim Start ─── */}
      {showSplash && (
        <SplashScreen
          onPrepareExit={handleSplashPrepareExit}
          onFinish={handleSplashFinish}
        />
      )}

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

      {/* ─── 2. Haupt-HUD & Verschmolzene Open-Gallery-Bühne ─── */}
      {isMenuPrepared && (
        <div
          inert={hasActiveOverlay}
          aria-hidden={hasActiveOverlay}
          className={`safe-screen relative z-10 flex h-full w-full flex-col overflow-hidden ${
            hasActiveOverlay ? 'pointer-events-none' : ''
          }`}
        >
          <MainMenuHeader
            avatar={userProfile.avatar}
            hasActiveLobby={Boolean(activeLobby)}
            hasAppUpdate={hasUpdate}
            onOpenProfile={() => {
              triggerHaptic();
              setShowAvatarModal(true);
            }}
            onOpenSimulation={() => {
              triggerHaptic();
              setSimulationError(null);
              setShowSimulationModal(true);
            }}
            onOpenTvJoin={() => {
              triggerHaptic();
              setTvJoinError(null);
              setShowTvJoinModal(true);
            }}
            onOpenActiveLobby={handleOpenActiveLobby}
            onOpenSettings={() => {
              triggerHaptic();
              setShowSettings(true);
            }}
          />

          <main className="tablet-main-area widescreen-main-area relative flex flex-1 min-h-0 w-full flex-col">
            <section aria-label="Spiele" className="flex flex-1 min-h-0 w-full flex-col">
              <OpenGalleryLayout
                games={games}
                favoriteIds={favoriteIds}
                activeSection={activeSection}
                searchQuery={searchQuery}
                filterCounts={filterCounts}
                onSelectGame={(gameId) => {
                  const found = games.find((g) => g.id === gameId);
                  if (found) handleLaunchGame(found, false);
                }}
                onLaunchGame={handleLaunchGame}
                onToggleFavorite={handleToggleFavorite}
                onSelectSection={handleSelectSection}
                onSearchChange={setSearchQuery}
              />
            </section>
          </main>
        </div>
      )}

      {/* ─── 3. Multiplayer & TV Lobby-Screen beim Start eines Spiels ─── */}
      {multiplayerGame && (
        <LobbyScreen
          game={multiplayerGame}
          initialLobby={deepLinkLobby}
          initialTvMode={launchInTvMode}
          onLobbyChange={setActiveLobby}
          onMinimize={(lobby) => {
            if (lobby) {
              setActiveLobby(lobby);
              setDeepLinkLobby(lobby);
            }
            setMultiplayerGame(null);
          }}
          onClose={() => {
            setMultiplayerGame(null);
            setDeepLinkLobby(null);
            setActiveLobby(null);
            setLaunchInTvMode(false);
          }}
        />
      )}

      {/* ─── 4. Simulation-Starter ohne weitere Lobby-Teilnehmer ─── */}
      {showSimulationModal && (
        <SimulationModal
          isOpen={showSimulationModal}
          isStarting={isStartingSimulation}
          startingGameId={startingSimulationGameId}
          errorMessage={simulationError}
          onClose={() => setShowSimulationModal(false)}
          onStartSimulation={handleStartSimulation}
        />
      )}

      {/* ─── 5. Modal für TV-Beitritt (QR-Code Scan & Code-Eingabe) ─── */}
      {showTvJoinModal && (
        <TvJoinModal
          isOpen={showTvJoinModal}
          onClose={() => setShowTvJoinModal(false)}
          onJoin={joinByCode}
          isJoining={isJoiningLobby}
          errorMessage={tvJoinError}
        />
      )}

      {/* ─── 5. Einstellungen ("OPTIONS" Panel) ─── */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={handleToggleVibration}
        onInstall={deferredPrompt ? handleInstall : undefined}
        onApplyUpdate={hasUpdate ? applyUpdate : undefined}
      />

      {/* ─── 6. Spielerprofil: Name & Avatar zentral an einer Stelle ─── */}
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
    </div>
  );
}

export default App;
