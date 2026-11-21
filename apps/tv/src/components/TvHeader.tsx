import { Bot, Settings, Tv } from 'lucide-react';
import { ConnectionStatusBadge } from '@projektbox/ui';

export interface TvHeaderProps {
  hasActiveLobby?: boolean;
  onOpenSimulation: () => void;
  onOpenActiveLobby?: () => void;
  onOpenSettings: () => void;
}

export function TvHeader({
  hasActiveLobby = false,
  onOpenSimulation,
  onOpenActiveLobby,
  onOpenSettings,
}: TvHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] shrink-0 px-3 sm:px-6 lg:px-10">
      <header className="relative z-30 flex w-full flex-wrap items-center justify-between gap-2.5 sm:gap-4 py-2.5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="border-b-2 border-[#F59E0B] px-1 pb-0.5 select-none">
              <span className="font-arcade block truncate text-lg sm:text-xl lg:text-3xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
                PROJEKT <span className="text-[#FBBF24]">BOX</span>
              </span>
            </div>
            <span className="font-arcade shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#F59E0B]/55 bg-[#F59E0B]/15 px-2 sm:px-3 py-1 text-[10px] sm:text-xs tracking-widest text-[#FDE68A] uppercase">
              <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>TV</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <ConnectionStatusBadge />
          </div>

          {hasActiveLobby && onOpenActiveLobby && (
            <button
              type="button"
              onClick={onOpenActiveLobby}
              className="font-arcade inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-xl border border-[#34D399]/65 bg-[#10B981]/20 px-3 sm:px-4 text-xs sm:text-sm tracking-wider text-[#6EE7B7] uppercase transition hover:bg-[#10B981]/30 cursor-pointer"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse" />
              <span>TV-RAUM ÖFFNEN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSimulation}
            className="font-arcade inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-xl border border-[#38BDF8]/60 bg-[#0284C7]/20 px-3 sm:px-4 text-xs sm:text-sm tracking-wider text-[#BAE6FD] uppercase transition hover:bg-[#0284C7]/35 cursor-pointer"
          >
            <Bot className="h-4 w-4" />
            <span>TV SIMULATION</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Einstellungen öffnen"
            className="font-arcade inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-3 sm:px-4 text-xs sm:text-sm tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">OPTIONEN</span>
          </button>
        </div>
      </header>
    </div>
  );
}
