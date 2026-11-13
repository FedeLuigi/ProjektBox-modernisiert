import { CATEGORIES, type Category, type Game } from '../data/games';
import {
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
  CrystalSlider,
  CrystalStatBar,
} from './CrystalUI';

/* ─── 1. GOLDENE MÜNZEN- & STERN-LEISTE (exakt wie die 2 Fortschrittsleisten rechts im Referenzbild) ─── */
export function CoinCounterPill({
  coins,
  starsTotal = 258,
  onClick,
}: {
  coins: number;
  starsTotal?: number;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
      <CrystalStatBar type="star" value={starsTotal} onClick={onClick} />
      <CrystalStatBar type="coin" value={coins} onClick={onClick} />
    </div>
  );
}

/* ─── 2. ZENTRIERTES SPIEL-LOGO OBEN IM CRYSTAL-STIL ─── */
export function ArcadeLogoHeader() {
  return (
    <div className="pointer-events-none flex flex-col items-center justify-center select-none">
      <div
        style={{ clipPath: 'polygon(0% 0%, 100% 5%, 94% 100%, 6% 100%)' }}
        className="bg-[#17608E] p-[3px]"
      >
        <div
          style={{ clipPath: 'polygon(0% 0%, 100% 5%, 94% 100%, 6% 100%)' }}
          className="relative overflow-hidden border-2 border-[#68C5EE] bg-[#9CE0FA] px-5 py-1 sm:px-8 sm:py-1.5"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[#B6ECFD]"
            style={{ clipPath: 'polygon(0 0, 52% 0, 68% 100%, 0 100%)' }}
          />
          <span className="font-arcade relative z-10 text-lg sm:text-2xl md:text-3xl tracking-wider text-[#15608E] uppercase">
            PROJEKT BOX
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── 3. SPIELER-PROFIL & KRISTALL-ICON-BUTTONS OBEN RECHTS ─── */
export function PlayerProfileBar({
  playerName,
  onOpenMenu,
  onOpenSettings,
}: {
  playerName: string;
  activeCategory?: Category;
  onOpenMenu: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div className="hidden sm:block">
        <CrystalReadout value={playerName} />
      </div>

      {/* Zahnrad Icon-Button (wie im 6er-Block oben links im Referenzbild) */}
      {onOpenSettings && (
        <CrystalIconButton
          tilt="right"
          size="md"
          onClick={onOpenSettings}
          title="Optionen öffnen"
          aria-label="Optionen öffnen"
        >
          <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
            <path d="M19.6 4l.9 3.1a10.4 10.4 0 0 1 2.9 1.2l2.9-1.4 2.3 2.3-1.4 2.9a10.4 10.4 0 0 1 1.2 2.9l3.1.9v3.2l-3.1.9a10.4 10.4 0 0 1-1.2 2.9l1.4 2.9-2.3 2.3-2.9-1.4a10.4 10.4 0 0 1-2.9 1.2L19.6 31h-3.2l-.9-3.1a10.4 10.4 0 0 1-2.9-1.2L9.7 28l-2.3-2.3 1.4-2.9a10.4 10.4 0 0 1-1.2-2.9L4.5 19v-3.2l3.1-.9a10.4 10.4 0 0 1 1.2-2.9L7.4 9.1l2.3-2.3 2.9 1.4a10.4 10.4 0 0 1 2.9-1.2L16.4 4h3.2zM18 12.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
          </svg>
        </CrystalIconButton>
      )}

      {/* Menü Icon-Button (3 Balken ≡ exakt wie im Referenzbild) */}
      <CrystalIconButton
        tilt="left"
        size="md"
        onClick={onOpenMenu}
        title="Menü öffnen"
        aria-label="Menü öffnen"
      >
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <rect x="6" y="8" width="24" height="4.5" />
          <rect x="6" y="15.75" width="24" height="4.5" />
          <rect x="6" y="23.5" width="24" height="4.5" />
        </svg>
      </CrystalIconButton>
    </div>
  );
}

/* ─── 4. DIE 6 QUADRATISCHEN / TRAPEZFÖRMIGEN ICON-BUTTONS (wie oben links im Referenzbild) ─── */
export function CrystalQuickIconGrid({
  onPlayRandom,
  onOpenSettings,
  onOpenMenu,
  onOpenTvJoin,
  onResetFilter,
}: {
  onPlayRandom: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onOpenTvJoin: () => void;
  onResetFilter: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {/* 1. Pause || -> TV-Beitritt */}
      <CrystalIconButton tilt="left" size="md" onClick={onOpenTvJoin} title="TV-Code eingeben">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <rect x="9" y="7" width="6.5" height="22" />
          <rect x="20.5" y="7" width="6.5" height="22" />
        </svg>
      </CrystalIconButton>

      {/* 2. Replay ↻ -> Filter zurücksetzen */}
      <CrystalIconButton tilt="right" size="md" onClick={onResetFilter} title="Filter zurücksetzen">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <path d="M18 7a11 11 0 1 0 10.4 14.5h-4.2A7 7 0 1 1 18 11c2.2 0 4.1 1 5.4 2.6L19 18h11V7l-3.7 3.7A10.9 10.9 0 0 0 18 7z" />
        </svg>
      </CrystalIconButton>

      {/* 3. Play ▶ -> Sofort spielen */}
      <CrystalIconButton tilt="left" size="md" onClick={onPlayRandom} title="Direkt starten">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <polygon points="10,7 29,18 10,29" />
        </svg>
      </CrystalIconButton>

      {/* 4. Settings ⚙ -> Optionen */}
      <CrystalIconButton tilt="right" size="md" onClick={onOpenSettings} title="Optionen">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <path d="M19.6 4l.9 3.1a10.4 10.4 0 0 1 2.9 1.2l2.9-1.4 2.3 2.3-1.4 2.9a10.4 10.4 0 0 1 1.2 2.9l3.1.9v3.2l-3.1.9a10.4 10.4 0 0 1-1.2 2.9l1.4 2.9-2.3 2.3-2.9-1.4a10.4 10.4 0 0 1-2.9 1.2L19.6 31h-3.2l-.9-3.1a10.4 10.4 0 0 1-2.9-1.2L9.7 28l-2.3-2.3 1.4-2.9a10.4 10.4 0 0 1-1.2-2.9L4.5 19v-3.2l3.1-.9a10.4 10.4 0 0 1 1.2-2.9L7.4 9.1l2.3-2.3 2.9 1.4a10.4 10.4 0 0 1 2.9-1.2L16.4 4h3.2zM18 12.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
        </svg>
      </CrystalIconButton>

      {/* 5. Stop ■ -> Alle Spiele zeigen */}
      <CrystalIconButton tilt="left" size="md" onClick={onResetFilter} title="Alle Spiele">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <rect x="9" y="9" width="18" height="18" />
        </svg>
      </CrystalIconButton>

      {/* 6. Menu ≡ -> Kategorien */}
      <CrystalIconButton tilt="right" size="md" onClick={onOpenMenu} title="Kategorie-Auswahl">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-white">
          <rect x="6" y="8" width="24" height="4.5" />
          <rect x="6" y="15.75" width="24" height="4.5" />
          <rect x="6" y="23.5" width="24" height="4.5" />
        </svg>
      </CrystalIconButton>
    </div>
  );
}

/* ─── 5. MODAL: EPISODE FREISCHALTEN / DIREKT SPIELEN IM "LEVEL 16" KRISTALL-FENSTER ─── */
export function UnlockEpisodeModal({
  game,
  coins,
  onClose,
  onUnlockWithCoins,
  onPlayDirectly,
}: {
  game: Game | null;
  coins: number;
  onClose: () => void;
  onUnlockWithCoins: (game: Game) => void;
  onPlayDirectly: (game: Game) => void;
}) {
  if (!game) return null;
  const cost = game.unlockCost ?? 20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#103858]/65 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <CrystalPanel stars={3} title={game.title} contentClassName="gap-3">
          <CrystalReadout label="SCORE" value="25873" />
          <CrystalReadout label="REWARD" value={`${coins} / ${cost}`} />

          <div className="mt-3 flex w-full flex-col gap-2.5">
            <CrystalButton fullWidth size="md" onClick={() => onPlayDirectly(game)}>
              PLAY
            </CrystalButton>
            <CrystalButton
              fullWidth
              size="sm"
              variant="secondary"
              tilt="right"
              onClick={() => onUnlockWithCoins(game)}
            >
              CONTINUE
            </CrystalButton>
            <CrystalButton fullWidth size="sm" variant="secondary" onClick={onClose}>
              EXIT
            </CrystalButton>
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}

/* ─── 6. MODAL: MENÜ ("DIFFICULTY"-STIL) & EINSTELLUNGEN ("OPTIONS"-STIL) ─── */
export function ArcadeMenuModal({
  mode,
  onClose,
  category,
  onSelectCategory,
  coins,
  onAddBonusCoins,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onResetProgress,
  canInstall,
  onInstall,
}: {
  mode: 'menu' | 'shop' | 'settings' | null;
  onClose: () => void;
  category: Category;
  onSelectCategory: (cat: Category) => void;
  allUnlocked: boolean;
  onToggleAllUnlocked: () => void;
  coins: number;
  onAddBonusCoins: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onResetProgress: () => void;
  canInstall: boolean;
  onInstall: () => void;
}) {
  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#103858]/65 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        {mode === 'menu' && (
          /* Exakt wie das "DIFFICULTY" Kristall-Panel rechts oben im Referenzbild */
          <CrystalPanel title="KATEGORIE" contentClassName="gap-3.5 py-6">
            <div className="flex w-full flex-col gap-3 px-2">
              {CATEGORIES.map((cat, idx) => {
                const active = category === cat;
                return (
                  <CrystalButton
                    key={cat}
                    fullWidth
                    size="lg"
                    tilt={idx % 2 === 0 ? 'left' : 'right'}
                    variant={active ? 'primary' : 'secondary'}
                    onClick={() => {
                      onSelectCategory(cat);
                      onClose();
                    }}
                  >
                    {cat}
                  </CrystalButton>
                );
              })}

              {canInstall && (
                <CrystalButton fullWidth size="md" onClick={onInstall}>
                  INSTALL APP
                </CrystalButton>
              )}

              <div className="pt-2 flex justify-center">
                <CrystalButton size="md" onClick={onClose} className="min-w-[130px]">
                  OK
                </CrystalButton>
              </div>
            </div>
          </CrystalPanel>
        )}

        {mode === 'shop' && (
          /* Exakt wie das "LEVEL 16" Kristall-Panel links unten im Referenzbild */
          <CrystalPanel stars={3} title="BONUS REWARD" contentClassName="gap-3.5">
            <CrystalReadout label="SCORE" value="25873" />
            <CrystalReadout label="REWARD" value={String(coins)} />

            <div className="mt-2 flex w-full flex-col gap-2.5 px-2">
              <CrystalButton fullWidth size="md" onClick={onAddBonusCoins}>
                +50 REWARD
              </CrystalButton>
              <CrystalButton fullWidth size="md" variant="secondary" onClick={onClose}>
                OK
              </CrystalButton>
            </div>
          </CrystalPanel>
        )}

        {mode === 'settings' && (
          /* Exakt wie das "OPTIONS" Kristall-Panel rechts unten im Referenzbild */
          <CrystalPanel topTabLabel="OPTIONS" contentClassName="gap-5 py-6">
            <CrystalSlider
              label="MUSIC"
              value={soundEnabled ? 82 : 18}
              onChange={() => onToggleSound()}
            />
            <CrystalSlider
              label="SOUND"
              value={hapticsEnabled ? 82 : 18}
              onChange={() => onToggleHaptics()}
            />

            <div className="mt-2 flex w-full gap-2.5 justify-center">
              <CrystalButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  onResetProgress();
                  onClose();
                }}
              >
                REPLAY
              </CrystalButton>
              <CrystalButton size="sm" onClick={onClose} className="min-w-[110px]">
                OK
              </CrystalButton>
            </div>
          </CrystalPanel>
        )}
      </div>
    </div>
  );
}
