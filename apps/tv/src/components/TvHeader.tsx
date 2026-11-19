import { Bot, Settings, Tv } from 'lucide-react';
import {
  ConnectionStatusBadge,
  PlayerAvatarButton,
  type AvatarConfig,
} from '@projektbox/ui';

export interface TvHeaderProps {
  avatar?: AvatarConfig;
  hasActiveLobby?: boolean;
  onOpenProfile: () => void;
  onOpenSimulation: () => void;
  onOpenActiveLobby?: () => void;
  onOpenSettings: () => void;
}

export function TvHeader({
  avatar,
  hasActiveLobby = false,
  onOpenProfile,
  onOpenSimulation,
  onOpenActiveLobby,
  onOpenSettings,
}: TvHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] shrink-0 px-6 lg:px-10">
      <header className="relative z-30 flex w-full flex-nowrap items-center justify-between gap-4 border-b border-white/15 py-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="shrink-0 rounded-full ring-2 ring-white/25 shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
            <PlayerAvatarButton avatar={avatar} onClick={onOpenProfile} />
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="border-b-2 border-[#F59E0B] px-1 pb-0.5 select-none">
              <span className="font-arcade block truncate text-xl lg:text-3xl tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(15,23,42,0.75)]">
                PROJEKT <span className="text-[#FBBF24]">BOX</span>
              </span>
            </div>
            <span className="font-arcade inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/55 bg-[#F59E0B]/15 px-3 py-1 text-xs tracking-widest text-[#FDE68A] uppercase">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="hidden lg:block">
            <ConnectionStatusBadge />
          </div>

          {hasActiveLobby && onOpenActiveLobby && (
            <button
              type="button"
              onClick={onOpenActiveLobby}
              className="font-arcade inline-flex h-11 items-center gap-2 rounded-xl border border-[#34D399]/65 bg-[#10B981]/20 px-4 text-sm tracking-wider text-[#6EE7B7] uppercase transition hover:bg-[#10B981]/30 cursor-pointer"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse" />
              <span>TV-RAUM ÖFFNEN</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSimulation}
            className="font-arcade inline-flex h-11 items-center gap-2 rounded-xl border border-[#38BDF8]/60 bg-[#0284C7]/20 px-4 text-sm tracking-wider text-[#BAE6FD] uppercase transition hover:bg-[#0284C7]/35 cursor-pointer"
          >
            <Bot className="h-4 w-4" />
            <span>TV SIMULATION</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Einstellungen öffnen"
            className="font-arcade inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-4 text-sm tracking-wider text-white uppercase transition hover:bg-white/15 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>OPTIONEN</span>
          </button>
        </div>
      </header>
    </div>
  );
}
