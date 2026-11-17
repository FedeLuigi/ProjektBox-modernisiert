import { Plus, Settings, Tv } from 'lucide-react';
import { type AvatarConfig } from './Avatar';
import { PlayerAvatarButton } from './ArcadeHudElements';

export interface MainMenuHeaderProps {
  avatar?: AvatarConfig;
  onOpenProfile: () => void;
  onOpenTvJoin: () => void;
  onOpenSplashDesigns: () => void;
  onOpenSettings: () => void;
}

/**
 * Verschmolzene Kopfleiste im Open-Gallery-Stil:
 * Avatar + PROJEKT BOX links • LOBBY BEITRETEN, „+“ (Startanimationen) & Einstellungen rechts.
 */
export function MainMenuHeader({
  avatar,
  onOpenProfile,
  onOpenTvJoin,
  onOpenSplashDesigns,
  onOpenSettings,
}: MainMenuHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] shrink-0 px-4 sm:px-6 lg:px-8">
      <header className="tablet-header landscape-top-bar relative z-30 flex w-full flex-nowrap items-center justify-between gap-3 border-b border-white/15 py-2 landscape:py-1">
        {/* Links: Avatar + Wortmarke verschmolzen */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
            <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
          </div>

          <div className="landscape-hide-logo landscape:hidden! border-b-2 border-[#F59E0B] px-1 pb-0.5 select-none">
            <span className="font-arcade text-base sm:text-xl md:text-2xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
              PROJEKT <span className="text-[#FBBF24]">BOX</span>
            </span>
          </div>
        </div>

        {/* Rechts: TV CODE & Einstellungen */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenTvJoin}
            title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
            className="font-arcade inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-lg border border-[#F59E0B]/60 bg-transparent px-2.5 sm:px-3.5 text-[11px] sm:text-xs tracking-wider text-[#FDE68A] uppercase transition-all hover:bg-[#F59E0B]/15 cursor-pointer active:scale-95"
          >
            <Tv className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">LOBBY BEITRETEN</span>
          </button>

          <button
            type="button"
            onClick={onOpenSplashDesigns}
            title="Startanimationen (10 Varianten) auswählen"
            aria-label="Startanimationen (10 Varianten) auswählen"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/25 bg-white/[0.06] text-[#FDE68A] transition-all hover:border-[#F59E0B] hover:bg-[#F59E0B]/20 hover:text-white cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Optionen & Einstellungen öffnen"
            aria-label="Optionen & Einstellungen öffnen"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/20 bg-transparent text-white/80 transition-all hover:bg-white/10 hover:text-white cursor-pointer active:scale-95"
          >
            <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
        </div>
      </header>
    </div>
  );
}
