import { Bot, Settings, Tv } from 'lucide-react';
import { PlayerAvatarButton, type AvatarConfig } from '@projektbox/ui';

export interface MainMenuHeaderProps {
  avatar?: AvatarConfig;
  hasActiveLobby?: boolean;
  hasAppUpdate?: boolean;
  onOpenProfile: () => void;
  onOpenSimulation?: () => void;
  onOpenTvJoin: () => void;
  onOpenActiveLobby?: () => void;
  onOpenSettings: () => void;
}

/**
 * Verschmolzene Kopfleiste im Open-Gallery-Stil:
 * Avatar + PROJEKT BOX links • SIMULIEREN, LOBBY BEITRETEN & Einstellungen rechts.
 */
export function MainMenuHeader({
  avatar,
  hasActiveLobby = false,
  hasAppUpdate = false,
  onOpenProfile,
  onOpenSimulation,
  onOpenTvJoin,
  onOpenActiveLobby,
  onOpenSettings,
}: MainMenuHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] shrink-0 px-4 sm:px-6 lg:px-8">
      <header className="tablet-header landscape-top-bar relative z-30 flex w-full flex-nowrap items-center justify-between gap-2 sm:gap-3 border-b border-white/15 py-2 landscape:py-1">
        {/* Links: Avatar + Wortmarke verschmolzen (unter 420px verborgen, damit nichts die Buttons rechts überlagert) */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="shrink-0 rounded-full ring-2 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
            <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
          </div>

          <div className="landscape-hide-logo landscape:hidden! hidden min-[420px]:block min-w-0 overflow-hidden border-b-2 border-[#F59E0B] px-1 pb-0.5 select-none">
            <span className="font-arcade block truncate text-sm md:text-base lg:text-xl xl:text-2xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
              PROJEKT <span className="text-[#FBBF24]">BOX</span>
            </span>
          </div>
        </div>

        {/* Rechts: SIMULIEREN, LOBBY BEITRETEN / LOBBY ANSEHEN & Einstellungen */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {onOpenSimulation && (
            <button
              type="button"
              onClick={onOpenSimulation}
              title="Spiele sofort allein mit Bots oder im TV-Modus simulieren"
              className="font-arcade inline-flex h-8 sm:h-9 items-center gap-1 sm:gap-1.5 rounded-lg border border-[#38BDF8]/55 bg-[#0284C7]/15 px-2 sm:px-3 text-[10px] sm:text-xs tracking-wider text-[#BAE6FD] uppercase transition-all hover:bg-[#0284C7]/25 cursor-pointer active:scale-95"
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden whitespace-nowrap">SIM</span>
              <span className="hidden sm:inline whitespace-nowrap">SIMULIEREN</span>
            </button>
          )}

          <button
            type="button"
            onClick={hasActiveLobby && onOpenActiveLobby ? onOpenActiveLobby : onOpenTvJoin}
            title={
              hasActiveLobby
                ? 'Zur laufenden Lobby zurückkehren'
                : 'Mit einem bestehenden Lobby-Code oder QR-Code beitreten'
            }
            className={`font-arcade inline-flex h-8 sm:h-9 items-center gap-1 sm:gap-1.5 rounded-lg border px-2 sm:px-3.5 text-[10px] sm:text-xs tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              hasActiveLobby
                ? 'border-[#34D399]/60 bg-[#10B981]/15 text-[#6EE7B7] hover:bg-[#10B981]/25'
                : 'border-[#F59E0B]/60 bg-transparent text-[#FDE68A] hover:bg-[#F59E0B]/15'
            }`}
          >
            {hasActiveLobby ? (
              <span className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse shrink-0" />
            ) : (
              <Tv className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="sm:hidden whitespace-nowrap">
              {hasActiveLobby ? 'LOBBY' : 'BEITRETEN'}
            </span>
            <span className="hidden sm:inline whitespace-nowrap">
              {hasActiveLobby ? 'LOBBY ANSEHEN' : 'LOBBY BEITRETEN'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title={
              hasAppUpdate
                ? 'Optionen & Einstellungen öffnen (App-Update verfügbar)'
                : 'Optionen & Einstellungen öffnen'
            }
            aria-label={
              hasAppUpdate
                ? 'Optionen & Einstellungen öffnen (App-Update verfügbar)'
                : 'Optionen & Einstellungen öffnen'
            }
            className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/20 bg-transparent text-white/80 transition-all hover:bg-white/10 hover:text-white cursor-pointer active:scale-95"
          >
            <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            {hasAppUpdate && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#F59E0B] ring-2 ring-[#1B2B40]"
              />
            )}
          </button>
        </div>
      </header>
    </div>
  );
}
