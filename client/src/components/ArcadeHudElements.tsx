import { type NavSection } from '../App';
import { type CrystalAccent } from '../data/games';
import { Avatar, type AvatarConfig } from './Avatar';
import {
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
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
  playerName,
  avatar,
  onOpenMenu,
  onOpenSettings,
}: {
  playerName: string;
  avatar?: AvatarConfig;
  onOpenMenu: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <div
        onClick={onOpenSettings}
        className="hidden md:flex items-center gap-2 cursor-pointer"
        title="Spielerprofil anpassen"
      >
        {avatar && <Avatar config={avatar} size={32} />}
        <CrystalReadout value={playerName} variant="neutral" />
      </div>

      {/* Zahnrad Icon-Button (neutrales Frost-Perlmutt) */}
      {onOpenSettings && (
        <CrystalIconButton
          tilt="right"
          size="md"
          variant="neutral"
          onClick={onOpenSettings}
          title="Optionen & Profil öffnen"
          aria-label="Optionen & Profil öffnen"
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
        title="Filter & Menü öffnen"
        aria-label="Filter & Menü öffnen"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4 overflow-y-auto backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-sm pt-3">
        <CrystalPanel title="SPIELFILTER" contentClassName="gap-3 py-5">
          <div className="flex w-full flex-col gap-2.5 px-2">
            {SECTION_ITEMS.map((item, idx) => {
              const active = activeSection === item.id;
              return (
                <CrystalButton
                  key={item.id}
                  fullWidth
                  size="lg"
                  tilt={idx % 2 === 0 ? 'left' : 'right'}
                  variant={active ? item.accent : 'secondary'}
                  onClick={() => {
                    onSelectSection(item.id);
                    onClose();
                  }}
                >
                  {item.label}
                </CrystalButton>
              );
            })}

            {canInstall && (
              <CrystalButton fullWidth size="md" variant="cyan" onClick={onInstall}>
                APP INSTALLIEREN
              </CrystalButton>
            )}

            <div className="pt-1.5 flex justify-center">
              <CrystalButton size="md" variant="secondary" onClick={onClose} className="min-w-[130px]">
                OK
              </CrystalButton>
            </div>
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}
