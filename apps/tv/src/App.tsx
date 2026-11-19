import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type { Lobby, NavSection } from '@projektbox/shared/types';
import {
  AvatarCustomizerModal,
  GAMES,
  IslandBackground,
  SettingsSheet,
  SimulationModal,
  SplashScreen,
  STORAGE_KEYS,
  getFavoriteGameIds,
  getRecentGames,
  installGlobalAudioHandlers,
  recordGamePlayed,
  saveFavoriteGameIds,
  saveUserProfile,
  socketService,
  syncBackgroundMusic,
  useUserProfile,
  type Game,
  type RecentGameEntry,
} from '@projektbox/ui';
import { TvHeader } from './components/TvHeader';
import { TvGalleryLayout } from './components/TvGalleryLayout';
import { TvLobbyScreen } from './components/TvLobbyScreen';
import { TvRemoteHintBar } from './components/TvRemoteHintBar';
import { useTvRemoteNavigation } from './utils/tvNavigation';

export function App() {
  const userProfile = useUserProfile();

  const [showSplash, setShowSplash] = useState(true);
  const [isMenuPrepared, setIsMenuPrepared] = useState(false);

  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const [startingSimulationGameId, setStartingSimulationGameId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteGameIds());
  const [recentEntries, setRecentEntries] = useState<RecentGameEntry[]>(() => getRecentGames());

  const [tvGame, setTvGame] = useState<Game | null>(null);
  const [restoredLobby, setRestoredLobby] = useState<Lobby | null>(null);
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState(false);

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

  useEffect(() => installGlobalAudioHandlers(), []);

  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    void socketService.restoreSession().then((lobby) => {
      if (!lobby) return;
      const matched = GAMES.find((g) => g.id === lobby.gameId) || GAMES[0];
      setActiveLobby(lobby);
      setRestoredLobby(lobby);
      setTvGame(matched);
      setIsMenuPrepared(true);
      setShowSplash(false);
    });
  }, []);

  useEffect(() => {
    if (!activeLobby || tvGame) return;
    const unsubUpdated = socketService.onLobbyUpdated(({ lobby: updated }) => {
      setActiveLobby((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : updated));
    });
    const unsubStarted = socketService.onGameStarted(({ lobby: updated }) => {
      const matched = GAMES.find((g) => g.id === updated.gameId) || GAMES[0];
      setActiveLobby(updated);
      setRestoredLobby(updated);
      setTvGame(matched);
    });
    const unsubExpired = socketService.onLobbyExpired(({ lobbyId }) => {
      setActiveLobby((prev) => (prev?.id === lobbyId ? null : prev));
    });
    const unsubSessExp = socketService.onSessionExpired(() => {
      setActiveLobby(null);
    });
    return () => {
      unsubUpdated();
      unsubStarted();
      unsubExpired();
      unsubSessExp();
    };
  }, [activeLobby, tvGame]);

  const handleToggleFavorite = useCallback((gameId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId];
      saveFavoriteGameIds(next);
      return next;
    });
  }, []);

  const handleLaunchTvGame = useCallback(
    (game: Game) => {
      setRecentEntries(recordGamePlayed(game.id));
      if (activeLobby && !activeLobby.isSimulated && activeLobby.gameId === game.id) {
        setRestoredLobby(activeLobby);
        setTvGame(game);
        return;
      }
      if (activeLobby) {
        void socketService.leaveLobby();
        setActiveLobby(null);
      }
      setRestoredLobby(null);
      setTvGame(game);
    },
    [activeLobby]
  );

  const handleStartSimulation = useCallback(
    async (game: Game, _isTvMode: boolean, botCount: number) => {
      if (isStartingSimulation) return;
      setIsStartingSimulation(true);
      setStartingSimulationGameId(game.id);
      setSimulationError(null);
      try {
        const simLobby = await socketService.simulateGame(game.id, true, Math.max(2, botCount));
        setRecentEntries(recordGamePlayed(game.id));
        setActiveLobby(simLobby);
        setRestoredLobby(simLobby);
        setTvGame(game);
        setShowSimulationModal(false);
      } catch (err: any) {
        setSimulationError(err.message || 'TV-Simulation konnte nicht gestartet werden.');
      } finally {
        setIsStartingSimulation(false);
        setStartingSimulationGameId(null);
      }
    },
    [isStartingSimulation]
  );

  const handleBackNavigation = useCallback(() => {
    if (showSplash) {
      setIsMenuPrepared(true);
      setShowSplash(false);
      return;
    }
    if (showAvatarModal) {
      setShowAvatarModal(false);
      return;
    }
    if (showSettings) {
      setShowSettings(false);
      return;
    }
    if (showSimulationModal && !isStartingSimulation) {
      setShowSimulationModal(false);
      return;
    }
    if (tvGame) {
      if (activeLobby?.status === 'in_progress' || activeLobby?.isSimulated) {
        void socketService.leaveLobby();
        setActiveLobby(null);
        setRestoredLobby(null);
        setTvGame(null);
      } else {
        setRestoredLobby(activeLobby);
        setTvGame(null);
      }
    }
  }, [
    activeLobby,
    isStartingSimulation,
    showAvatarModal,
    showSettings,
    showSimulationModal,
    showSplash,
    tvGame,
  ]);

  const activeScopeKey = showSplash
    ? 'splash'
    : showAvatarModal
      ? 'avatar'
      : showSettings
        ? 'settings'
        : showSimulationModal
          ? 'simulation'
          : tvGame
            ? `game:${tvGame.id}:${activeLobby?.status || 'lobby'}`
            : `gallery:${activeSection}`;

  useTvRemoteNavigation({
    enabled: true,
    scopeKey: activeScopeKey,
    onBack: handleBackNavigation,
  });

  const hasActiveOverlay =
    showSplash || Boolean(tvGame) || showSimulationModal || showSettings || showAvatarModal;

  const filterCounts = useMemo<Partial<Record<NavSection, number>>>(
    () => ({ favorites: favoriteIds.length, recent: recentEntries.length }),
    [favoriteIds.length, recentEntries.length]
  );

  return (
    <div
      data-tv-app="true"
      className="relative flex h-full min-h-lvh w-full flex-col overflow-hidden bg-[#1B2B40] text-white select-none"
    >
      {showSplash && (
        <SplashScreen
          onPrepareExit={() => setIsMenuPrepared(true)}
          onFinish={() => {
            setIsMenuPrepared(true);
            setShowSplash(false);
          }}
        />
      )}

      <IslandBackground />

      {isMenuPrepared && (
        <div
          inert={hasActiveOverlay}
          aria-hidden={hasActiveOverlay}
          className={`safe-screen relative z-10 flex h-full w-full flex-col overflow-hidden ${
            hasActiveOverlay ? 'pointer-events-none' : ''
          }`}
        >
          <TvHeader
            avatar={userProfile.avatar}
            hasActiveLobby={Boolean(activeLobby)}
            onOpenProfile={() => setShowAvatarModal(true)}
            onOpenSimulation={() => {
              setSimulationError(null);
              setShowSimulationModal(true);
            }}
            onOpenActiveLobby={() => {
              if (!activeLobby) return;
              const matched = GAMES.find((g) => g.id === activeLobby.gameId) || GAMES[0];
              setRestoredLobby(activeLobby);
              setTvGame(matched);
            }}
            onOpenSettings={() => setShowSettings(true)}
          />

          <main className="relative flex flex-1 min-h-0 w-full flex-col">
            <TvGalleryLayout
              games={games}
              favoriteIds={favoriteIds}
              activeSection={activeSection}
              searchQuery={searchQuery}
              filterCounts={filterCounts}
              onLaunchTvGame={handleLaunchTvGame}
              onToggleFavorite={handleToggleFavorite}
              onSelectSection={setActiveSection}
              onSearchChange={setSearchQuery}
            />
          </main>

          <TvRemoteHintBar />
        </div>
      )}

      {tvGame && (
        <TvLobbyScreen
          game={tvGame}
          initialLobby={restoredLobby}
          onLobbyChange={setActiveLobby}
          onMinimize={(lobby) => {
            if (lobby) {
              setActiveLobby(lobby);
              setRestoredLobby(lobby);
            }
            setTvGame(null);
          }}
          onClose={() => {
            setTvGame(null);
            setRestoredLobby(null);
            setActiveLobby(null);
          }}
        />
      )}

      {showSimulationModal && (
        <SimulationModal
          isOpen={showSimulationModal}
          isStarting={isStartingSimulation}
          startingGameId={startingSimulationGameId}
          errorMessage={simulationError}
          defaultTvMode={true}
          tvOnly={true}
          onClose={() => setShowSimulationModal(false)}
          onStartSimulation={handleStartSimulation}
        />
      )}

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onToggleSound={(enabled) => {
          setSoundEnabled(enabled);
          try {
            localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
          } catch {
            // ignore
          }
          syncBackgroundMusic(enabled);
        }}
        vibrationEnabled={vibrationEnabled}
        onToggleVibration={(enabled) => setVibrationEnabled(enabled)}
      />

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
