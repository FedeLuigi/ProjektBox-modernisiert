import { Plus, Settings, Tv } from 'lucide-react';
import { type AvatarConfig } from './Avatar';
import { ArcadeLogoHeader, PlayerAvatarButton, PlayerProfileBar } from './ArcadeHudElements';
import { CrystalButton, CrystalIconButton } from './CrystalUI';
import { type MenuLayoutVariant } from './LayoutExplorerModal';

interface MainMenuHeaderProps {
  layout: MenuLayoutVariant;
  avatar?: AvatarConfig;
  onOpenProfile: () => void;
  onOpenExplorer: () => void;
  onOpenTvJoin: () => void;
  onOpenSettings: () => void;
}

/**
 * Passt die gesamte obere Navigationsleiste (Avatar, PROJEKT BOX Titel, +, TV CODE, Einstellungen)
 * nahtlos an die gewählte Design-Variante an.
 */
export function MainMenuHeader({
  layout,
  avatar,
  onOpenProfile,
  onOpenExplorer,
  onOpenTvJoin,
  onOpenSettings,
}: MainMenuHeaderProps) {
  // Standard-Karussell behält exakt den gewohnten Crystal-Header
  if (layout === 'carousel') {
    return (
      <header className="tablet-header landscape-top-bar relative z-30 flex md:grid md:grid-cols-[1fr_auto_1fr] shrink-0 flex-nowrap items-center justify-between gap-1.5 sm:gap-2 px-1.5 sm:px-4 pt-0.5 pb-1 landscape:py-0.5 landscape:px-0">
        <div className="shrink-0 flex items-center md:justify-self-start">
          <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 md:justify-self-center">
          <div className="landscape-hide-logo landscape:hidden!">
            <ArcadeLogoHeader />
          </div>
          <CrystalIconButton
            size="sm"
            variant="crystal"
            tilt="right"
            onClick={onOpenExplorer}
            title="Design-Varianten testen"
            aria-label="Design-Varianten testen"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
          </CrystalIconButton>
        </div>

        <div className="shrink-0 flex items-center gap-1 sm:gap-2 md:justify-self-end">
          <CrystalButton
            size="sm"
            tilt="right"
            variant="amber"
            title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
            onClick={onOpenTvJoin}
          >
            TV CODE
          </CrystalButton>

          <PlayerProfileBar showAvatar={false} onOpenSettings={onOpenSettings} />
        </div>
      </header>
    );
  }

  // Offene Design-Varianten: Titel, Buttons & Leiste passen sich dem jeweiligen Stil an
  const isPills = layout === 'open-pills';
  const isDock = layout === 'open-dock';
  const isGallery = layout === 'open-gallery';
  const isMinimal = layout === 'open-minimal';

  return (
    <header className="tablet-header landscape-top-bar relative z-30 flex md:grid md:grid-cols-[1fr_auto_1fr] shrink-0 flex-nowrap items-center justify-between gap-2 px-3 sm:px-6 pt-1 pb-1.5 landscape:py-1">
      {/* Links: Avatar im offenen Ring-Stil */}
      <div className="shrink-0 flex items-center md:justify-self-start">
        <div className="rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
        </div>
      </div>

      {/* Mitte: Offene Wortmarke "PROJEKT BOX" + Design-Switcher "+" */}
      <div className="flex items-center gap-2 sm:gap-3 md:justify-self-center">
        <div
          className={`landscape-hide-logo landscape:hidden! flex items-center select-none ${
            isPills
              ? 'rounded-full border border-white/20 bg-white/10 px-4 py-1 backdrop-blur-xs shadow-lg'
              : isGallery
                ? 'border-b-2 border-[#F59E0B] px-2 pb-0.5'
                : 'px-1'
          }`}
        >
          <span className="font-arcade text-lg sm:text-2xl md:text-3xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
            PROJEKT <span className="text-[#FBBF24]">BOX</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenExplorer}
          title="Design-Varianten testen"
          aria-label="Design-Varianten testen"
          className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isDock
              ? 'rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-xs'
              : isGallery
                ? 'rounded-lg border border-white/25 bg-transparent text-[#FDE68A] hover:bg-white/10'
                : 'rounded-full border border-white/25 bg-white/10 text-[#38BDF8] hover:bg-white/20 hover:text-white backdrop-blur-xs'
          }`}
        >
          <Plus className="h-4 w-4 stroke-[2.6]" />
        </button>
      </div>

      {/* Rechts: TV CODE & Einstellungen im passenden offenen Stil */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 md:justify-self-end">
        <button
          type="button"
          onClick={onOpenTvJoin}
          title="Mit einem bestehenden 6-stelligen TV- oder Raum-Code beitreten"
          className={`font-arcade inline-flex items-center gap-1.5 px-3 sm:px-3.5 h-8 sm:h-9 text-[11px] sm:text-xs tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
            isPills
              ? 'rounded-full border border-[#FDE68A]/50 bg-[#F59E0B]/20 text-[#FEF3C7] hover:bg-[#F59E0B]/35 backdrop-blur-xs'
              : isDock
                ? 'rounded-xl border border-white/20 bg-white/10 text-[#FDE68A] hover:bg-white/20 backdrop-blur-xs'
                : isGallery
                  ? 'rounded-lg border border-[#F59E0B]/60 bg-transparent text-[#FDE68A] hover:bg-[#F59E0B]/15'
                  : isMinimal
                    ? 'rounded-full border border-white/20 bg-white/8 text-white/90 hover:bg-white/18'
                    : 'rounded-full border border-[#FBBF24]/50 bg-[#F59E0B]/20 text-[#FEF3C7] hover:bg-[#F59E0B]/30 backdrop-blur-xs'
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
          className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center transition-all cursor-pointer active:scale-95 ${
            isDock
              ? 'rounded-xl border border-white/20 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white backdrop-blur-xs'
              : isGallery
                ? 'rounded-lg border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white'
                : 'rounded-full border border-white/20 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white backdrop-blur-xs'
          }`}
        >
          <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </button>
      </div>
    </header>
  );
}
