import { Settings, Tv } from 'lucide-react';
import { type AvatarConfig } from './Avatar';
import { PlayerAvatarButton } from './ArcadeHudElements';

interface MainMenuHeaderProps {
  avatar?: AvatarConfig;
  onOpenProfile: () => void;
  onOpenTvJoin: () => void;
  onOpenSettings: () => void;
}

/**
 * Obere Navigationsleiste im offenen Open-Gallery-Design:
 * Avatar links • PROJEKT BOX Wortmarke mittig • TV CODE & Einstellungen rechts.
 */
export function MainMenuHeader({
  avatar,
  onOpenProfile,
  onOpenTvJoin,
  onOpenSettings,
}: MainMenuHeaderProps) {
  return (
    <header className="tablet-header landscape-top-bar relative z-30 flex md:grid md:grid-cols-[1fr_auto_1fr] shrink-0 flex-nowrap items-center justify-between gap-2 px-3 sm:px-6 pt-1 pb-1.5 landscape:py-1">
      {/* Links: Avatar im offenen Ring-Stil */}
      <div className="shrink-0 flex items-center md:justify-self-start">
        <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
        </div>
      </div>

      {/* Mitte: Offene Wortmarke "PROJEKT BOX" mit Akzent-Unterstrich */}
      <div className="landscape-hide-logo landscape:hidden! flex items-center md:justify-self-center border-b-2 border-[#F59E0B] px-2 pb-0.5 select-none">
        <span className="font-arcade text-lg sm:text-2xl md:text-3xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
          PROJEKT <span className="text-[#FBBF24]">BOX</span>
        </span>
      </div>

      {/* Rechts: TV CODE & Einstellungen im offenen Gallery-Stil */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 md:justify-self-end">
        <button
          type="button"
          onClick={onOpenTvJoin}
          title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
          className="font-arcade inline-flex items-center gap-1.5 px-3 sm:px-3.5 h-8 sm:h-9 text-[11px] sm:text-xs tracking-wider uppercase rounded-lg border border-[#F59E0B]/60 bg-transparent text-[#FDE68A] hover:bg-[#F59E0B]/15 transition-all cursor-pointer active:scale-95"
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
    </header>
  );
}
