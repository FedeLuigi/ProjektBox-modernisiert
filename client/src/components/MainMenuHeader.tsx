import { Plus, Settings, Tv } from 'lucide-react';
import { type AvatarConfig } from './Avatar';
import { PlayerAvatarButton } from './ArcadeHudElements';

export interface MainMenuHeaderProps {
  avatar?: AvatarConfig;
  onOpenProfile: () => void;
  onOpenTvJoin: () => void;
  onOpenSettings: () => void;
  onOpenLayoutExplorer: () => void;
}

/**
 * Wiederverwendbare offene Wortmarke „PROJEKT BOX“ inklusive „+“-Button für Layout-Varianten.
 */
export function BrandWordmark({
  onOpenLayoutExplorer,
  compact = false,
}: {
  onOpenLayoutExplorer: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="border-b-2 border-[#F59E0B] px-1.5 pb-0.5">
        <span
          className={`font-arcade tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)] ${
            compact ? 'text-base sm:text-xl' : 'text-lg sm:text-2xl md:text-3xl'
          }`}
        >
          PROJEKT <span className="text-[#FBBF24]">BOX</span>
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenLayoutExplorer}
        title="Layout-Varianten entdecken & umschalten"
        aria-label="Layout-Varianten entdecken & umschalten"
        className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white transition-all cursor-pointer active:scale-95"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Wiederverwendbare Aktions-Buttons (TV CODE & Einstellungen) im offenen Gallery-Stil.
 */
export function HeaderActionButtons({
  onOpenTvJoin,
  onOpenSettings,
  compact = false,
}: {
  onOpenTvJoin: () => void;
  onOpenSettings: () => void;
  compact?: boolean;
}) {
  return (
    <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={onOpenTvJoin}
        title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
        className={`font-arcade inline-flex items-center gap-1.5 tracking-wider uppercase rounded-lg border border-[#F59E0B]/60 bg-transparent text-[#FDE68A] hover:bg-[#F59E0B]/15 transition-all cursor-pointer active:scale-95 ${
          compact ? 'px-2.5 h-8 text-[11px]' : 'px-3 sm:px-3.5 h-8 sm:h-9 text-[11px] sm:text-xs'
        }`}
      >
        <Tv className="h-3.5 w-3.5 shrink-0" />
        <span>TV CODE</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        title="Optionen & Einstellungen öffnen"
        aria-label="Optionen & Einstellungen öffnen"
        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-95"
      >
        <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </button>
    </div>
  );
}

/**
 * Klassische obere Navigationsleiste im offenen Open-Gallery-Design:
 * Avatar links • PROJEKT BOX + „+“ mittig • TV CODE & Einstellungen rechts.
 */
export function MainMenuHeader({
  avatar,
  onOpenProfile,
  onOpenTvJoin,
  onOpenSettings,
  onOpenLayoutExplorer,
}: MainMenuHeaderProps) {
  return (
    <header className="tablet-header landscape-top-bar relative z-30 flex md:grid md:grid-cols-[1fr_auto_1fr] shrink-0 flex-nowrap items-center justify-between gap-2 px-3 sm:px-6 pt-1 pb-1.5 landscape:py-1">
      <div className="shrink-0 flex items-center md:justify-self-start">
        <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
        </div>
      </div>

      <div className="landscape-hide-logo landscape:hidden! flex items-center md:justify-self-center">
        <BrandWordmark onOpenLayoutExplorer={onOpenLayoutExplorer} />
      </div>

      <div className="md:justify-self-end">
        <HeaderActionButtons onOpenTvJoin={onOpenTvJoin} onOpenSettings={onOpenSettings} />
      </div>
    </header>
  );
}
