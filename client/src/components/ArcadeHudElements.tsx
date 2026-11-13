import { CATEGORIES, CATEGORY_ACCENTS, type Category, type Game } from '../data/games';
import {
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
  CrystalSlider,
  CrystalStatBar,
} from './CrystalUI';

/* ─── 1. GOLDENE MÜNZEN-LEISTE ─── */
export function CoinCounterPill({
  coins,
  onClick,
}: {
  coins: number;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3.5">
      <CrystalStatBar
        type="coin"
        value={coins}
        onClick={onClick}
      />
    </div>
  );
}

/* ─── 2. ZENTRIERTES SPIEL-LOGO OBEN IM EDLEN SCHIEFER-GOLD-KRISTALL-STIL ─── */
export function ArcadeLogoHeader() {
  return (
    <div className="pointer-events-none flex flex-col items-center justify-center select-none">
      <div
        style={{ clipPath: 'polygon(0% 0%, 100% 5%, 94% 100%, 6% 100%)' }}
        className="bg-[#0F172A] p-[3px] shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
      >
        <div
          style={{ clipPath: 'polygon(0% 0%, 100% 5%, 94% 100%, 6% 100%)' }}
          className="relative overflow-hidden border-2 border-[#F59E0B] bg-[#1E293B] px-5 py-1 sm:px-8 sm:py-1.5 landscape:py-0.5"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[#334155]/70"
            style={{ clipPath: 'polygon(0 0, 52% 0, 68% 100%, 0 100%)' }}
          />
          <span className="font-arcade relative z-10 text-lg sm:text-2xl md:text-3xl landscape:text-base tracking-wider text-[#F8FAFC] uppercase drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">
            PROJEKT <span className="text-[#FBBF24]">BOX</span>
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
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <div className="hidden md:block">
        <CrystalReadout value={playerName} variant="neutral" />
      </div>

      {/* Zahnrad Icon-Button (neutrales Frost-Perlmutt) */}
      {onOpenSettings && (
        <CrystalIconButton
          tilt="right"
          size="md"
          variant="neutral"
          onClick={onOpenSettings}
          title="Optionen öffnen"
          aria-label="Optionen öffnen"
        >
          <svg viewBox="0 0 36 36" className="h-5 w-5 sm:h-6 sm:w-6 fill-current">
            <path d="M19.6 4l.9 3.1a10.4 10.4 0 0 1 2.9 1.2l2.9-1.4 2.3 2.3-1.4 2.9a10.4 10.4 0 0 1 1.2 2.9l3.1.9v3.2l-3.1.9a10.4 10.4 0 0 1-1.2 2.9l1.4 2.9-2.3 2.3-2.9-1.4a10.4 10.4 0 0 1-2.9 1.2L19.6 31h-3.2l-.9-3.1a10.4 10.4 0 0 1-2.9-1.2L9.7 28l-2.3-2.3 1.4-2.9a10.4 10.4 0 0 1-1.2-2.9L4.5 19v-3.2l3.1-.9a10.4 10.4 0 0 1 1.2-2.9L7.4 9.1l2.3-2.3 2.9 1.4a10.4 10.4 0 0 1 2.9-1.2L16.4 4h3.2zM18 12.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
          </svg>
        </CrystalIconButton>
      )}

      {/* Menü Icon-Button (3 Balken ≡) */}
      <CrystalIconButton
        tilt="left"
        size="md"
        variant="neutral"
        onClick={onOpenMenu}
        title="Menü öffnen"
        aria-label="Menü öffnen"
      >
        <svg viewBox="0 0 36 36" className="h-5 w-5 sm:h-6 sm:w-6 fill-current">
          <rect x="6" y="8" width="24" height="4.5" />
          <rect x="6" y="15.75" width="24" height="4.5" />
          <rect x="6" y="23.5" width="24" height="4.5" />
        </svg>
      </CrystalIconButton>
    </div>
  );
}

/* ─── 4. DIE 6 QUADRATISCHEN / TRAPEZFÖRMIGEN ICON-BUTTONS MIT VISUELLER HIERARCHIE ─── */
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
      <CrystalIconButton tilt="left" size="md" variant="amber" onClick={onOpenTvJoin} title="TV-Code eingeben">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <rect x="9" y="7" width="6.5" height="22" />
          <rect x="20.5" y="7" width="6.5" height="22" />
        </svg>
      </CrystalIconButton>

      <CrystalIconButton tilt="right" size="md" variant="neutral" onClick={onResetFilter} title="Filter zurücksetzen">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <path d="M18 7a11 11 0 1 0 10.4 14.5h-4.2A7 7 0 1 1 18 11c2.2 0 4.1 1 5.4 2.6L19 18h11V7l-3.7 3.7A10.9 10.9 0 0 0 18 7z" />
        </svg>
      </CrystalIconButton>

      <CrystalIconButton tilt="left" size="md" variant="emerald" onClick={onPlayRandom} title="Direkt starten">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <polygon points="10,7 29,18 10,29" />
        </svg>
      </CrystalIconButton>

      <CrystalIconButton tilt="right" size="md" variant="neutral" onClick={onOpenSettings} title="Optionen">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <path d="M19.6 4l.9 3.1a10.4 10.4 0 0 1 2.9 1.2l2.9-1.4 2.3 2.3-1.4 2.9a10.4 10.4 0 0 1 1.2 2.9l3.1.9v3.2l-3.1.9a10.4 10.4 0 0 1-1.2 2.9l1.4 2.9-2.3 2.3-2.9-1.4a10.4 10.4 0 0 1-2.9 1.2L19.6 31h-3.2l-.9-3.1a10.4 10.4 0 0 1-2.9-1.2L9.7 28l-2.3-2.3 1.4-2.9a10.4 10.4 0 0 1-1.2-2.9L4.5 19v-3.2l3.1-.9a10.4 10.4 0 0 1 1.2-2.9L7.4 9.1l2.3-2.3 2.9 1.4a10.4 10.4 0 0 1 2.9-1.2L16.4 4h3.2zM18 12.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
        </svg>
      </CrystalIconButton>

      <CrystalIconButton tilt="left" size="md" variant="neutral" onClick={onResetFilter} title="Alle Spiele">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <rect x="9" y="9" width="18" height="18" />
        </svg>
      </CrystalIconButton>

      <CrystalIconButton tilt="right" size="md" variant="rose" onClick={onOpenMenu} title="Kategorie-Auswahl">
        <svg viewBox="0 0 36 36" className="h-6 w-6 fill-current">
          <rect x="6" y="8" width="24" height="4.5" />
          <rect x="6" y="15.75" width="24" height="4.5" />
          <rect x="6" y="23.5" width="24" height="4.5" />
        </svg>
      </CrystalIconButton>
    </div>
  );
}

/* ─── 5. MODAL: EPISODE FREISCHALTEN / DIREKT SPIELEN ─── */
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4 overflow-y-auto backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-sm pt-3">
        <CrystalPanel accent={game.accent} title={game.title} contentClassName="gap-3">
          <CrystalReadout label="SCORE" value={String(game.defaultScore)} variant="neutral" />
          <CrystalReadout label="REWARD" value={`${coins} / ${cost}`} variant="gold" />

          <div className="mt-2 flex w-full flex-col gap-2.5">
            <CrystalButton fullWidth size="md" variant={game.accent} onClick={() => onPlayDirectly(game)}>
              PLAY
            </CrystalButton>
            <CrystalButton
              fullWidth
              size="sm"
              variant="gold"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4 overflow-y-auto backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-sm pt-3">
        {mode === 'menu' && (
          <CrystalPanel title="KATEGORIE" contentClassName="gap-3 py-5">
            <div className="flex w-full flex-col gap-2.5 px-2">
              {CATEGORIES.map((cat, idx) => {
                const active = category === cat;
                return (
                  <CrystalButton
                    key={cat}
                    fullWidth
                    size="lg"
                    tilt={idx % 2 === 0 ? 'left' : 'right'}
                    variant={active ? CATEGORY_ACCENTS[cat] : 'secondary'}
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
                <CrystalButton fullWidth size="md" variant="cyan" onClick={onInstall}>
                  INSTALL APP
                </CrystalButton>
              )}

              <div className="pt-1.5 flex justify-center">
                <CrystalButton size="md" variant="secondary" onClick={onClose} className="min-w-[130px]">
                  OK
                </CrystalButton>
              </div>
            </div>
          </CrystalPanel>
        )}

        {mode === 'shop' && (
          <CrystalPanel accent="gold" title="BONUS REWARD" contentClassName="gap-3">
            <CrystalReadout label="SCORE" value="25873" variant="neutral" />
            <CrystalReadout label="REWARD" value={String(coins)} variant="gold" />

            <div className="mt-2 flex w-full flex-col gap-2.5 px-2">
              <CrystalButton fullWidth size="md" variant="gold" onClick={onAddBonusCoins}>
                +50 REWARD
              </CrystalButton>
              <CrystalButton fullWidth size="md" variant="secondary" onClick={onClose}>
                OK
              </CrystalButton>
            </div>
          </CrystalPanel>
        )}

        {mode === 'settings' && (
          <CrystalPanel topTabLabel="OPTIONS" contentClassName="gap-5 py-5">
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
              <CrystalButton size="sm" variant="primary" onClick={onClose} className="min-w-[110px]">
                OK
              </CrystalButton>
            </div>
          </CrystalPanel>
        )}
      </div>
    </div>
  );
}
