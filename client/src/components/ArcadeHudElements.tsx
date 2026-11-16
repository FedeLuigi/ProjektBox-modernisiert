import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, User } from 'lucide-react';
import { type NavSection } from '../App';
import { type CrystalAccent } from '../data/games';
import { Avatar, type AvatarConfig } from './Avatar';
import {
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
} from './CrystalUI';

/* ─── 1. ZENTRIERTES SPIEL-LOGO OBEN IM EDLEN SCHIEFER-GOLD-KRISTALL-STIL ─── */
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

/* ─── 2. SPIELER-PROFIL & KRISTALL-ICON-BUTTONS OBEN RECHTS ─── */
export function PlayerProfileBar({
  avatar,
  onOpenMenu,
  onOpenSettings,
  onOpenProfile,
}: {
  playerName?: string;
  avatar?: AvatarConfig;
  onOpenMenu?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
}) {
  const handleProfileClick = onOpenProfile || onOpenSettings;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Anklickbares Profil-Icon (Avatar) direkt neben dem Einstellungs-Button */}
      <button
        type="button"
        onClick={handleProfileClick}
        title="Profil & Avatar anpassen"
        aria-label="Profil & Avatar anpassen"
        className="group relative flex h-9 w-9 sm:h-11 sm:w-11 landscape:h-9 landscape:w-9 items-center justify-center rounded-full border-2 border-[#F59E0B] bg-[#0F172A] p-[2px] shadow-[0_3px_0_rgba(15,23,42,0.35)] transition-transform hover:scale-105 active:scale-92 cursor-pointer shrink-0 focus:outline-none"
      >
        {avatar ? (
          <Avatar config={avatar} size={28} className="sm:w-[34px] sm:h-[34px]" />
        ) : (
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#1E293B] text-[#FBBF24]">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </button>

      {/* Zahnrad Icon-Button (neutrales Frost-Perlmutt) */}
      {onOpenSettings && (
        <CrystalIconButton
          tilt="right"
          size="md"
          variant="neutral"
          onClick={onOpenSettings}
          title="Optionen & Einstellungen öffnen"
          aria-label="Optionen & Einstellungen öffnen"
        >
          <svg viewBox="0 0 36 36" className="h-5 w-5 sm:h-6 sm:w-6 fill-current">
            <path d="M19.6 4l.9 3.1a10.4 10.4 0 0 1 2.9 1.2l2.9-1.4 2.3 2.3-1.4 2.9a10.4 10.4 0 0 1 1.2 2.9l3.1.9v3.2l-3.1.9a10.4 10.4 0 0 1-1.2 2.9l1.4 2.9-2.3 2.3-2.9-1.4a10.4 10.4 0 0 1-2.9 1.2L19.6 31h-3.2l-.9-3.1a10.4 10.4 0 0 1-2.9-1.2L9.7 28l-2.3-2.3 1.4-2.9a10.4 10.4 0 0 1-1.2-2.9L4.5 19v-3.2l3.1-.9a10.4 10.4 0 0 1 1.2-2.9L7.4 9.1l2.3-2.3 2.9 1.4a10.4 10.4 0 0 1 2.9-1.2L16.4 4h3.2zM18 12.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
          </svg>
        </CrystalIconButton>
      )}

      {/* Optionaler Menü Icon-Button (3 Balken ≡) – der Spielfilter nutzt stattdessen SectionFilterBar */}
      {onOpenMenu && (
        <CrystalIconButton
          tilt="left"
          size="md"
          variant="neutral"
          onClick={onOpenMenu}
          title="Filter & Menü öffnen"
          aria-label="Filter & Menü öffnen"
        >
          <svg viewBox="0 0 36 36" className="h-5 w-5 sm:h-6 sm:w-6 fill-current">
            <rect x="6" y="8" width="24" height="4.5" />
            <rect x="6" y="15.75" width="24" height="4.5" />
            <rect x="6" y="23.5" width="24" height="4.5" />
          </svg>
        </CrystalIconButton>
      )}
    </div>
  );
}

/* ─── 3. MODAL: FILTER- & SPIELTYP-MENÜ IM ORIGINALEN CRYSTAL-PANEL-STIL ─── */
export const SECTION_ITEMS: {
  id: NavSection;
  label: string;
  shortLabel: string;
  accent: CrystalAccent;
}[] = [
  { id: 'all', label: 'ALLE SPIELE', shortLabel: 'ALLE', accent: 'amber' },
  { id: 'duel', label: '2 SPIELER DUELL', shortLabel: '2 SPIELER', accent: 'indigo' },
  { id: 'party', label: 'PARTY (2–8 SP.)', shortLabel: 'PARTY 2–8', accent: 'rose' },
  { id: 'favorites', label: 'FAVORITEN', shortLabel: 'FAVORITEN', accent: 'coral' },
  { id: 'recent', label: 'ZULETZT GESPIELT', shortLabel: 'ZULETZT', accent: 'emerald' },
];

/* ─── 3b. RESPONSIVE SPIELFILTER-LEISTE ───
   Zeigt alle Filter direkt an, solange sie in die tatsächlich verfügbare Breite passen.
   Nur bei echtem Platzmangel wird auf einen kompakten Sandwich-Button umgeschaltet,
   der das SPIELFILTER-Modal öffnet. Gemessen wird per ResizeObserver statt per Breakpoint. */
export function SectionFilterBar({
  activeSection,
  onSelectSection,
  onOpenMenu,
  counts,
  buttonClassName = '',
  gapClassName = 'gap-1.5 sm:gap-2',
}: {
  activeSection: NavSection;
  onSelectSection: (sec: NavSection) => void;
  onOpenMenu: () => void;
  counts?: Partial<Record<NavSection, number>>;
  buttonClassName?: string;
  gapClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      const available = container.clientWidth;
      // Ausgeblendete Leiste (z. B. Portrait-Leiste im Querformat) nicht neu bewerten
      if (available <= 0) return;
      const required = Math.ceil(measure.getBoundingClientRect().width);
      setIsCollapsed(required > available);
    };

    update();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(container);
    observer?.observe(measure);
    window.addEventListener('resize', update);
    // Nach dem Laden der Arcade-Schrift ändert sich die Chip-Breite
    document.fonts?.ready.then(update).catch(() => {});

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const renderChips = (forMeasure: boolean) =>
    SECTION_ITEMS.map((item, idx) => {
      const count = counts?.[item.id] ?? 0;
      return (
        <CrystalButton
          key={item.id}
          size="sm"
          tilt={idx % 2 === 0 ? 'left' : 'right'}
          variant={activeSection === item.id ? item.accent : 'secondary'}
          tabIndex={forMeasure ? -1 : undefined}
          aria-pressed={forMeasure ? undefined : activeSection === item.id}
          onClick={forMeasure ? undefined : () => onSelectSection(item.id)}
          className={`shrink-0 ${buttonClassName}`}
        >
          <span>{item.shortLabel}</span>
          {count > 0 && <span className="ml-0.5 opacity-90">({count})</span>}
        </CrystalButton>
      );
    });

  const activeItem = SECTION_ITEMS.find((item) => item.id === activeSection) ?? SECTION_ITEMS[0];
  const activeCount = counts?.[activeItem.id] ?? 0;

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 items-center">
      {/* Unsichtbare Messleiste mit identischen Chips für die benötigte Inline-Breite */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 h-0 w-full overflow-hidden"
      >
        <div ref={measureRef} className={`flex w-max items-center ${gapClassName}`}>
          {renderChips(true)}
        </div>
      </div>

      {isCollapsed ? (
        <CrystalButton
          size="sm"
          tilt="left"
          variant={activeItem.accent}
          onClick={onOpenMenu}
          title="Spielfilter öffnen"
          aria-label={`Spielfilter öffnen (aktiv: ${activeItem.label})`}
          aria-haspopup="dialog"
          className={`max-w-full ${buttonClassName}`}
        >
          <Menu className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
          <span className="truncate">{activeItem.shortLabel}</span>
          {activeCount > 0 && <span className="opacity-90">({activeCount})</span>}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
        </CrystalButton>
      ) : (
        <div className={`flex min-w-0 items-center ${gapClassName}`}>{renderChips(false)}</div>
      )}
    </div>
  );
}

export function ArcadeMenuModal({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  canInstall,
  onInstall,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeSection: NavSection;
  onSelectSection: (sec: NavSection) => void;
  canInstall: boolean;
  onInstall: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4 landscape:p-2 overflow-y-auto backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="tablet-modal-box my-auto w-full max-w-sm landscape:max-w-xl pt-3 landscape:pt-0"
      >
        <CrystalPanel
          title="SPIELFILTER"
          contentClassName="gap-3 landscape:gap-2 py-5 landscape:py-3 landscape:px-4"
        >
          <div className="flex w-full flex-col gap-2.5 landscape:gap-2 px-2 landscape:px-0">
            <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 landscape:gap-2 w-full">
              {SECTION_ITEMS.map((item, idx) => {
                const active = activeSection === item.id;
                const isLastOdd =
                  idx === SECTION_ITEMS.length - 1 &&
                  SECTION_ITEMS.length % 2 === 1 &&
                  !canInstall;
                return (
                  <div
                    key={item.id}
                    className={isLastOdd ? 'landscape:col-span-2' : ''}
                  >
                    <CrystalButton
                      fullWidth
                      size="lg"
                      tilt={idx % 2 === 0 ? 'left' : 'right'}
                      variant={active ? item.accent : 'secondary'}
                      onClick={() => {
                        onSelectSection(item.id);
                        onClose();
                      }}
                      className="landscape:h-9 landscape:text-xs"
                    >
                      {item.label}
                    </CrystalButton>
                  </div>
                );
              })}

              {canInstall && (
                <CrystalButton
                  fullWidth
                  size="md"
                  variant="cyan"
                  onClick={onInstall}
                  className="landscape:h-9 landscape:text-xs"
                >
                  APP INSTALLIEREN
                </CrystalButton>
              )}
            </div>

            <div className="pt-1.5 landscape:pt-0.5 flex justify-center">
              <CrystalButton
                size="md"
                variant="secondary"
                onClick={onClose}
                className="min-w-[130px] landscape:h-8 landscape:text-xs"
              >
                OK
              </CrystalButton>
            </div>
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}
